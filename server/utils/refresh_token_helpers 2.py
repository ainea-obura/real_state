from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.token_blacklist.models import (
    OutstandingToken,
    BlacklistedToken,
)


# Helper function to blacklist a token
def blacklist_token(refresh_token):
    try:
        outstanding_token = OutstandingToken.objects.get(token=str(refresh_token))
        BlacklistedToken.objects.get_or_create(token=outstanding_token)
    except OutstandingToken.DoesNotExist:
        raise ValidationError("The provided refresh token is not valid.")


def validate_and_decode_token(refresh_token):
    try:
        refresh = RefreshToken(refresh_token)
        refresh.verify()
        return refresh.payload
    except TokenError:
        raise ValidationError("Invalid or expired refresh token")
    except Exception:
        raise ValidationError("Token refresh failed")
