from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from .models import CV


class CVTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='cvuser', email='cv@test.com', password='pass1234', role='jobseeker'
        )
        self.client.force_authenticate(user=self.user)

    def test_get_cv_creates_if_not_exists(self):
        """TC-23: GET /cvs/ auto-creates a blank CV for the user"""
        res = self.client.get(reverse('cv'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(CV.objects.count(), 1)

    def test_update_cv(self):
        """TC-24: User can update their CV"""
        self.client.get(reverse('cv'))  # create it first
        res = self.client.patch(reverse('cv'), {
            'full_name': 'Abebe Kebede',
            'email': 'abebe@test.com',
            'phone': '0911111111',
            'skills': 'Python, Django, React Native',
            'education': 'BSc Computer Science, AAU',
            'experience': '2 years Django developer',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['full_name'], 'Abebe Kebede')

    def test_cv_requires_auth(self):
        """TC-25: CV endpoint requires authentication"""
        self.client.force_authenticate(user=None)
        res = self.client.get(reverse('cv'))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_one_cv_per_user(self):
        """TC-26: Each user has only one CV (OneToOne)"""
        self.client.get(reverse('cv'))
        self.client.get(reverse('cv'))  # call twice
        self.assertEqual(CV.objects.filter(user=self.user).count(), 1)
