from decimal import Decimal
from django.utils import timezone
from rest_framework import generics, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Job
from .serializers import JobSerializer, JobCreateSerializer
from config.email_service import (
    send_job_submitted, send_job_approved, send_job_rejected,
    send_job_published, send_extend_fee_set, send_extend_approved, send_extend_rejected,
)


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or getattr(request.user, 'role', '') == 'admin'
        )


# ── Public / Job Seeker endpoints ─────────────────────────────────────────────

class JobListView(generics.ListAPIView):
    """Public: only published, non-expired jobs"""
    serializer_class = JobSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'location', 'industry', 'skill_level']

    def get_queryset(self):
        from django.db import connections
        today_str = timezone.now().date().strftime('%Y-%m-%d')

        # Use raw pymongo — avoids djongo boolean/date SQL bugs
        db_conn = connections['default']
        db_conn.ensure_connection()
        col = db_conn.connection['jobs_job']
        docs = col.find(
            {
                'status': 'published',
                'is_active': True,
                '$or': [
                    {'deadline': None},
                    {'deadline': {'$exists': False}},
                    {'deadline': ''},
                    {'deadline': {'$gte': today_str}},
                ]
            },
            {'id': 1}
        )
        ids = [d['id'] for d in docs if d.get('id')]
        qs = Job.objects.filter(id__in=ids).order_by('-created_at')
        for param, field in [
            ('location', 'location__icontains'),
            ('industry', 'industry__icontains'),
            ('skill_level', 'skill_level'),
            ('job_type', 'job_type'),
        ]:
            val = self.request.query_params.get(param)
            if val:
                qs = qs.filter(**{field: val})
        return qs


class JobDetailView(generics.RetrieveAPIView):
    queryset = Job.objects.filter(status='published')
    serializer_class = JobSerializer
    permission_classes = [permissions.AllowAny]


# ── Employer endpoints ────────────────────────────────────────────────────────

class JobCreateView(generics.CreateAPIView):
    """Employer submits a job for admin review — no payment yet"""
    serializer_class = JobCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        job = serializer.save(posted_by=self.request.user, status='draft')
        try:
            send_job_submitted(self.request.user.email, self.request.user.username, job.title)
        except Exception:
            pass


class MyJobsView(generics.ListAPIView):
    """Employer sees all their jobs with current status"""
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Job.objects.filter(posted_by=self.request.user)


class JobUpdateView(generics.UpdateAPIView):
    """Employer can edit a job only if it's still in draft"""
    serializer_class = JobCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Job.objects.filter(posted_by=self.request.user, status='draft')


class JobDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Job.objects.filter(posted_by=self.request.user)


