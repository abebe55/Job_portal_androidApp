from django.urls import path
from .views import (
    RegisterView, ProfileView,
    AdminUserListView, AdminUserDetailView,
    AdminEmployerVerificationListView, AdminEmployerVerificationDetailView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileView.as_view(), name='profile'),
    # Admin — users
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    # Admin — employer verifications
    path('admin/employer-verifications/', AdminEmployerVerificationListView.as_view(), name='admin-emp-verif-list'),
    path('admin/employer-verifications/<int:pk>/', AdminEmployerVerificationDetailView.as_view(), name='admin-emp-verif-detail'),
]
