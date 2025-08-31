from django.core.management.base import BaseCommand
from django_celery_beat.models import PeriodicTask, IntervalSchedule, CrontabSchedule
from payments.models import TaskConfiguration
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Sync TaskConfiguration with django-celery-beat PeriodicTask"

    def handle(self, *args, **options):
        try:
            # Get all task configurations
            task_configs = TaskConfiguration.objects.filter(
                task_type__in=["invoice_generation", "invoice_reminders"]
            )

            synced_count = 0
            for config in task_configs:
                if self.sync_task_config(config):
                    synced_count += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully synced {synced_count} task configurations"
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to sync task configurations: {e}")
            )

    def sync_task_config(self, config):
        """Sync a single TaskConfiguration with PeriodicTask"""
        task_name = f"{config.task_type}-task"

        # Create or update the schedule first
        schedule = self.create_schedule(config)
        if not schedule:
            self.stdout.write(
                self.style.WARNING(f"  Could not create schedule for: {task_name}")
            )
            return False

        # Get or create the periodic task with the schedule
        periodic_task, created = PeriodicTask.objects.get_or_create(
            name=task_name,
            defaults={
                "task": f"payments.tasks.{self.get_task_function_name(config.task_type)}",
                "enabled": config.enabled,
                "crontab": schedule,
            },
        )

        # Update task details
        periodic_task.task = (
            f"payments.tasks.{self.get_task_function_name(config.task_type)}"
        )
        periodic_task.enabled = config.enabled
        periodic_task.crontab = schedule
        periodic_task.interval = None  # Clear interval if it was set
        periodic_task.save()

        status = "created" if created else "updated"
        self.stdout.write(f"  {status} task: {task_name}")
        return True

    def create_schedule(self, config):
        """Create CrontabSchedule based on TaskConfiguration execution_frequency"""
        try:
            # Map execution_frequency to cron schedule
            cron_mapping = {
                "every_minute": {"minute": "*", "hour": "*", "day_of_week": "*", "day_of_month": "*", "month_of_year": "*"},
                "every_hour": {"minute": "0", "hour": "*", "day_of_week": "*", "day_of_month": "*", "month_of_year": "*"},
                "every_4_hours": {"minute": "0", "hour": "0,4,8,12,16,20", "day_of_week": "*", "day_of_month": "*", "month_of_year": "*"},
                "every_6_hours": {"minute": "0", "hour": "0,6,12,18", "day_of_week": "*", "day_of_month": "*", "month_of_year": "*"},
                "once_daily": {"minute": "0", "hour": "9", "day_of_week": "*", "day_of_month": "*", "month_of_year": "*"},
            }
            
            cron_settings = cron_mapping.get(config.execution_frequency, cron_mapping["once_daily"])
            
            schedule, created = CrontabSchedule.objects.get_or_create(
                minute=cron_settings["minute"],
                hour=cron_settings["hour"],
                day_of_week=cron_settings["day_of_week"],
                day_of_month=cron_settings["day_of_month"],
                month_of_year=cron_settings["month_of_year"],
            )
            return schedule

        except Exception as e:
            self.stdout.write(f"    Error creating schedule: {e}")
            return None

    def get_task_function_name(self, task_type):
        """Map task type to actual function name"""
        task_mapping = {
            "invoice_generation": "generate_monthly_invoices",
            "invoice_reminders": "send_invoice_reminders",
        }
        return task_mapping.get(task_type, task_type)