class JobPayFeeView(APIView):
    """
    Employer initiates Chapa payment for the posting fee after admin approval.
    Returns Chapa checkout URL.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        import uuid, requests as req
        from django.conf import settings as django_settings
        from wallet.models import Wallet, Transaction

        try:
            # Allow retry from payment_pending too (in case previous Chapa call failed)
            job = Job.objects.get(pk=pk, posted_by=request.user, status__in=['approved', 'payment_pending'])
        except Job.DoesNotExist:
            return Response({'error': 'Job not found or not approved yet'}, status=404)

        fee = job.posting_fee
        if not fee:
            return Response({'error': 'Admin has not set the posting fee yet'}, status=400)

        # Convert Decimal128 (MongoDB) to Python Decimal
        from decimal import Decimal as PyDecimal
        try:
            fee = PyDecimal(str(fee))
        except Exception:
            return Response({'error': 'Invalid posting fee value'}, status=400)

        tx_ref = f"JOB-{uuid.uuid4().hex[:12].upper()}"

        email = request.data.get('email') or request.user.email or 'user@example.com'
        first_name = request.data.get('first_name') or request.user.username or 'User'

        # Call Chapa FIRST — only save state if it succeeds
        payload = {
            "amount": str(fee),
            "currency": "ETB",
            "email": email,
            "first_name": first_name,
            "last_name": request.data.get('last_name', ''),
            "phone_number": request.data.get('phone_number', '') or getattr(request.user, 'phone', '') or '',
            "tx_ref": tx_ref,
            "callback_url": f"{django_settings.BACKEND_URL}/api/wallet/chapa/callback/",
            "return_url": f"{django_settings.FRONTEND_URL}/my-jobs?tx_ref={tx_ref}&job_id={job.id}&chapa_return=1",
            "customization[title]": f"JobPortal - Posting Fee",
            "customization[description]": f"Fee to publish: {job.title}",
        }
        headers = {"Authorization": f"Bearer {django_settings.CHAPA_SECRET_KEY}"}
        try:
            resp = req.post("https://api.chapa.co/v1/transaction/initialize",
                            json=payload, headers=headers, timeout=15)
            data = resp.json()
            if data.get('status') != 'success':
                return Response({'error': data.get('message', 'Chapa error'), 'detail': data}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        # Chapa succeeded — now save tx_ref and update status
        job.fee_tx_ref = tx_ref
        job.status = 'payment_pending'
        job.save(update_fields=['fee_tx_ref', 'status'])

        # Create pending wallet transaction via raw pymongo (avoids Decimal128 issue)
        from django.db import connections
        from django.utils import timezone as tz
        db_conn = connections['default']
        db_conn.ensure_connection()
        wal_col = db_conn.connection['wallet_wallet']
        tx_col  = db_conn.connection['wallet_transaction']

        # Get or create wallet
        wal_doc = wal_col.find_one({'user_id': request.user.id})
        if not wal_doc:
            max_wal = wal_col.find_one(sort=[('id', -1)], projection={'id': 1})
            next_wal_id = (max_wal.get('id', 0) if max_wal else 0) + 1
            wal_col.insert_one({'id': next_wal_id, 'user_id': request.user.id, 'balance': '0'})
            wallet_id = next_wal_id
        else:
            wallet_id = wal_doc.get('id')

        max_tx = tx_col.find_one(sort=[('id', -1)], projection={'id': 1})
        next_tx_id = (max_tx.get('id', 0) if max_tx else 0) + 1
        tx_col.insert_one({
            'id': next_tx_id,
            'wallet_id': wallet_id,
            'tx_type': 'commission',
            'amount': str(fee),
            'status': 'pending',
            'reference': tx_ref,
            'description': f"Job posting fee for: {job.title}",
            'chapa_tx_id': '',
            'created_at': tz.now(),
        })

        return Response({'checkout_url': data['data']['checkout_url'], 'tx_ref': tx_ref})


class JobPaymentReturnView(APIView):
    """
    Chapa redirects here after payment (return_url must be http/https).
    Confirms payment then serves HTML page that opens the app deep link.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        from django.http import HttpResponse
        from wallet.models import Transaction
        import requests as req
        from django.conf import settings as django_settings

        tx_ref = request.query_params.get('tx_ref', '')

        # Verify with Chapa and publish job
        if tx_ref:
            try:
                verify_url = f"https://api.chapa.co/v1/transaction/verify/{tx_ref}"
                headers = {"Authorization": f"Bearer {django_settings.CHAPA_SECRET_KEY}"}
                resp = req.get(verify_url, headers=headers, timeout=15)
                data = resp.json()
                if data.get('status') == 'success':
                    tx = Transaction.objects.filter(reference=tx_ref, status='pending').first()
                    if tx:
                        tx.status = 'completed'
                        tx.save()
                    try:
                        job = Job.objects.get(pk=pk)
                        job.status = 'published'
                        job.fee_paid = True
                        job.is_approved = True
                        job.is_active = True
                        job.published_at = timezone.now()
                        job.save()
                    except Job.DoesNotExist:
                        pass
            except Exception:
                pass

        deep_link = f"jobportal://my-jobs?tx_ref={tx_ref}&job_id={pk}&chapa_return=1"
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment Successful</title>
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
    .icon {{ font-size: 72px; margin-bottom: 20px; }}
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
    <div class="icon">✅</div>
    <h1>Payment Successful!</h1>
    <p class="sub">Your job posting fee has been received.<br>Your job is now live and visible to job seekers.</p>
    <a href="{deep_link}" class="btn" id="openBtn">Open JobPortal App</a>
    <p class="note">If the app doesn't open automatically, tap the button above.</p>
  </div>
  <script>
    // Redirect immediately
    window.location.href = "{deep_link}";
  </script>
