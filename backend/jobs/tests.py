from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from .models import Job


class JobTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employer = User.objects.create_user(
            username='employer1', email='emp@test.com', password='pass1234', role='employer'
        )
        self.seeker = User.objects.create_user(
            username='seeker1', email='seek@test.com', password='pass1234', role='jobseeker'
        )
        self.job = Job.objects.create(
            title='Software Engineer',
            description='Build great software',
            location='Addis Ababa',
            skill_level='mid',
            industry='Technology',
            job_type='fulltime',
            posted_by=self.employer
        )

    def test_list_jobs_public(self):
        """TC-08: Anyone can list active jobs"""
        res = self.client.get(reverse('job-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_search_jobs_by_location(self):
        """TC-09: Filter jobs by location"""
        res = self.client.get(reverse('job-list'), {'location': 'Addis'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_search_jobs_no_match(self):
        """TC-10: Search with no match returns empty list"""
        res = self.client.get(reverse('job-list'), {'location': 'Hawassa'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 0)

    def test_create_job_employer(self):
        """TC-11: Employer can post a job"""
        self.client.force_authenticate(user=self.employer)
        data = {
            'title': 'Data Analyst',
            'description': 'Analyze data',
            'location': 'Dire Dawa',
            'skill_level': 'entry',
            'industry': 'Finance',
            'job_type': 'parttime',
        }
        res = self.client.post(reverse('job-create'), data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Job.objects.count(), 2)

    def test_create_job_unauthenticated(self):
        """TC-12: Unauthenticated user cannot post a job"""
        res = self.client.post(reverse('job-create'), {'title': 'Test'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_job_detail(self):
        """TC-13: Anyone can view job detail"""
        res = self.client.get(reverse('job-detail', args=[self.job.pk]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['title'], 'Software Engineer')

    def test_delete_job_owner(self):
        """TC-14: Employer can delete their own job"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.delete(reverse('job-detail', args=[self.job.pk]))
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_job_non_owner(self):
        """TC-15: Non-owner cannot delete a job"""
        self.client.force_authenticate(user=self.seeker)
        res = self.client.delete(reverse('job-detail', args=[self.job.pk]))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
