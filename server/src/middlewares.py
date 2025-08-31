from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from ipware import get_client_ip
from rest_framework import status

from accounts.models import BlockedIP


class IPBlockMiddleware(MiddlewareMixin):
    """
    Middleware that checks if the client's IP is blocked before processing the request.
    If the IP is blocked, the middleware immediately returns a 403 response with a generic message.
    Otherwise, the request proceeds as normal.
    """  # noqa: E501

    def process_request(self, request):
        # 1. Get the client IP
        request_ip, _ = get_client_ip(request)
        if not request_ip:
            # If IP could not be determined, return a generic error response
            # (You might want to allow the request in this scenario,
            # but here's a strict approach.)
            return JsonResponse(
                {"error": True, "message": "Unable to determine client IP."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Check if the IP is blocked
        # Use .exists() if you only need to know if a record is present
        is_blocked = BlockedIP.objects.filter(blocked_ip=request_ip, is_unblocked=True).exists()  # noqa: E501

        if is_blocked:
            # 3. Block immediately with a generic message
            return JsonResponse(
                {
                    "error": True,
                    "message": "Access denied, Please contact support"
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # 4. If not blocked, proceed
        return None
