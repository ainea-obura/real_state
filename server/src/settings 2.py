import os
import urllib.parse

from datetime import timedelta
from pathlib import Path

# import sentry_sdk
from celery.schedules import crontab
from dotenv import load_dotenv

# from sentry_sdk.integrations.celery import CeleryIntegration
# from sentry_sdk.integrations.django import DjangoIntegration
# from sentry_sdk.integrations.redis import RedisIntegration

# Base directory path
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv()

# Environment detection
ENVIRONMENT = os.getenv(
    "ENVIRONMENT", "development"
)  # production, staging, development
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() == "true"

# sentry_sdk.init(
#     dsn=os.getenv("SENTRY_DSN"),
#     integrations=[
#         DjangoIntegration(
#             transaction_style="url",
#             middleware_spans=True,
#         ),
#         CeleryIntegration(
#             monitor_beat_tasks=True,
#             propagate_traces=True,
#         ),
#         RedisIntegration(),
#     ],
#     traces_sample_rate=0.1 if ENVIRONMENT == "production" else 1.0,
#     send_default_pii=True,
#     environment=ENVIRONMENT,
# )

# Security settings
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")

# Host configuration based on environment
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "::1",
    "hoyhub.net",
    "www.hoyhub.net",
    "api.hoyhub.net",
    "ws.hoyhub.net",
    "ws.localhost",
    "ws.localhost:8000",
    "kalsite.hoyhub.net",
    "9cc441bd3901.ngrok-free.app",
    "10.10.66.123",
]
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://hoyhub.net",
    "https://hoyhub.net",
    "https://www.hoyhub.net",
    "https://ws.hoyhub.net",
    "https://ws.localhost",
    "http://ws.localhost:8000",
    "https://kalsite.hoyhub.net",
    "https://65f56421a797.ngrok-free.app",
    "http://10.10.66.123",
]
APPEND_SLASH = True

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.humanize",
    # GeoDjango
    "django.contrib.gis",
    "rest_framework_gis",
    # Third parties app
    # 2FA
    "django_otp",
    # DRF
    "channels",
    "rest_framework",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    # Django Rate limiter
    "django_ratelimit",
    # Cors Headers
    "corsheaders",
    # Celery Beat
    "django_celery_beat",
    # Local Apps
    "accounts",
    "otp",
    "properties",
    "company",
    "agents",
    "notifications",
    "payments",
    "sales",
    "documents",
    "menupermissions",
]

