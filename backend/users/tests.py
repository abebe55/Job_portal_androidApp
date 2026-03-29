"""
users/tests.py — Full coverage of every endpoint in users/urls.py
Endpoints covered:
  POST   /api/auth/register/
  POST   /api/token/
  GET    /api/auth/profile/
  PATCH  /api/auth/profile/
  GET    /api/auth/admin/users/
  GET    /api/auth/admin/users/?role=
  GET    /api/auth/admin/users/<pk>/
  PATCH  /api/auth/admin/users/<pk>/
  DELETE /api/auth/admin/users/<pk>/
  GET    /api/auth/admin/employer-verifications/
  GET    /api/auth/admin/employer-verifications/?status=
  GET    /api/auth/admin/employer-verifications/<pk>/
  PATCH  /api/auth/admin/employer-verifications/<pk>/  (approve / reject / invalid)
  Custom JWT: employer_pending flag
"""
import io
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import User, EmployerVerification


# ── helpers ───────────────────────────────────────────────────────────────────

def make_image(name='test.jpg'):
    img = Image.new('RGB', (100, 100), color=(100, 200, 100))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    buf.seek(0)
    return InMemoryUploadedFile(buf, 'image', name, 'image/jpeg', buf.getbuffer().nbytes, None)


def make_seeker(username='seeker', email=None, **kw):
    return User.objects.create_user(
        username=username,
        email=email or f'{username}@test.com',
        password='pass1234',
        role='jobseeker',
        **kw
    )


def make_employer(username='employer', email=None, approved=True, **kw):
    return User.objects.create_user(
        username=username,
        email=email or f'{username}@test.com',
        password='pass1234',
        role='employer',
        is_approved=approved,
        **kw
    )


def make_admin(username='admin', email=None):
    return User.objects.create_user(
        username=username,
        email=email or f'{username}@test.com',
        password='pass1234',
        role='admin',
        is_staff=True,
    )


# ── Registration ──────────────────────────────────────────────────────────────

class RegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('register')

    def test_jobseeker_registers_successfully(self):
        """TC-U01: Job seeker registers — HTTP 201, role=jobseeker, is_approved=True"""
        res = self.client.post(self.url, {
            'username': 'seeker1', 'email': 'seeker1@test.com',
            'password': 'pass1234', 'role': 'jobseeker',
            'phone': '0911000001', 'location': 'Addis Ababa',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='seeker1')
        self.assertEqual(user.role, 'jobseeker')
        self.assertTrue(user.is_approved)

    def test_duplicate_username_returns_400(self):
        """TC-U02: Duplicate username → 400"""
        make_seeker('dup')
        res = self.client.post(self.url, {
            'username': 'dup', 'email': 'new@test.com',
            'password': 'pass1234', 'role': 'jobseeker',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_email_returns_400(self):
        """TC-U03: Duplicate email → 400"""
        make_seeker('u1', email='dup@test.com')
        res = self.client.post(self.url, {
            'username': 'u2', 'email': 'dup@test.com',
            'password': 'pass1234', 'role': 'jobseeker',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_short_password_returns_400(self):
        """TC-U04: Password < 6 chars → 400"""
        res = self.client.post(self.url, {
            'username': 'shortpw', 'email': 'sp@test.com',
            'password': '123', 'role': 'jobseeker',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employer_without_employer_type_returns_400(self):
        """TC-U05: Employer registration missing employer_type → 400"""
        res = self.client.post(self.url, {
            'username': 'emp_nodocs', 'email': 'emp_nodocs@test.com',
            'password': 'pass1234', 'role': 'employer',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employer_registers_with_id_docs_pending_approval(self):
        """TC-U06: Employer with valid ID docs → 201, is_approved=False, verif status=pending"""
        res = self.client.post(self.url, {
            'username': 'emp_ok', 'email': 'emp_ok@test.com',
            'password': 'pass1234', 'role': 'employer',
            'phone': '0911000002',
            'employer_type': 'individual',
            'organization_name': 'Self',
            'national_id_number': 'ETH-123456',
            'national_id_front': make_image('front.jpg'),
            'national_id_back': make_image('back.jpg'),
        }, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='emp_ok')
        self.assertFalse(user.is_approved)
        verif = EmployerVerification.objects.get(user=user)
        self.assertEqual(verif.status, 'pending')
        self.assertEqual(verif.employer_type, 'individual')

    def test_employer_type_other_requires_description(self):
        """TC-U07: employer_type=other without employer_type_other → 400"""
        res = self.client.post(self.url, {
            'username': 'emp_other', 'email': 'emp_other@test.com',
            'password': 'pass1234', 'role': 'employer',
            'employer_type': 'other',
            # employer_type_other missing
            'national_id_number': 'ETH-999',
            'national_id_front': make_image('f.jpg'),
            'national_id_back': make_image('b.jpg'),
        }, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ── Authentication ────────────────────────────────────────────────────────────

class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.token_url = reverse('token_obtain_pair')
        self.seeker = make_seeker('authseeker', phone='0911000003')
        self.employer_pending = make_employer('emp_pending', approved=False)

    def test_valid_login_returns_jwt_tokens(self):
        """TC-U08: Correct credentials → 200 with access + refresh tokens"""
        res = self.client.post(self.token_url, {
            'username': 'authseeker', 'password': 'pass1234',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)

    def test_wrong_password_returns_401(self):
        """TC-U09: Wrong password → 401"""
        res = self.client.post(self.token_url, {
            'username': 'authseeker', 'password': 'wrongpass',
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_nonexistent_user_returns_401(self):
        """TC-U10: Non-existent username → 401"""
        res = self.client.post(self.token_url, {
            'username': 'nobody', 'password': 'pass1234',
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_pending_employer_login_returns_employer_pending_flag(self):
        """TC-U11: Unapproved employer logs in → employer_pending=True in response"""
        res = self.client.post(self.token_url, {
            'username': 'emp_pending', 'password': 'pass1234',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('employer_pending'))
        self.assertIn('message', res.data)

    def test_approved_user_login_employer_pending_false(self):
        """TC-U12: Approved user logs in → employer_pending=False"""
        res = self.client.post(self.token_url, {
            'username': 'authseeker', 'password': 'pass1234',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data.get('employer_pending'))


# ── Profile ───────────────────────────────────────────────────────────────────

class ProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('profile')
        self.user = make_seeker('profuser', phone='0911000004', location='Addis Ababa')

    def test_profile_requires_authentication(self):
        """TC-U13: GET /profile/ without token → 401"""
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_returns_correct_fields(self):
        """TC-U14: Authenticated GET /profile/ returns username, role, location"""
        self.client.force_authenticate(user=self.user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['username'], 'profuser')
        self.assertEqual(res.data['role'], 'jobseeker')
        self.assertEqual(res.data['location'], 'Addis Ababa')

    def test_profile_patch_updates_fields(self):
        """TC-U15: PATCH /profile/ updates phone, location, bio, preferred_language"""
        self.client.force_authenticate(user=self.user)
        res = self.client.patch(self.url, {
            'phone': '0922000000',
            'location': 'Dire Dawa',
            'bio': 'Django developer',
            'preferred_language': 'am',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone, '0922000000')
        self.assertEqual(self.user.location, 'Dire Dawa')
        self.assertEqual(self.user.preferred_language, 'am')

    def test_profile_cannot_change_username(self):
        """TC-U16: username is read-only — PATCH attempt is silently ignored"""
        self.client.force_authenticate(user=self.user)
        self.client.patch(self.url, {'username': 'hacked'})
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'profuser')


# ── Admin: User Management ────────────────────────────────────────────────────

class AdminUserManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.seeker = make_seeker('s1')
        self.employer = make_employer('e1')

    def test_admin_lists_all_users(self):
        """TC-U17: Admin GET /admin/users/ returns all users"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('admin-user-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 3)  # admin + seeker + employer

    def test_admin_filters_users_by_role(self):
        """TC-U18: GET /admin/users/?role=employer returns only employers"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('admin-user-list'), {'role': 'employer'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['role'], 'employer')

    def test_non_admin_cannot_list_users(self):
        """TC-U19: Non-admin GET /admin/users/ → 403"""
        self.client.force_authenticate(user=self.seeker)
        res = self.client.get(reverse('admin-user-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_gets_user_detail(self):
        """TC-U20: Admin GET /admin/users/<pk>/ returns user detail"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('admin-user-detail', args=[self.seeker.pk]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['username'], 's1')

    def test_admin_can_suspend_user(self):
        """TC-U21: Admin PATCH /admin/users/<pk>/ can set is_suspended=True"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            reverse('admin-user-detail', args=[self.seeker.pk]),
            {'is_suspended': True}, format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.seeker.refresh_from_db()
        self.assertTrue(self.seeker.is_suspended)

    def test_admin_can_delete_user(self):
        """TC-U22: Admin DELETE /admin/users/<pk>/ removes the user"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(reverse('admin-user-detail', args=[self.seeker.pk]))
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=self.seeker.pk).exists())


# ── Admin: Employer Verification ──────────────────────────────────────────────

class AdminEmployerVerificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.employer = make_employer('emp_verif', approved=False)
        self.verif = EmployerVerification.objects.create(
            user=self.employer,
            employer_type='individual',
            national_id_number='ETH-001',
            status='pending',
        )

    def test_admin_lists_all_verifications(self):
        """TC-U23: Admin GET /admin/employer-verifications/ returns all submissions"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('admin-emp-verif-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_admin_filters_verifications_by_status(self):
        """TC-U24: GET /admin/employer-verifications/?status=pending returns only pending"""
        # Create an approved one too
        emp2 = make_employer('emp2_verif', email='emp2v@test.com', approved=True)
        EmployerVerification.objects.create(
            user=emp2, employer_type='company', status='approved'
        )
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('admin-emp-verif-list'), {'status': 'pending'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['status'], 'pending')

    def test_admin_gets_verification_detail(self):
        """TC-U25: Admin GET /admin/employer-verifications/<pk>/ returns full detail"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('admin-emp-verif-detail', args=[self.verif.pk]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['employer_type'], 'individual')
        self.assertEqual(res.data['national_id_number'], 'ETH-001')

    def test_admin_approves_employer_verification(self):
        """TC-U26: Admin PATCH approve → verif.status=approved, user.is_approved=True"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            reverse('admin-emp-verif-detail', args=[self.verif.pk]),
            {'action': 'approve', 'note': 'Docs verified'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.verif.refresh_from_db()
        self.employer.refresh_from_db()
        self.assertEqual(self.verif.status, 'approved')
        self.assertTrue(self.employer.is_approved)
        self.assertEqual(self.verif.admin_note, 'Docs verified')

    def test_admin_rejects_employer_verification(self):
        """TC-U27: Admin PATCH reject → verif.status=rejected, user.is_approved=False"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            reverse('admin-emp-verif-detail', args=[self.verif.pk]),
            {'action': 'reject', 'note': 'Invalid ID'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.verif.refresh_from_db()
        self.employer.refresh_from_db()
        self.assertEqual(self.verif.status, 'rejected')
        self.assertFalse(self.employer.is_approved)

    def test_invalid_action_returns_400(self):
        """TC-U28: PATCH with invalid action value → 400"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            reverse('admin-emp-verif-detail', args=[self.verif.pk]),
            {'action': 'delete'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_admin_cannot_access_verifications(self):
        """TC-U29: Non-admin GET /admin/employer-verifications/ → 403"""
        seeker = make_seeker('s_verif')
        self.client.force_authenticate(user=seeker)
        res = self.client.get(reverse('admin-emp-verif-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
