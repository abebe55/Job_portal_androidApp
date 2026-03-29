from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Application
from .serializers import ApplicationSerializer, ApplicationStatusSerializer
from jobs.models import Job


class ApplyJobView(generics.CreateAPIView):
    """Job seeker applies to a published job"""
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        job_id = serializer.validated_data.get('job_id')
        try:
            job = Job.objects.get(pk=job_id, status='published')
        except Job.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'job_id': 'This job is not available for applications.'})
        serializer.save(applicant=self.request.user)


class MyApplicationsView(generics.ListAPIView):
    """Job seeker sees all their applications with full status + job info"""
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Application.objects.filter(
            applicant=self.request.user
        ).select_related('job', 'job__posted_by', 'applicant')


class JobApplicationsView(generics.ListAPIView):
    """Employer sees all applicants for their job, with full CV"""
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        job_id = self.kwargs['job_id']
        return Application.objects.filter(
            job_id=job_id,
            job__posted_by=self.request.user
        ).select_related('applicant', 'applicant__cv', 'job')


class UpdateApplicationStatusView(generics.UpdateAPIView):
    """Employer accepts or rejects an applicant, with optional note"""
    serializer_class = ApplicationStatusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Application.objects.filter(job__posted_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save()
