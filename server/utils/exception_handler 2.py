from rest_framework.exceptions import Throttled
from rest_framework.views import exception_handler


def flatten_errors(errors):
    """
    Recursively flatten error messages into a single string.
    """
    if isinstance(errors, list):
        messages = []
        for item in errors:
            messages.append(flatten_errors(item))
        return ", ".join(messages)
    elif isinstance(errors, dict):
        messages = []
        for key, val in errors.items():
            messages.append(f"{key}: {flatten_errors(val)}")
        return ", ".join(messages)
    return str(errors)


def error_exception_handler(exc, context):
    """
    Custom exception handler that flattens errors into a single message.
    For throttling errors, includes a `retry_after` key with the seconds to wait:
    {
        "error": true,
        "message": "<field>: <error_message>",
        "retry_after": <seconds>      # only on throttled errors
    }
    """
    # Delegate to DRF's default handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Handle throttled errors separately
        if isinstance(exc, Throttled):
            wait = int(exc.wait or 0)
            response.data = {
                "error": True,
                "error_code": "RATE_LIMIT_EXCEEDED",
                "message": f"Please wait {wait} second(s) before retrying.",
                "retry_after": wait,
            }
        else:
            # Flatten any other errors into one string
            if isinstance(response.data, dict):
                flattened = []
                for field, errors in response.data.items():
                    text = flatten_errors(errors)
                    flattened.append(f"{field}: {text}")
                message = " and ".join(flattened)
            else:
                message = str(response.data)
            response.data = {"error": True, "message": message}
    return response
