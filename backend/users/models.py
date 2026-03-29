from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('jobseeker', 'Job Seeker'),
        ('employer', 'Employer'),
        ('admin', 'Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='jobseeker')
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    profile_photo = models.ImageField(upload_to='profiles/', blank=True, null=True)
    preferred_language = models.CharField(max_length=10, default='en')
    is_approved = models.BooleanField(default=True)
    is_suspended = models.BooleanField(default=False)

    def __str__(self):
        return self.username


class EmployerVerification(models.Model):
    EMPLOYER_TYPE_CHOICES = (
        ('company',    'Company / PLC / Corporation'),
        ('factory',    'Factory / Manufacturing'),
        ('ngo',        'NGO / Organization'),
        ('shop',       'Shop / Small Business'),
        ('individual', 'Individual / Freelancer'),
        ('other',      'Other'),
    )
    STATUS_CHOICES = (
        ('pending',  'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    user             = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employer_verification')
    employer_type    = models.CharField(max_length=20, choices=EMPLOYER_TYPE_CHOICES)
    employer_type_other = models.CharField(max_length=100, blank=True)  # if type == 'other'
    organization_name = models.CharField(max_length=200, blank=True)

    # Company / Factory / NGO
    business_license  = models.FileField(upload_to='employer_docs/licenses/', blank=True, null=True)
    tin_certificate   = models.FileField(upload_to='employer_docs/tin/', blank=True, null=True)
    registration_cert = models.FileField(upload_to='employer_docs/reg/', blank=True, null=True)

    # Shop / Individual / Other
    national_id_front = models.ImageField(upload_to='employer_docs/national_id/', blank=True, null=True)
    national_id_back  = models.ImageField(upload_to='employer_docs/national_id/', blank=True, null=True)
    national_id_number = models.CharField(max_length=50, blank=True)

    # Extra supporting doc (any type)
    supporting_doc    = models.FileField(upload_to='employer_docs/supporting/', blank=True, null=True)

    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_note   = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at  = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} — {self.employer_type} [{self.status}]"
