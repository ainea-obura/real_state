import datetime

import pendulum

from django.contrib.humanize.templatetags.humanize import (
    intcomma,
)
from rest_framework import serializers

from utils.currency import get_serialized_default_currency


def format_price(value):
    try:
        amount = float(value)
        # Round to nearest integer
        rounded_amount = round(amount)
        # Use intcomma for thousands separator
        formatted = intcomma(rounded_amount)
        return formatted
    except (ValueError, TypeError):
        return str(value)


def format_money_with_currency(amount, currency=None):
    if not currency:
        currency = get_serialized_default_currency()
    # Handle both dict and model instance
    if hasattr(currency, "symbol"):
        symbol = currency.symbol
    elif isinstance(currency, dict):
        symbol = currency.get("symbol", "")
    else:
        symbol = ""
    formatted = format_price(amount)
    return f"{symbol} {formatted}".strip()


class RobustDateTimeField(serializers.DateTimeField):
    """
    A custom DateTime field that converts the datetime from the database
    to GMT+3 (Africa/Mogadishu) and returns a relative time string.
    """

    def to_representation(self, value):
        if not value:
            return None

        if not isinstance(value, (datetime.datetime, datetime.date)):
            raise serializers.ValidationError("Invalid datetime format")

        try:
            dt = pendulum.instance(value).in_timezone("Africa/Mogadishu")
            now = pendulum.now("Africa/Mogadishu")
            diff_seconds = abs(now.diff(dt).in_seconds())

            # if diff_seconds < 60:
            #     relative = "just now"
            # elif dt.date() == now.date():
            #     # <-- use no-arg diff_for_humans here
            #     relative = dt.diff_for_humans()
            # elif dt.date() == now.subtract(days=1).date():
            #     relative = "Yesterday"
            # else:
            relative = dt.format("DD MMM YYYY, HH:mm")

            return relative

        except Exception:
            return None
