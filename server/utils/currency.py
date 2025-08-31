# payments/utils/currency.py

from payments.serializers.currency import CurrencySerializer
from properties.models import Currencies


def get_serialized_default_currency():
    currency = Currencies.objects.all()

    if currency:
        default_currency = currency.filter(default=True).first()
        if default_currency:
            return CurrencySerializer(default_currency).data
        else:
            return CurrencySerializer(currency.first()).data
    return {
        "id": "",
        "name": "",
        "code": "",
        "symbol": "",
        "decimal_places": 2,
        "default": False,
    }
