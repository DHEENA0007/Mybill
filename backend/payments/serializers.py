from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_type', 'reference_type', 'reference_id',
            'amount', 'payment_method', 'payment_date', 'notes',
            'recorded_by', 'recorded_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value
