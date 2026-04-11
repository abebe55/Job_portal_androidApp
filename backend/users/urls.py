from django.urls import path
from .views import (
    RegisterView, ProfileView,
    AdminUserListView, AdminUserDetailView,
    AdminEmployerVerificationListView, AdminEmployerVerificationDetailView,
    SendVerificationOTPView, VerifyEmailOTPView,
    PasswordResetRequestView, PasswordResetConfirmView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileView.as_view(), name='profile'),
    # Email verification
    path('send-otp/', SendVerificationOTPView.as_view(), name='send-otp'),
    path('verify-otp/', VerifyEmailOTPView.as_view(), name='verify-otp'),
    # Password reset
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    # Admin — users
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    # Admin — employer verifications
    path('admin/employer-verifications/', AdminEmployerVerificationListView.as_view(), name='admin-emp-verif-list'),
    path('admin/employer-verifications/<int:user_id>/', AdminEmployerVerificationDetailView.as_view(), name='admin-emp-verif-detail'),
]
