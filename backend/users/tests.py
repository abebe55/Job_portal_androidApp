from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import User


class UserAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')
        self.token_url = reverse('token_obtain_pair')
        self.profile_url = reverse('profile')

    def test_register_jobseeker(self):
        """TC-01: Register a new job seeker"""
        data = {
            'username': 'testseeker',
            'email': 'seeker@test.com',
            'password': 'pass1234',
            'role': 'jobseeker',
            'phone': '0911000000',
            'location': 'Addis Ababa'
        }
        res = self.client.post(self.register_url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)

    def test_register_employer(self):
        """TC-02: Register a new employer"""
        data = {
            'username': 'testemployer',
            'email': 'employer@test.com',
            'password': 'pass1234',
            'role': 'employer',
        }
        res = self.client.post(self.register_url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_register_duplicate_username(self):
        """TC-03: Duplicate username should fail"""
        User.objects.create_user(username='dup', email='a@a.com', password='pass1234')
        res = self.client.post(self.register_url, {'username': 'dup', 'email': 'b@b.com', 'password': 'pass1234'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_valid(self):
        """TC-04: Login with valid credentials returns JWT tokens"""
        User.objects.create_user(username='loginuser', email='l@l.com', password='pass1234')
        res = self.client.post(self.token_url, {'username': 'loginuser', 'password': 'pass1234'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)

    def test_login_invalid(self):
        """TC-05: Login with wrong password returns 401"""
        User.objects.create_user(username='loginuser2', email='l2@l.com', password='pass1234')
        res = self.client.post(self.token_url, {'username': 'loginuser2', 'password': 'wrongpass'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_requires_auth(self):
        """TC-06: Profile endpoint requires authentication"""
        res = self.client.get(self.profile_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_authenticated(self):
        """TC-07: Authenticated user can view profile"""
        user = User.objects.create_user(username='profuser', email='p@p.com', password='pass1234', role='jobseeker')
        self.client.force_authenticate(user=user)
        res = self.client.get(self.profile_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['username'], 'profuser')
        self.assertEqual(res.data['role'], 'jobseeker')
