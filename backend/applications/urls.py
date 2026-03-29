from django.urls import path
from .views import ApplyJobView, MyApplicationsView, JobApplicationsView, UpdateApplicationStatusView

urlpatterns = [
    path('apply/', ApplyJobView.as_view(), name='apply-job'),
    path('my/', MyApplicationsView.as_view(), name='my-applications'),
    path('job/<int:job_id>/', JobApplicationsView.as_view(), name='job-applications'),
    path('<int:pk>/status/', UpdateApplicationStatusView.as_view(), name='update-status'),
]
