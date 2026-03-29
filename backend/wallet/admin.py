from django.contrib import admin
from .models import Wallet, Transaction, CommissionSetting


@admin.register(CommissionSetting)
class CommissionSettingAdmin(admin.ModelAdmin):
    list_display = ['job_post_fee', 'updated_at', 'updated_by']
    readonly_fields = ['updated_at']

    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ['user', 'balance', 'updated_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['updated_at']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['wallet', 'tx_type', 'amount', 'status', 'reference', 'created_at']
    list_filter = ['tx_type', 'status']
    search_fields = ['wallet__user__username', 'reference']
    readonly_fields = ['created_at']
