import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "src.settings")

app = Celery("real_state")
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()


# Explicitly import tasks after Django is ready
def import_tasks():
    """Import tasks after Django is fully loaded"""
    try:
        import django

        django.setup()

        # Import tasks explicitly
        from payments.tasks import (
            calculate_single_owner_payout,
            calculate_all_owner_payouts_for_period,
            generate_monthly_invoices,
            send_invoice_reminders,
        )

        return True
    except Exception as e:
        print(f"Warning: Could not import tasks: {e}")
        return False


# Import tasks when the app is ready
import_tasks()
