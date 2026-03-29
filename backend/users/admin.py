from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'phone', 'location', 'is_approved', 'is_suspended', 'is_staff']
    list_filter = ['role', 'is_staff', 'is_active', 'is_approved', 'is_suspended']
    list_editable = ['is_approved', 'is_suspended']
    search_fields = ['username', 'email', 'phone']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Job Portal Info', {'fields': ('role', 'phone', 'location', 'bio', 'profile_photo', 'preferred_language', 'is_approved', 'is_suspended')}),
    )
    actions = ['approve_users', 'suspend_users', 'unsuspend_users']

    def approve_users(self, request, queryset):
        queryset.update(is_approved=True)
        self.message_user(request, f"{queryset.count()} user(s) approved.")
    approve_users.short_description = "Approve selected users"

    def suspend_users(self, request, queryset):
        queryset.update(is_suspended=True, is_active=False)
        self.message_user(request, f"{queryset.count()} user(s) suspended.")
    suspend_users.short_description = "Suspend selected users"

    def unsuspend_users(self, request, queryset):
        queryset.update(is_suspended=False, is_active=True)
        self.message_user(request, f"{queryset.count()} user(s) unsuspended.")
    unsuspend_users.short_description = "Unsuspend selected users"
