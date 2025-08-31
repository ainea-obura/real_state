from django.http import JsonResponse
from django_ratelimit.exceptions import Ratelimited
from ipware import get_client_ip


def ratelimit_handler(request, exception):
    if isinstance(exception, Ratelimited):
        # Retrieve the client's IP address
        ip, _ = get_client_ip(request)
        if ip is None:
            # TODO: Implement Alert Here
            ip = 'Unknown IP'

        # Return a response indicating the client should slow down
        return JsonResponse(
            {
                "error": True,
                "message": f"Wooo Wooo! Your {ip} exceeded allowed limit of requests try again later",  # noqa: E501
            },
            status=429
        )

    # If the exception is not rate limit related, return a general forbidden message
    # TODO: Implemet Alert Here
    return JsonResponse(
        {
            "error": True,
            "message": "An Error Accoured try again later",
            "status_code": 403,
        },
        status=403
    )
