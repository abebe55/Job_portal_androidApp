"""
users/views.py — JobPortal authentication views (fixed architecture)

Registration flow:
  POST /auth/register/
    1. Validate input
    2. Create user
    3. Generate + store + send 6-digit OTP
    4. Return 201 { user, requires_email_verification: true }
  Frontend navigates to /verify-email?email=... (no auto-login)

Verification (AllowAny — identified by email, not JWT):
  POST /auth/send-otp/    body: { email }
  POST /auth/verify-otp/  body: { email, otp }
  On success → frontend calls /api/token/ to log in

Password reset (fixed to use send_password_reset_otp):
  POST /auth/password-reset/request/
  POST /auth/password-reset/confirm/

Login:
  POST /api/token/ — blocks unverified emails with clear error
"""

from rest_framework import generics, permissions, status, parsers, serializers as drf_serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger('users')

from .models import User, EmployerVerification, EmailVerificationOTP, generate_otp
from .serializers import RegisterSerializer, UserSerializer, EmployerVerificationDetailSerializer
from config.email_service import (
    send_email_verification_otp,
    send_password_reset_otp,
    send_welcome_email,
    send_employer_approved,
    send_employer_rejected,
)


# ── DB helper ─────────────────────────────────────────────────────────────────

def _get_db():
    """Return a stable MongoDB connection, retrying on cold-start failure."""
    import time
    from django.db import connections
    for attempt in range(3):
        try:
            db = connections['default']
            if db.connection is None:
                db.ensure_connection()
            return db
        except Exception:
            connections['default'].close()
            time.sleep(0.6 * (attempt + 1))
    db = connections['default']
    db.ensure_connection()
    return db


# ── Registration ──────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset           = User.objects.all()
    serializer_class   = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    parser_classes     = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def create(self, request, *args, **kwargs):
        logger.debug('[RegisterView] incoming data keys: %s', list(request.data.keys()))
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
        except Exception as exc:
            logger.error('[RegisterView] validation error: %s', exc)
            raise

        try:
            user = serializer.save()
            logger.debug('[RegisterView] user created: id=%s username=%s', user.id, user.username)
        except Exception as exc:
            logger.error('[RegisterView] serializer.save() failed: %s', exc, exc_info=True)
            raise

        # Generate + store verification OTP immediately after user creation
        otp     = generate_otp()
        expires = timezone.now() + timedelta(minutes=15)
        try:
            EmailVerificationOTP.objects.create(
                user=user, otp=otp, email=user.email,
                otp_type='email_verification', expires_at=expires,
            )
            logger.debug('[RegisterView] OTP created for %s', user.email)
        except Exception as exc:
            logger.error('[RegisterView] OTP create failed: %s', exc, exc_info=True)
            # Don't fail registration — OTP can be re-requested

        # Send OTP — welcome email is sent after successful verification
        try:
            sent = send_email_verification_otp(user.email, user.username, otp)
            logger.debug('[RegisterView] OTP email sent=%s to %s', sent, user.email)
        except Exception as exc:
            logger.error('[RegisterView] OTP email exception: %s', exc, exc_info=True)

        return Response(
            {
                'message': 'Account created. Please check your email for the verification code.',
                'user': {
                    'id':       user.id,
                    'username': user.username,
                    'email':    user.email,
                    'role':     user.role,
                },
                'requires_email_verification': True,
            },
            status=status.HTTP_201_CREATED,
        )


# ── Email verification (AllowAny) ─────────────────────────────────────────────