</body>
</html>"""
        return HttpResponse(html, content_type='text/html')


class JobConfirmPaymentView(APIView):
    """
    Called after Chapa redirects back — confirm payment and publish job.
    No re-verify needed: Chapa callback already credited wallet.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from django.db import connections
        from django.utils import timezone as tz

        try:
            job = Job.objects.get(pk=pk, posted_by=request.user)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=404)

        tx_ref = request.data.get('tx_ref') or job.fee_tx_ref
        if not tx_ref:
            return Response({'error': 'No tx_ref'}, status=400)

        db_conn = connections['default']
        db_conn.ensure_connection()

        # Mark transaction completed via raw pymongo (avoids Decimal128 issue)
        tx_col = db_conn.connection['wallet_transaction']
        tx_col.update_one(
            {'reference': tx_ref, 'status': 'pending'},
            {'$set': {'status': 'completed'}}
        )

        # Publish the job via raw pymongo
        job_col = db_conn.connection['jobs_job']
        job_col.update_one(
            {'id': job.id},
            {'$set': {
                'status': 'published',
                'fee_paid': True,
                'is_approved': True,
                'is_active': True,
                'published_at': tz.now(),
            }}
        )

        try:
            send_job_published(job.posted_by.email, job.posted_by.username, job.title)
        except Exception:
            pass
        return Response({'message': 'Job published successfully', 'status': 'published'})


# ── Admin endpoints ───────────────────────────────────────────────────────────

class AdminJobListView(generics.ListAPIView):
    """Admin: list all jobs, filterable by status"""
    serializer_class = JobSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = Job.objects.all().select_related('posted_by')
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        return qs


class AdminJobDetailView(generics.RetrieveAPIView):
    """Admin: full job detail including applicants"""
    serializer_class = JobSerializer
    permission_classes = [IsAdmin]
    queryset = Job.objects.all()


class AdminReviewJobView(APIView):
    """
    Admin reviews a job:
    - action=approve: set status=approved, set posting_fee
    - action=reject:  set status=rejected, add note
    """
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            job = Job.objects.get(pk=pk)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=404)

        action = request.data.get('action')
        note   = request.data.get('note', '')
        fee    = request.data.get('posting_fee')

        if action == 'approve':
            if not fee:
                return Response({'error': 'posting_fee is required when approving'}, status=400)
            job.status      = 'approved'
            job.posting_fee = Decimal(str(fee))
            job.admin_note  = note
            job.reviewed_by = request.user
            job.reviewed_at = timezone.now()
            job.save()
            try:
                send_job_approved(job.posted_by.email, job.posted_by.username, job.title, str(fee))
            except Exception:
                pass
            return Response({
                'message': f'Job approved. Employer will be notified to pay ETB {fee}.',
                'status': job.status,
                'posting_fee': str(job.posting_fee),
            })

        elif action == 'reject':
            job.status      = 'rejected'
            job.admin_note  = note
            job.reviewed_by = request.user
            job.reviewed_at = timezone.now()
            job.save()
            try:
                send_job_rejected(job.posted_by.email, job.posted_by.username, job.title, note)
            except Exception:
                pass
            return Response({'message': 'Job rejected.', 'status': job.status})

        elif action == 'publish':
            # Admin manually publishes (e.g. after offline payment)
            job.status       = 'published'
            job.fee_paid     = True
            job.is_approved  = True
            job.is_active    = True
            job.published_at = timezone.now()
            job.save()
            try:
                send_job_published(job.posted_by.email, job.posted_by.username, job.title)
            except Exception:
                pass
            return Response({'message': 'Job published.', 'status': job.status})

        return Response({'error': 'Invalid action. Use approve, reject, or publish.'}, status=400)


# Fix missing import
from django.db import models


# ── Deadline & Extension endpoints ───────────────────────────────────────────

class AutoCloseExpiredView(APIView):
    """Called by cron or manually — closes all published jobs past deadline."""
    permission_classes = [IsAdmin]

    def post(self, request):
        from django.db import connections
        today_str = timezone.now().date().strftime('%Y-%m-%d')
        db_conn = connections['default']
        db_conn.ensure_connection()
        col = db_conn.connection['jobs_job']
        # Find published jobs where deadline string < today
        # Deadline stored as string YYYY-MM-DD — string comparison works correctly
        result = col.update_many(
            {
                'status': 'published',
                'deadline': {'$lt': today_str, '$ne': None, '$exists': True, '$type': 'string'}
            },
            {'$set': {'status': 'closed', 'is_active': False}}
        )
        return Response({'closed': result.modified_count})


