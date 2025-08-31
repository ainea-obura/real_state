from django.core.management.base import BaseCommand
from django.db import transaction
from payments.models import Payout
from payments.payouts.utils import calculate_owner_payout
from accounts.models import Users
from properties.models import PropertyOwner
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Recalculate all existing payouts with the updated logic to fix negative balances"

    def add_arguments(self, parser):
        parser.add_argument(
            "--month",
            type=int,
            help="Specific month to recalculate (1-12)",
        )
        parser.add_argument(
            "--year",
            type=int,
            help="Specific year to recalculate",
        )
        parser.add_argument(
            "--owner",
            type=str,
            help="Specific owner ID to recalculate",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force recalculation even for completed payouts",
        )

    def handle(self, *args, **options):
        self.stdout.write("Starting payout recalculation...")

        # Get all payouts
        payouts = Payout.objects.all()

        if options["month"]:
            payouts = payouts.filter(month=options["month"])
        if options["year"]:
            payouts = payouts.filter(year=options["year"])
        if options["owner"]:
            payouts = payouts.filter(owner_id=options["owner"])
        if not options["force"]:
            # Only recalculate pending payouts by default
            payouts = payouts.filter(status="pending")

        total_payouts = payouts.count()
        self.stdout.write(f"Found {total_payouts} payouts to recalculate")

        if total_payouts == 0:
            self.stdout.write("No payouts to recalculate")
            return

        # Confirm before proceeding
        if not options["force"]:
            confirm = input("Proceed with recalculation? (y/N): ")
            if confirm.lower() != "y":
                self.stdout.write("Recalculation cancelled")
                return

        updated_count = 0
        error_count = 0

        for payout in payouts:
            try:
                with transaction.atomic():
                    # Recalculate using the updated logic
                    recalculated_payout = calculate_owner_payout(
                        payout.owner, payout.property_node, payout.month, payout.year
                    )

                    # Check if the values changed
                    old_net = payout.net_amount
                    new_net = recalculated_payout.net_amount

                    if old_net != new_net:
                        self.stdout.write(
                            f"Updated payout {payout.payout_number}: "
                            f"net_amount {old_net} → {new_net}"
                        )
                        updated_count += 1
                    else:
                        self.stdout.write(
                            f"No change for payout {payout.payout_number}: "
                            f"net_amount {new_net}"
                        )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"Error recalculating payout {payout.payout_number}: {str(e)}"
                    )
                )
                error_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Recalculation complete! Updated: {updated_count}, Errors: {error_count}"
            )
        )