class SendVerificationOTPView(APIView):
    """POST /api/auth/send-otp/  body: { email }"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        # Backwards compat: authenticated user may omit email
        if not email and request.user and request.user.is_authenticated:
            email = request.user.email
        if not email:
            return Response({'error': 'Email is required.'}, status=400)

        try:
            db      = _get_db()
            usr_col = db.connection['users_user']
            otp_col = db.connection['users_emailverificationotp']
        except Exception:
            return Response({'error': 'Database unavailable. Please try again.'}, status=503)

        user_doc = usr_col.find_one({'email': email})
        if not user_doc:
            return Response({'message': f'If {email} is registered, a code has been sent.'})

        if user_doc.get('email_verified'):
            return Response({'message': 'Email is already verified.'})

        # 60-second cooldown
        now    = timezone.now()
        cutoff = (now - timedelta(seconds=60)).replace(tzinfo=None)
        recent = otp_col.find_one({
            '$or': [
                {'user_id': user_doc['id'],       'otp_type': 'email_verification', 'verified': False},
                {'user_id': str(user_doc['id']),  'otp_type': 'email_verification', 'verified': False},
            ],
            'created_at': {'$gte': cutoff},
        })
        if recent:
            return Response({'message': f'A code was already sent to {email}. Please wait 60 seconds.'})

        # Invalidate old OTPs
        otp_col.update_many(
            {'$or': [
                {'user_id': user_doc['id'],      'otp_type': 'email_verification', 'verified': False},
                {'user_id': str(user_doc['id']), 'otp_type': 'email_verification', 'verified': False},
            ]},
            {'$set': {'verified': True}},
        )

        otp     = generate_otp()
        expires = now + timedelta(minutes=15)
        try:
            user_obj = User.objects.get(id=user_doc['id'])
            EmailVerificationOTP.objects.create(
                user=user_obj, otp=otp, email=email,
                otp_type='email_verification', expires_at=expires,
            )
        except Exception:
            otp_col.insert_one({
                'user_id': user_doc['id'], 'otp': otp, 'email': email,
                'otp_type': 'email_verification', 'verified': False,
                'created_at': now, 'expires_at': expires,
            })

        sent = send_email_verification_otp(email, user_doc.get('username', ''), otp)
        if not sent:
            return Response(
                {'error': 'Unable to send verification email. Please try again.'}, status=503)

        return Response({'message': f'Verification code sent to {email}. Valid for 15 minutes.'})


class VerifyEmailOTPView(APIView):
    """POST /api/auth/verify-otp/  body: { email, otp }"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email     = (request.data.get('email') or '').strip().lower()
        otp_input = (request.data.get('otp')   or '').strip()

        if not email and request.user and request.user.is_authenticated:
            email = request.user.email
        if not email:
            return Response({'error': 'Email is required.'}, status=400)
        if len(otp_input) != 6:
            return Response({'error': 'Please enter the 6-digit code.'}, status=400)

        try:
            db      = _get_db()
            usr_col = db.connection['users_user']
            otp_col = db.connection['users_emailverificationotp']
        except Exception:
            return Response({'error': 'Database unavailable. Please try again.'}, status=503)

        user_doc = usr_col.find_one({'email': email})
        if not user_doc:
            return Response({'error': 'Invalid code.'}, status=400)

        otp_doc = otp_col.find_one(
            {'$or': [
                {'user_id': user_doc['id'],      'otp': otp_input,
                 'otp_type': 'email_verification', 'verified': False},
                {'user_id': str(user_doc['id']), 'otp': otp_input,
                 'otp_type': 'email_verification', 'verified': False},
            ]},
            sort=[('created_at', -1)],
        )
        if not otp_doc:
            return Response({'error': 'Invalid code.'}, status=400)

        from datetime import timezone as dt_tz
        expires = otp_doc.get('expires_at')
        if expires:
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=dt_tz.utc)
            if timezone.now() > expires:
                return Response(
                    {'error': 'Code has expired. Please request a new one.'}, status=400)

        otp_col.update_one({'_id': otp_doc['_id']}, {'$set': {'verified': True}})
        usr_col.update_one({'_id': user_doc['_id']}, {'$set': {'email_verified': True}})

        # Send welcome email now that email is confirmed
        try:
            send_welcome_email(
                email,
                user_doc.get('username', ''),
                user_doc.get('role', 'jobseeker'),
            )
        except Exception:
            pass

        return Response({
            'message':        'Email verified successfully! You can now log in.',
            'email_verified': True,
            'email':          email,
        })