# Middleware
MIDDLEWARE = [
    "src.middlewares.IPBlockMiddleware",
    "django_ratelimit.middleware.RatelimitMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django_otp.middleware.OTPMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# URL Configuration
ROOT_URLCONF = "src.routes"


# === UNIFIED MINIO/S3 CONFIGURATION ===
# MinIO Configuration - Centralized and consistent
MINIO_ACCESS_KEY = "django-user"
MINIO_SECRET_KEY = "@Nisa@@252"
MINIO_BUCKET_MEDIA = "media"
MINIO_BUCKET_STATIC = "static"

# Environment-specific MinIO endpoints
if ENVIRONMENT == "production":
    MINIO_ENDPOINT_INTERNAL = "http://127.0.0.1:9000"  # Internal communication
    MINIO_ENDPOINT_PUBLIC = "https://s3.hoyhub.net"  # Public access via nginx
    MINIO_USE_SSL = False  # Internal communication doesn't use SSL
else:
    MINIO_ENDPOINT_INTERNAL = "http://localhost:9000"
    MINIO_ENDPOINT_PUBLIC = "http://localhost:9000"
    MINIO_USE_SSL = False

# Compression Settings
COMPRESS_MEDIA = True
COMPRESS_EXTENSIONS = {
    "images": ["jpg", "jpeg", "png"],
    "pdfs": ["pdf"],
    "videos": ["mp4"],
}
COMPRESS_QUALITY = {
    "images": 50,
    "pdfs": "screen",
    "videos": "medium",
}

# Presigned URL settings
PRESIGNED_URL_EXPIRE_SECONDS = int(
    os.getenv("PRESIGNED_URL_EXPIRE_SECONDS", "3600")
)  # 1 hour default

# Storage Backends Configuration
STORAGES = {
    "default": {
        "BACKEND": "src.storage_backends.CompressedMediaStorage",
        "OPTIONS": {
            "access_key": MINIO_ACCESS_KEY,
            "secret_key": MINIO_SECRET_KEY,
            "bucket_name": MINIO_BUCKET_MEDIA,
            "endpoint_url": MINIO_ENDPOINT_INTERNAL,
            "use_ssl": MINIO_USE_SSL,
            "default_acl": None,  # Use bucket policy instead
            "querystring_auth": True,  # Enable presigned URLs
            "file_overwrite": False,
            "signature_version": "s3v4",
            "url_expire": PRESIGNED_URL_EXPIRE_SECONDS,
            "public_endpoint": MINIO_ENDPOINT_PUBLIC,  # Custom option for your storage backend
            "region_name": "us-east-1",
        },
    },
    "staticfiles": {
        "BACKEND": "storages.backends.s3boto3.S3StaticStorage",
        "OPTIONS": {
            "access_key": MINIO_ACCESS_KEY,
            "secret_key": MINIO_SECRET_KEY,
            "bucket_name": MINIO_BUCKET_STATIC,
            "endpoint_url": MINIO_ENDPOINT_INTERNAL,
            "use_ssl": MINIO_USE_SSL,
            "default_acl": "public-read",
            "querystring_auth": False,
            "region_name": "us-east-1",
        },
    },
}

# URL configurations - Let storage backend handle media URLs
MEDIA_URL = None  # Always use storage backend's URL generation
if ENVIRONMENT == "production":
    STATIC_URL = f"{MINIO_ENDPOINT_PUBLIC}/static/"
else:
    STATIC_URL = f"{MINIO_ENDPOINT_PUBLIC}/static/"


# Templates configuration
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ASGI application configuration
ASGI_APPLICATION = "src.asgi.application"

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))


# Simple Redis URL without authentication
def build_redis_url(host, port, db):
    """Build Redis URL without authentication"""
    return f"redis://{host}:{port}/{db}"


# Channel Layers Configuration for WebSockets
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [build_redis_url(REDIS_HOST, REDIS_PORT, REDIS_DB)],
            "capacity": 1500,
            "expiry": 60,
        },
    },
}

# Cache Configuration
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": build_redis_url(REDIS_HOST, REDIS_PORT, REDIS_DB),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "CONNECTION_POOL_KWARGS": {
                "max_connections": 20,
            },
        },
    },
    "cache-for-ratelimiting": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": build_redis_url(REDIS_HOST, REDIS_PORT, 2),  # DB 2
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "SERIALIZER": "django_redis.serializers.json.JSONSerializer",
            "CONNECTION_POOL_KWARGS": {
                "max_connections": 20,
            },
        },
        "TIMEOUT": 300,
    },
}

# Database Configuration
if ENVIRONMENT == "production":
    DATABASES = {
        "default": {
            "ENGINE": "django.contrib.gis.db.backends.postgis",
            "NAME": os.getenv("DB_NAME"),
            "USER": os.getenv("DB_USER"),
            "PASSWORD": os.getenv("DB_PASSWORD"),
            "HOST": os.getenv("DB_HOST", "db.hoyhub.net"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "OPTIONS": {
                "sslmode": "require",
            },
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.contrib.gis.db.backends.postgis",
            "NAME": os.getenv("DB_NAME"),
            "USER": os.getenv("DB_USER"),
            "PASSWORD": os.getenv("DB_PASSWORD"),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
        }
    }

# Password validators
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Localization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Europe/Istanbul"
USE_I18N = True
USE_TZ = True

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom user model
AUTH_USER_MODEL = "accounts.Users"

# DRF Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day" if ENVIRONMENT == "production" else "1000/day",
        "user": "1000/day" if ENVIRONMENT == "production" else "10000/day",
    },
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_VERSIONING_CLASS": "rest_framework.versioning.NamespaceVersioning",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "utils.exception_handler.error_exception_handler",
}

