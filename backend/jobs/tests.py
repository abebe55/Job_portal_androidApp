"""
jobs/tests.py — Full coverage of every endpoint in jobs/urls.py
Endpoints covered:
  GET    /api/jobs/                          (public list, filters: location, industry, skill_level, job_type, search)
  GET    /api/jobs/<pk>/                     (public detail)
  POST   /api/jobs/create/                   (employer, all fields, validation)
  GET    /api/jobs/my-jobs/                  (employer own jobs only)
  PATCH  /api/jobs/<pk>/edit/                (employer edit draft only)
  DELETE /api/jobs/<pk>/delete/              (employer delete own, non-owner blocked)
  POST   /api/jobs/<pk>/confirm-payment/     (publish after payment)
  GET    /api/jobs/admin/all/                (admin list all, filter by status)
  GET    /api/jobs/admin/<pk>/               (admin detail)
  PATCH  /api/jobs/admin/<pk>/review/        (approve+fee, reject, publish, invalid action, approve without fee)
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from wallet.models import Wallet, Transaction
from .models import Job


# ── helpers ───────────────────────────────────────────────────────────────────

def make_employer(username='emp', email=None, approved=True):
    return User.objects.create_user(
        username=username,
        email=email or f'{username}@test.com',
        password='pass1234',
        role='employer',
        is_approved=approved,
    )


def make_seeker(username='seek', email=None):
    return User.objects.create_user(
        username=username,
        email=email or f'{username}@test.com',
        password='pass1234',
        role='jobseeker',
    )


def make_admin(username='admin', email=None):
    return User.objects.create_user(
        username=username,
        email=email or f'{username}@test.com',
        password='pass1234',
        role='admin',
        is_staff=True,
    )


def make_published_job(employer, **kwargs):
    defaults = dict(
        title='Software Engineer',
        description='Build great software for our team',
        location='Addis Ababa',
        skill_level='mid',
        industry='Technology',
        job_type='fulltime',
        salary='15000',
        posted_by=employer,
        status='published',
        is_active=True,
        is_approved=True,
    )
    defaults.update(kwargs)
    return Job.objects.create(**defaults)


def make_draft_job(employer, **kwargs):
    defaults = dict(
        title='Draft Job',
        description='Pending admin review',
        location='Addis Ababa',
        skill_level='entry',
        industry='Finance',
        job_type='fulltime',
        posted_by=employer,
        status='draft',
    )
    defaults.update(kwargs)
    return Job.objects.create(**defaults)


JOB_CREATE_DATA = {
    'title': 'Data Analyst',
    'title_am': 'ዳታ አናሊስት',
    'description': 'Analyze financial data and produce monthly reports',
    'description_am': 'የፋይናንስ ዳታ ይተንትኑ',
    'location': 'Dire Dawa',
    'skill_level': 'entry',
    'industry': 'Finance',
    'job_type': 'parttime',
    'salary': '8000',
    'deadline': '',
}


# ── Public Job List & Search ──────────────────────────────────────────────────

class JobListTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employer = make_employer()
        self.job1 = make_published_job(
            self.employer, title='Django Developer',
            location='Addis Ababa', industry='Technology',
            skill_level='mid', job_type='fulltime',
        )
        self.job2 = make_published_job(
            self.employer, title='Sales Manager',
            location='Dire Dawa', industry='Sales',
            skill_level='senior', job_type='parttime',
        )
        # Draft — must NOT appear in public list
        make_draft_job(self.employer, title='Hidden Draft')

    def test_public_list_returns_only_published(self):
        """TC-J01: Public job list returns only published jobs"""
        res = self.client.get(reverse('job-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)
        titles = [j['title'] for j in res.data]
        self.assertNotIn('Hidden Draft', titles)

    def test_filter_by_location(self):
        """TC-J02: ?location=Dire returns only Dire Dawa jobs"""
        res = self.client.get(reverse('job-list'), {'location': 'Dire'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['title'], 'Sales Manager')

    def test_filter_by_industry(self):
        """TC-J03: ?industry=Technology returns only Technology jobs"""
        res = self.client.get(reverse('job-list'), {'industry': 'Technology'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['industry'], 'Technology')

    def test_filter_by_skill_level(self):
        """TC-J04: ?skill_level=senior returns only senior jobs"""
        res = self.client.get(reverse('job-list'), {'skill_level': 'senior'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['skill_level'], 'senior')

    def test_filter_by_job_type(self):
        """TC-J05: ?job_type=parttime returns only part-time jobs"""
        res = self.client.get(reverse('job-list'), {'job_type': 'parttime'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['job_type'], 'parttime')

    def test_search_by_title_keyword(self):
        """TC-J06: ?search=Django returns jobs matching title"""
        res = self.client.get(reverse('job-list'), {'search': 'Django'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['title'], 'Django Developer')

    def test_filter_no_match_returns_empty(self):
        """TC-J07: Filter with no match returns empty list"""
        res = self.client.get(reverse('job-list'), {'location': 'Hawassa'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 0)

    def test_public_job_detail(self):
        """TC-J08: GET /jobs/<pk>/ returns full job detail"""
        res = self.client.get(reverse('job-detail', args=[self.job1.pk]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['title'], 'Django Developer')
        self.assertEqual(res.data['location'], 'Addis Ababa')
        self.assertEqual(res.data['skill_level'], 'mid')
        self.assertEqual(res.data['salary'], '15000')

    def test_draft_job_detail_not_accessible(self):
        """TC-J09: GET /jobs/<pk>/ for a draft job → 404"""
        draft = make_draft_job(self.employer)
        res = self.client.get(reverse('job-detail', args=[draft.pk]))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


# ── Employer Job CRUD ─────────────────────────────────────────────────────────

class JobCreateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employer = make_employer()
        self.seeker = make_seeker()

    def test_employer_creates_job_with_all_fields(self):
        """TC-J10: Employer POST /jobs/create/ with all fields → 201, status=draft"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.post(reverse('job-create'), JOB_CREATE_DATA)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        job = Job.objects.get(title='Data Analyst')
        self.assertEqual(job.status, 'draft')
        self.assertEqual(job.posted_by, self.employer)
        self.assertEqual(job.location, 'Dire Dawa')
        self.assertEqual(job.skill_level, 'entry')
        self.assertEqual(job.job_type, 'parttime')
        self.assertEqual(job.salary, '8000')

    def test_create_job_unauthenticated_returns_401(self):
        """TC-J11: Unauthenticated POST /jobs/create/ → 401"""
        res = self.client.post(reverse('job-create'), JOB_CREATE_DATA)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_job_missing_title_returns_400(self):
        """TC-J12: Missing required field 'title' → 400"""
        self.client.force_authenticate(user=self.employer)
        data = {**JOB_CREATE_DATA}
        del data['title']
        res = self.client.post(reverse('job-create'), data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_job_missing_description_returns_400(self):
        """TC-J13: Missing required field 'description' → 400"""
        self.client.force_authenticate(user=self.employer)
        data = {**JOB_CREATE_DATA}
        del data['description']
        res = self.client.post(reverse('job-create'), data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_job_with_amharic_fields(self):
        """TC-J14: title_am and description_am are saved correctly"""
        self.client.force_authenticate(user=self.employer)
        self.client.post(reverse('job-create'), JOB_CREATE_DATA)
        job = Job.objects.get(title='Data Analyst')
        self.assertEqual(job.title_am, 'ዳታ አናሊስት')
        self.assertEqual(job.description_am, 'የፋይናንስ ዳታ ይተንትኑ')


class JobUpdateDeleteTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employer = make_employer()
        self.other_employer = make_employer('other_emp', email='other@test.com')
        self.seeker = make_seeker()
        self.draft_job = make_draft_job(self.employer)
        self.published_job = make_published_job(self.employer)

    def test_employer_edits_own_draft_job(self):
        """TC-J15: Employer PATCH /jobs/<pk>/edit/ on own draft → 200, fields updated"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.patch(
            reverse('job-edit', args=[self.draft_job.pk]),
            {'title': 'Updated Title', 'description': 'Updated description text here',
             'location': 'Hawassa', 'skill_level': 'mid',
             'industry': 'NGO', 'job_type': 'contract'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.draft_job.refresh_from_db()
        self.assertEqual(self.draft_job.title, 'Updated Title')
        self.assertEqual(self.draft_job.location, 'Hawassa')

    def test_employer_cannot_edit_published_job(self):
        """TC-J16: Employer cannot edit a published job (only draft allowed) → 404"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.patch(
            reverse('job-edit', args=[self.published_job.pk]),
            {'title': 'Hacked Title', 'description': 'x',
             'location': 'x', 'skill_level': 'entry',
             'industry': 'x', 'job_type': 'fulltime'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_employer_deletes_own_job(self):
        """TC-J17: Employer DELETE /jobs/<pk>/delete/ own job → 204"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.delete(reverse('job-delete', args=[self.draft_job.pk]))
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Job.objects.filter(pk=self.draft_job.pk).exists())

    def test_employer_cannot_delete_other_employers_job(self):
        """TC-J18: Employer cannot delete another employer's job → 404"""
        self.client.force_authenticate(user=self.other_employer)
        res = self.client.delete(reverse('job-delete', args=[self.draft_job.pk]))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_seeker_cannot_delete_job(self):
        """TC-J19: Job seeker cannot delete any job → 404"""
        self.client.force_authenticate(user=self.seeker)
        res = self.client.delete(reverse('job-delete', args=[self.draft_job.pk]))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class MyJobsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employer = make_employer()
        self.other_employer = make_employer('other2', email='other2@test.com')
        make_published_job(self.employer, title='My Job 1')
        make_draft_job(self.employer, title='My Job 2')
        make_published_job(self.other_employer, title='Other Job')

    def test_my_jobs_returns_only_own_jobs(self):
        """TC-J20: GET /jobs/my-jobs/ returns only the authenticated employer's jobs"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.get(reverse('my-jobs'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)
        titles = [j['title'] for j in res.data]
        self.assertIn('My Job 1', titles)
        self.assertIn('My Job 2', titles)
        self.assertNotIn('Other Job', titles)

    def test_my_jobs_includes_all_statuses(self):
        """TC-J21: my-jobs includes draft, published, and all other statuses"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.get(reverse('my-jobs'))
        statuses = [j['status'] for j in res.data]
        self.assertIn('published', statuses)
        self.assertIn('draft', statuses)

    def test_my_jobs_requires_auth(self):
        """TC-J22: GET /jobs/my-jobs/ without auth → 401"""
        res = self.client.get(reverse('my-jobs'))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class JobConfirmPaymentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employer = make_employer()
        self.job = Job.objects.create(
            title='Approved Job',
            description='Ready for payment',
            location='Addis Ababa',
            skill_level='mid',
            industry='Tech',
            job_type='fulltime',
            posted_by=self.employer,
            status='payment_pending',
            posting_fee='100.00',
            fee_tx_ref='TEST-TX-REF-001',
        )
        self.wallet = Wallet.objects.create(user=self.employer)
        Transaction.objects.create(
            wallet=self.wallet,
            tx_type='commission',
            amount='100.00',
            status='pending',
            reference='TEST-TX-REF-001',
        )

    def test_confirm_payment_publishes_job(self):
        """TC-J23: POST /jobs/<pk>/confirm-payment/ → job status=published, fee_paid=True"""
        self.client.force_authenticate(user=self.employer)
        res = self.client.post(
            reverse('job-confirm-payment', args=[self.job.pk]),
            {'tx_ref': 'TEST-TX-REF-001'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, 'published')
        self.assertTrue(self.job.fee_paid)
        self.assertTrue(self.job.is_active)

    def test_confirm_payment_marks_transaction_completed(self):
        """TC-J24: confirm-payment marks the pending transaction as completed"""
        self.client.force_authenticate(user=self.employer)
        self.client.post(
            reverse('job-confirm-payment', args=[self.job.pk]),
            {'tx_ref': 'TEST-TX-REF-001'},
            format='json'
        )
        tx = Transaction.objects.get(reference='TEST-TX-REF-001')
        self.assertEqual(tx.status, 'completed')


# ── Admin Job Management ──────────────────────────────────────────────────────

class AdminJobTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.employer = make_employer()
        self.seeker = make_seeker()
        self.draft_job = make_draft_job(self.employer, title='Draft One')
        self.published_job = make_published_job(self.employer, title='Published One')

    def test_admin_lists_all_jobs(self):
        """TC-J25: Admin GET /jobs/admin/all/ returns all jobs regardless of status"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('admin-job-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)

    def test_admin_filters_jobs_by_status(self):
        """TC-J26: GET /jobs/admin/all/?status=draft returns only draft jobs"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('admin-job-list'), {'status': 'draft'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['status'], 'draft')

    def test_non_admin_cannot_access_admin_job_list(self):
        """TC-J27: Non-admin GET /jobs/admin/all/ → 403"""
        self.client.force_authenticate(user=self.seeker)
        res = self.client.get(reverse('admin-job-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_gets_job_detail(self):
        """TC-J28: Admin GET /jobs/admin/<pk>/ returns full job detail"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('admin-job-detail', args=[self.draft_job.pk]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['title'], 'Draft One')

    def test_admin_approves_job_with_fee(self):
        """TC-J29: Admin PATCH approve with posting_fee → status=approved, fee set"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            reverse('admin-review-job', args=[self.draft_job.pk]),
            {'action': 'approve', 'posting_fee': '75.00', 'note': 'Looks good'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.draft_job.refresh_from_db()
        self.assertEqual(self.draft_job.status, 'approved')
        self.assertEqual(float(self.draft_job.posting_fee), 75.0)
        self.assertEqual(self.draft_job.admin_note, 'Looks good')
        self.assertEqual(self.draft_job.reviewed_by, self.admin)

    def test_admin_approve_without_fee_returns_400(self):
        """TC-J30: Admin approve without posting_fee → 400"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            reverse('admin-review-job', args=[self.draft_job.pk]),
            {'action': 'approve'},  # no posting_fee
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_rejects_job_with_note(self):
        """TC-J31: Admin PATCH reject → status=rejected, note saved"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            reverse('admin-review-job', args=[self.draft_job.pk]),
            {'action': 'reject', 'note': 'Does not meet standards'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.draft_job.refresh_from_db()
        self.assertEqual(self.draft_job.status, 'rejected')
        self.assertEqual(self.draft_job.admin_note, 'Does not meet standards')

    def test_admin_manually_publishes_job(self):
        """TC-J32: Admin PATCH action=publish → status=published, fee_paid=True"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            reverse('admin-review-job', args=[self.draft_job.pk]),
            {'action': 'publish'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.draft_job.refresh_from_db()
        self.assertEqual(self.draft_job.status, 'published')
        self.assertTrue(self.draft_job.fee_paid)
        self.assertTrue(self.draft_job.is_active)

    def test_admin_review_invalid_action_returns_400(self):
        """TC-J33: Admin PATCH with unknown action → 400"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            reverse('admin-review-job', args=[self.draft_job.pk]),
            {'action': 'delete'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class JobModelTests(TestCase):
    def setUp(self):
        self.employer = make_employer()

    def test_is_visible_true_for_published_no_deadline(self):
        """TC-J34: Job.is_visible=True when status=published and no deadline"""
        job = make_published_job(self.employer)
        self.assertTrue(job.is_visible)

    def test_is_visible_false_for_draft(self):
        """TC-J35: Job.is_visible=False when status=draft"""
        job = make_draft_job(self.employer)
        self.assertFalse(job.is_visible)

    def test_is_visible_false_for_past_deadline(self):
        """TC-J36: Job.is_visible=False when deadline has passed"""
        from datetime import date, timedelta
        job = make_published_job(self.employer, deadline=date.today() - timedelta(days=1))
        self.assertFalse(job.is_visible)

    def test_is_visible_true_for_future_deadline(self):
        """TC-J37: Job.is_visible=True when deadline is in the future"""
        from datetime import date, timedelta
        job = make_published_job(self.employer, deadline=date.today() + timedelta(days=30))
        self.assertTrue(job.is_visible)
