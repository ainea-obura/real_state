from django.core.management.base import BaseCommand
from payments.scheduler import update_celery_schedule


class Command(BaseCommand):
    help = "Update Celery Beat schedule with database configurations"

    def handle(self, *args, **options):
        try:
            update_celery_schedule()
            self.stdout.write(
                self.style.SUCCESS("Successfully updated Celery Beat schedule")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to update Celery Beat schedule: {e}")
            ) 