import uuid
import requests
from decimal import Decimal
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Wallet, Transaction, CommissionSetting
from .serializers import WalletSerializer, TransactionSerializer, InitiatePaymentSerializer, CommissionSettingSerializer


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_staff or getattr(request.user, 'role', '') == 'admin')


def get_or_create_wallet(user):
    wallet, _ = Wallet.objects.get_or_create(user=user)
    return wallet


class MyWalletView(generics.RetrieveAPIView):
    serializer_class = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_or_create_wallet(self.request.user)


class InitiateDepositView(APIView):
    """Employer initiates a Chapa payment to top up wallet"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = InitiatePaymentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        tx_ref = f"JP-{uuid.uuid4().hex[:12].upper()}"
        wallet = get_or_create_wallet(request.user)

        Transaction.objects.create(
            wallet=wallet,
            tx_type='deposit',
            amount=d['amount'],
            status='pending',
            reference=tx_ref,
            description=f"Wallet top-up by {request.user.username}",
        )

        chapa_url = "https://api.chapa.co/v1/transaction/initialize"
        payload = {
            "amount": str(d['amount']),
            "currency": "ETB",
            "email": d['email'],
            "first_name": d['first_name'],
            "last_name": d.get('last_name', ''),
            "phone_number": d.get('phone_number', ''),
            "tx_ref": tx_ref,
            "callback_url": f"{settings.BACKEND_URL}/api/wallet/chapa/callback/",
            "return_url": f"{settings.BACKEND_URL}/api/wallet/deposit-return/?tx_ref={tx_ref}",
            "customization[title]": "JobPortal - Job Posting Fee",
            "customization[description]": "Commission fee for posting a job on JobPortal",
        }
        headers = {"Authorization": f"Bearer {settings.CHAPA_SECRET_KEY}"}

        try:
            resp = requests.post(chapa_url, json=payload, headers=headers, timeout=15)
            data = resp.json()
            if data.get('status') == 'success':
                return Response({
                    "checkout_url": data['data']['checkout_url'],
                    "tx_ref": tx_ref,
                })
            return Response({"error": data.get('message', 'Chapa error')}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class ChapaCallbackView(APIView):
    """Chapa calls this after payment — verify and credit wallet. Accepts both GET and POST."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return self._handle(request)

    def post(self, request):
        return self._handle(request)

    def _handle(self, request):
        from django.db import connections
        from decimal import Decimal as PyDecimal

        tx_ref = (
            request.data.get('tx_ref') or
            request.query_params.get('tx_ref') or
            request.query_params.get('trx_ref')
        )
        if not tx_ref:
            return Response({"error": "No tx_ref"}, status=400)

        verify_url = f"https://api.chapa.co/v1/transaction/verify/{tx_ref}"
        headers = {"Authorization": f"Bearer {settings.CHAPA_SECRET_KEY}"}
        try:
            resp = requests.get(verify_url, headers=headers, timeout=15)
            data = resp.json()
        except Exception as e:
            return Response({"error": str(e)}, status=500)

        if data.get('status') != 'success':
            return Response({"error": "Payment not verified"}, status=400)

        # Use raw pymongo to avoid Decimal128 conversion errors
        db_conn = connections['default']
        db_conn.ensure_connection()
        tx_col  = db_conn.connection['wallet_transaction']
        wal_col = db_conn.connection['wallet_wallet']

        tx_doc = tx_col.find_one({'reference': tx_ref, 'status': 'pending'})
        if not tx_doc:
            return Response({"message": "Already processed"})

        chapa_id = data['data'].get('id', '') if isinstance(data.get('data'), dict) else ''
        tx_col.update_one(
            {'_id': tx_doc['_id']},
            {'$set': {'status': 'completed', 'chapa_tx_id': chapa_id}}
        )

        # Credit wallet balance
        wallet_id = tx_doc.get('wallet_id')
        amount_raw = tx_doc.get('amount', 0)
        try:
            amount = PyDecimal(str(amount_raw))
        except Exception:
            amount = PyDecimal('0')

        wal_doc = wal_col.find_one({'id': wallet_id})
        if wal_doc:
            current = PyDecimal(str(wal_doc.get('balance', 0)))
            new_balance = current + amount
            wal_col.update_one({'_id': wal_doc['_id']}, {'$set': {'balance': str(new_balance)}})

        # If this is an extension payment (tx_ref starts with EXT-), auto-approve and reset extend fields
        if tx_ref.startswith('EXT-'):
            job_col = db_conn.connection['jobs_job']
            job_doc = job_col.find_one({'extend_fee_tx_ref': tx_ref})
            if job_doc:
                new_dl = job_doc.get('extend_new_deadline', '')
                update_fields = {
                    'extend_status': 'none',
                    'extend_requested': False,
                    'extend_fee_paid': True,
                    'extend_new_deadline': None,
                    'extend_fee': None,
                    'extend_fee_tx_ref': '',
                }
                if new_dl:
                    update_fields['deadline'] = new_dl
                    update_fields['status'] = 'published'
                    update_fields['is_active'] = True
                job_col.update_one({'_id': job_doc['_id']}, {'$set': update_fields})

        return Response({"message": "Wallet credited", "balance": str(amount)})


