from rest_framework import generics, permissions, status, parsers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from datetime import timedelta
from .models import User, EmployerVerification, EmailVerificationOTP, generate_otp
from .serializers import RegisterSerializer, UserSerializer, EmployerVerificationDetailSerializer
from config.email_service import (
    send_email_verification_otp, send_welcome_email,
    send_employer_approved, send_employer_rejected,
)


# ── Password Reset ────────────────────────────────────────────────────────────

class PasswordResetRequestView(APIView):
    """Step 1: User enters email → receive 6-digit OTP."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required.'}, status=400)

        from django.db import connections
        db_conn = connections['default']
        db_conn.ensure_connection()
        usr_col = db_conn.connection['users_user']
        otp_col = db_conn.connection['users_emailverificationotp']

        user_doc = usr_col.find_one({'email': email})
        if not user_doc:
            return Response({'message': 'If that email exists, an OTP has been sent.'})

        otp = generate_otp()
        expires = timezone.now() + timedelta(minutes=15)

        # Invalidate old unverified password_reset OTPs for this user
        otp_col.update_many(
            {'$or': [
                {'user_id': user_doc['id'],     'otp_type': 'password_reset', 'verified': False},
                {'user_id': str(user_doc['id']), 'otp_type': 'password_reset', 'verified': False},
            ]},
            {'$set': {'verified': True}}
        )

        # Use Django ORM so otp_type is stored consistently via the model
        try:
            user_obj = User.objects.get(id=user_doc['id'])
            EmailVerificationOTP.objects.create(
                user=user_obj, otp=otp, email=email,
                otp_type='password_reset', expires_at=expires
            )
        except User.DoesNotExist:
            # Fallback: raw insert if ORM lookup fails
            otp_col.insert_one({
                'user_id': user_doc['id'],
                'otp': otp,
                'email': email,
                'otp_type': 'password_reset',
                'verified': False,
                'created_at': timezone.now(),
                'expires_at': expires,
            })

        try:
            send_email_verification_otp(email, user_doc.get('username', ''), otp)
        except Exception:
            pass

        return Response({'message': 'If that email exists, an OTP has been sent.'})


class PasswordResetConfirmView(APIView):
    """Step 2: User enters OTP + new password → password updated."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email        = request.data.get('email', '').strip().lower()
        otp_input    = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '').strip()

        if not email or not otp_input or not new_password:
            return Response({'error': 'Email, OTP, and new password are required.'}, status=400)
        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=400)

        from django.db import connections
        from django.contrib.auth.hashers import make_password
        from datetime import timezone as dt_tz
        db_conn = connections['default']
        db_conn.ensure_connection()
        usr_col = db_conn.connection['users_user']
        otp_col = db_conn.connection['users_emailverificationotp']

        user_doc = usr_col.find_one({'email': email})
        if not user_doc:
            return Response({'error': 'Invalid OTP.'}, status=400)

        otp_doc = otp_col.find_one(
            {'$or': [
                {'user_id': user_doc['id'],      'otp': otp_input, 'otp_type': 'password_reset', 'verified': False},
                {'user_id': str(user_doc['id']), 'otp': otp_input, 'otp_type': 'password_reset', 'verified': False},
            ]},
            sort=[('created_at', -1)]
        )
        if not otp_doc:
            return Response({'error': 'Invalid or expired OTP.'}, status=400)

        expires = otp_doc.get('expires_at')
        if expires:
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=dt_tz.utc)
            if timezone.now() > expires:
                return Response({'error': 'OTP has expired. Please request a new one.'}, status=400)

        otp_col.update_one({'_id': otp_doc['_id']}, {'$set': {'verified': True}})
        usr_col.update_one({'_id': user_doc['_id']}, {'$set': {'password': make_password(new_password)}})

        return Response({'message': 'Password reset successfully. You can now log in.'})


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or getattr(request.user, 'role', '') == 'admin'
        )


# ── Custom login: block unapproved employers ─────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        # Employers who are not yet approved can log in but get a flag
        if user.role == 'employer' and not user.is_approved:
            data['employer_pending'] = True
            data['message'] = (
                'Your employer account is pending admin approval. '
                'You can log in but cannot post jobs until approved.'
            )
        else:
            data['employer_pending'] = False
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# ── Register ─────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def perform_create(self, serializer):
        user = serializer.save()
        # Only send welcome email here — OTP is sent by the verify-email screen via /send-otp/
        try:
            send_welcome_email(user.email, user.username, user.role)
        except Exception:
            pass


