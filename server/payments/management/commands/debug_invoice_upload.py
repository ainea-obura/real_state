from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from properties.models import LocationNode, Currencies
from payments.models import Invoice, InvoiceItem
from accounts.models import Users


class Command(BaseCommand):
    help = 'Debug bulk invoice upload - check if customers and properties exist'

    def handle(self, *args, **options):
        try:
            # Check customers from your Excel
            customer_names = ["Nur Gure", "Rosemary Gitonga", "Mohamed Dirir"]
            
            self.stdout.write("=== CHECKING CUSTOMERS ===")
            for name in customer_names:
                user = None
                if " " in name:
                    name_parts = name.split(" ", 1)
                    user = Users.objects.filter(
                        first_name__iexact=name_parts[0].strip(),
                        last_name__iexact=name_parts[1].strip(),
                        is_active=True
                    ).first()
                else:
                    user = Users.objects.filter(
                        first_name__iexact=name,
                        is_active=True
                    ).first()
                
                if user:
                    self.stdout.write(f"✅ Found: {name} -> {user.first_name} {user.last_name} (ID: {user.id})")
                else:
                    self.stdout.write(f"❌ Not found: {name}")
            
            # Check properties from your Excel
            house_numbers = ["A1KPM02", "A2KPM02", "1KPM01"]
            
            self.stdout.write("\n=== CHECKING PROPERTIES ===")
            for house_no in house_numbers:
                property_node = LocationNode.objects.filter(
                    name__iexact=house_no,
                    node_type="UNIT",
                    is_deleted=False
                ).first()
                
                if property_node:
                    self.stdout.write(f"✅ Found: {house_no} -> {property_node.name} (ID: {property_node.id})")
                else:
                    self.stdout.write(f"❌ Not found: {house_no}")
            
            # Check all available users
            self.stdout.write("\n=== ALL AVAILABLE USERS ===")
            users = Users.objects.filter(is_active=True)[:10]
            for user in users:
                self.stdout.write(f"- {user.first_name} {user.last_name} ({user.email})")
            
            # Check all available units
            self.stdout.write("\n=== ALL AVAILABLE UNITS ===")
            units = LocationNode.objects.filter(node_type="UNIT", is_deleted=False)[:10]
            for unit in units:
                self.stdout.write(f"- {unit.name} (ID: {unit.id})")
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error checking data: {str(e)}')
            )
