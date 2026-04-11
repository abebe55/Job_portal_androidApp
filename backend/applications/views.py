from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import IntegrityError
from .models import Application
from .serializers import ApplicationSerializer, ApplicationStatusSerializer
from jobs.models import Job
from config.email_service import (
    send_application_received, send_employer_new_applicant,
    send_application_accepted, send_application_rejected, send_application_reviewed,
)


class ApplyJobView(generics.CreateAPIView):
    """Job seeker applies to a published job"""
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job_id = serializer.validated_data.get('job_id')
        try:
            job = Job.objects.get(pk=job_id, status='published')
        except Job.DoesNotExist:
            raise ValidationError({'job_id': 'This job is not available for applications.'})
        if Application.objects.filter(job_id=job_id, applicant=request.user).exists():
            raise ValidationError({'detail': 'You have already applied to this job.'})
        application = serializer.save(applicant=request.user)

        # Email to job seeker: application received
        try:
            send_application_received(
                request.user.email, request.user.username,
                job.title, job.posted_by.username
            )
        except Exception:
            pass

        # Email to employer: new applicant
        try:
            send_employer_new_applicant(
                job.posted_by.email, job.posted_by.username,
                job.title, request.user.username
            )
        except Exception:
            pass

        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
        application = serializer.save()
        # Send email to job seeker based on new status
        try:
            applicant = application.applicant
            job_title = application.job.title
            note = application.employer_note or ''
            if application.status == 'accepted':
                send_application_accepted(applicant.email, applicant.username, job_title, note)
            elif application.status == 'rejected':
                send_application_rejected(applicant.email, applicant.username, job_title, note)
            elif application.status == 'reviewed':
                send_application_reviewed(applicant.email, applicant.username, job_title)
        except Exception:
            pass
