from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from accounts.models import Users
from properties.models import LocationNode, ProjectDetail, UnitDetail, Currencies
from sales.models import PropertySale, PropertySaleItem, PropertyReservation, SalesPerson


class Command(BaseCommand):
    help = 'Add sample sales data for testing the sales dashboard'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing sample data before adding new data',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.clear_sample_data()

        with transaction.atomic():
            self.create_sample_sales_data()
            self.stdout.write(
                self.style.SUCCESS('Successfully added sample sales data!')
            )

    def clear_sample_data(self):
        """Clear existing sample data"""
        self.stdout.write('Clearing existing sample data...')
        
        # Clear sales data
        PropertySale.objects.filter(notes__icontains='SAMPLE').delete()
        PropertyReservation.objects.filter(notes__icontains='SAMPLE').delete()
        
        # Clear sample users
        Users.objects.filter(email__icontains='sample').delete()
        
        self.stdout.write('Sample data cleared.')

    def create_sample_sales_data(self):
        """Create comprehensive sample sales data"""
        
        # Get or create default currency
        currency, _ = Currencies.objects.get_or_create(
            code='KES',
            defaults={
                'name': 'Kenyan Shilling',
                'symbol': 'KES',
                'decimal_places': 2,
                'default': True
            }
        )

        # Create sample sales people
        sales_person1, _ = Users.objects.get_or_create(
            email='john.sales@sample.com',
            defaults={
                'first_name': 'John',
                'last_name': 'Sales',
                'type': 'sales_person',
                'is_active': True,
                'username': 'john_sales'
            }
        )

        sales_person2, _ = Users.objects.get_or_create(
            email='mary.sales@sample.com',
            defaults={
                'first_name': 'Mary',
                'last_name': 'Sales',
                'type': 'sales_person',
                'is_active': True,
                'username': 'mary_sales'
            }
        )

        # Create SalesPerson records
        sp1, _ = SalesPerson.objects.get_or_create(
            user=sales_person1,
            defaults={
                'employee_id': 'SP001',
                'commission_rate': Decimal('2.5'),
                'is_active': True
            }
        )

        sp2, _ = SalesPerson.objects.get_or_create(
            user=sales_person2,
            defaults={
                'employee_id': 'SP002',
                'commission_rate': Decimal('3.0'),
                'is_active': True
            }
        )

        # Create sample buyers
        buyer1, _ = Users.objects.get_or_create(
            email='alice.buyer@sample.com',
            defaults={
                'first_name': 'Alice',
                'last_name': 'Johnson',
                'type': 'owner',
                'is_active': True,
                'username': 'alice_buyer',
                'phone': '+254712345678'
            }
        )

        buyer2, _ = Users.objects.get_or_create(
            email='bob.buyer@sample.com',
            defaults={
                'first_name': 'Bob',
                'last_name': 'Smith',
                'type': 'owner',
                'is_active': True,
                'username': 'bob_buyer',
                'phone': '+254723456789'
            }
        )

        buyer3, _ = Users.objects.get_or_create(
            email='carol.buyer@sample.com',
            defaults={
                'first_name': 'Carol',
                'last_name': 'Davis',
                'type': 'owner',
                'is_active': True,
                'username': 'carol_buyer',
                'phone': '+254734567890'
            }
        )

        # Get existing projects and units
        projects = LocationNode.objects.filter(node_type='PROJECT')
        if not projects.exists():
            self.stdout.write(
                self.style.WARNING('No projects found. Please create projects first.')
            )
            return

        project = projects.first()
        
        # Get units from the project
        units = LocationNode.objects.filter(
            node_type='UNIT'
        ).select_related('unit_detail')[:10]  # Limit to 10 units for sample

        if not units.exists():
            self.stdout.write(
                self.style.WARNING('No units found in the project. Please create units first.')
            )
            return

        # Create sample property sales
        self.create_sample_sales(units[:5], [buyer1, buyer2], [sp1, sp2])
        
        # Create sample reservations
        self.create_sample_reservations(units[5:8], [buyer3], sp1)
        
        # Update unit statuses
        self.update_unit_statuses(units)

    def create_sample_sales(self, units, buyers, sales_people):
        """Create sample property sales"""
        
        # Sale 1: Completed sale
        sale1 = PropertySale.objects.create(
            sale_date=date.today() - timedelta(days=30),
            status='completed',
            assigned_sales_person=sales_people[0],
            notes='SAMPLE: Completed sale for testing'
        )
        
        PropertySaleItem.objects.create(
            sale=sale1,
            property_node=units[0],
            buyer=buyers[0],
            sale_price=Decimal('15450000'),
            down_payment=Decimal('3090000'),
            down_payment_percentage=Decimal('20.0'),
            possession_date=date.today() + timedelta(days=30)
        )

        # Sale 2: Active sale
        sale2 = PropertySale.objects.create(
            sale_date=date.today() - timedelta(days=15),
            status='active',
            assigned_sales_person=sales_people[1],
            notes='SAMPLE: Active sale with payments ongoing'
        )
        
        PropertySaleItem.objects.create(
            sale=sale2,
            property_node=units[1],
            buyer=buyers[1],
            sale_price=Decimal('13250000'),
            down_payment=Decimal('2650000'),
            down_payment_percentage=Decimal('20.0'),
            possession_date=date.today() + timedelta(days=45)
        )

        # Sale 3: Pending sale
        sale3 = PropertySale.objects.create(
            sale_date=date.today() - timedelta(days=5),
            status='pending',
            assigned_sales_person=sales_people[0],
            notes='SAMPLE: Pending sale awaiting final approval'
        )
        
        PropertySaleItem.objects.create(
            sale=sale3,
            property_node=units[2],
            buyer=buyers[0],
            sale_price=Decimal('11250000'),
            down_payment=Decimal('2250000'),
            down_payment_percentage=Decimal('20.0')
        )

        self.stdout.write(f'Created {PropertySale.objects.filter(notes__icontains="SAMPLE").count()} sample sales')

    def create_sample_reservations(self, units, buyers, sales_person):
        """Create sample property reservations"""
        
        # Reservation 1: Confirmed reservation
        reservation1 = PropertyReservation.objects.create(
            status='confirmed',
            owner=buyers[0],
            end_date=date.today() + timedelta(days=30),
            deposit_fee=Decimal('50000'),
            notes='SAMPLE: Confirmed reservation with deposit paid'
        )
        reservation1.properties.add(units[0])

        # Reservation 2: Pending reservation
        reservation2 = PropertyReservation.objects.create(
            status='pending',
            owner=buyers[0],
            end_date=date.today() + timedelta(days=15),
            notes='SAMPLE: Pending reservation awaiting deposit'
        )
        reservation2.properties.add(units[1])

        self.stdout.write(f'Created {PropertyReservation.objects.filter(notes__icontains="SAMPLE").count()} sample reservations')

    def update_unit_statuses(self, units):
        """Update unit statuses based on sales and reservations"""
        
        # Get units with sales
        sold_units = PropertySaleItem.objects.filter(
            sale__status__in=['completed', 'active']
        ).values_list('property_node_id', flat=True)
        
        # Get units with reservations
        reserved_units = PropertyReservation.objects.filter(
            status__in=['confirmed', 'pending']
        ).values_list('properties', flat=True)
        
        # Update unit details
        for unit in units:
            if unit.id in sold_units:
                # Mark as sold
                if hasattr(unit, 'unit_detail') and unit.unit_detail:
                    unit.unit_detail.status = 'sold'
                    unit.unit_detail.save()
            elif unit.id in reserved_units:
                # Mark as booked
                if hasattr(unit, 'unit_detail') and unit.unit_detail:
                    unit.unit_detail.status = 'booked'
                    unit.unit_detail.save()

        self.stdout.write('Updated unit statuses based on sales and reservations')
