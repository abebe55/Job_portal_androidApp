from django.db import models
from django.conf import settings


class Job(models.Model):
    SKILL_CHOICES = (
        ('entry',  'Entry Level'),
        ('mid',    'Mid Level'),
        ('senior', 'Senior Level'),
    )
    JOB_TYPE_CHOICES = (
        ('fulltime',   'Full Time'),
        ('parttime',   'Part Time'),
        ('contract',   'Contract'),
        ('internship', 'Internship'),
    )

    # ── Workflow status ───────────────────────────────────────────────────────
    # draft        → employer submitted, waiting admin review
    # under_review → admin is reviewing
    # approved     → admin approved, fee set, waiting employer payment
    # payment_pending → employer initiated payment, waiting confirmation
    # published    → payment confirmed, visible to job seekers
    # rejected     → admin rejected
    # closed       → deadline passed or employer closed it
    STATUS_CHOICES = (
        ('draft',           'Draft - Pending Review'),
        ('under_review',    'Under Admin Review'),
        ('approved',        'Approved - Awaiting Payment'),
        ('payment_pending', 'Payment Pending'),
        ('published',       'Published'),
        ('rejected',        'Rejected'),
        ('closed',          'Closed'),
    )

    title          = models.CharField(max_length=200)
    title_am       = models.CharField(max_length=200, blank=True)
    description    = models.TextField()
    description_am = models.TextField(blank=True)
    location       = models.CharField(max_length=100)
    skill_level    = models.CharField(max_length=20, choices=SKILL_CHOICES)
    industry       = models.CharField(max_length=100)
    job_type       = models.CharField(max_length=20, choices=JOB_TYPE_CHOICES, default='fulltime')
    salary         = models.CharField(max_length=50, blank=True)
    deadline       = models.DateField(null=True, blank=True)
    posted_by      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='jobs'
    )
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    # ── Workflow fields ───────────────────────────────────────────────────────
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    admin_note     = models.TextField(blank=True, verbose_name='Admin note to employer')
    posting_fee    = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        verbose_name='Fee set by admin (ETB)'
    )
    fee_paid       = models.BooleanField(default=False)
    fee_tx_ref     = models.CharField(max_length=200, blank=True, verbose_name='Chapa tx_ref for fee')
    reviewed_by    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reviewed_jobs'
    )
    reviewed_at    = models.DateTimeField(null=True, blank=True)
    published_at   = models.DateTimeField(null=True, blank=True)

    # Legacy — kept for compatibility
    is_active      = models.BooleanField(default=True)
    is_approved    = models.BooleanField(default=False)
    approval_note  = models.TextField(blank=True)

    # ── Deadline extension request ────────────────────────────────────────────
    extend_requested    = models.BooleanField(default=False)
    extend_new_deadline = models.DateField(null=True, blank=True)
    extend_fee          = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    extend_fee_tx_ref   = models.CharField(max_length=200, blank=True)
    extend_fee_paid     = models.BooleanField(default=False)
    extend_status       = models.CharField(
        max_length=20,
        choices=(('none','None'),('pending','Pending'),('fee_set','Fee Set'),('paid','Paid'),('approved','Approved'),('rejected','Rejected')),
        default='none'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} [{self.status}]"

    @property
    def is_visible(self):
        """Job is visible to job seekers only when published and before deadline."""
        from django.utils import timezone
        if self.status != 'published':
            return False
        if self.deadline and self.deadline < timezone.now().date():
            return False
        return True

    @property
    def is_expired(self):
        from django.utils import timezone
        return bool(self.deadline and self.deadline < timezone.now().date())

    def auto_close_if_expired(self):
        """Call this to deactivate job when deadline passes."""
        from django.utils import timezone
        if self.status == 'published' and self.deadline and self.deadline < timezone.now().date():
            self.status = 'closed'
            self.is_active = False
            self.save(update_fields=['status', 'is_active'])
