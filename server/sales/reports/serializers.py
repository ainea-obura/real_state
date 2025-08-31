from rest_framework import serializers


class KPISerializer(serializers.Serializer):
    """Serializer for KPI data"""

    unitsSold = serializers.IntegerField()
    averageSalePrice = serializers.FloatField()
    totalRevenue = serializers.FloatField()
    averageTimeToClose = serializers.FloatField()


class MonthlySalesDataSerializer(serializers.Serializer):
    """Serializer for monthly sales data used in charts"""

    month = serializers.CharField()
    unitsSold = serializers.IntegerField()
    revenue = serializers.FloatField()
    averagePrice = serializers.FloatField()


class SalesRecordSerializer(serializers.Serializer):
    """Serializer for individual sales records"""

    id = serializers.CharField()
    propertyName = serializers.CharField()
    salePrice = serializers.FloatField()
    soldDate = serializers.DateField()
    timeToClose = serializers.IntegerField()
    project = serializers.CharField()


class PropertySalesPerformanceReportSerializer(serializers.Serializer):
    """Main serializer for Property Sales Performance report"""

    kpis = KPISerializer()
    monthlyData = MonthlySalesDataSerializer(many=True)
    salesRecords = SalesRecordSerializer(many=True)


class PropertySalesPerformanceReportQuerySerializer(serializers.Serializer):
    """Query parameters for filtering Property Sales Performance data"""

    from_date = serializers.DateField(required=False)
    to_date = serializers.DateField(required=False)
    project_id = serializers.UUIDField(required=False)

    def validate(self, data):
        """Validate date range if both dates are provided"""
        from_date = data.get("from_date")
        to_date = data.get("to_date")

        if from_date and to_date and from_date > to_date:
            raise serializers.ValidationError("from_date cannot be after to_date")

        return data
