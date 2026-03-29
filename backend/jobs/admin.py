from django.contrib import admin
from django.utils import timezone
from .models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display  = ['title', 'posted_by', 'status', 'posting_fee', 'fee_paid', 'industry', 'location', 'created_at']
    list_filter   = ['status', 'skill_level', 'job_type', 'fee_paid']
    search_fields = ['title', 'location', 'industry', 'posted_by__username']
    readonly_fields = ['created_at', 'updated_at', 'reviewed_at', 'published_at', 'fee_tx_ref']
    list_editable = ['status', 'posting_fee']
    actions = ['approve_with_default_fee', 'reject_jobs', 'publish_jobs']

    fieldsets = (
        ('Job Info', {'fields': (
            'title', 'title_am', 'description', 'description_am',
            'location', 'industry', 'skill_level', 'job_type',
            'salary', 'deadline', 'posted_by',
        )}),
        ('Workflow', {'fields': (
            'status', 'posting_fee', 'fee_paid', 'fee_tx_ref',
            'admin_note', 'reviewed_by', 'reviewed_at', 'published_at',
        )}),
        ('Meta', {'fields': ('is_active', 'created_at', 'updated_at')}),
    )

    def approve_with_default_fee(self, request, queryset):
        from wallet.models import CommissionSetting
        setting = CommissionSetting.objects.first()
        fee = setting.job_post_fee if setting else 50
        updated = queryset.filter(status__in=['draft', 'under_review']).update(
            status='approved', posting_fee=fee,
            reviewed_by=request.user, reviewed_at=timezone.now()
        )
        self.message_user(request, f"{updated} job(s) approved with fee ETB {fee}.")
    approve_with_default_fee.short_description = "Approve selected jobs (default fee)"

    def reject_jobs(self, request, queryset):
        queryset.update(status='rejected', reviewed_by=request.user, reviewed_at=timezone.now())
        self.message_user(request, f"{queryset.count()} job(s) rejected.")
    reject_jobs.short_description = "Reject selected jobs"

    def publish_jobs(self, request, queryset):
        queryset.update(
            status='published', fee_paid=True,
            is_approved=True, is_active=True,
            published_at=timezone.now()
        )
        self.message_user(request, f"{queryset.count()} job(s) published.")
    publish_jobs.short_description = "Publish selected jobs (skip payment)"