# ── Password reset ────────────────────────────────────────────────────────────

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'error': 'Email is required.'}, status=400)

        try:
            db      = _get_db()
            usr_col = db.connection['users_user']
            otp_col = db.connection['users_emailverificationotp']
        except Exception:
            return Response({'error': 'Database unavailable. Please try again.'}, status=503)

        user_doc = usr_col.find_one({'email': email})
        if not user_doc:
            return Response({'message': 'If that email is registered, an OTP has been sent.'})

        otp     = generate_otp()
        expires = timezone.now() + timedelta(minutes=15)

        otp_col.update_many(
            {'$or': [
                {'user_id': user_doc['id'],      'otp_type': 'password_reset', 'verified': False},
                {'user_id': str(user_doc['id']), 'otp_type': 'password_reset', 'verified': False},
            ]},
            {'$set': {'verified': True}},
        )

        try:
            user_obj = User.objects.get(id=user_doc['id'])
            EmailVerificationOTP.objects.create(
                user=user_obj, otp=otp, email=email,
                otp_type='password_reset', expires_at=expires,
            )
        except Exception:
            otp_col.insert_one({
                'user_id': user_doc['id'], 'otp': otp, 'email': email,
                'otp_type': 'password_reset', 'verified': False,
                'created_at': timezone.now(), 'expires_at': expires,
            })

        # ✅ Use password-reset template (was wrongly calling email_verification)
        sent = send_password_reset_otp(email, user_doc.get('username', ''), otp)
        if not sent:
            return Response(
                {'error': 'Unable to send reset email. Please try again.'}, status=503)

        return Response({'message': 'If that email is registered, an OTP has been sent.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email        = (request.data.get('email')        or '').strip().lower()
        otp_input    = (request.data.get('otp')          or '').strip()
        new_password = (request.data.get('new_password') or '').strip()

        if not email or not otp_input or not new_password:
            return Response(
                {'error': 'Email, OTP, and new password are required.'}, status=400)
        if len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters.'}, status=400)

        from django.contrib.auth.hashers import make_password
        from datetime import timezone as dt_tz

        try:
            db      = _get_db()
            usr_col = db.connection['users_user']
            otp_col = db.connection['users_emailverificationotp']
        except Exception:
            return Response({'error': 'Database unavailable. Please try again.'}, status=503)

        user_doc = usr_col.find_one({'email': email})
        if not user_doc:
            return Response({'error': 'Invalid OTP.'}, status=400)

        otp_doc = otp_col.find_one(
            {'$or': [
                {'user_id': user_doc['id'],      'otp': otp_input,
                 'otp_type': 'password_reset', 'verified': False},
                {'user_id': str(user_doc['id']), 'otp': otp_input,
                 'otp_type': 'password_reset', 'verified': False},
            ]},
            sort=[('created_at', -1)],
        )
        if not otp_doc:
            return Response({'error': 'Invalid or expired OTP.'}, status=400)

        expires = otp_doc.get('expires_at')
        if expires:
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=dt_tz.utc)
            if timezone.now() > expires:
                return Response(
                    {'error': 'OTP has expired. Please request a new one.'}, status=400)

        otp_col.update_one({'_id': otp_doc['_id']}, {'$set': {'verified': True}})
        usr_col.update_one(
            {'_id': user_doc['_id']},
            {'$set': {'password': make_password(new_password)}},
        )
        return Response({'message': 'Password reset successfully. You can now log in.'})


# ── Login — blocks unverified users ──────────────────────────────────────────

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or getattr(request.user, 'role', '') == 'admin'
        )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        # ✅ Block login for unverified email
        if not user.email_verified:
            raise drf_serializers.ValidationError(
                'Please verify your email address before logging in. '
                'Check your inbox for the verification code.'
            )

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


# ── Profile ───────────────────────────────────────────────────────────────────

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class   = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        try:
            db  = _get_db()
            col = db.connection['users_user']
            doc = col.find_one({'id': request.user.id})
        except Exception:
            return super().retrieve(request, *args, **kwargs)

        if not doc:
            return super().retrieve(request, *args, **kwargs)

        BASE      = request.build_absolute_uri('/')[:-1]
        photo     = doc.get('profile_photo', '')
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


# ── Admin — user management ───────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    serializer_class   = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs   = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = UserSerializer
    permission_classes = [IsAdmin]
    queryset           = User.objects.all()

    def partial_update(self, request, *args, **kwargs):
        pk      = kwargs.get('pk')
        allowed = [
            'username', 'email', 'phone', 'location', 'bio', 'role',
            'is_approved', 'is_suspended', 'is_active', 'preferred_language',
        ]
        update = {k: v for k, v in request.data.items() if k in allowed}
        if not update:
            return Response({'detail': 'No valid fields to update.'}, status=400)
        db  = _get_db()
        col = db.connection['users_user']
        col.update_one({'id': int(pk)}, {'$set': update})
        doc = col.find_one({'id': int(pk)})
        return Response({
            'id':           doc.get('id'),
            'username':     doc.get('username', ''),
            'email':        doc.get('email', ''),
            'role':         doc.get('role', ''),
            'phone':        doc.get('phone', ''),
            'location':     doc.get('location', ''),
            'bio':          doc.get('bio', ''),
            'is_approved':  bool(doc.get('is_approved', False)),
            'is_suspended': bool(doc.get('is_suspended', False)),
        })


