from django.core.cache import cache
from django.db.models import Q
from django.http import JsonResponse
from ipware import get_client_ip  # Import get_client_ip from django-ipware
from rest_framework import status

from accounts.models import BlockedIP

MAX_ATTEMPTS = 5
REDIS_EXPIRE_SECONDS  = 60 * 15  # 15 minutes or however long you want to block

def is_ip_in_db_blocklist(ip_address: str) -> bool:
    """
    Checks the SQL database to see if this IP is permanently blocked.
    """
    return BlockedIP.objects.filter(blocked_ip=ip_address, is_unblocked=True).exists()

def increment_attempts_in_redis(ip_address: str) -> int:
    """
    Increment the failed attempts in Redis, return the new count.
    """
    key = f"login_attempts:{ip_address}"
    attempts = cache.get(key, 0)
    attempts += 1
    # Store or refresh the key with an expiry
    cache.set(key, attempts, REDIS_EXPIRE_SECONDS)
    return attempts

def reset_attempts_in_redis(ip_address: str):
    """
    Clear the attempts in Redis for this IP.
    """
    key = f"login_attempts:{ip_address}"
    cache.delete(key)


def permanently_block_ip(ip_address: str):
    """
    Create or update the block record in the DB. This is your 'permanent' block logic
    until an admin unblocks it.
    """
    BlockedIP.objects.update_or_create(
        blocked_ip=ip_address,
        defaults={"is_unblocked": True}
    )
    # Optionally also reset attempts in Redis once blocked
    reset_attempts_in_redis(ip_address)
    

def block_ip(request):
    # 1. Get client IP
    request_ip, _ = get_client_ip(request)
    if not request_ip:
        return JsonResponse(
            {"error": True, "message": "Unable to proccess your request"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 2. Check if IP is already blocked in DB
    if is_ip_in_db_blocklist(request_ip):
        return JsonResponse(
            {"error": True, "message": "Access denied, Please contact support."},
            status=status.HTTP_403_FORBIDDEN
        )

    # 3. Increment attempts in Redis
    attempts = increment_attempts_in_redis(request_ip)
    # 4. If attempts exceed threshold, block permanently
    if attempts > MAX_ATTEMPTS:
        permanently_block_ip(request_ip)
        return JsonResponse(
            {"error": True, "message": "Access denied, Please contact support."},
            status=status.HTTP_403_FORBIDDEN
        )

    # Otherwise, return None, meaning "not blocked yet"
    return None