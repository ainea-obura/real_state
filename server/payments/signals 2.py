import datetime

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django_celery_beat.models import CrontabSchedule

from payments.models import Invoice, Receipt, TaskConfiguration
from payments.payouts.utils import (
    calculate_owner_payout,
)
from properties.models import PropertyOwner, PropertyService, PropertyTenant

# Import your payout calculation service (to be implemented)
# from payments.payouts.utils import calculate_owner_payout


def get_affected_payout_context(instance):
    """
    Extract owner, property_node, month, year from the changed instance.
    Returns a list of (owner, property_node, month, year) tuples to recalculate.
    """
    now = datetime.date.today()
    month = now.month
    year = now.year
    context = []
    if isinstance(instance, Invoice):
        # Invoice: get all owners for the property
        property_node = instance.property
        owners = PropertyOwner.objects.filter(node=property_node)
        for owner in owners:
            context.append((owner.owner_user, property_node, month, year))
    elif isinstance(instance, Receipt):
        # Receipt: get invoice, then property and owners
        invoice = instance.invoice
        property_node = invoice.property
        owners = PropertyOwner.objects.filter(node=property_node)
        for owner in owners:
            context.append((owner.owner_user, property_node, month, year))
    elif isinstance(instance, PropertyTenant):
        # PropertyTenant: get property and owners
        property_node = instance.node
        owners = PropertyOwner.objects.filter(node=property_node)
        for owner in owners:
            context.append((owner.owner_user, property_node, month, year))
    elif isinstance(instance, PropertyOwner):
        # PropertyOwner: get property and owner
        property_node = instance.node
        context.append((instance.owner_user, property_node, month, year))
    elif isinstance(instance, PropertyService):
        # PropertyService: get property and owners
        property_node = instance.property_node
        owners = PropertyOwner.objects.filter(node=property_node)
        for owner in owners:
            context.append((owner.owner_user, property_node, month, year))
    return context


def recalculate_owner_payout_for_instance(instance, **kwargs):
    context_list = get_affected_payout_context(instance)
    for owner, property_node, month, year in context_list:
        calculate_owner_payout(owner, property_node, month, year)


@receiver([post_save, post_delete], sender=Invoice)
@receiver([post_save, post_delete], sender=Receipt)
@receiver([post_save, post_delete], sender=PropertyTenant)
@receiver([post_save, post_delete], sender=PropertyOwner)
@receiver([post_save, post_delete], sender=PropertyService)
def payout_related_model_changed(sender, instance, **kwargs):
    recalculate_owner_payout_for_instance(instance, **kwargs)


@receiver(pre_save, sender=TaskConfiguration)
def validate_task_configuration(sender, instance, **kwargs):
    """
    Validate TaskConfiguration before saving to prevent duplicates
    """
    # Check for existing configurations with same task_type
    existing = TaskConfiguration.objects.filter(task_type=instance.task_type)
    if instance.pk:
        existing = existing.exclude(pk=instance.pk)

    if existing.exists():
        raise ValueError(f"TaskConfiguration for '{instance.task_type}' already exists")


@receiver(post_save, sender=TaskConfiguration)
def cleanup_duplicate_schedules(sender, instance, created, **kwargs):
    """
    Clean up duplicate CrontabSchedule records when TaskConfiguration is saved
    """
    try:
        # Find duplicate schedules with same values
        duplicates = CrontabSchedule.objects.filter(
            minute="*", hour="*", day_of_week="*", month_of_year="*"
        )

        if duplicates.count() > 1:
            # Keep the first one, delete the rest
            first_id = duplicates.first().id
            duplicates.exclude(id=first_id).delete()

    except Exception as e:
        # Log error but don't fail the save
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error cleaning up duplicate schedules: {e}")


@receiver([post_save, post_delete], sender=TaskConfiguration)
def task_configuration_changed(sender, instance, **kwargs):
    """
    Sync TaskConfiguration with django-celery-beat when configurations change.
    Only affects invoice and reminder tasks.
    """
    try:
        # Only sync if it's one of our two tasks
        if instance.task_type in ["invoice_generation", "invoice_reminders"]:
            import logging

            logger = logging.getLogger(__name__)
            logger.info(f"🔄 Signal triggered for {instance.task_type}")
            logger.info(f"  - execution_frequency: {instance.execution_frequency}")
            logger.info(f"  - enabled: {instance.enabled}")
            logger.info(f"  - frequency: {instance.frequency}")

            # Use direct function call instead of call_command
            from payments.scheduler import sync_task_configurations

            sync_task_configurations()

            logger.info(f"✅ Sync completed for {instance.task_type}")
    except Exception as e:
        # Log error but don't fail the save operation
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error syncing task schedules: {e}")
        import traceback

        logger.error(f"Traceback: {traceback.format_exc()}")
