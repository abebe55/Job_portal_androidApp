from django.urls import path
from .views import (
    JobListView, JobDetailView,
    JobCreateView, MyJobsView, JobUpdateView, JobDeleteView,
    JobPayFeeView, JobConfirmPaymentView,
    AdminJobListView, AdminJobDetailView, AdminReviewJobView,
)

urlpatterns = [
    # Public
    path('', JobListView.as_view(), name='job-list'),
    path('<int:pk>/', JobDetailView.as_view(), name='job-detail'),

    # Employer
    path('create/', JobCreateView.as_view(), name='job-create'),
    path('my-jobs/', MyJobsView.as_view(), name='my-jobs'),
    path('<int:pk>/edit/', JobUpdateView.as_view(), name='job-edit'),
    path('<int:pk>/delete/', JobDeleteView.as_view(), name='job-delete'),
    path('<int:pk>/pay-fee/', JobPayFeeView.as_view(), name='job-pay-fee'),
    path('<int:pk>/confirm-payment/', JobConfirmPaymentView.as_view(), name='job-confirm-payment'),

    # Admin
    path('admin/all/', AdminJobListView.as_view(), name='admin-job-list'),
    path('admin/<int:pk>/', AdminJobDetailView.as_view(), name='admin-job-detail'),
    path('admin/<int:pk>/review/', AdminReviewJobView.as_view(), name='admin-review-job'),
]
