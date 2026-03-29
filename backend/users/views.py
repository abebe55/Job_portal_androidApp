from rest_framework import generics, permissions, status, parsers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from .models import User, EmployerVerification
from .serializers import RegisterSerializer, UserSerializer, EmployerVerificationDetailSerializer


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


# ── Profile ──────────────────────────────────────────────────────────────────

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


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


# ── Admin: employer verification ─────────────────────────────────────────────

class AdminEmployerVerificationListView(generics.ListAPIView):
    """List all employer verification submissions, filterable by status."""
    serializer_class = EmployerVerificationDetailSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = EmployerVerification.objects.select_related('user').order_by('-submitted_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class AdminEmployerVerificationDetailView(APIView):
    """Approve or reject a single employer verification."""
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        try:
            v = EmployerVerification.objects.select_related('user').get(pk=pk)
        except EmployerVerification.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        return Response(EmployerVerificationDetailSerializer(v, context={'request': request}).data)

    def patch(self, request, pk):
        try:
            v = EmployerVerification.objects.select_related('user').get(pk=pk)
        except EmployerVerification.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        action = request.data.get('action')  # 'approve' or 'reject'
        note   = request.data.get('note', '')

        if action not in ('approve', 'reject'):
            return Response({'detail': 'action must be "approve" or "reject".'}, status=400)

        v.admin_note  = note
        v.reviewed_at = timezone.now()

        if action == 'approve':
            v.status = 'approved'
            v.user.is_approved = True
            v.user.save(update_fields=['is_approved'])
        else:
            v.status = 'rejected'
            v.user.is_approved = False
            v.user.save(update_fields=['is_approved'])

        v.save()
        return Response(EmployerVerificationDetailSerializer(v, context={'request': request}).data)
