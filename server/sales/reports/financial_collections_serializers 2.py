from rest_framework import serializers
from django.db.models import Sum, Count
from django.utils import timezone
from django.db.models.functions import TruncMonth

from sales.models import PaymentSchedule


class MonthlyFinancialDataSerializer(serializers.Serializer):
    """Serializer for monthly financial collections data"""

    month = serializers.CharField()
    expected = serializers.FloatField()
    collected = serializers.FloatField()
    collection_rate = serializers.FloatField()


class FinancialCollectionsKPISerializer(serializers.Serializer):
    """Serializer for Financial Collections KPIs"""

    expectedPeriod = serializers.FloatField()
    collectedPeriod = serializers.FloatField()
    collectionRate = serializers.FloatField()
    overdueAmount = serializers.FloatField()


class FinancialCollectionsReportSerializer(serializers.Serializer):
    """Main serializer for Financial Collections Summary report"""

    success = serializers.BooleanField()
    message = serializers.CharField()
    data = serializers.DictField()

    # Nested serializers
    kpis = FinancialCollectionsKPISerializer()
    monthlyData = MonthlyFinancialDataSerializer(many=True)


class FinancialCollectionsQuerySerializer(serializers.Serializer):
    """Query parameters for Financial Collections Summary report"""

    from_date = serializers.DateField(required=False)
    to_date = serializers.DateField(required=False)
    project_id = serializers.UUIDField(required=False)
