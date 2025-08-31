from rest_framework import serializers


class PersonSerializer(serializers.Serializer):
    name = serializers.CharField(allow_null=True)
    email = serializers.CharField(allow_null=True)
    phone = serializers.CharField(allow_null=True)


class UnifiedTransactionSerializer(serializers.Serializer):
    id = serializers.CharField()
    date = serializers.DateField()
    tenant = PersonSerializer(allow_null=True)
    owners = PersonSerializer(many=True)
    agents = PersonSerializer(many=True)
    vendors = PersonSerializer(many=True)
    unit = serializers.CharField(allow_null=True)
    property = serializers.CharField(allow_null=True)
    type = serializers.CharField()
    reference = serializers.CharField(allow_null=True)
    amount = serializers.CharField()
    status = serializers.CharField()
    method = serializers.CharField(allow_null=True)
    notes = serializers.CharField(allow_blank=True, allow_null=True)


class TransactionsSummarySerializer(serializers.Serializer):
    totalIncome = serializers.DecimalField(max_digits=12, decimal_places=2)
    outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)
    overdue = serializers.DecimalField(max_digits=12, decimal_places=2)
    upcoming = serializers.DecimalField(max_digits=12, decimal_places=2)
    expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