# ── Profile ──────────────────────────────────────────────────────────────────

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        # Use raw pymongo to get accurate boolean fields (djongo misreads booleans)
        from django.db import connections
        db_conn = connections['default']
        db_conn.ensure_connection()
        col = db_conn.connection['users_user']
        doc = col.find_one({'id': request.user.id})
        if not doc:
            return super().retrieve(request, *args, **kwargs)

        BASE = request.build_absolute_uri('/')[:-1]
        photo = doc.get('profile_photo', '')
        photo_url = f"{BASE}/media/{photo}" if photo else None

        return Response({
            'id':                 doc.get('id'),
            'username':           doc.get('username', ''),
            'email':              doc.get('email', ''),
            'role':               doc.get('role', 'jobseeker'),
            'phone':              doc.get('phone', ''),
            'location':           doc.get('location', ''),
            'bio':                doc.get('bio', ''),
            'profile_photo':      photo_url,
            'preferred_language': doc.get('preferred_language', 'en'),
            'is_approved':        bool(doc.get('is_approved', False)),
            'is_suspended':       bool(doc.get('is_suspended', False)),
            'email_verified':     bool(doc.get('email_verified', False)),
        })


# ── Admin: user management ───────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all()

    def partial_update(self, request, *args, **kwargs):
        # Use raw pymongo to avoid djongo boolean/field update issues
        from django.db import connections
        pk = kwargs.get('pk')
        allowed = ['username', 'email', 'phone', 'location', 'bio', 'role',
                   'is_approved', 'is_suspended', 'is_active', 'preferred_language']
        update = {k: v for k, v in request.data.items() if k in allowed}
        if not update:
            return Response({'detail': 'No valid fields to update.'}, status=400)
        db_conn = connections['default']
        db_conn.ensure_connection()
        col = db_conn.connection['users_user']
        col.update_one({'id': int(pk)}, {'$set': update})
        doc = col.find_one({'id': int(pk)})
        return Response({
            'id': doc.get('id'), 'username': doc.get('username', ''),
            'email': doc.get('email', ''), 'role': doc.get('role', ''),
            'phone': doc.get('phone', ''), 'location': doc.get('location', ''),
            'bio': doc.get('bio', ''), 'is_approved': bool(doc.get('is_approved', False)),
            'is_suspended': bool(doc.get('is_suspended', False)),
        })


# ── Admin: employer verification ─────────────────────────────────────────────

class AdminEmployerVerificationListView(APIView):
    """List employer verifications using raw pymongo — avoids all djongo SQL issues."""
    permission_classes = [IsAdmin]

    def get(self, request):
        from django.db import connections
        db_conn = connections['default']
        db_conn.ensure_connection()
        ev_col  = db_conn.connection['users_employerverification']
        usr_col = db_conn.connection['users_user']

        status_filter = request.query_params.get('status')
        query = {}
        if status_filter:
            query['status'] = status_filter

        # Get latest record per user (deduplicate)
        all_docs = list(ev_col.find(query).sort('submitted_at', -1))
        seen, unique_docs = set(), []
        for doc in all_docs:
            uid = doc.get('user_id')
            if uid not in seen:
                seen.add(uid)
                unique_docs.append(doc)

        # Fetch user info for each
        user_ids = [d['user_id'] for d in unique_docs]
        users = {u['id']: u for u in usr_col.find({'id': {'$in': user_ids}})}

        BASE = request.build_absolute_uri('/')[:-1]

        def file_url(path):
            if not path:
                return None
            if path.startswith('http'):
                return path
            return f"{BASE}/media/{path}"

        results = []
        for doc in unique_docs:
            uid = doc.get('user_id')
            u = users.get(uid, {})
            results.append({
                'user_id':            uid,
                'id':                 uid,
                'pk':                 uid,
                'username':           u.get('username', ''),
                'email':              u.get('email', ''),
                'phone':              u.get('phone', ''),
                'location':           u.get('location', ''),
                'is_approved':        u.get('is_approved', False),
                'employer_type':      doc.get('employer_type', ''),
                'employer_type_other':doc.get('employer_type_other', ''),
                'organization_name':  doc.get('organization_name', ''),
                'national_id_number': doc.get('national_id_number', ''),
                'status':             doc.get('status', 'pending'),
                'admin_note':         doc.get('admin_note', ''),
                'submitted_at':       doc.get('submitted_at', '').isoformat() if doc.get('submitted_at') else None,
                'reviewed_at':        doc.get('reviewed_at', '').isoformat() if doc.get('reviewed_at') else None,
                'business_license':   file_url(doc.get('business_license')),
                'tin_certificate':    file_url(doc.get('tin_certificate')),
                'registration_cert':  file_url(doc.get('registration_cert')),
                'national_id_front':  file_url(doc.get('national_id_front')),
                'national_id_back':   file_url(doc.get('national_id_back')),
                'supporting_doc':     file_url(doc.get('supporting_doc')),
            })

        return Response(results)


