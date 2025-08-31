from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    name = "payments"

    def ready(self):
        # Import signals to register them
        try:
            from . import signals
        except ImportError:
            pass

        # Note: sync_task_schedules removed to avoid async context issues
        # Run manually when needed: python manage.py sync_task_schedules
