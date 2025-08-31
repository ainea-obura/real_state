import sys
import traceback

from functools import wraps

import redis

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response

from Users.models import (
    ErrorLogs,  # Adjust this if your app name is different
    Users,
)
from utils.device_detection import get_request_meta

# initialize redis for cache
redis_client = redis.StrictRedis(
    host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=0, decode_responses=True
)


def get_user_id(request, validated_data=None):
    """
    Retrieve user ID from validated_data or request context.
    """
    validated_data = validated_data or {}
    email = validated_data.pop('email', None)

    if email:
        try:
            return Users.objects.get(email=email).id
        except Users.DoesNotExist:
            return None
    elif request and hasattr(request, 'user') and request.user.is_authenticated:
        return request.user.id
    return None


def error_log():
    """
    Decorator to log unexpected exceptions into ErrorLogs with device and user information.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            try:
                return func(self, request, *args, **kwargs)
            except Exception as e:
                try:
                    exc_type, exc_value, exc_traceback = sys.exc_info()
                    tb = traceback.format_exc()
                    line_number = exc_traceback.tb_lineno if exc_traceback else 0
                except:
                    exc_type = type(e)
                    exc_value = str(e)
                    tb = "Could not get traceback"
                    line_number = 0

                # Extract user and device data
                user_id = get_user_id(request)
                device_info = get_request_meta(request) if request else {}

                browser = device_info.get('browser', 'N/A')
                ip_address = device_info.get('ip_address', 'N/A')
                os_info = device_info.get('operating_system', 'N/A')

                # Log the error into the ErrorLogs table
                ErrorLogs.objects.create(
                    user_id=user_id,
                    expected_error=str(e),
                    field_error=str(e),  # Customize if you need more detailed field errors
                    trace_back=tb,
                    line_number=exc_traceback.tb_lineno if exc_traceback else 0,
                    browser=browser,
                    ip_address=ip_address,
                    operating_system=os_info,
                    path=request.path if request else None
                )

                # Optional: re-raise the error so the app behaves normally
                # Clear all error log related caches
                try:
                    # Delete all keys matching the error-logs pattern
                    for key in redis_client.scan_iter("error-logs:*"):
                        redis_client.delete(key)
                except Exception as redis_err:
                    print(f"Failed to clear error log caches: {redis_err}")

                return Response(
                    {"error": True,"message": "An unexpected error occurred. Please contact the administrator."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return wrapper
    return decorator