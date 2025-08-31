from rest_framework import serializers
from django.db import transaction
from django.core.exceptions import ValidationError

from ..models import (
    PropertySaleItem,
    SalesPerson,
)
from accounts.models import Users


class AssignSalesPersonSerializer(serializers.Serializer):
    """Serializer for assigning sales persons to property sales"""

    # Required fields
    salesItemId = serializers.UUIDField(
        help_text="ID of the PropertySaleItem to assign sales person to"
    )
    staffId = serializers.UUIDField(
        help_text="ID of the staff user (sales person) to assign"
    )
    commissionType = serializers.ChoiceField(
        choices=[("percentage", "Percentage"), ("fixed", "Fixed Amount")],
        help_text="Type of commission: percentage or fixed amount",
    )
    commissionAmount = serializers.CharField(
        help_text="Commission value (percentage as string or fixed amount as string)"
    )
    paymentSetting = serializers.ChoiceField(
        choices=[
            ("per_payment", "Per Payment"),
            ("per_project_completion", "Per Project Completion"),
        ],
        help_text="When commission is paid: per payment or per project completion",
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Additional notes about the assignment",
    )

    def validate_salesItemId(self, value):
        """Validate that the sale item exists"""
        print(f"=== VALIDATING salesItemId: {value} ===")
        try:
            sale_item = PropertySaleItem.objects.get(id=value)
            print(f"✅ Found PropertySaleItem: {sale_item}")

            # Check if this sale item already has a sales person assigned
            if hasattr(sale_item, "sale") and sale_item.sale.assigned_sales_person:
                current_person = sale_item.sale.assigned_sales_person
                print(f"⚠️ Sale already has assigned sales person: {current_person}")
                raise ValidationError(
                    f"This property sale already has "
                    f"{current_person.get_full_name()} assigned as the sales person. "
                    f"Please remove the existing assignment first or choose a "
                    f"different property sale."
                )

        except PropertySaleItem.DoesNotExist:
            print(f"❌ PropertySaleItem not found with ID: {value}")
            raise ValidationError(
                f"Property sale item with ID '{value}' was not found. "
                f"Please check the ID and try again."
            )
        return value

    def validate_staffId(self, value):
        """Validate that the staff user exists and is a sales person"""
        try:
            user = Users.objects.get(id=value, type="staff")
            print(f"✅ Found Users with type 'staff': {user}")
        except Users.DoesNotExist:
            print(f"❌ Users not found with ID: {value} and type: 'staff'")
            raise ValidationError(
                f"User with ID '{value}' was not found or is not a staff member. "
                f"Only staff members can be assigned as sales persons. "
                f"Please verify the user ID and ensure they have staff "
                f"privileges."
            )
        return value

    def validate_commissionAmount(self, value):
        """Validate commission amount based on type"""
        print(f"=== VALIDATING commissionAmount: {value} ===")
        try:
            amount = float(value)
            print(f"✅ Converted to float: {amount}")
            if amount <= 0:
                print(f"❌ Amount is not greater than 0: {amount}")
                raise ValidationError(
                    f"Commission amount must be greater than 0. "
                    f"Current value '{value}' is invalid. "
                    f"Please enter a positive number."
                )

            # Get commission type from the data
            commission_type = self.initial_data.get("commissionType")
            print(f"Commission type from data: {commission_type}")
            if commission_type == "percentage" and amount > 100:
                print(f"❌ Percentage exceeds 100%: {amount}%")
                raise ValidationError(
                    f"Percentage commission cannot exceed 100%. "
                    f"Current value '{amount}%' is too high. "
                    f"Please enter a percentage between 0 and 100."
                )

            print(f"✅ Commission amount validation passed: {amount}")

        except (ValueError, TypeError) as e:
            print(f"❌ Error converting to float: {e}")
            raise ValidationError(
                f"Commission amount '{value}' is not a valid number. "
                f"Please enter a numeric value (e.g., 10 for 10% or 1000 for $1000)."
            )

        return value

    def validate(self, data):
        """Validate the entire data set"""
        # Check if the sales person is already assigned to this specific sale
        sales_item_id = data.get("salesItemId")
        staff_id = data.get("staffId")

        if sales_item_id and staff_id:
            try:
                sale_item = PropertySaleItem.objects.get(id=sales_item_id)
                if (
                    hasattr(sale_item, "sale")
                    and sale_item.sale.assigned_sales_person
                    and str(sale_item.sale.assigned_sales_person.user.id)
                    == str(staff_id)
                ):
                    current_person = sale_item.sale.assigned_sales_person
                    raise ValidationError(
                        f"Sales person {current_person.get_full_name()} "
                        f"is already assigned to this property sale. "
                        f"Please choose a different sales person or property sale."
                    )
            except PropertySaleItem.DoesNotExist:
                pass  # This will be caught by the individual field validation

        return data

    def _get_or_create_sales_person(self, user):
        """Get existing SalesPerson or create new one for the user"""
        try:
            # Try to get existing SalesPerson
            sales_person = SalesPerson.objects.get(user=user)
            print(f"✅ Found existing SalesPerson: {sales_person}")
            return sales_person
        except SalesPerson.DoesNotExist:
            # Create new SalesPerson record
            print(f"📝 Creating new SalesPerson for user: {user}")

            # Generate a unique employee ID based on user info
            user_id_hex = user.id.hex[:8].upper()
            employee_id = "SP" + user_id_hex

            sales_person = SalesPerson.objects.create(
                user=user,
                employee_id=employee_id,
                is_active=True,
                is_available=True,
            )
            print(f"✅ Created new SalesPerson: {sales_person}")
            return sales_person

    def assign_sales_person(self):
        """Assign sales person to the property sale"""
        validated_data = self.validated_data

        with transaction.atomic():
            print("1. Starting transaction...")

            # Get the sale item
            print(
                f"2. Looking for PropertySaleItem with ID: "
                f"{validated_data['salesItemId']}"
            )
            sale_item = PropertySaleItem.objects.get(id=validated_data["salesItemId"])
            print(f"3. Found sale item: {sale_item}")

            # Get the staff user (sales person)
            print(f"4. Looking for Users with ID: {validated_data['staffId']}")
            staff_user = Users.objects.get(id=validated_data["staffId"])
            print(f"5. Found staff user: {staff_user}")
            print(f"6. User type: {staff_user.type}")

            # Get or create SalesPerson record
            print("7. Getting or creating SalesPerson record...")
            sales_person = self._get_or_create_sales_person(staff_user)
            print(f"8. SalesPerson ready: {sales_person}")

            # Get the sale from the sale item
            print("9. Getting sale from sale_item.sale...")
            sale = sale_item.sale
            print(f"10. Found sale: {sale}")

            # Update the sale with assigned sales person
            print("11. Updating sale.assigned_sales_person...")
            sale.assigned_sales_person = sales_person
            print("12. Setting sale.notes...")
            sale.notes = validated_data.get("notes", "")
            print("13. Saving sale...")
            sale.save()
            print("14. Sale saved successfully!")

            # Save commission details to SalesPerson record
            print("15. Saving commission details to SalesPerson...")
            sales_person.commission_type = validated_data["commissionType"]
            sales_person.commission_rate = validated_data["commissionAmount"]
            sales_person.commission_payment_setting = validated_data["paymentSetting"]
            sales_person.commission_property_sale = sale
            sales_person.save()
            print("16. Commission details saved successfully!")

            print("15. Preparing response...")
            response_data = {
                "success": True,
                "message": "Sales person assigned successfully",
                "data": {
                    "sale_id": str(sale.id),
                    "sale_item_id": str(sale_item.id),
                    "sales_person_id": str(sales_person.id),
                    "sales_person_name": sales_person.get_full_name(),
                    "commission_amount": validated_data["commissionAmount"],
                    "commission_type": validated_data["commissionType"],
                    "payment_setting": validated_data["paymentSetting"],
                    "notes": validated_data.get("notes", ""),
                    "assigned_at": (
                        sale.updated_at.isoformat() if sale.updated_at else None
                    ),
                },
            }
            print(f"17. Response data: {response_data}")
            print("=== END DEBUG ===")
            return response_data

    def to_representation(self, instance):
        """Custom representation for the response"""
        if hasattr(instance, "assign_sales_person"):
            return instance.assign_sales_person()
        return super().to_representation(instance)
