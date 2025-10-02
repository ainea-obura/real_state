from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction

from sales.models import PropertySale, PropertySaleItem, SaleCommission


class Command(BaseCommand):
    help = 'Calculate commissions for existing sales (3% after contract signing)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sale-id',
            type=str,
            help='Calculate commission for a specific sale ID',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Calculate commissions for all sales',
        )

    def handle(self, *args, **options):
        if options['sale_id']:
            self.calculate_commission_for_sale(options['sale_id'])
        elif options['all']:
            self.calculate_commissions_for_all_sales()
        else:
            self.stdout.write(
                self.style.WARNING('Please specify --sale-id or --all')
            )

    def calculate_commission_for_sale(self, sale_id):
        """Calculate commission for a specific sale"""
        try:
            sale = PropertySale.objects.get(id=sale_id)
            self.process_sale(sale)
        except PropertySale.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Sale {sale_id} not found')
            )

    def calculate_commissions_for_all_sales(self):
        """Calculate commissions for all sales"""
        sales = PropertySale.objects.filter(
            status__in=['active', 'completed']
        ).select_related('assigned_sales_person__user')

        self.stdout.write(f'Processing {sales.count()} sales...')
        
        processed_count = 0
        for sale in sales:
            if self.process_sale(sale):
                processed_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'Successfully processed {processed_count} sales')
        )

    def process_sale(self, sale):
        """Process a single sale for commission calculation"""
        try:
            # Check if sale has an assigned sales person
            if not sale.assigned_sales_person:
                self.stdout.write(
                    self.style.WARNING(f'Sale {sale.id} has no assigned sales person')
                )
                return False

            # Calculate total sale value
            sale_items = PropertySaleItem.objects.filter(sale=sale)
            total_sale_value = sum(item.sale_price for item in sale_items)

            if total_sale_value == 0:
                self.stdout.write(
                    self.style.WARNING(f'Sale {sale.id} has no sale items')
                )
                return False

            # Calculate 3% commission
            commission_rate = Decimal('3.0')  # 3%
            commission_amount = (total_sale_value * commission_rate) / Decimal('100')

            # Create or update commission record
            commission, created = SaleCommission.objects.get_or_create(
                sale=sale,
                agent=sale.assigned_sales_person.user,
                defaults={
                    'commission_amount': commission_amount,
                    'commission_type': '%',
                    'commission_rate': commission_rate,
                    'status': 'pending',
                    'notes': f'3% commission after contract signing for sale {sale.id}'
                }
            )

            if not created:
                # Update existing commission
                commission.commission_amount = commission_amount
                commission.commission_rate = commission_rate
                commission.status = 'pending'
                commission.notes = f'3% commission after contract signing for sale {sale.id}'
                commission.save()

            action = 'Created' if created else 'Updated'
            self.stdout.write(
                f'{action} commission for sale {sale.id}: '
                f'KES {commission_amount:,.2f} (3% of {total_sale_value:,.2f})'
            )

            return True

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error processing sale {sale.id}: {str(e)}')
            )
            return False




