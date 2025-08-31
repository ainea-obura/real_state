from rest_framework import serializers
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from django.db.models.functions import TruncMonth

from sales.models import SalesPerson, PropertySale, AssignedDocument
from properties.models import PropertyOwner


class SalesPersonPerformanceSerializer(serializers.Serializer):
    """Serializer for individual sales person performance data"""

    id = serializers.UUIDField(source="id")
    name = serializers.CharField(source="user.get_full_name")
    employee_id = serializers.CharField()

    # Performance metrics
    contracted = serializers.IntegerField()
    offers_sent = serializers.IntegerField()
    won = serializers.IntegerField()
    lost = serializers.IntegerField()
    conversion_percent = serializers.FloatField()
    avg_deal_size = serializers.FloatField()
    revenue = serializers.FloatField()


class SalesTeamPerformanceKPISerializer(serializers.Serializer):
    """Serializer for Sales Team Performance KPIs"""

    total_deals_closed = serializers.IntegerField()
    conversion_rate = serializers.FloatField()
    avg_deal_size = serializers.FloatField()
    pipeline_velocity = serializers.IntegerField()


class SalesTeamPerformanceReportSerializer(serializers.Serializer):
    """Main serializer for Sales Team Performance report"""

    success = serializers.BooleanField()
    message = serializers.CharField()
    data = serializers.DictField()

    # Nested serializers
    kpis = SalesTeamPerformanceKPISerializer()
    salespeople = SalesPersonPerformanceSerializer(many=True)


class SalesTeamPerformanceQuerySerializer(serializers.Serializer):
    """Query parameters for Sales Team Performance report"""

    from_date = serializers.DateField(required=False)
    to_date = serializers.DateField(required=False)
    project_id = serializers.UUIDField(required=False)
