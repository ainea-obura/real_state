from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from properties.models import LocationNode, Currencies
from payments.models import Invoice, InvoiceItem


class Command(BaseCommand):
    help = 'Create a sample invoice for apartment A205 for testing update bills functionality'

    def handle(self, *args, **options):
        try:
            # Find apartment A205
            apartment = LocationNode.objects.filter(
                name__iexact="A205",
                node_type="UNIT",
                is_deleted=False
            ).first()

            if not apartment:
                self.stdout.write(
                    self.style.ERROR('Apartment A205 not found. Please create it first.')
                )
                return

            self.stdout.write(f'Found apartment: {apartment.name} (ID: {apartment.id})')

            # Get or create default currency
            currency, created = Currencies.objects.get_or_create(
                code='KES',
                defaults={
                    'name': 'Kenyan Shilling',
                    'symbol': 'KES',
                    'decimal_places': 2,
                    'default': True
                }
            )

            # Create sample invoice
            invoice = Invoice.objects.create(
                issue_date=date.today(),
                due_date=date.today() + timedelta(days=30),
                status="ISSUED",  # This is the correct status for unpaid invoices
                description="Sample rent invoice for testing update bills functionality",
                discount=Decimal('0'),
                tax_percentage=Decimal('0'),
                total_amount=Decimal('15000.00'),
                balance=Decimal('15000.00'),  # Full amount outstanding
                property=apartment,
            )

            # Create invoice items
            InvoiceItem.objects.create(
                invoice=invoice,
                type="RENT",
                name="Monthly Rent",
                amount=Decimal('15000.00'),
                quantity=Decimal('1'),
                price=Decimal('15000.00'),
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created sample invoice for apartment A205:\n'
                    f'- Invoice ID: {invoice.id}\n'
                    f'- Invoice Number: {invoice.invoice_number}\n'
                    f'- Amount: KES {invoice.total_amount}\n'
                    f'- Status: {invoice.status}\n'
                    f'- Balance: KES {invoice.balance}'
                )
            )

            # Also create a partial invoice for testing
            partial_invoice = Invoice.objects.create(
                issue_date=date.today(),
                due_date=date.today() + timedelta(days=30),
                status="PARTIAL",
                description="Sample partial invoice for testing",
                discount=Decimal('0'),
                tax_percentage=Decimal('0'),
                total_amount=Decimal('10000.00'),
                balance=Decimal('5000.00'),  # Partial amount outstanding
                property=apartment,
            )

            InvoiceItem.objects.create(
                invoice=partial_invoice,
                type="SERVICE_CHARGE",
                name="Service Charge",
                amount=Decimal('10000.00'),
                quantity=Decimal('1'),
                price=Decimal('10000.00'),
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created partial invoice for apartment A205:\n'
                    f'- Invoice ID: {partial_invoice.id}\n'
                    f'- Invoice Number: {partial_invoice.invoice_number}\n'
                    f'- Amount: KES {partial_invoice.total_amount}\n'
                    f'- Status: {partial_invoice.status}\n'
                    f'- Balance: KES {partial_invoice.balance}'
                )
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'\nTotal outstanding amount for A205: KES {invoice.balance + partial_invoice.balance}'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating sample invoice: {str(e)}')
            )