class ExpiredJobsView(generics.ListAPIView):
    """Admin: list all expired/closed jobs."""
    serializer_class = JobSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        from django.db import connections
        today_str = timezone.now().date().strftime('%Y-%m-%d')
        db_conn = connections['default']
        db_conn.ensure_connection()
        col = db_conn.connection['jobs_job']
        docs = col.find({
            '$or': [
                {'status': 'closed'},
                {'status': 'published', 'deadline': {'$lt': today_str, '$ne': None, '$type': 'string'}}
            ]
        }, {'id': 1})
        ids = [d['id'] for d in docs if d.get('id')]
        return Job.objects.filter(id__in=ids).order_by('-id')


class AdminDeleteJobView(APIView):
    """Admin: delete a single job."""
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        try:
            job = Job.objects.get(pk=pk)
            job.delete()
            return Response({'message': 'Job deleted'}, status=204)
        except Job.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class AdminBulkDeleteJobsView(APIView):
    """Admin: bulk delete jobs by IDs."""
    permission_classes = [IsAdmin]

    def post(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided'}, status=400)
        deleted, _ = Job.objects.filter(pk__in=ids).delete()
        return Response({'deleted': deleted})


class RequestDeadlineExtendView(APIView):
    """Employer requests a deadline extension."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        import re
        try:
            job = Job.objects.get(pk=pk, posted_by=request.user)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=404)

        new_deadline = request.data.get('new_deadline', '').strip()
        if not new_deadline or not re.match(r'^\d{4}-\d{2}-\d{2}$', new_deadline):
            return Response({'error': 'new_deadline is required in YYYY-MM-DD format'}, status=400)

        # Use raw pymongo to avoid Decimal128 issues on save
        from django.db import connections
        db_conn = connections['default']
        db_conn.ensure_connection()
        col = db_conn.connection['jobs_job']
        col.update_one(
            {'id': job.id},
            {'$set': {
                'extend_requested': True,
                'extend_new_deadline': new_deadline,
                'extend_status': 'pending',
                'extend_fee': None,
                'extend_fee_paid': False,
                'extend_fee_tx_ref': '',
            }}
        )
        return Response({'message': 'Extension request submitted. Admin will review and set the fee.'})


class AdminReviewExtendView(APIView):
    """Admin: approve/reject extension request, set fee."""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            job = Job.objects.get(pk=pk)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=404)

        action = request.data.get('action')
        fee = request.data.get('extend_fee')

        from django.db import connections
        db_conn = connections['default']
        db_conn.ensure_connection()
        col = db_conn.connection['jobs_job']

        if action == 'set_fee':
            if not fee:
                return Response({'error': 'extend_fee is required'}, status=400)
            col.update_one({'id': job.id}, {'$set': {'extend_fee': str(fee), 'extend_status': 'fee_set'}})
            try:
                new_dl = col.find_one({'id': job.id}, {'extend_new_deadline': 1})
                dl_str = new_dl.get('extend_new_deadline', '') if new_dl else ''
                send_extend_fee_set(job.posted_by.email, job.posted_by.username, job.title, str(fee), dl_str)
            except Exception:
                pass
            return Response({'message': f'Extension fee set to ETB {fee}. Employer will be notified to pay.'})

        elif action == 'reject':
            col.update_one({'id': job.id}, {'$set': {'extend_status': 'rejected', 'extend_requested': False}})
            try:
                send_extend_rejected(job.posted_by.email, job.posted_by.username, job.title)
            except Exception:
                pass
            return Response({'message': 'Extension request rejected.'})

        elif action == 'approve':
            doc = col.find_one({'id': job.id}, {'extend_new_deadline': 1})
            new_dl = doc.get('extend_new_deadline', '') if doc else ''
            if new_dl:
                col.update_one({'id': job.id}, {'$set': {
                    'deadline': new_dl,
                    'status': 'published',
                    'is_active': True,
                    'extend_status': 'approved',
                    'extend_requested': False,
                }})
                try:
                    send_extend_approved(job.posted_by.email, job.posted_by.username, job.title, new_dl)
                except Exception:
                    pass
            return Response({'message': 'Extension approved. Job deadline updated.'})

        return Response({'error': 'Invalid action. Use set_fee, reject, or approve.'}, status=400)


class PayExtendFeeView(APIView):
    """Employer pays the extension fee via Chapa."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        import uuid, requests as req
        from django.conf import settings as django_settings
        from django.db import connections
        from django.utils import timezone as tz
        from decimal import Decimal as PyDecimal

        # Use raw pymongo to find job — avoids djongo IN clause bug
        db_conn = connections['default']
        db_conn.ensure_connection()
        job_col = db_conn.connection['jobs_job']
        job_doc = job_col.find_one({
            'id': pk,
            'posted_by_id': request.user.id,
            'extend_status': {'$in': ['fee_set', 'paid']}
        })
        if not job_doc:
            return Response({'error': 'Job not found or extension fee not set yet'}, status=404)

        try:
            job = Job.objects.get(pk=pk)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=404)

        fee = job.extend_fee
        if not fee:
            return Response({'error': 'Extension fee not set'}, status=400)

        # Convert Decimal128 to Python Decimal
        from decimal import Decimal as PyDecimal
        try:
            fee = PyDecimal(str(fee))
        except Exception:
            return Response({'error': 'Invalid extension fee value'}, status=400)

        tx_ref = f"EXT-{uuid.uuid4().hex[:12].upper()}"
        email = request.data.get('email') or request.user.email or 'user@example.com'
        first_name = request.data.get('first_name') or request.user.username or 'User'

        payload = {
            "amount": str(fee),
            "currency": "ETB",
            "email": email,
            "first_name": first_name,
            "tx_ref": tx_ref,
            "callback_url": f"{django_settings.BACKEND_URL}/api/wallet/chapa/callback/",
            "return_url": f"{django_settings.FRONTEND_URL}/my-jobs?tx_ref={tx_ref}&job_id={job.id}&chapa_return=1&extend=1",
            "customization[title]": "JobPortal - Deadline Extension Fee",
            "customization[description]": f"Extension fee for: {job.title}",
        }
        headers = {"Authorization": f"Bearer {django_settings.CHAPA_SECRET_KEY}"}
        try:
            resp = req.post("https://api.chapa.co/v1/transaction/initialize",
                            json=payload, headers=headers, timeout=15)
            data = resp.json()
            if data.get('status') != 'success':
                return Response({'error': data.get('message', 'Chapa error')}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        # Use raw pymongo — avoids Decimal128 issues
        from django.db import connections
        from django.utils import timezone as tz
        db_conn = connections['default']
        db_conn.ensure_connection()
        job_col = db_conn.connection['jobs_job']
        tx_col  = db_conn.connection['wallet_transaction']
        wal_col = db_conn.connection['wallet_wallet']

        # Update job
        job_col.update_one(
            {'id': job.id},
            {'$set': {'extend_fee_tx_ref': tx_ref, 'extend_status': 'paid'}}
        )

        # Get or create wallet
        wal_doc = wal_col.find_one({'user_id': request.user.id})
        if not wal_doc:
            max_wal = wal_col.find_one(sort=[('id', -1)], projection={'id': 1})
            next_wal_id = (max_wal.get('id', 0) if max_wal else 0) + 1
            wal_col.insert_one({'id': next_wal_id, 'user_id': request.user.id, 'balance': '0'})
            wallet_id = next_wal_id
        else:
            wallet_id = wal_doc.get('id')

        max_tx = tx_col.find_one(sort=[('id', -1)], projection={'id': 1})
        next_tx_id = (max_tx.get('id', 0) if max_tx else 0) + 1
        tx_col.insert_one({
            'id': next_tx_id,
            'wallet_id': wallet_id,
            'tx_type': 'commission',
            'amount': str(fee),
            'status': 'pending',
            'reference': tx_ref,
            'chapa_tx_id': '',
            'description': f"Deadline extension fee for: {job.title}",
            'created_at': tz.now(),
        })

        return Response({'checkout_url': data['data']['checkout_url'], 'tx_ref': tx_ref})


class ConfirmExtendPaymentView(APIView):
    """
    Called by mobile app after ChapaWebView intercepts return URL.
    Verifies extension payment with Chapa directly and processes it.
    This is needed because Chapa callback can't reach localhost in development.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        import requests as req
        from django.conf import settings as django_settings
        from django.db import connections
        from django.utils import timezone as tz
        from decimal import Decimal as PyDecimal

        tx_ref = request.data.get('tx_ref')
        if not tx_ref:
            return Response({'error': 'tx_ref required'}, status=400)

        # Verify with Chapa
        try:
            verify_url = f"https://api.chapa.co/v1/transaction/verify/{tx_ref}"
            headers = {"Authorization": f"Bearer {django_settings.CHAPA_SECRET_KEY}"}
            resp = req.get(verify_url, headers=headers, timeout=15)
            data = resp.json()
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        if data.get('status') != 'success':
            return Response({'error': 'Payment not verified by Chapa'}, status=400)

        db_conn = connections['default']
        db_conn.ensure_connection()
        tx_col  = db_conn.connection['wallet_transaction']
        job_col = db_conn.connection['jobs_job']
        wal_col = db_conn.connection['wallet_wallet']

        # Mark transaction completed
        tx_doc = tx_col.find_one({'reference': tx_ref})
        if tx_doc:
            chapa_id = data['data'].get('id', '') if isinstance(data.get('data'), dict) else ''
            tx_col.update_one(
                {'_id': tx_doc['_id']},
                {'$set': {'status': 'completed', 'chapa_tx_id': chapa_id}}
            )
            # Credit wallet
            wallet_id = tx_doc.get('wallet_id')
            amount_raw = tx_doc.get('amount', 0)
            try:
                amount = PyDecimal(str(amount_raw))
            except Exception:
                amount = PyDecimal('0')
            wal_doc = wal_col.find_one({'id': wallet_id})
            if wal_doc:
                current = PyDecimal(str(wal_doc.get('balance', 0)))
                wal_col.update_one({'_id': wal_doc['_id']}, {'$set': {'balance': str(current + amount)}})
        else:
            print(f"[ConfirmExtend] WARNING: No transaction found for tx_ref={tx_ref}")

        # Update job deadline and reset extend fields
        job_doc = job_col.find_one({'id': pk}, {'extend_new_deadline': 1})
        new_dl = job_doc.get('extend_new_deadline', '') if job_doc else ''
        update = {
            'extend_status': 'none',
            'extend_requested': False,
            'extend_fee_paid': True,
            'extend_new_deadline': None,
            'extend_fee': None,
            'extend_fee_tx_ref': '',
        }
        if new_dl:
            update['deadline'] = new_dl
            update['status'] = 'published'
            update['is_active'] = True
        job_col.update_one({'id': pk}, {'$set': update})

        return Response({'message': 'Extension payment confirmed', 'new_deadline': new_dl or None})


class ExtendPaymentReturnView(APIView):
    """Chapa return URL for extension fee payment."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        from django.http import HttpResponse
        from django.db import connections
        import requests as req
        from django.conf import settings as django_settings

        tx_ref = request.query_params.get('tx_ref', '')
        if tx_ref:
            try:
                verify_url = f"https://api.chapa.co/v1/transaction/verify/{tx_ref}"
                headers = {"Authorization": f"Bearer {django_settings.CHAPA_SECRET_KEY}"}
                resp = req.get(verify_url, headers=headers, timeout=15)
                data = resp.json()
                if data.get('status') == 'success':
                    db_conn = connections['default']
                    db_conn.ensure_connection()
                    tx_col  = db_conn.connection['wallet_transaction']
                    job_col = db_conn.connection['jobs_job']

                    # Mark transaction completed
                    tx_col.update_one(
                        {'reference': tx_ref, 'status': 'pending'},
                        {'$set': {'status': 'completed'}}
                    )

                    # Update job deadline — auto-approve after payment, reset extend fields so employer can extend again
                    job_doc = job_col.find_one({'id': pk}, {'extend_new_deadline': 1})
                    new_dl = job_doc.get('extend_new_deadline', '') if job_doc else ''
                    if new_dl:
                        job_col.update_one({'id': pk}, {'$set': {
                            'deadline': new_dl,
                            'status': 'published',
                            'is_active': True,
                            'extend_status': 'none',      # reset so employer can extend again
                            'extend_requested': False,
                            'extend_fee_paid': True,
                            'extend_new_deadline': None,  # clear so next extension starts fresh
                            'extend_fee': None,
                            'extend_fee_tx_ref': '',
                        }})
            except Exception:
                pass

        # Redirect directly to frontend
        return_url = f"{django_settings.FRONTEND_URL}/my-jobs?tx_ref={tx_ref}&job_id={pk}&chapa_return=1&extend=1"
        from django.http import HttpResponseRedirect
        return HttpResponseRedirect(return_url)
