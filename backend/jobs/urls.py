from django.urls import path
from .views import (
    JobListView, JobDetailView,
    JobCreateView, MyJobsView, JobUpdateView, JobDeleteView,
    JobPayFeeView, JobPaymentReturnView, JobConfirmPaymentView,
    AdminJobListView, AdminJobDetailView, AdminReviewJobView,
    AutoCloseExpiredView, ExpiredJobsView,
    AdminDeleteJobView, AdminBulkDeleteJobsView,
    RequestDeadlineExtendView, AdminReviewExtendView,
    PayExtendFeeView, ExtendPaymentReturnView, ConfirmExtendPaymentView,
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
    path('<int:pk>/payment-return/', JobPaymentReturnView.as_view(), name='job-payment-return'),
    path('<int:pk>/confirm-payment/', JobConfirmPaymentView.as_view(), name='job-confirm-payment'),
    path('<int:pk>/request-extend/', RequestDeadlineExtendView.as_view(), name='job-request-extend'),
    path('<int:pk>/pay-extend/', PayExtendFeeView.as_view(), name='job-pay-extend'),
    path('<int:pk>/extend-payment-return/', ExtendPaymentReturnView.as_view(), name='job-extend-payment-return'),
    path('<int:pk>/confirm-extend/', ConfirmExtendPaymentView.as_view(), name='job-confirm-extend'),

    # Admin
    path('admin/all/', AdminJobListView.as_view(), name='admin-job-list'),
    path('admin/expired/', ExpiredJobsView.as_view(), name='admin-expired-jobs'),
    path('admin/auto-close/', AutoCloseExpiredView.as_view(), name='admin-auto-close'),
    path('admin/bulk-delete/', AdminBulkDeleteJobsView.as_view(), name='admin-bulk-delete'),
    path('admin/<int:pk>/', AdminJobDetailView.as_view(), name='admin-job-detail'),
    path('admin/<int:pk>/review/', AdminReviewJobView.as_view(), name='admin-review-job'),
    path('admin/<int:pk>/delete/', AdminDeleteJobView.as_view(), name='admin-delete-job'),
    path('admin/<int:pk>/review-extend/', AdminReviewExtendView.as_view(), name='admin-review-extend'),
]
