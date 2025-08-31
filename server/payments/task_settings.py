import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Users
from payments.models import TaskConfiguration
from payments.tasks import generate_monthly_invoices, send_invoice_reminders
from utils.custom_pagination import CustomPageNumberPagination

from .serializers.task_settings import (
    TaskConfigurationListSerializer,
    TaskConfigurationSerializer,
    TaskConfigurationUpdateSerializer,
    TaskTestSerializer,
)

logger = logging.getLogger(__name__)


@extend_schema(
    tags=["Task Settings"],
    description="List all task configurations with pagination and filtering.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class TaskConfigurationListView(ListAPIView):
    """
    List all task configurations.
    Supports pagination and filtering by task type and status.
    """

    serializer_class = TaskConfigurationListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        """Get task configurations with optional filtering"""
        queryset = TaskConfiguration.objects.all().order_by("-created_at")

        # Filter by task type
        task_type = self.request.query_params.get("task_type")
        if task_type:
            queryset = queryset.filter(task_type=task_type)

        # Filter by enabled status
        enabled = self.request.query_params.get("enabled")
        if enabled is not None:
            enabled_bool = enabled.lower() == "true"
            queryset = queryset.filter(enabled=enabled_bool)

        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset


@extend_schema(
    tags=["Task Settings"],
    description="Get detailed information about a specific task configuration.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class TaskConfigurationDetailView(RetrieveAPIView):
    """
    Retrieve detailed information about a specific task configuration.
    """

    serializer_class = TaskConfigurationSerializer
    permission_classes = [IsAuthenticated]
    queryset = TaskConfiguration.objects.all()
    lookup_field = "id"


@extend_schema(
    tags=["Task Settings"],
    description="Create a new task configuration.",
    request=TaskConfigurationSerializer,
    responses={201: TaskConfigurationSerializer},
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class TaskConfigurationCreateView(CreateAPIView):
    """
    Create a new task configuration.
    """

    serializer_class = TaskConfigurationSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create task configuration with user tracking"""
        logger.info(f"Creating task configuration")
        logger.info(f"Request data: {request.data}")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Set created_by and updated_by
        instance = serializer.save(created_by=request.user, updated_by=request.user)

        logger.info(
            f"Created instance: frequency={instance.frequency}, day_of_week={instance.day_of_week}"
        )

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


@extend_schema(
    tags=["Task Settings"],
    description="Update an existing task configuration.",
    request=TaskConfigurationUpdateSerializer,
    responses={200: TaskConfigurationSerializer},
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PATCH", block=True),
    name="dispatch",
)
class TaskConfigurationUpdateView(UpdateAPIView):
    """
    Update an existing task configuration.
    Supports partial updates.
    """

    serializer_class = TaskConfigurationUpdateSerializer
    permission_classes = [IsAuthenticated]
    queryset = TaskConfiguration.objects.all()
    lookup_field = "id"

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update task configuration with user tracking"""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        # Debug logging
        logger.info(f"Updating task configuration {instance.task_type}")
        logger.info(f"Request data: {request.data}")
        logger.info(
            f"Request execution_frequency: {request.data.get('execution_frequency', 'NOT_FOUND')}"
        )
        logger.info(
            f"Current instance data: frequency={instance.frequency}, execution_frequency={instance.execution_frequency}, day_of_week={instance.day_of_week}"
        )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        # Set updated_by
        serializer.save(updated_by=request.user)

        # Debug logging after save
        instance.refresh_from_db()
        logger.info(
            f"After save: frequency={instance.frequency}, execution_frequency={instance.execution_frequency}, day_of_week={instance.day_of_week}"
        )

        # Return full serialized data
        full_serializer = TaskConfigurationSerializer(instance)
        return Response(full_serializer.data)


@extend_schema(
    tags=["Task Settings"],
    description="Test execution of a specific task type.",
    request=TaskTestSerializer,
    responses={200: dict},
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class TaskTestView(APIView):
    """
    Test execution of a specific task type.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Test task execution"""
        serializer = TaskTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        task_type = serializer.validated_data["task_type"]
        force_run = serializer.validated_data.get("force_run", False)

        try:
            # Get task configuration
            task_config = TaskConfiguration.objects.get(task_type=task_type)

            # Check if task is enabled (unless force_run is True)
            if not task_config.enabled and not force_run:
                return Response(
                    {
                        "success": False,
                        "message": f"Task {task_type} is disabled. Use force_run=true to override.",
                        "task_type": task_type,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Execute the appropriate task
            try:
                # Test Redis connection first
                import redis

                r = redis.Redis(
                    host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=0
                )
                r.ping()

                if task_type == "invoice_generation":
                    result = generate_monthly_invoices.delay()
                    task_name = "Invoice Generation"
                elif task_type == "invoice_reminders":
                    result = send_invoice_reminders.delay()
                    task_name = "Invoice Reminders"
                else:
                    return Response(
                        {
                            "success": False,
                            "message": f"Unknown task type: {task_type}",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except redis.ConnectionError as redis_error:
                logger.error(f"Redis connection error: {redis_error}")
                return Response(
                    {
                        "success": False,
                        "message": f"Redis connection failed. Please ensure Redis is running.",
                        "task_type": task_type,
                        "error": str(redis_error),
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            except Exception as celery_error:
                logger.error(f"Celery connection error: {celery_error}")
                return Response(
                    {
                        "success": False,
                        "message": f"Celery service not available. Please ensure Redis and Celery worker are running.",
                        "task_type": task_type,
                        "error": str(celery_error),
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            # Update task configuration stats
            task_config.update_execution_stats(success=True)

            logger.info(
                f"Task {task_name} executed successfully by user {request.user.email}"
            )

            return Response(
                {
                    "success": True,
                    "message": f"{task_name} task executed successfully",
                    "task_id": str(result.id),
                    "task_type": task_type,
                    "executed_at": timezone.now().isoformat(),
                },
                status=status.HTTP_200_OK,
            )

        except TaskConfiguration.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": f"Task configuration not found for {task_type}",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error(f"Error executing task {task_type}: {str(e)}")

            # Update task configuration stats on error
            try:
                task_config = TaskConfiguration.objects.get(task_type=task_type)
                task_config.update_execution_stats(success=False)
            except TaskConfiguration.DoesNotExist:
                pass

            return Response(
                {
                    "success": False,
                    "message": f"Error executing task: {str(e)}",
                    "task_type": task_type,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Task Settings"],
    description="Get summary statistics for all task configurations.",
    responses={200: dict},
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class TaskSettingsSummaryView(APIView):
    """
    Get summary statistics for task configurations.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Get task settings summary"""
        try:
            # Get all task configurations
            task_configs = TaskConfiguration.objects.all()

            # Calculate summary statistics
            total_tasks = task_configs.count()
            enabled_tasks = task_configs.filter(enabled=True).count()
            active_tasks = task_configs.filter(status="active").count()

            total_executions = sum(config.execution_count for config in task_configs)
            total_errors = sum(config.error_count for config in task_configs)

            # Calculate overall success rate
            overall_success_rate = 0
            if total_executions + total_errors > 0:
                overall_success_rate = round(
                    (total_executions / (total_executions + total_errors)) * 100, 1
                )

            # Get recent activity (last 7 days)
            week_ago = timezone.now() - timezone.timedelta(days=7)
            recent_executions = sum(
                1
                for config in task_configs
                if config.last_run and config.last_run >= week_ago
            )

            # Get task-specific stats
            task_stats = {}
            for config in task_configs:
                task_stats[config.task_type] = {
                    "enabled": config.enabled,
                    "status": config.status,
                    "execution_count": config.execution_count,
                    "error_count": config.error_count,
                    "last_run": config.last_run.isoformat()
                    if config.last_run
                    else None,
                    "success_rate": round(
                        (
                            config.execution_count
                            / (config.execution_count + config.error_count)
                        )
                        * 100,
                        1,
                    )
                    if (config.execution_count + config.error_count) > 0
                    else 0,
                }

            return Response(
                {
                    "summary": {
                        "total_tasks": total_tasks,
                        "enabled_tasks": enabled_tasks,
                        "active_tasks": active_tasks,
                        "total_executions": total_executions,
                        "total_errors": total_errors,
                        "overall_success_rate": overall_success_rate,
                        "recent_executions": recent_executions,
                    },
                    "task_stats": task_stats,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error getting task settings summary: {str(e)}")
            return Response(
                {
                    "success": False,
                    "message": f"Error getting summary: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
