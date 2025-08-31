from rest_framework import serializers


class AgentPayoutSerializer(serializers.Serializer):
    """Serializer for individual agent payout data"""

    id = serializers.UUIDField()

    # Agent information
    agent = serializers.DictField(
        child=serializers.CharField(), help_text="Agent object with name, phone, email"
    )

    # Property information
    projectName = serializers.CharField()
    propertyInfo = serializers.CharField()

    # Financial data
    pending = serializers.FloatField()
    paid = serializers.FloatField()
    paidDate = serializers.DateField(source="paid_date", allow_null=True)

    # Expense information
    expenses = serializers.FloatField(help_text="Total expenses billed to agent")
    netPending = serializers.FloatField(help_text="Pending amount minus expenses")
    netPaid = serializers.FloatField(help_text="Paid amount minus expenses")


class AgentPayoutsKPISerializer(serializers.Serializer):
    """Serializer for Agent Payouts KPIs"""

    accruedUnpaid = serializers.FloatField()
    approvedReady = serializers.FloatField()
    paidPeriod = serializers.FloatField()
    avgCommissionRate = serializers.FloatField()


class AgentPayoutsReportSerializer(serializers.Serializer):
    """Main serializer for Agent Payouts report"""

    success = serializers.BooleanField()
    message = serializers.CharField()
    data = serializers.DictField()

    # Nested serializers
    kpis = AgentPayoutsKPISerializer()
    agentPayouts = AgentPayoutSerializer(many=True)


class AgentPayoutsQuerySerializer(serializers.Serializer):
    """Query parameters for Agent Payouts report"""

    from_date = serializers.DateField(required=False)
    to_date = serializers.DateField(required=False)
    project_id = serializers.UUIDField(required=False)
