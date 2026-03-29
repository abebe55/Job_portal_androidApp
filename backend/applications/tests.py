from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from jobs.models import Job
from .models import Application


def make_published_job(employer, **kwargs):
    """Helper: create a published job ready for applications."""
    defaults = dict(
        title='Test Job',
        description='Test description for the job',
        location='Addis Ababa',
        skill_level='mid',
        industry='Technology',
        job_type='fulltime',
        salary='12000',
        posted_by=employer,
        status='published',
        is_active=True,
        is_approved=True,
    )
    defaults.update(kwargs)
    return Job.objects.create(**defaults)


class ApplicationSubmissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employer = User.objects.create_user(
            username='emp_app', email='emp_app@test.com',
            password='pass1234', role='employer', is_approved=True
        )
        self.seeker = User.objects.create_user(
            username='seek_app', email='seek_app@test.com',
            password='pass1234', role='jobseeker'
        )
        self.seeker2 = User.objects.create_user(
            username='seek_app2', email='seek_app2@test.com',
            password='pass1234', role='jobseeker'
        )
        self.job = make_published_job(self.employer)

    def test_jobseeker_can_apply_with_cover_letter(self):
        """TC-A01: Job seeker applies to a published job with cover letter"""
        self.client.force_authenticate(user=self.seeker)
        res = self.client.post(reverse('apply-job'), {
            'job_id': self.job.pk,
            'cover_letter': 'I am very interested in this position.',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Application.objects.count(), 1)
        app = Application.objects.first()
        self.assertEqual(app.applicant, self.seeker)
        self.assertEqual(app.job, self.job)
        self.assertEqual(app.cover_letter, 'I am very interested in this position.')

    def test_jobseeker_can_apply_without_cover_letter(self):
        """TC-A02: Cover letter is optional — application still succeeds"""
        self.client.force_authenticate(user=self.seeker)
        res = self.client.post(reverse('apply-job'), {
            'job_id': self.job.pk,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_new_application_status_is_pending(self):
        """TC-A03: Newly submitted application defaults to 'pending' status"""
        self.client.force_authenticate(user=self.seeker)
        self.client.post(reverse('apply-job'), {'job_id': self.job.pk})
        app = Application.objects.get(applicant=self.seeker, job=self.job)
        self.assertEqual(app.status, 'pending')

    def test_duplicate_application_returns_400(self):
        """TC-A04: Applying to the same job twice returns 400"""
        self.client.force_authenticate(user=self.seeker)
        self.client.post(reverse('apply-job'), {'job_id': self.job.pk})
        res = self.client.post(reverse('apply-job'), {'job_id': self.job.pk})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Application.objects.count(), 1)

    def test_unauthenticated_user_cannot_apply(self):
        """TC-A05: Unauthenticated request to apply returns 401"""
        res = self.client.post(reverse('apply-job'), {'job_id': self.job.pk})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_apply_to_draft_job(self):
        """TC-A06: Applying to a non-published (draft) job returns 400"""
        draft_job = Job.objects.create(
            title='Draft Job', description='Not published yet',
            location='Addis Ababa', skill_level='entry',
            industry='Finance', job_type='fulltime',
            posted_by=self.employer, status='draft',
        )
        self.client.force_authenticate(user=self.seeker)
        res = self.client.post(reverse('apply-job'), {'job_id': draft_job.pk})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_multiple_seekers_can_apply_to_same_job(self):
        """TC-A07: Different job seekers can all apply to the same job"""
        self.client.force_authenticate(user=self.seeker)
        self.client.post(reverse('apply-job'), {'job_id': self.job.pk})
        self.client.force_authenticate(user=self.seeker2)
        res = self.client.post(reverse('apply-job'), {'job_id': self.job.pk})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Application.objects.count(), 2)


class MyApplicationsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employer = User.objects.create_user(
            username='emp_myapp', email='emp_myapp@test.com',
            password='pass1234', role='employer', is_approved=True
        )
        self.seeker = User.objects.create_user(
            username='seek_myapp', email='seek_myapp@test.com',
            password='pass1234', role='jobseeker'
        )
        self.job1 = make_published_job(self.employer, title='Job One')
        self.job2 = make_published_job(self.employer, title='Job Two')
        Application.objects.create(job=self.job1, applicant=self.seeker, cover_letter='First')
        Application.objects.create(job=self.job2, applicant=self.seeker, cover_letter='Second')

    def test_seeker_sees_only_own_applications(self):
        """TC-A08: Job seeker's my-applications returns only their own applications"""
        other_seeker = User.objects.create_user(
            username='other_seek', email='other@test.com',
            password='pass1234', role='jobseeker'
        )
        # other_seeker applies to job2 (seeker already applied to job1 and job2 in setUp)
        job3 = make_published_job(self.employer, title='Job Three')
        Application.objects.create(job=job3, applicant=other_seeker)
        self.client.force_authenticate(user=self.seeker)
        res = self.client.get(reverse('my-applications'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)

    def test_my_applications_includes_job_details(self):
        """TC-A09: Each application in my-applications includes full job info"""
        self.client.force_authenticate(user=self.seeker)
        res = self.client.get(reverse('my-applications'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        titles = [a['job']['title'] for a in res.data]
        self.assertIn('Job One', titles)
        self.assertIn('Job Two', titles)

    def test_my_applications_requires_auth(self):
        """TC-A10: my-applications returns 401 without authentication"""
        res = self.client.get(reverse('my-applications'))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class EmployerApplicantManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employer = User.objects.create_user(
            username='emp_mgmt', email='emp_mgmt@test.com',
            password='pass1234', role='employer', is_approved=True
        )
        self.other_employer = User.objects.create_user(
            username='emp_other', email='emp_other@test.com',
            password='pass1234', role='employer', is_approved=True
        )
        self.seeker = User.objects.create_user(
            username='seek_mgmt', email='seek_mgmt@test.com',
            password='pass1234', role='jobseeker'
        )
        self.job = make_published_job(self.employer)
        self.application = Application.objects.create(
            job=self.job, applicant=self.seeker,
            cover_letter='Please consider me.'
        )

    def test_employer_views_applicants_for_own_job(self):
        """TC-A11: Employer can view all applicants for their own job"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.get(reverse('job-applications', args=[self.job.pk]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['applicant']['username'], 'seek_mgmt')

    def test_employer_cannot_view_applicants_for_other_job(self):
        """TC-A12: Employer cannot view applicants for another employer's job"""
        self.client.force_authenticate(user=self.other_employer)
        res = self.client.get(reverse('job-applications', args=[self.job.pk]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Returns empty — filtered by job__posted_by=request.user
        self.assertEqual(len(res.data), 0)

    def test_employer_accepts_applicant(self):
        """TC-A13: Employer can accept an applicant — status changes to 'accepted'"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.patch(
            reverse('update-status', args=[self.application.pk]),
            {'status': 'accepted', 'employer_note': 'Great profile!'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, 'accepted')
        self.assertEqual(self.application.employer_note, 'Great profile!')

    def test_employer_rejects_applicant(self):
        """TC-A14: Employer can reject an applicant — status changes to 'rejected'"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.patch(
            reverse('update-status', args=[self.application.pk]),
            {'status': 'rejected', 'employer_note': 'Not enough experience.'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, 'rejected')

    def test_employer_marks_applicant_as_reviewed(self):
        """TC-A15: Employer can mark application as reviewed"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.patch(
            reverse('update-status', args=[self.application.pk]),
            {'status': 'reviewed'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, 'reviewed')

    def test_invalid_status_value_returns_400(self):
        """TC-A16: Setting an invalid status value returns 400"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.patch(
            reverse('update-status', args=[self.application.pk]),
            {'status': 'hired'},  # not a valid choice
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class ApplicationResponseTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employer = User.objects.create_user(
            username='emp_resp', email='emp_resp@test.com',
            password='pass1234', role='employer', is_approved=True
        )
        self.seeker = User.objects.create_user(
            username='seek_resp', email='seek_resp@test.com',
            password='pass1234', role='jobseeker'
        )
        self.job = make_published_job(self.employer)
        self.application = Application.objects.create(
            job=self.job, applicant=self.seeker,
            cover_letter='Test cover letter'
        )

    def test_applicant_cv_included_in_employer_view(self):
        """TC-A17: Employer viewing applicants gets applicant_cv field in response"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.get(reverse('job-applications', args=[self.job.pk]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        # applicant_cv key must be present (may be null if no CV yet)
        self.assertIn('applicant_cv', res.data[0])

    def test_application_response_includes_applied_at(self):
        """TC-A18: Application response includes applied_at timestamp"""
        self.client.force_authenticate(user=self.seeker)
        res = self.client.get(reverse('my-applications'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('applied_at', res.data[0])

    def test_application_unique_together_constraint(self):
        """TC-A19: unique_together on (job, applicant) prevents DB-level duplicates"""
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            Application.objects.create(job=self.job, applicant=self.seeker)
