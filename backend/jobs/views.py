from decimal import Decimal
from django.utils import timezone
from rest_framework import generics, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Job
from .serializers import JobSerializer, JobCreateSerializer


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
        qs = Job.objects.filter(status='published', is_active=True)
        today = timezone.now().date()
        qs = qs.filter(models.Q(deadline__isnull=True) | models.Q(deadline__gte=today))
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
        serializer.save(posted_by=self.request.user, status='draft')


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
            job = Job.objects.get(pk=pk, posted_by=request.user, status='approved')
        except Job.DoesNotExist:
            return Response({'error': 'Job not found or not approved yet'}, status=404)

        fee = job.posting_fee
        if not fee:
            return Response({'error': 'Admin has not set the posting fee yet'}, status=400)

        tx_ref = f"JOB-{uuid.uuid4().hex[:12].upper()}"

        # Save tx_ref on job
        job.fee_tx_ref = tx_ref
        job.status = 'payment_pending'
        job.save(update_fields=['fee_tx_ref', 'status'])

        # Create pending wallet transaction
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        Transaction.objects.create(
            wallet=wallet, tx_type='commission',
            amount=fee, status='pending',
            reference=tx_ref,
            description=f"Job posting fee for: {job.title}",
        )

        # Call Chapa
        payload = {
            "amount": str(fee),
            "currency": "ETB",
            "email": request.data.get('email', request.user.email or 'user@example.com'),
            "first_name": request.data.get('first_name', request.user.username),
            "last_name": request.data.get('last_name', ''),
            "phone_number": request.data.get('phone_number', ''),
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
            if data.get('status') == 'success':
                return Response({'checkout_url': data['data']['checkout_url'], 'tx_ref': tx_ref})
            return Response({'error': data.get('message', 'Chapa error')}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class JobConfirmPaymentView(APIView):
    """
    Called after Chapa redirects back — confirm payment and publish job.
    No re-verify needed: Chapa callback already credited wallet.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from wallet.models import Transaction
        try:
            job = Job.objects.get(pk=pk, posted_by=request.user)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=404)

        tx_ref = request.data.get('tx_ref') or job.fee_tx_ref
        if not tx_ref:
            return Response({'error': 'No tx_ref'}, status=400)

        # Mark transaction completed if still pending
        tx = Transaction.objects.filter(reference=tx_ref).first()
        if tx and tx.status == 'pending':
            tx.status = 'completed'
            tx.save()

        # Publish the job
        job.status = 'published'
        job.fee_paid = True
        job.is_approved = True
        job.is_active = True
        job.published_at = timezone.now()
        job.save()

        return Response({'message': 'Job published successfully', 'status': job.status})


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
            return Response({'message': 'Job rejected.', 'status': job.status})

        elif action == 'publish':
            # Admin manually publishes (e.g. after offline payment)
            job.status       = 'published'
            job.fee_paid     = True
            job.is_approved  = True
            job.is_active    = True
            job.published_at = timezone.now()
            job.save()
            return Response({'message': 'Job published.', 'status': job.status})

        return Response({'error': 'Invalid action. Use approve, reject, or publish.'}, status=400)


# Fix missing import
from django.db import models
