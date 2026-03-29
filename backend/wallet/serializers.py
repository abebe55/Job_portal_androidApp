from rest_framework import serializers
from .models import Wallet, Transaction, CommissionSetting

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['wallet', 'created_at']

class WalletSerializer(serializers.ModelSerializer):
    transactions = TransactionSerializer(many=True, read_only=True)
    class Meta:
        model = Wallet
        fields = ['id', 'balance', 'updated_at', 'transactions']

class CommissionSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionSetting
        fields = '__all__'
        read_only_fields = ['updated_at', 'updated_by']

class InitiatePaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField(required=False, default='')
    phone_number = serializers.CharField(required=False, default='')
