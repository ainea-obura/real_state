import logging
from celery.schedules import crontab
from django.utils import timezone
from payments.models import TaskConfiguration
from django_celery_beat.models import PeriodicTask, CrontabSchedule

logger = logging.getLogger(__name__)


def sync_task_configurations():
    """
    Sync TaskConfiguration with django-celery-beat PeriodicTask.
    This function can be called directly without using call_command.
    """
    try:
        # Get all task configurations
        task_configs = TaskConfiguration.objects.filter(
            task_type__in=["invoice_generation", "invoice_reminders"]
        )

        synced_count = 0
        for config in task_configs:
            if _sync_single_task_config(config):
                synced_count += 1

        logger.info(f"Successfully synced {synced_count} task configurations")
        return synced_count

    except Exception as e:
        logger.error(f"Failed to sync task configurations: {e}")
        return 0


def _sync_single_task_config(config):
    """Sync a single TaskConfiguration with PeriodicTask"""
    try:
        task_name = f"{config.task_type}-task"

        # Create or update the schedule first
        schedule = _create_schedule_for_config(config)
        if not schedule:
            logger.warning(f"Could not create schedule for: {task_name}")
            return False

        # Get or create the periodic task with the schedule
        periodic_task, created = PeriodicTask.objects.get_or_create(
            name=task_name,
            defaults={
                "task": f"payments.tasks.{_get_task_function_name(config.task_type)}",
                "enabled": config.enabled,
                "crontab": schedule,
            },
        )

        # Update task details
        periodic_task.task = (
            f"payments.tasks.{_get_task_function_name(config.task_type)}"
        )
        periodic_task.enabled = config.enabled
        periodic_task.crontab = schedule
        periodic_task.interval = None  # Clear interval if it was set
        periodic_task.save()

        status = "created" if created else "updated"
        logger.info(f"{status} task: {task_name}")
        return True

    except Exception as e:
        logger.error(f"Error syncing task config {config.task_type}: {e}")
        return False


def _create_schedule_for_config(config):
    """Create CrontabSchedule based on TaskConfiguration execution_frequency"""
    try:
        # Map execution_frequency to cron schedule
        cron_mapping = {
            "every_minute": {
                "minute": "*",
                "hour": "*",
                "day_of_week": "*",
                "day_of_month": "*",
                "month_of_year": "*",
            },
            "every_hour": {
                "minute": "0",
                "hour": "*",
                "day_of_week": "*",
                "day_of_month": "*",
                "month_of_year": "*",
            },
            "every_4_hours": {
                "minute": "0",
                "hour": "0,4,8,12,16,20",
                "day_of_week": "*",
                "day_of_month": "*",
                "month_of_year": "*",
            },
            "every_6_hours": {
                "minute": "0",
                "hour": "0,6,12,18",
                "day_of_week": "*",
                "day_of_month": "*",
                "month_of_year": "*",
            },
            "once_daily": {
                "minute": "0",
                "hour": "9",
                "day_of_week": "*",
                "day_of_month": "*",
                "month_of_year": "*",
            },
        }

        cron_settings = cron_mapping.get(
            config.execution_frequency, cron_mapping["once_daily"]
        )

        schedule, created = CrontabSchedule.objects.get_or_create(
            minute=cron_settings["minute"],
            hour=cron_settings["hour"],
            day_of_week=cron_settings["day_of_week"],
            day_of_month=cron_settings["day_of_month"],
            month_of_year=cron_settings["month_of_year"],
        )
        return schedule

    except Exception as e:
        logger.error(f"Error creating schedule: {e}")
        return None


