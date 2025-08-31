from rest_framework import serializers
from django.db import transaction
from django.core.exceptions import ValidationError

from ..models import PropertySaleItem
from payments.models import Expense


class RemoveSalesPersonSerializer(serializers.Serializer):
    """Serializer for removing sales person assignments from property sales"""

    # Required fields
    salesItemId = serializers.UUIDField(
        help_text="ID of the PropertySaleItem to remove sales person from"
    )

    def validate_salesItemId(self, value):
        """Validate that the sale item exists and has a sales person assigned"""
        print(f"=== VALIDATING salesItemId for removal: {value} ===")
        try:
            sale_item = PropertySaleItem.objects.get(id=value)
            print(f"✅ Found PropertySaleItem: {sale_item}")

            # Check if this sale item has a sales person assigned
            if not hasattr(sale_item, "sale") or not sale_item.sale.assigned_sales_person:
                print(f"❌ No sales person assigned to this sale")
                raise ValidationError(
                    f"This property sale does not have a sales person assigned. "
                    f"Nothing to remove."
                )

            # Check if there are any expenses related to this sales person assignment
            sales_person = sale_item.sale.assigned_sales_person
            related_expenses = Expense.objects.filter(
                commission_type__in=["sales", "tenant"],
                agent=sales_person.user,  # Sales person is linked via agent field
                commission_reference__isnull=False
            )
            
            if related_expenses.exists():
                expense_count = related_expenses.count()
                print(f"⚠️ Found {expense_count} related expenses - removal blocked")
                raise ValidationError(
                    f"Cannot remove sales person {sales_person.get_full_name()} because "
                    f"{expense_count} expense(s) have been created. "
                    f"Sales person commissions cannot be removed once expenses are generated."
                )

            print(f"✅ Sales person can be removed - no expenses found")
            return value

        except PropertySaleItem.DoesNotExist:
            print(f"❌ PropertySaleItem not found with ID: {value}")
            raise ValidationError(
                f"Property sale item with ID '{value}' was not found. "
                f"Please check the ID and try again."
            )

    def remove_sales_person(self):
        """Remove sales person from the property sale"""
        validated_data = self.validated_data

        with transaction.atomic():
            print("1. Starting removal transaction...")

            # Get the sale item
            print(f"2. Looking for PropertySaleItem with ID: {validated_data['salesItemId']}")
            sale_item = PropertySaleItem.objects.get(id=validated_data["salesItemId"])
            print(f"3. Found sale item: {sale_item}")

            # Get the sale and sales person
            sale = sale_item.sale
            sales_person = sale.assigned_sales_person
            print(f"4. Found sale: {sale}")
            print(f"5. Found assigned sales person: {sales_person}")

            # Store info for response
            sales_person_name = sales_person.get_full_name()
            sales_person_id = str(sales_person.id)

            # Clear the sales person assignment
            print("6. Clearing sales person assignment...")
            sale.assigned_sales_person = None
            sale.notes = f"{sale.notes or ''}\n\nSales person {sales_person_name} removed on {sale.updated_at.strftime('%Y-%m-%d %H:%M')}".strip()
            sale.save()
            print("7. Sale updated successfully!")

            # Clear commission fields from SalesPerson
            print("8. Clearing commission fields from SalesPerson...")
            sales_person.commission_type = None
            sales_person.commission_rate = None
            sales_person.commission_payment_setting = None
            sales_person.commission_property_sale = None
            sales_person.save()
            print("9. Commission fields cleared successfully!")

            print("10. Preparing response...")
            response_data = {
                "success": True,
                "message": "Sales person removed successfully",
                "data": {
                    "sale_id": str(sale.id),
                    "sale_item_id": str(sale_item.id),
                    "removed_sales_person_id": sales_person_id,
                    "removed_sales_person_name": sales_person_name,
                    "removed_at": sale.updated_at.isoformat() if sale.updated_at else None,
                },
            }
            print(f"11. Response data: {response_data}")
            print("=== END DEBUG ===")
            return response_data

    def to_representation(self, instance):
        """Custom representation for the response"""
        if hasattr(instance, "remove_sales_person"):
            return instance.remove_sales_person()
        return super().to_representation(instance)
