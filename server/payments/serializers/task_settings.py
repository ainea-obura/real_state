from rest_framework import serializers

from payments.models import TaskConfiguration


class TaskConfigurationSerializer(serializers.ModelSerializer):
    """
    Serializer for TaskConfiguration model.
    Handles CRUD operations for task settings.
    """

    task_type_display = serializers.CharField(
        source="get_task_type_display",
        read_only=True,
        help_text="Human-readable task type name",
    )

    frequency_display = serializers.CharField(
        source="get_frequency_display",
        read_only=True,
        help_text="Human-readable frequency name",
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
        help_text="Human-readable status name",
    )

    last_run_status_display = serializers.CharField(
        source="get_last_run_status_display",
        read_only=True,
        help_text="Human-readable last run status name",
    )

    cron_expression = serializers.SerializerMethodField(
        help_text="Generated cron expression for Celery Beat"
    )

    last_run_formatted = serializers.SerializerMethodField(
        help_text="Formatted last run date/time"
    )

    success_rate = serializers.SerializerMethodField(
        help_text="Success rate percentage based on execution stats"
    )

    class Meta:
        model = TaskConfiguration
        fields = [
            "id",
            "task_type",
            "task_type_display",
            "enabled",
            "frequency",
            "frequency_display",
            "time",
            "execution_frequency",
            "day_of_week",
            "day_of_month",
            "before_due_days",
            "after_due_days",
            "status",
            "status_display",
            "last_run",
            "last_run_formatted",
            "last_run_status",
            "last_run_status_display",
            "execution_count",
            "error_count",
            "success_rate",
            "notes",
            "cron_expression",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "last_run",
            "last_run_status",
            "execution_count",
            "error_count",
        ]

    def get_cron_expression(self, obj):
        """Get the cron expression for this task configuration"""
        return obj.get_cron_expression()

    def get_last_run_formatted(self, obj):
        """Format last run datetime for display"""
        if obj.last_run:
            return obj.last_run.strftime("%Y-%m-%d %H:%M:%S")
        return None

    def get_success_rate(self, obj):
        """Calculate success rate percentage"""
        total = obj.execution_count + obj.error_count
        if total == 0:
            return 0
        return round((obj.execution_count / total) * 100, 1)

    def validate(self, data):
        """Custom validation for task configuration"""
        frequency = data.get("frequency")
        day_of_week = data.get("day_of_week")
        day_of_month = data.get("day_of_month")
        task_type = data.get("task_type")
        before_due_days = data.get("before_due_days")
        after_due_days = data.get("after_due_days")

        # Validate weekly frequency requires day_of_week
        if frequency == "weekly" and not day_of_week:
            raise serializers.ValidationError(
                "Day of week is required for weekly frequency"
            )

        # Validate monthly frequency requires day_of_month
        if frequency == "monthly" and not day_of_month:
            raise serializers.ValidationError(
                "Day of month is required for monthly frequency"
            )

        # Validate day_of_month range
        if day_of_month and not (1 <= day_of_month <= 31):
            raise serializers.ValidationError("Day of month must be between 1 and 31")

        # Validate reminder-specific fields
        if task_type == "invoice_reminders":
            if before_due_days is None and after_due_days is None:
                raise serializers.ValidationError(
                    "At least one reminder day (before or after) is required for invoice reminders"
                )

            if before_due_days is not None and not (0 <= before_due_days <= 30):
                raise serializers.ValidationError(
                    "Before due days must be between 0 and 30"
                )

            if after_due_days is not None and not (0 <= after_due_days <= 30):
                raise serializers.ValidationError(
                    "After due days must be between 0 and 30"
                )

        return data


class TaskConfigurationListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing task configurations.
    Used in list views to reduce payload size.
    """

    task_type_display = serializers.CharField(
        source="get_task_type_display", read_only=True
    )

    frequency_display = serializers.CharField(
        source="get_frequency_display", read_only=True
    )

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    last_run_formatted = serializers.SerializerMethodField()

    class Meta:
        model = TaskConfiguration
        fields = [
            "id",
            "task_type",
            "task_type_display",
            "enabled",
            "frequency",
            "frequency_display",
            "time",
            "execution_frequency",
            "day_of_week",
            "day_of_month",
            "before_due_days",
            "after_due_days",
            "status",
            "status_display",
            "last_run",
            "last_run_formatted",
            "last_run_status",
            "execution_count",
            "error_count",
            "notes",
            "created_at",
            "updated_at",
        ]

    def get_last_run_formatted(self, obj):
        if obj.last_run:
            return obj.last_run.strftime("%Y-%m-%d %H:%M:%S")
        return None


class TaskConfigurationUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating task configurations.
    Allows partial updates and tracks who made the changes.
    """

    class Meta:
        model = TaskConfiguration
        fields = [
            "enabled",
            "frequency",
            "time",
            "execution_frequency",
            "day_of_week",
            "day_of_month",
            "before_due_days",
            "after_due_days",
            "status",
            "notes",
        ]

    def validate(self, data):
        """Custom validation for updates"""
        frequency = data.get("frequency")
        day_of_week = data.get("day_of_week")
        day_of_month = data.get("day_of_month")
        task_type = self.instance.task_type if self.instance else None
        before_due_days = data.get("before_due_days")
        after_due_days = data.get("after_due_days")

        # Validate weekly frequency requires day_of_week
        if frequency == "weekly" and not day_of_week:
            raise serializers.ValidationError(
                "Day of week is required for weekly frequency"
            )

        # Validate monthly frequency requires day_of_month
        if frequency == "monthly" and not day_of_month:
            raise serializers.ValidationError(
                "Day of month is required for monthly frequency"
            )

        # Validate day_of_month range
        if day_of_month and not (1 <= day_of_month <= 31):
            raise serializers.ValidationError("Day of month must be between 1 and 31")

        # Validate reminder-specific fields
        if task_type == "invoice_reminders":
            if before_due_days is None and after_due_days is None:
                raise serializers.ValidationError(
                    "At least one reminder day (before or after) is required for invoice reminders"
                )

            if before_due_days is not None and not (0 <= before_due_days <= 30):
                raise serializers.ValidationError(
                    "Before due days must be between 0 and 30"
                )

            if after_due_days is not None and not (0 <= after_due_days <= 30):
                raise serializers.ValidationError(
                    "After due days must be between 0 and 30"
                )

        return data


class TaskTestSerializer(serializers.Serializer):
    """
    Serializer for testing task execution.
    """

    task_type = serializers.ChoiceField(
        choices=TaskConfiguration.TASK_TYPE_CHOICES, help_text="Type of task to test"
    )

    force_run = serializers.BooleanField(
        default=False, help_text="Force run the task even if disabled"
    )
