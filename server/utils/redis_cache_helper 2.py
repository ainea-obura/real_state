import redis

from django.conf import settings
from django.core.cache import cache

# initialize redis for cache
redis_client = redis.StrictRedis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=1,  # Match the db number used in project.py
    decode_responses=True,
)


def clear_redis_cache(pattern):
    cache.delete_pattern(pattern)
    cache.clear()
