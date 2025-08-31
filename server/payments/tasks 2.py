import datetime
import logging

from datetime import timedelta

from celery import shared_task
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from accounts.models import Users
from payments.models import Invoice, InvoiceItem, Payout
from payments.payouts.utils import (
    get_collected_rent_for_property,
    get_conditional_service_charge,
    get_full_management_properties_for_owner,
    get_owner_invoices_with_service_charge,
)
from properties.models import PropertyTenant, PropertyOwner
from utils.invoice import get_missing_invoice_items, send_invoice_email

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def calculate_single_owner_payout(self, owner_id, payout_month, payout_year):
    """
    Calculate payout for a single owner - more reliable and scalable
    """
    try:
        # Use select_related to avoid extra queries
        owner = Users.objects.select_related().get(id=owner_id, type="owner")

        properties = get_full_management_properties_for_owner(owner)

        # Calculate period dates once
        period_start = datetime.date(payout_year, payout_month, 1)
        if payout_month == 12:
            period_end = datetime.date(payout_year + 1, 1, 1) - datetime.timedelta(
                days=1
            )
        else:
            period_end = datetime.date(
                payout_year, payout_month + 1, 1
            ) - datetime.timedelta(days=1)

        processed_count = 0
        for property_node in properties:
            try:
                _process_single_property(
                    owner,
                    property_node,
                    payout_month,
                    payout_year,
                    period_start,
                    period_end,
                )
                processed_count += 1
            except Exception as property_error:
                logger.error(
                    f"Failed to process property {getattr(property_node, 'id', None)}: {property_error}"
                )
                # Continue processing other properties instead of failing entire owner
                continue

        return {"owner_id": owner_id, "properties_processed": processed_count}

    except Users.DoesNotExist:
        logger.error(f"Owner {owner_id} not found")
        return {"error": "Owner not found"}
    except Exception as exc:
        logger.error(f"Failed to process owner {owner_id}: {exc}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2**self.request.retries))


def _process_single_property(
    owner, property_node, payout_month, payout_year, period_start, period_end
):
    """
    Extract property processing logic to separate function for better error handling
    Updated logic:
    - Check if property has active tenants
    - Get rent collected
    - Get conditional service charge (only if unpaid owner invoices with SERVICE_CHARGE items exist)
    - Calculate balance as: rent collected - conditional service charge
    """

    # Optimize queries with select_related
    active_tenants = PropertyTenant.objects.filter(
        node=property_node,
        contract_start__lte=period_end,
        contract_end__gte=period_start,
        is_deleted=False,
    ).select_related("node")

    # Get rent collected
    rent_collected = (
        get_collected_rent_for_property(property_node, payout_month, payout_year) or 0
    )

    # Get conditional service charge (updated logic: independent of rent)
    service_charge = get_conditional_service_charge(
        property_node, payout_month, payout_year
    )

    # Check for existing invoices to add note (if service_charge == 0 due to invoice)
    payout_notes = ""
    if service_charge == 0:
        invoices = get_owner_invoices_with_service_charge(
            property_node, payout_month, payout_year
        )
        if invoices:
            invoice_num = invoices[
                0
            ].invoice_number  # Use first invoice; adjust if multiple
            payout_notes = f"Invoice {invoice_num} is applied to the service charge"

    logger.info(
        f"      Current month ({payout_year}-{payout_month:02d}) rent collected: {rent_collected}"
    )
    logger.info(f"      Service charge (conditional): {service_charge}")

    # Calculate payout amounts
    if not active_tenants.exists():
        logger.info(f"      No active tenants for this property in this period.")
        rent_collected = 0

    # Balance = rent collected - conditional service charge
    # (Service charge now applied even if rent == 0, per updated logic)
    balance = rent_collected - service_charge

    logger.info(
        f"      Rent: {rent_collected}, Service Charge: {service_charge}, Balance: {balance}"
    )

    # Skip creating/updating if balance is zero or negative
    if balance <= 0:
        logger.info(
            f"      Skipping zero/negative payout for property {property_node.id}"
        )
        # Optionally delete existing zero payout if it exists
        Payout.objects.filter(
            owner=owner,
            property_node=property_node,
            month=payout_month,
            year=payout_year,
            net_amount__lte=0,
        ).delete()
        return

    # Use atomic transaction for each property
    with transaction.atomic():
        payout, created = Payout.objects.update_or_create(
            owner=owner,
            property_node=property_node,
            month=payout_month,
            year=payout_year,
            defaults={
                "rent_collected": rent_collected,
                "services_expenses": 0,  # No longer used
                "management_fee": service_charge,  # Now stores conditional service charge
                "net_amount": balance,
                "status": "pending",
                "payout_date": None,
                "notes": payout_notes,  # Add note about invoice if applicable
            },
        )
        logger.info(f"      Payout {'created' if created else 'updated'}")


@shared_task(bind=True)
def calculate_all_owner_payouts_for_period(self):
    """
    Dispatch payout calculations to individual tasks for better reliability
    """
    today = datetime.date.today()
    payout_month = today.month
    payout_year = today.year

    # Get owner IDs only - don't load full objects
    owner_ids = list(Users.objects.filter(type="owner").values_list("id", flat=True))

    # Track progress with cache
    cache_key = f"payout_batch_{payout_year}_{payout_month}"
    cache.set(cache_key, {"total": len(owner_ids), "completed": 0}, timeout=3600)

    # Dispatch individual tasks
    task_ids = []
    for owner_id in owner_ids:
        task = calculate_single_owner_payout.delay(owner_id, payout_month, payout_year)
        task_ids.append(task.id)
    return {
        "batch_id": cache_key,
        "total_owners": len(owner_ids),
        "task_ids": task_ids[:10],  # Return first 10 task IDs for monitoring
    }


@shared_task(bind=True, max_retries=3)
def generate_monthly_invoices(self):
    """
    Generate invoices for all active tenants - checks database configuration
    """
    logger.info("📄 Invoice Generation Task Started")

    # Check if task is enabled in database
    try:
        from payments.models import TaskConfiguration

        task_config = TaskConfiguration.objects.filter(
            task_type="invoice_generation", enabled=True, status="active"
        ).first()

        if not task_config:
            logger.info("Invoice generation task is disabled or not configured")
            return {"status": "skipped", "reason": "task_disabled_or_not_configured"}

    except Exception as e:
        logger.error(f"Error checking task configuration: {e}")
        # Continue with execution if we can't check configuration
        logger.warning("Proceeding with default configuration")

    now = timezone.now()
    year, month = now.year, now.month
    period_label = now.strftime("%B %Y")

    # Get all active tenants and owners
    tenants = PropertyTenant.objects.filter(is_deleted=False).select_related(
        "tenant_user", "node"
    )
    owners = PropertyOwner.objects.filter(is_deleted=False).select_related(
        "owner_user", "node"
    )

    if not tenants.exists() and not owners.exists():
        logger.info("No active tenants or owners found")
        return {"generated": 0, "skipped": 0, "errors": 0, "reason": "no_tenants_or_owners"}

    generated_count = 0
    skipped_count = 0
    error_count = 0

    for tenant in tenants:
        try:
            user = tenant.tenant_user
            node = tenant.node

            # Check if invoice already exists for this month
            # existing_invoice = Invoice.objects.filter(
            #     tenants=tenant,
            #     property=node,
            #     issue_date__year=year,
            #     issue_date__month=month,
            #     status__in=["ISSUED", "PARTIAL", "PAID", "OVERDUE", "DRAFT"],
            # ).first()

            # if existing_invoice:
            #     skipped_count += 1
            #     continue

            # Get missing invoice items
            items = get_missing_invoice_items(
                user=user,
                node=node,
                year=year,
                month=month,
                user_type="tenant",
                period_label=period_label,
            )

            print("*****************************************************")
            print(items)
            print("*****************************************************")

            if not items:
                skipped_count += 1
                continue

            # Filter out items based on user type
            filtered_items = []
            for item in items:
                item_type = item.get("type", "").lower()
                # For tenants: exclude variable items
                if item_type != "variable":
                    filtered_items.append(item)

            if not filtered_items:
                skipped_count += 1
                continue

            # Create invoice with proper tax and discount handling
            invoice = Invoice.objects.create(
                issue_date=now,
                due_date=now + timedelta(days=10),
                status="ISSUED",
                description=f"Auto-generated invoice for {period_label}",
                discount=0,  # Default discount
                tax_percentage=0,  # Default tax percentage
                total_amount=0,
                balance=0,
                property=node,
            )
            invoice.tenants.add(tenant)

            # Create invoice items with proper structure
            subtotal = 0
            for item in filtered_items:
                # Handle amount, quantity, price structure
                amount = item.get("amount", 0)
                quantity = item.get("quantity", 1)
                price = amount * quantity

                # Handle service linking
                service = None
                if item.get("serviceId"):
                    try:
                        from properties.models import PropertyService

                        service = PropertyService.objects.get(pk=item["serviceId"])
                    except PropertyService.DoesNotExist:
                        pass

                # Handle penalty linking
                penalty = None
                if item.get("penaltyId"):
                    try:
                        from payments.models import Penalty

                        penalty = Penalty.objects.get(pk=item["penaltyId"])
                        penalty.status = "applied_to_invoice"
                        penalty.linked_invoice = invoice
                        penalty.save()
                    except Penalty.DoesNotExist:
                        pass

                InvoiceItem.objects.create(
                    invoice=invoice,
                    type=item["type"].upper(),
                    name=item["description"],
                    amount=amount,
                    quantity=quantity,
                    price=price,
                    service=service,
                    penalty=penalty,
                )
                subtotal += price

            # Calculate totals with tax and discount (like manual creation)
            tax_amount = (
                (float(subtotal) * float(invoice.tax_percentage) / 100)
                if invoice.tax_percentage
                else 0
            )
            discount_amount = (
                (float(subtotal) * float(invoice.discount) / 100)
                if invoice.discount
                else 0
            )
            total_amount = float(subtotal) + tax_amount - discount_amount

            # Update invoice totals
            invoice.total_amount = subtotal
            invoice.balance = total_amount
            invoice.save()

            logger.info(f"Invoice {invoice.invoice_number} created for {user.email}")

            # Send email using your existing system
            if user.email:
                try:
                    send_invoice_email(invoice, user)
                    logger.info(f"Invoice email sent to {user.email}")
                except Exception as e:
                    logger.warning(f"Failed to send invoice email to {user.email}: {e}")
                    error_count += 1

            generated_count += 1

        except Exception as e:
            logger.error(f"Error generating invoice for tenant {tenant.id}: {e}")
            error_count += 1

    # Process owners
    logger.info(f"Processing {owners.count()} owners...")
    for owner in owners:
        try:
            user = owner.owner_user
            node = owner.node

            # Check if invoice already exists for this month
            existing_invoice = Invoice.objects.filter(
                owners=owner,
                property=node,
                issue_date__year=year,
                issue_date__month=month,
                status__in=["ISSUED", "PARTIAL", "PAID", "OVERDUE", "DRAFT"],
            ).first()

            if existing_invoice:
                skipped_count += 1
                continue

            # Get missing invoice items
            items = get_missing_invoice_items(
                user=user,
                node=node,
                year=year,
                month=month,
                user_type="owner",
                period_label=period_label,
            )

            if not items:
                skipped_count += 1
                continue

            # Filter out items based on user type
            filtered_items = []
            for item in items:
                item_type = item.get("type", "").lower()
                # For owners: exclude service_charge items
                if item_type != "service_charge":
                    filtered_items.append(item)

            if not filtered_items:
                skipped_count += 1
                continue

            # Create invoice with proper tax and discount handling
            invoice = Invoice.objects.create(
                issue_date=now,
                due_date=now + timedelta(days=10),
                status="ISSUED",
                description=f"Auto-generated invoice for {period_label}",
                discount=0,  # Default discount
                tax_percentage=0,  # Default tax percentage
                total_amount=0,
                balance=0,
                property=node,
            )
            invoice.owners.add(owner)

            # Create invoice items with proper structure
            subtotal = 0
            for item in filtered_items:
                # Handle amount, quantity, price structure
                amount = item.get("amount", 0)
                quantity = item.get("quantity", 1)
                price = amount * quantity

                # Handle service linking
                service = None
                if item.get("serviceId"):
                    try:
                        from properties.models import PropertyService

                        service = PropertyService.objects.get(pk=item["serviceId"])
                    except PropertyService.DoesNotExist:
                        pass

                # Handle penalty linking
                penalty = None
                if item.get("penaltyId"):
                    try:
                        from payments.models import Penalty

                        penalty = Penalty.objects.get(pk=item["penaltyId"])
                        penalty.status = "applied_to_invoice"
                        penalty.linked_invoice = invoice
                        penalty.save()
                    except Penalty.DoesNotExist:
                        pass

                InvoiceItem.objects.create(
                    invoice=invoice,
                    type=item["type"].upper(),
                    name=item["description"],
                    amount=amount,
                    quantity=quantity,
                    price=price,
                    service=service,
                    penalty=penalty,
                )
                subtotal += price

            # Calculate totals with tax and discount (like manual creation)
            tax_amount = (
                (float(subtotal) * float(invoice.tax_percentage) / 100)
                if invoice.tax_percentage
                else 0
            )
            discount_amount = (
                (float(subtotal) * float(invoice.discount) / 100)
                if invoice.discount
                else 0
            )
            total_amount = float(subtotal) + tax_amount - discount_amount

            # Update invoice totals
            invoice.total_amount = subtotal
            invoice.balance = total_amount
            invoice.save()

            logger.info(f"Invoice {invoice.invoice_number} created for {user.email}")

            # Send email using your existing system
            if user.email:
                try:
                    send_invoice_email(invoice, user)
                    logger.info(f"Invoice email sent to {user.email}")
                except Exception as e:
                    logger.warning(f"Failed to send invoice email to {user.email}: {e}")
                    error_count += 1

            generated_count += 1

        except Exception as e:
            logger.error(f"Error generating invoice for owner {owner.id}: {e}")
            error_count += 1

    logger.info(
        f"📄 Invoice Generation: {generated_count} generated, {skipped_count} skipped, {error_count} errors"
    )

    # Update task configuration statistics
    try:
        if task_config:
            task_config.update_execution_stats(success=True)
    except Exception as e:
        logger.error(f"Error updating task statistics: {e}")

    return {
        "generated": generated_count,
        "skipped": skipped_count,
        "errors": error_count,
        "tenant_processed": tenants.count(),
        "owner_processed": owners.count(),
    }


def _get_invoice_reminder_candidates(before_due_days, after_due_days):
    """
    Helper function to get invoices that need reminders with detailed logging
    """
    today = timezone.now().date()
    upcoming_reminder_date = today + timezone.timedelta(days=before_due_days)
    overdue_reminder_date = today - timezone.timedelta(days=after_due_days)

    logger.info(f"🔍 Invoice Reminder Analysis:")
    logger.info(f"  Today: {today}")
    logger.info(
        f"  Upcoming reminder date: {upcoming_reminder_date} (due in {before_due_days} days)"
    )
    logger.info(
        f"  Overdue reminder date: {overdue_reminder_date} (due {after_due_days} days ago)"
    )

    from django.db.models import Q

    # Get all relevant invoices for analysis
    all_relevant = (
        Invoice.objects.filter(
            status__in=["ISSUED", "PARTIAL", "OVERDUE"],
            balance__gt=0,
        )
        .select_related("property")
        .prefetch_related("tenants__tenant_user")
    )

    # 1. Upcoming reminders (due in X days)
    upcoming_invoices = all_relevant.filter(due_date=upcoming_reminder_date)

    # 2. Overdue reminders (due X days ago)
    overdue_reminder_invoices = all_relevant.filter(due_date=overdue_reminder_date)

    # 3. Overdue invoices (past due date) - FIXED LOGIC
    overdue_invoices = all_relevant.filter(
        Q(due_date__lt=today)  # Past due date
        & Q(status__in=["ISSUED", "PARTIAL", "OVERDUE"])  # Any unpaid status
    )

    logger.info(f"📊 Invoice Counts:")
    logger.info(f"  Upcoming reminders: {upcoming_invoices.count()}")
    logger.info(f"  Overdue reminders: {overdue_reminder_invoices.count()}")
    logger.info(f"  Overdue invoices: {overdue_invoices.count()}")

    # Combine all candidates
    candidates = (
        upcoming_invoices | overdue_reminder_invoices | overdue_invoices
    ).distinct()

    logger.info(f"  Total candidates: {candidates.count()}")

    # Log some examples for debugging
    for invoice in candidates[:5]:  # Show first 5
        tenants = list(invoice.tenants.all())
        tenant_emails = [t.tenant_user.email for t in tenants if t.tenant_user.email]
        is_overdue = invoice.due_date < today
        overdue_status = "OVERDUE" if is_overdue else "OK"
        logger.info(
            f"  📄 Invoice {invoice.invoice_number}: Due {invoice.due_date}, Balance {invoice.balance}, Status {invoice.status}, Overdue: {overdue_status}, Tenants: {tenant_emails}"
        )

    return candidates, upcoming_reminder_date, overdue_reminder_date


def _get_owner_invoice_reminder_candidates(before_due_days, after_due_days):
    """
    Helper function to get owner invoices that need reminders with detailed logging
    """
    today = timezone.now().date()
    upcoming_reminder_date = today + timezone.timedelta(days=before_due_days)
    overdue_reminder_date = today - timezone.timedelta(days=after_due_days)

    logger.info(f"🔍 Owner Invoice Reminder Analysis:")
    logger.info(f"  Today: {today}")
    logger.info(
        f"  Upcoming reminder date: {upcoming_reminder_date} (due in {before_due_days} days)"
    )
    logger.info(
        f"  Overdue reminder date: {overdue_reminder_date} (due {after_due_days} days ago)"
    )

    from django.db.models import Q

    # Get all relevant owner invoices for analysis
    all_relevant = (
        Invoice.objects.filter(
            status__in=["ISSUED", "PARTIAL", "OVERDUE"],
            balance__gt=0,
            owners__isnull=False,  # Only owner invoices
        )
        .select_related("property")
        .prefetch_related("owners__owner_user")
    )

    # 1. Upcoming reminders (due in X days)
    upcoming_invoices = all_relevant.filter(due_date=upcoming_reminder_date)

    # 2. Overdue reminders (due X days ago)
    overdue_reminder_invoices = all_relevant.filter(due_date=overdue_reminder_date)

    # 3. Overdue invoices (past due date) - FIXED LOGIC
    overdue_invoices = all_relevant.filter(
        Q(due_date__lt=today)  # Past due date
        & Q(status__in=["ISSUED", "PARTIAL", "OVERDUE"])  # Any unpaid status
    )

    logger.info(f"📊 Owner Invoice Counts:")
    logger.info(f"  Upcoming reminders: {upcoming_invoices.count()}")
    logger.info(f"  Overdue reminders: {overdue_reminder_invoices.count()}")
    logger.info(f"  Overdue invoices: {overdue_invoices.count()}")

    # Combine all candidates
    candidates = (
        upcoming_invoices | overdue_reminder_invoices | overdue_invoices
    ).distinct()

    logger.info(f"  Total owner candidates: {candidates.count()}")

    # Log some examples for debugging
    for invoice in candidates[:5]:  # Show first 5
        owners = list(invoice.owners.all())
        owner_emails = [o.owner_user.email for o in owners if o.owner_user.email]
        is_overdue = invoice.due_date < today
        overdue_status = "OVERDUE" if is_overdue else "OK"
        logger.info(
            f"  📄 Owner Invoice {invoice.invoice_number}: Due {invoice.due_date}, Balance {invoice.balance}, Status {invoice.status}, Overdue: {overdue_status}, Owners: {owner_emails}"
        )

    return candidates, upcoming_reminder_date, overdue_reminder_date


@shared_task(bind=True, max_retries=3)
def send_invoice_reminders(self):
    """
    Send invoice reminders - checks database configuration
    """
    logger.info("📧 Invoice Reminders Task Started")

    # Check if task is enabled in database
    try:
        from payments.models import TaskConfiguration

        task_config = TaskConfiguration.objects.filter(
            task_type="invoice_reminders", enabled=True, status="active"
        ).first()

        if not task_config:
            logger.info("Invoice reminders task is disabled or not configured")
            return {"status": "skipped", "reason": "task_disabled_or_not_configured"}

        # Use configuration from database
        before_due_days = task_config.before_due_days or 2
        after_due_days = task_config.after_due_days or 1

    except Exception as e:
        logger.error(f"Error checking task configuration: {e}")
        # Use default values if we can't check configuration
        logger.warning("Proceeding with default configuration")
        before_due_days = 2
        after_due_days = 1

    # Get invoice candidates with detailed analysis (tenants and owners)
    tenant_reminders, upcoming_reminder_date, overdue_reminder_date = (
        _get_invoice_reminder_candidates(before_due_days, after_due_days)
    )
    
    # Get owner invoice candidates
    owner_reminders, _, _ = _get_owner_invoice_reminder_candidates(before_due_days, after_due_days)
    
    # Combine tenant and owner reminders
    reminders = tenant_reminders | owner_reminders

    if not reminders.exists():
        logger.info("No invoices found needing reminders")
        return {
            "sent": 0,
            "errors": 0,
            "skipped": 0,
            "total_found": 0,
        }

    sent_count = 0
    error_count = 0
    skipped_count = 0

    for invoice in reminders:
        try:
            # Get users based on invoice type (tenant or owner)
            users = []
            if invoice.tenants.exists():
                users = [t.tenant_user for t in invoice.tenants.all()]
            elif invoice.owners.exists():
                users = [o.owner_user for o in invoice.owners.all()]

            for user in users:
                if not user.email:
                    logger.warning(f"No email for user {user.id}")
                    skipped_count += 1
                    continue

                # Determine reminder type based on due date
                today = timezone.now().date()
                is_overdue = invoice.due_date < today
                is_upcoming = invoice.due_date == upcoming_reminder_date
                is_late_reminder = invoice.due_date == overdue_reminder_date

                # Improved reminder type logic
                if is_overdue:
                    # Invoice is past due date
                    if invoice.status == "OVERDUE":
                        reminder_type = "overdue"
                    else:
                        # Invoice is overdue but status hasn't been updated
                        reminder_type = "overdue"
                elif is_upcoming:
                    reminder_type = "upcoming"
                elif is_late_reminder:
                    reminder_type = "outstanding"
                else:
                    # Skip if not in our target dates
                    skipped_count += 1
                    continue

                logger.info(
                    f"📧 Sending {reminder_type} reminder for invoice {invoice.invoice_number} to {user.email} (Due: {invoice.due_date}, Status: {invoice.status}, Overdue: {is_overdue})"
                )

                # Use the new send_reminder_email function
                from utils.invoice import send_reminder_email

                # Send reminder email using the new function
                result = send_reminder_email(invoice, user, reminder_type)

                if result.get("success"):
                    sent_count += 1
                    logger.info(f"✅ {reminder_type} reminder sent to {user.email}")
                else:
                    logger.error(
                        f"❌ Failed to send {reminder_type} reminder to {user.email}: {result.get('error', 'Unknown error')}"
                    )
                    error_count += 1

        except Exception as e:
            logger.error(
                f"❌ Error processing reminder for invoice {invoice.invoice_number}: {e}"
            )
            error_count += 1

    logger.info(f"📧 Invoice Reminders Summary:")
    logger.info(f"  ✅ Sent: {sent_count}")
    logger.info(f"  ❌ Errors: {error_count}")
    logger.info(f"  ⏭️  Skipped: {skipped_count}")

    # Update task configuration statistics
    try:
        if task_config:
            task_config.update_execution_stats(success=True)
    except Exception as e:
        logger.error(f"Error updating task statistics: {e}")

    return {
        "sent": sent_count,
        "errors": error_count,
        "skipped": skipped_count,
        "total_found": len(reminders),
        "tenant_reminders": len(tenant_reminders),
        "owner_reminders": len(owner_reminders),
    }
