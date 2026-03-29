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
            "return_url": f"{settings.FRONTEND_URL}/post-job?tx_ref={tx_ref}&chapa_return=1",
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

        tx = Transaction.objects.filter(
            reference=tx_ref, status='pending'
        ).first()
        if not tx:
            return Response({"message": "Already processed"})

        tx.status = 'completed'
        tx.chapa_tx_id = data['data'].get('id', '')
        tx.save()

        wallet = tx.wallet
        wallet.balance += tx.amount
        wallet.save()

        return Response({"message": "Wallet credited", "balance": str(wallet.balance)})


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
