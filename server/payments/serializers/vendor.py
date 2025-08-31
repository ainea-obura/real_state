from rest_framework import serializers
from payments.models import Vendor
from django.db import models
from utils.format import format_money_with_currency


class VendorSerializer(serializers.ModelSerializer):
    totalExpenses = serializers.SerializerMethodField()
    expenseCount = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "type",
            "totalExpenses",
            "expenseCount",
        ]
        read_only_fields = ["id"]

    def get_totalExpenses(self, obj):
        return format_money_with_currency(
            obj.expenses.aggregate(total=models.Sum("amount"))["total"] or 0
        )

    def get_expenseCount(self, obj):
        return obj.expenses.count()


class VendorCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ["name", "email", "phone", "type"]


class VendorStatsSerializer(serializers.Serializer):
    total_vendors = serializers.IntegerField()
    total_expenses = serializers.CharField()
    total_expense_count = serializers.IntegerField()
    currency = serializers.DictField()
