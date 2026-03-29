from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from jobs.models import Job
from .models import Application


class ApplicationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employer = User.objects.create_user(
            username='emp', email='emp@t.com', password='pass1234', role='employer'
        )
        self.seeker = User.objects.create_user(
            username='seek', email='seek@t.com', password='pass1234', role='jobseeker'
        )
        self.job = Job.objects.create(
            title='Backend Dev', description='Django dev', location='Addis Ababa',
            skill_level='mid', industry='Tech', job_type='fulltime', posted_by=self.employer
        )

    def test_apply_to_job(self):
        """TC-16: Job seeker can apply to a job"""
        self.client.force_authenticate(user=self.seeker)
        res = self.client.post(reverse('apply-job'), {'job_id': self.job.pk, 'cover_letter': 'I am interested'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Application.objects.count(), 1)

    def test_apply_duplicate(self):
        """TC-17: Cannot apply to same job twice"""
        self.client.force_authenticate(user=self.seeker)
        self.client.post(reverse('apply-job'), {'job_id': self.job.pk})
        res = self.client.post(reverse('apply-job'), {'job_id': self.job.pk})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_apply_unauthenticated(self):
        """TC-18: Unauthenticated user cannot apply"""
        res = self.client.post(reverse('apply-job'), {'job_id': self.job.pk})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_my_applications(self):
        """TC-19: Job seeker can view their applications"""
        Application.objects.create(job=self.job, applicant=self.seeker)
        self.client.force_authenticate(user=self.seeker)
        res = self.client.get(reverse('my-applications'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_employer_view_applicants(self):
        """TC-20: Employer can view applicants for their job"""
        Application.objects.create(job=self.job, applicant=self.seeker)
        self.client.force_authenticate(user=self.employer)
        res = self.client.get(reverse('job-applications', args=[self.job.pk]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_update_application_status(self):
        """TC-21: Employer can accept/reject an application"""
        app = Application.objects.create(job=self.job, applicant=self.seeker)
        self.client.force_authenticate(user=self.employer)
        res = self.client.patch(reverse('update-status', args=[app.pk]), {'status': 'accepted'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'accepted')

    def test_default_status_is_pending(self):
        """TC-22: New application status defaults to pending"""
        app = Application.objects.create(job=self.job, applicant=self.seeker)
        self.assertEqual(app.status, 'pending')
