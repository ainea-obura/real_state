from rest_framework import serializers
from payments.models import Payment
from datetime import datetime
import random

class PaymentListSerializer(serializers.ModelSerializer):
    """Serializer for listing payments with minimal fields."""

    class Meta:
        model = Payment
        fields = [
            "id",
            "reference_number",
            "amount",
            "payment_date",
            "payment_method",
            "payment_type",
            "status",
        ]
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for detailed payment operations (create, update)."""
    reference_number = serializers.CharField(read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "tenant",
            "client",
            "unit",
            "amount",
            "payment_date",
            "payment_method",
            "payment_type",
            "reference_number",
            "status",
            "notes",
            "document",
        ]

    def create(self, validated_data):
        """Auto-generate reference_number in format PAY-YYYYMMDD-XXXXXX."""
        validated_data['reference_number'] = f"PAY-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
        return super().create(validated_data)
