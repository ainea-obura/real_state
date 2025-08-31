from rest_framework import serializers
from decimal import Decimal
from django.utils import timezone


class MonthlyDataSerializer(serializers.Serializer):
    month = serializers.IntegerField()
    month_name = serializers.CharField()
    year = serializers.IntegerField()
    value = serializers.CharField()


class ProjectSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()


class ServiceSummaryDataSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    type = serializers.CharField()
    frequency = serializers.CharField()
    billedTo = serializers.CharField()
    description = serializers.CharField()
    monthly_breakdown = MonthlyDataSerializer(many=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    attached_projects = serializers.ListField(child=ProjectSerializer(), default=list)


class ProjectBreakdownSerializer(serializers.Serializer):
    project = serializers.CharField()
    amount = serializers.CharField()


class CollectionsBreakdownSerializer(serializers.Serializer):
    collections = ProjectBreakdownSerializer(many=True)


class ExpensesBreakdownSerializer(serializers.Serializer):
    expenses = ProjectBreakdownSerializer(many=True)


class ManagementFeeBreakdownSerializer(serializers.Serializer):
    managementFees = ProjectBreakdownSerializer(many=True)


class BalanceBreakdownSerializer(serializers.Serializer):
    balance = ProjectBreakdownSerializer(many=True)


class FinancialSummarySerializer(serializers.Serializer):
    totalCollected = serializers.CharField()
    totalExpense = serializers.CharField()
    totalManagementFee = serializers.CharField()
    balance = serializers.CharField()


class CurrentMonthSerializer(serializers.Serializer):
    month = serializers.IntegerField()
    month_name = serializers.CharField()
    year = serializers.IntegerField()


class AppliedFiltersSerializer(serializers.Serializer):
    project = serializers.CharField()
    month = serializers.CharField()
    year = serializers.IntegerField()


class ServiceSummaryReportDataSerializer(serializers.Serializer):
    services = ServiceSummaryDataSerializer(many=True)
    summary = FinancialSummarySerializer()
    projectBreakdowns = serializers.DictField()
    currentMonth = CurrentMonthSerializer()
    appliedFilters = AppliedFiltersSerializer()


class ServiceSummaryReportResponseSerializer(serializers.Serializer):
    error = serializers.BooleanField(default=False)
    message = serializers.CharField()
    data = ServiceSummaryReportDataSerializer()


# Legacy serializers for the original services report
class ServiceDataSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    type = serializers.CharField()
    frequency = serializers.CharField()
    billedTo = serializers.CharField()
    description = serializers.CharField()
    monthly_breakdown = MonthlyDataSerializer(many=True)
    total_cost = serializers.CharField()
    attached_projects = serializers.ListField(
        child=serializers.CharField(), default=list
    )


class ServicesReportSummarySerializer(serializers.Serializer):
    totalServices = serializers.IntegerField()
    totalCost = serializers.CharField()
    year = serializers.IntegerField()


class ServicesReportDataSerializer(serializers.Serializer):
    services = ServiceDataSerializer(many=True)
    summary = ServicesReportSummarySerializer()


class ServicesReportResponseSerializer(serializers.Serializer):
    error = serializers.BooleanField(default=False)
    message = serializers.CharField()
    data = ServicesReportDataSerializer()