class AdminEmployerVerificationDetailView(APIView):
    """Approve or reject a single employer verification."""
    permission_classes = [IsAdmin]

    def get(self, request, user_id):
        v = EmployerVerification.objects.select_related('user').filter(user__id=user_id).last()
        if not v:
            return Response({'detail': 'Not found.'}, status=404)
        return Response(EmployerVerificationDetailSerializer(v, context={'request': request}).data)

    def patch(self, request, user_id):
        action = request.data.get('action')
        note   = request.data.get('note', '')

        if action not in ('approve', 'reject'):
            return Response({'detail': 'action must be "approve" or "reject".'}, status=400)

        # Use raw pymongo to find and update the pending record directly
        from django.db import connections
        from django.utils import timezone as tz
        db_conn = connections['default']
        db_conn.ensure_connection()
        col = db_conn.connection['users_employerverification']

        new_status = 'approved' if action == 'approve' else 'rejected'
        result = col.update_one(
            {'user_id': user_id, 'status': 'pending'},
            {'$set': {
                'status': new_status,
                'admin_note': note,
                'reviewed_at': tz.now(),
            }}
        )

        if result.matched_count == 0:
            # Try updating any record for this user (may already be non-pending)
            col.update_one(
                {'user_id': user_id},
                {'$set': {'status': new_status, 'admin_note': note, 'reviewed_at': tz.now()}}
            )

        # Update user approval status
        try:
            from users.models import User
            user_obj = User.objects.get(id=user_id)
            user_obj.is_approved = (action == 'approve')
            user_obj.save(update_fields=['is_approved'])
            try:
                if action == 'approve':
                    send_employer_approved(user_obj.email, user_obj.username)
                else:
                    send_employer_rejected(user_obj.email, user_obj.username, note)
            except Exception:
                pass
        except Exception:
            pass

        return Response({'message': f'Employer {new_status} successfully.', 'status': new_status})


# ── Email Verification OTP ────────────────────────────────────────────────────

class SendVerificationOTPView(APIView):
    """Send a 6-digit OTP to the user's email for verification."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_otp_collection(self):
        from django.db import connections
        db_conn = connections['default']
        db_conn.ensure_connection()
        return db_conn.connection['users_emailverificationotp']

    def post(self, request):
        user = request.user
        if user.email_verified:
            return Response({'message': 'Email already verified.'})

        col = self._get_otp_collection()

        # If a valid email_verification OTP was sent in the last 60 seconds, don't create a new one
        now = timezone.now()
        cutoff = now - timedelta(seconds=60)
        cutoff_naive = cutoff.replace(tzinfo=None)  # MongoDB stores naive datetimes

        recent = col.find_one({
            '$or': [
                {'user_id': user.id,       'otp_type': 'email_verification', 'verified': False},
                {'user_id': str(user.id),  'otp_type': 'email_verification', 'verified': False},
            ],
            'created_at': {'$gte': cutoff_naive}
        })
        if recent:
            # A fresh OTP already exists — just confirm it was sent, don't create another
            return Response({'message': f'OTP sent to {user.email}. Valid for 15 minutes.'})

        otp = generate_otp()
        expires = now + timedelta(minutes=15)

        # Invalidate old unverified email_verification OTPs only
        col.update_many(
            {'$or': [
                {'user_id': user.id,      'otp_type': 'email_verification', 'verified': False},
                {'user_id': str(user.id), 'otp_type': 'email_verification', 'verified': False},
            ]},
            {'$set': {'verified': True}}
        )

        EmailVerificationOTP.objects.create(
            user=user, otp=otp, email=user.email,
            otp_type='email_verification', expires_at=expires
        )
        try:
            send_email_verification_otp(user.email, user.username, otp)
        except Exception:
            pass
        return Response({'message': f'OTP sent to {user.email}. Valid for 15 minutes.'})


class VerifyEmailOTPView(APIView):
    """Verify the OTP entered by the user."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_otp_collection(self):
        from django.db import connections
        db_conn = connections['default']
        db_conn.ensure_connection()
        return db_conn.connection['users_emailverificationotp']

    def post(self, request):
        otp_input = request.data.get('otp', '').strip()
        if not otp_input:
            return Response({'error': 'OTP is required.'}, status=400)

        user = request.user

        # Use raw pymongo to avoid djongo boolean-in-WHERE SQL bug
        col = self._get_otp_collection()

        # Try both int and string user_id — djongo may store either
        # Scope to email_verification OTPs only
        doc = col.find_one(
            {'$or': [
                {'user_id': user.id,      'otp': otp_input, 'otp_type': 'email_verification', 'verified': False},
                {'user_id': str(user.id), 'otp': otp_input, 'otp_type': 'email_verification', 'verified': False},
            ]},
            sort=[('created_at', -1)]
        )
        if not doc:
            return Response({'error': 'Invalid OTP.'}, status=400)

        from datetime import timezone as dt_tz
        expires = doc.get('expires_at')
        if expires:
            # MongoDB stores naive datetimes — make aware for comparison
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=dt_tz.utc)
            if timezone.now() > expires:
                return Response({'error': 'OTP has expired. Please request a new one.'}, status=400)

        col.update_one({'_id': doc['_id']}, {'$set': {'verified': True}})

        # Use raw pymongo to save email_verified — avoids djongo boolean save issues
        from django.db import connections
        db_conn = connections['default']
        db_conn.ensure_connection()
        usr_col = db_conn.connection['users_user']
        usr_col.update_one({'id': user.id}, {'$set': {'email_verified': True}})

        return Response({'message': 'Email verified successfully!', 'email_verified': True})
