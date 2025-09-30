from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from properties.models import LocationNode, Currencies
from payments.models import Invoice, InvoiceItem
from accounts.models import Users


class Command(BaseCommand):
    help = 'Create test customers and properties for invoice upload testing'

    def handle(self, *args, **options):
        try:
            # Create test customers from your Excel
            customers_data = [
                {"first_name": "Nur", "last_name": "Gure", "email": "nur.gure@test.com"},
                {"first_name": "Rosemary", "last_name": "Gitonga", "email": "rosemary.gitonga@test.com"},
                {"first_name": "Mohamed", "last_name": "Dirir", "email": "mohamed.dirir@test.com"},
            ]
            
            self.stdout.write("=== CREATING CUSTOMERS ===")
            created_users = []
            for customer in customers_data:
                user, created = Users.objects.get_or_create(
                    email=customer["email"],
                    defaults={
                        "first_name": customer["first_name"],
                        "last_name": customer["last_name"],
                        "username": f"{customer['first_name'].lower()}.{customer['last_name'].lower()}",
                        "is_active": True,
                    }
                )
                if created:
                    self.stdout.write(f"✅ Created: {user.first_name} {user.last_name}")
                else:
                    self.stdout.write(f"ℹ️ Exists: {user.first_name} {user.last_name}")
                created_users.append(user)
            
            # Create test properties from your Excel
            properties_data = [
                {"name": "A1KPM02", "description": "Olerai Apartments Unit A1KPM02"},
                {"name": "A2KPM02", "description": "Olerai Apartments Unit A2KPM02"},
                {"name": "1KPM01", "description": "239 Owashika Residency Unit 1KPM01"},
            ]
            
            self.stdout.write("\n=== CREATING PROPERTIES ===")
            # Find a project to attach units to
            project = LocationNode.objects.filter(node_type="PROJECT", is_deleted=False).first()
            if not project:
                self.stdout.write("❌ No project found. Please create a project first.")
                return
            
            # Find a block to attach units to
            block = LocationNode.objects.filter(node_type="BLOCK", parent=project, is_deleted=False).first()
            if not block:
                self.stdout.write("❌ No block found. Please create a block first.")
                return
            
            # Find a floor to attach units to
            floor = LocationNode.objects.filter(node_type="FLOOR", parent=block, is_deleted=False).first()
            if not floor:
                self.stdout.write("❌ No floor found. Please create a floor first.")
                return
            
            created_properties = []
            for prop in properties_data:
                unit, created = LocationNode.objects.get_or_create(
                    name=prop["name"],
                    node_type="UNIT",
                    parent=floor,
                    defaults={
                        "is_deleted": False,
                    }
                )
                if created:
                    self.stdout.write(f"✅ Created: {unit.name}")
                else:
                    self.stdout.write(f"ℹ️ Exists: {unit.name}")
                created_properties.append(unit)
            
            self.stdout.write(f"\n✅ Successfully created {len(created_users)} customers and {len(created_properties)} properties")
            self.stdout.write("You can now test the invoice upload with these customers and properties!")
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating test data: {str(e)}')
            )
