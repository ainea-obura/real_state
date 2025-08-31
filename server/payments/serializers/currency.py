from rest_framework import serializers

from properties.models import Currencies


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currencies
        fields = [
            "id",
            "name",
            "code",
            "symbol",
            "decimal_places",
            "default",
        ]
        read_only_fields = ["id"]


class CurrencyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Currencies
        fields = ["name", "code", "symbol", "decimal_places"]

class CurrencyStatsSerializer(serializers.Serializer):
    total_currencies = serializers.IntegerField()
    default_currency = serializers.CharField()
    most_used_currency = serializers.CharField()
    most_used_count = serializers.IntegerField()
