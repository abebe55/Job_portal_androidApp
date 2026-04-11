from django.urls import path
from .views import (
    MyWalletView, InitiateDepositView, ChapaCallbackView,
    ChapaVerifyView, DeductCommissionView, DepositReturnView,
    AdminCommissionSettingView, AdminAllTransactionsView, AdminAllWalletsView,
)

urlpatterns = [
    path('', MyWalletView.as_view(), name='my-wallet'),
    path('deposit/', InitiateDepositView.as_view(), name='initiate-deposit'),
    path('deposit-return/', DepositReturnView.as_view(), name='deposit-return'),
    path('chapa/callback/', ChapaCallbackView.as_view(), name='chapa-callback'),
    path('chapa/verify/', ChapaVerifyView.as_view(), name='chapa-verify'),
    path('deduct/', DeductCommissionView.as_view(), name='deduct-commission'),
    # Admin
    path('admin/commission/', AdminCommissionSettingView.as_view(), name='admin-commission'),
    path('admin/transactions/', AdminAllTransactionsView.as_view(), name='admin-transactions'),
    path('admin/wallets/', AdminAllWalletsView.as_view(), name='admin-wallets'),
]
