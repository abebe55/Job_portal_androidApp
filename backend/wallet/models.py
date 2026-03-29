from django.db import models
from django.conf import settings

class Wallet(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} — ETB {self.balance}"


class Transaction(models.Model):
    TYPE_CHOICES = (
        ('deposit', 'Deposit'),        # employer tops up wallet
        ('commission', 'Commission'),  # fee charged when job is posted/approved
        ('refund', 'Refund'),          # admin refunds
        ('withdrawal', 'Withdrawal'),  # future: jobseeker payout
    )
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    tx_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reference = models.CharField(max_length=200, blank=True)   # Chapa tx_ref
    chapa_tx_id = models.CharField(max_length=200, blank=True) # Chapa response id
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.wallet.user.username} | {self.tx_type} | ETB {self.amount}"


class CommissionSetting(models.Model):
    """Admin-controlled commission rate per job post"""
    job_post_fee = models.DecimalField(max_digits=8, decimal_places=2, default=50.00)  # ETB per job post
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='commission_updates'
    )

    class Meta:
        verbose_name = 'Commission Setting'

    def __str__(self):
        return f"Job Post Fee: ETB {self.job_post_fee}"