class ChapaVerifyView(APIView):
    """Mobile calls this to verify a tx_ref after returning from Chapa"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tx_ref = request.query_params.get('tx_ref')
        if not tx_ref:
            return Response({"error": "tx_ref required"}, status=400)

        verify_url = f"https://api.chapa.co/v1/transaction/verify/{tx_ref}"
        headers = {"Authorization": f"Bearer {settings.CHAPA_SECRET_KEY}"}
        try:
            resp = requests.get(verify_url, headers=headers, timeout=15)
            data = resp.json()
        except Exception as e:
            return Response({"error": str(e)}, status=500)

        if data.get('status') != 'success':
            return Response({"status": "pending", "message": "Payment not confirmed yet"}, status=200)

        tx = Transaction.objects.filter(reference=tx_ref, status='pending').first()
        if not tx:
            # Already processed — return current balance
            wallet = get_or_create_wallet(request.user)
            return Response({"status": "success", "balance": str(wallet.balance), "message": "Already processed"})

        tx.status = 'completed'
        tx.chapa_tx_id = data['data'].get('id', '')
        tx.save()

        wallet = tx.wallet
        wallet.balance += tx.amount
        wallet.save()

        return Response({"status": "success", "balance": str(wallet.balance), "amount": str(tx.amount)})


class DepositReturnView(APIView):
    """
    Chapa redirects here after wallet top-up (return_url must be http/https).
    Verifies payment, credits wallet, then serves HTML page that opens app deep link.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.http import HttpResponse

        tx_ref = request.query_params.get('tx_ref', '')

        if tx_ref:
            try:
                verify_url = f"https://api.chapa.co/v1/transaction/verify/{tx_ref}"
                headers = {"Authorization": f"Bearer {settings.CHAPA_SECRET_KEY}"}
                resp = requests.get(verify_url, headers=headers, timeout=15)
                data = resp.json()
                if data.get('status') == 'success':
                    tx = Transaction.objects.filter(reference=tx_ref, status='pending').first()
                    if tx:
                        tx.status = 'completed'
                        tx.chapa_tx_id = data['data'].get('id', '')
                        tx.save()
                        wallet = tx.wallet
                        wallet.balance += tx.amount
                        wallet.save()
            except Exception:
                pass

        deep_link = f"jobportal://wallet?tx_ref={tx_ref}&chapa_return=1"
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Top-Up Successful</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }}
    .card {{
      background: #fff; border-radius: 24px; padding: 48px 40px;
      text-align: center; max-width: 400px; width: 100%;
      box-shadow: 0 20px 60px rgba(124,58,237,0.15);
    }}
    .icon {{ font-size: 72px; margin-bottom: 20px; animation: pop 0.4s ease; }}
    @keyframes pop {{ 0% {{ transform: scale(0); }} 80% {{ transform: scale(1.1); }} 100% {{ transform: scale(1); }} }}
    h1 {{ color: #16a34a; font-size: 24px; font-weight: 800; margin-bottom: 8px; }}
    .sub {{ color: #6b7280; font-size: 15px; line-height: 1.5; margin-bottom: 32px; }}
    .btn {{
      display: inline-flex; align-items: center; gap: 8px;
      background: #7c3aed; color: #fff; text-decoration: none;
      padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 15px;
    }}
    .note {{ color: #9ca3af; font-size: 12px; margin-top: 20px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">💰</div>
    <h1>Wallet Topped Up!</h1>
    <p class="sub">Your wallet has been credited successfully.<br>You can now use your balance to post jobs.</p>
    <a href="{deep_link}" class="btn" id="openBtn">Open JobPortal App</a>
    <p class="note">If the app doesn't open automatically, tap the button above.</p>
  </div>
  <script>
    setTimeout(function() {{ window.location.href = "{deep_link}"; }}, 1500);
    document.getElementById('openBtn').addEventListener('click', function(e) {{
      e.preventDefault(); window.location.href = "{deep_link}";
    }});
  </script>
</body>
</html>"""
        return HttpResponse(html, content_type='text/html')


class DeductCommissionView(APIView):
    """Called when employer posts a job — deduct commission from wallet"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        setting = CommissionSetting.objects.first()
        fee = setting.job_post_fee if setting else Decimal('50.00')
        wallet = get_or_create_wallet(request.user)

        if wallet.balance < fee:
            return Response(
                {"error": f"Insufficient balance. Required: ETB {fee}, Available: ETB {wallet.balance}", "fee": str(fee), "balance": str(wallet.balance)},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        wallet.balance -= fee
        wallet.save()

        Transaction.objects.create(
            wallet=wallet,
            tx_type='commission',
            amount=fee,
            status='completed',
            description="Job posting commission fee",
        )
        return Response({"message": "Commission deducted", "fee": str(fee), "balance": str(wallet.balance)})


# ── Admin endpoints ──────────────────────────────────────────────────────────

class AdminCommissionSettingView(generics.RetrieveUpdateAPIView):
    """Admin: get or update the job posting fee"""
    serializer_class = CommissionSettingSerializer
    permission_classes = [IsAdmin]

    def get_object(self):
        obj, _ = CommissionSetting.objects.get_or_create(pk=1)
        return obj

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class AdminAllTransactionsView(generics.ListAPIView):
    """Admin: view all transactions"""
    serializer_class = TransactionSerializer
    permission_classes = [IsAdmin]
    queryset = Transaction.objects.all().order_by('-created_at')


class AdminAllWalletsView(generics.ListAPIView):
    """Admin: view all wallets"""
    serializer_class = WalletSerializer
    permission_classes = [IsAdmin]
    queryset = Wallet.objects.all()
