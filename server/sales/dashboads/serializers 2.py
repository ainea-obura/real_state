from rest_framework import serializers


class FeatureCardsSerializer(serializers.Serializer):
    """Serializer for sales dashboard feature cards data"""

    total_listings = serializers.IntegerField()
    sold_units = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    outstanding_payments = serializers.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        fields = [
            "total_listings",
            "sold_units",
            "total_revenue",
            "outstanding_payments",
        ]


class DashboardQuerySerializer(serializers.Serializer):
    """Serializer for dashboard query parameters"""

    from_date = serializers.DateField(required=False, allow_null=True)
    to_date = serializers.DateField(required=False, allow_null=True)
    project_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, data):
        """Validate date range if both dates are provided"""
        from_date = data.get("from_date")
        to_date = data.get("to_date")

        if from_date and to_date and from_date > to_date:
            raise serializers.ValidationError("from_date cannot be after to_date")

        return data


class AvailabilitySerializer(serializers.Serializer):
    """Serializer for availability data"""

    id = serializers.UUIDField()
    name = serializers.CharField()
    node_type = serializers.CharField()
    property_type = serializers.CharField(allow_null=True)
    project_detail = serializers.DictField(required=False)
    blocks = serializers.DictField(required=False)  # Changed from units to blocks
