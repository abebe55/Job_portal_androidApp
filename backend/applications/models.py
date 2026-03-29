from django.db import models
from django.conf import settings
from jobs.models import Job


class Application(models.Model):
    STATUS_CHOICES = (
        ('pending',  'Pending Review'),
        ('reviewed', 'Reviewed by Employer'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    )

    job          = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    applicant    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='applications'
    )
    cover_letter = models.TextField(blank=True)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    employer_note = models.TextField(blank=True, verbose_name='Note from employer to applicant')
    applied_at   = models.DateTimeField(auto_now_add=True)
    status_updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('job', 'applicant')
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.applicant.username} -> {self.job.title} [{self.status}]"