# JWT Configuration
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": (
        timedelta(hours=7) if ENVIRONMENT == "production" else timedelta(days=1)
    ),
    "REFRESH_TOKEN_LIFETIME": (
        timedelta(days=7) if ENVIRONMENT == "production" else timedelta(days=1)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# DRF Spectacular settings
SPECTACULAR_SETTINGS = {
    "TITLE": "HoyHub API",
    "DESCRIPTION": "HoyHub Real Estate Management System API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SWAGGER_UI_DIST": "SIDECAR",
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "REDOC_DIST": "SIDECAR",
    "SERVE_AUTHENTICATION": [
        "rest_framework_simplejwt.authentication.JWTAuthentication"
    ],
    "COMPONENT_SPLIT_REQUEST": True,
    "SECURITY": [{"Bearer": []}],
}

# Django Ratelimit Configuration
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = "cache-for-ratelimiting"
RATELIMIT_VIEW = "utils.exceptions.rate.ratelimit_handler"

# Two Factor Auth
TWO_FACTOR_CALL_GATEWAY = "two_factor.gateways.fake.Fake"

# Email Configuration
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
EMAIL_HOST = "smtp.sendgrid.net"
EMAIL_HOST_PASSWORD = SENDGRID_API_KEY
EMAIL_PORT = 587
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@hoyhub.net")

# Celery Configuration - FIXED FOR PASSWORD AUTHENTICATION
# Celery Configuration - FIXED FOR PASSWORD AUTHENTICATION
CELERY_BROKER_URL = build_redis_url(REDIS_HOST, REDIS_PORT, 0)
CELERY_RESULT_BACKEND = build_redis_url(REDIS_HOST, REDIS_PORT, 1)

CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

# Celery reliability settings
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_REJECT_ON_WORKER_LOST = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True

# Celery performance settings - FIXED to match service
CELERYD_PREFETCH_MULTIPLIER = 1
CELERYD_MAX_TASKS_PER_CHILD = 100  # Always 100 to match service
CELERY_WORKER_CONCURRENCY = 4  # Always 4 to match service

# Queue definitions
CELERY_TASK_DEFAULT_QUEUE = "default"
CELERY_TASK_DEFAULT_EXCHANGE = "default"
CELERY_TASK_DEFAULT_ROUTING_KEY = "default"

# Define all queues with their configurations
CELERY_TASK_QUEUES = {
    "default": {
        "exchange": "default",
        "routing_key": "default",
    },
    "payout_queue": {
        "exchange": "payout_queue",
        "routing_key": "payout_queue",
    },
    "management_queue": {
        "exchange": "management_queue",
        "routing_key": "management_queue",
    },
    "invoice_queue": {
        "exchange": "invoice_queue",
        "routing_key": "invoice_queue",
    },
    "reminder_queue": {
        "exchange": "reminder_queue",
        "routing_key": "reminder_queue",
    },
}

# Worker configuration - FIXED to match service
CELERY_WORKER_CONCURRENCY = 4  # Always 4
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_MAX_TASKS_PER_CHILD = 100  # Always 100

# Queue-specific worker settings
CELERY_WORKER_QUEUES = {
    "default": {"concurrency": 2},
    "payout_queue": {"concurrency": 2},
    "management_queue": {"concurrency": 1},
    "invoice_queue": {"concurrency": 2},
    "reminder_queue": {"concurrency": 1},
}

# Worker process settings
CELERY_WORKER_POOL = "prefork"
CELERY_WORKER_POOL_RESTARTS = True
CELERY_WORKER_SEND_TASK_EVENTS = True
CELERY_WORKER_RECEIVE_TASK_EVENTS = True

# Task routing
CELERY_TASK_ROUTES = {
    "payments.tasks.calculate_single_owner_payout": {"queue": "payout_queue"},
    "payments.tasks.calculate_all_owner_payouts_for_period": {
        "queue": "management_queue"
    },
    "payments.tasks.generate_monthly_invoices": {"queue": "invoice_queue"},
    "payments.tasks.send_invoice_reminders": {"queue": "reminder_queue"},
    "*": {"queue": "default"},
}

# Use django-celery-beat database scheduler for dynamic tasks
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"


# WebSocket settings
WEBSOCKET_MAX_CONNECTIONS_PER_USER = 1
WEBSOCKET_CONNECTION_TIMEOUT = 300
WEBSOCKET_PING_INTERVAL = 30