def get_dynamic_schedule():
    """
    Get dynamic schedule from database configurations.
    Only handles invoice_generation and invoice_reminders tasks.
    """
    schedule = {}

    try:
        # Get only the two tasks we care about
        task_configs = TaskConfiguration.objects.filter(
            task_type__in=["invoice_generation", "invoice_reminders"],
            enabled=True,
            status="active",
        )

        # If no task configs found, create default configurations
        if task_configs.count() == 0:
            logger.info(
                "No task configurations found. Creating default configurations..."
            )

            # Create default invoice generation config
            invoice_gen_config = TaskConfiguration.objects.create(
                task_type="invoice_generation",
                enabled=True,
                frequency="daily",
                time=timezone.datetime.strptime("09:00", "%H:%M").time(),
                execution_frequency="every_4_hours",
                status="active",
                notes="Auto-created default configuration for invoice generation",
            )

            # Create default invoice reminders config
            invoice_reminder_config = TaskConfiguration.objects.create(
                task_type="invoice_reminders",
                enabled=True,
                frequency="daily",
                time=timezone.datetime.strptime("10:00", "%H:%M").time(),
                execution_frequency="once_daily",
                status="active",
                before_due_days=3,
                notes="Auto-created default configuration for invoice reminders",
            )

            logger.info(
                "Created default task configurations for invoice generation and reminders"
            )

            # Re-query to get the newly created configs
            task_configs = TaskConfiguration.objects.filter(
                task_type__in=["invoice_generation", "invoice_reminders"],
                enabled=True,
                status="active",
            )

        for config in task_configs:
            task_name = f"{config.task_type}-task"

            # Generate cron expression based on configuration
            cron_expr = _generate_cron_expression(config)

            if cron_expr:
                schedule[task_name] = {
                    "task": f"payments.tasks.{_get_task_function_name(config.task_type)}",
                    "schedule": cron_expr,
                    "args": [],
                }

                logger.info(f"Scheduled task {config.task_type} with cron: {cron_expr}")
            else:
                logger.warning(
                    f"Could not generate cron expression for task {config.task_type}"
                )

    except Exception as e:
        logger.error(f"Error loading dynamic schedule: {e}")
        # Return empty schedule if there's an error
        return {}

    return schedule


def _generate_cron_expression(config):
    """
    Generate cron expression based on task configuration.
    """
    try:
        hour = config.time.hour
        minute = config.time.minute

        if config.frequency == "daily":
            return crontab(minute=minute, hour=hour)

        elif config.frequency == "weekly" and config.day_of_week:
            # Map day names to numbers (0=Sunday, 1=Monday, etc.)
            day_map = {
                "sunday": 0,
                "monday": 1,
                "tuesday": 2,
                "wednesday": 3,
                "thursday": 4,
                "friday": 5,
                "saturday": 6,
            }
            day_of_week = day_map.get(config.day_of_week.lower(), 1)
            return crontab(minute=minute, hour=hour, day_of_week=day_of_week)

        elif config.frequency == "monthly" and config.day_of_month:
            return crontab(minute=minute, hour=hour, day_of_month=config.day_of_month)

        else:
            logger.warning(f"Invalid configuration for task {config.task_type}")
            return None

    except Exception as e:
        logger.error(f"Error generating cron expression: {e}")
        return None


def _get_task_function_name(task_type):
    """
    Map task type to actual function name.
    """
    task_mapping = {
        "invoice_generation": "generate_monthly_invoices",
        "invoice_reminders": "send_invoice_reminders",
    }

    return task_mapping.get(task_type, task_type)


def update_celery_schedule():
    """
    Update Celery Beat schedule with database configurations.
    Only affects invoice and reminder tasks.
    """
    try:
        from celery import current_app
        from django.conf import settings

        # Get dynamic schedule for our two tasks
        dynamic_schedule = get_dynamic_schedule()

        # Keep the original payout task schedule
        original_schedule = {
            "monthly-owner-payouts": {
                "task": "payments.tasks.calculate_all_owner_payouts_for_period",
                "schedule": crontab(minute="*/1"),  # Keep as is
                "args": [],
            },
        }

        # Merge original schedule with dynamic schedule
        updated_schedule = {**original_schedule, **dynamic_schedule}

        # Update Celery Beat schedule
        current_app.conf.beat_schedule = updated_schedule

        logger.info(
            f"Updated Celery Beat schedule with {len(dynamic_schedule)} dynamic tasks + 1 static task"
        )

    except Exception as e:
        logger.error(f"Error updating Celery Beat schedule: {e}")


def get_task_status():
    """
    Get status of task configurations.
    """
    try:
        configs = TaskConfiguration.objects.filter(
            task_type__in=["invoice_generation", "invoice_reminders"]
        )
        status = {}

        for config in configs:
            status[config.task_type] = {
                "enabled": config.enabled,
                "status": config.status,
                "last_run": config.last_run,
                "last_run_status": config.last_run_status,
                "execution_count": config.execution_count,
                "error_count": config.error_count,
                "success_rate": (
                    config.success_rate if hasattr(config, "success_rate") else 0
                ),
            }

        return status

    except Exception as e:
        logger.error(f"Error getting task status: {e}")
        return {}