# ── Admin — employer verification ─────────────────────────────────────────────

class AdminEmployerVerificationListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        db      = _get_db()
        ev_col  = db.connection['users_employerverification']
        usr_col = db.connection['users_user']

        status_filter = request.query_params.get('status')
        query = {}
        if status_filter:
            query['status'] = status_filter

        all_docs    = list(ev_col.find(query).sort('submitted_at', -1))
        seen, unique = set(), []
        for doc in all_docs:
            uid = doc.get('user_id')
            if uid not in seen:
                seen.add(uid)
                unique.append(doc)

        user_ids = [d['user_id'] for d in unique]
        users    = {u['id']: u for u in usr_col.find({'id': {'$in': user_ids}})}
        BASE     = request.build_absolute_uri('/')[:-1]

        def file_url(path):
            if not path:
                return None
            return path if path.startswith('http') else f"{BASE}/media/{path}"

        results = []
        for doc in unique:
            uid = doc.get('user_id')
            u   = users.get(uid, {})
            results.append({
                'user_id':             uid,
                'id':                  uid,
                'pk':                  uid,
                'username':            u.get('username', ''),
                'email':               u.get('email', ''),
                'phone':               u.get('phone', ''),
                'location':            u.get('location', ''),
                'is_approved':         u.get('is_approved', False),
                'employer_type':       doc.get('employer_type', ''),
                'employer_type_other': doc.get('employer_type_other', ''),
                'organization_name':   doc.get('organization_name', ''),
                'national_id_number':  doc.get('national_id_number', ''),
                'status':              doc.get('status', 'pending'),
                'admin_note':          doc.get('admin_note', ''),
                'submitted_at': doc['submitted_at'].isoformat() if doc.get('submitted_at') else None,
                'reviewed_at':  doc['reviewed_at'].isoformat()  if doc.get('reviewed_at')  else None,
                'business_license':  file_url(doc.get('business_license')),
                'tin_certificate':   file_url(doc.get('tin_certificate')),
                'registration_cert': file_url(doc.get('registration_cert')),
                'national_id_front': file_url(doc.get('national_id_front')),
                'national_id_back':  file_url(doc.get('national_id_back')),
                'supporting_doc':    file_url(doc.get('supporting_doc')),
            })
        return Response(results)


class AdminEmployerVerificationDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, user_id):
        v = EmployerVerification.objects.select_related('user').filter(
            user__id=user_id).last()
        if not v:
            return Response({'detail': 'Not found.'}, status=404)
        return Response(
            EmployerVerificationDetailSerializer(v, context={'request': request}).data)

    def patch(self, request, user_id):
        action = request.data.get('action')
        note   = request.data.get('note', '')
        if action not in ('approve', 'reject'):
            return Response({'detail': 'action must be "approve" or "reject".'}, status=400)

        db         = _get_db()
        col        = db.connection['users_employerverification']
        new_status = 'approved' if action == 'approve' else 'rejected'

        result = col.update_one(
            {'user_id': user_id, 'status': 'pending'},
            {'$set': {'status': new_status, 'admin_note': note, 'reviewed_at': timezone.now()}},
        )
        if result.matched_count == 0:
            col.update_one(
                {'user_id': user_id},
                {'$set': {'status': new_status, 'admin_note': note, 'reviewed_at': timezone.now()}},
            )

        try:
            user_obj             = User.objects.get(id=user_id)
            user_obj.is_approved = (action == 'approve')
            user_obj.save(update_fields=['is_approved'])
            if action == 'approve':
                send_employer_approved(user_obj.email, user_obj.username)
            else:
                send_employer_rejected(user_obj.email, user_obj.username, note)
        except Exception:
            pass

        return Response({
            'message': f'Employer {new_status} successfully.',
            'status':  new_status,
        })
