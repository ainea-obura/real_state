from rest_framework import serializers
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta

from accounts.models import Users
from payments.models import Penalty, Invoice
from properties.models import PropertyTenant, LocationNode
from utils.format import format_money_with_currency

from django.db import transaction


class TenantSearchSerializer(serializers.ModelSerializer):
    """Serializer for searching tenants when creating penalties"""

    name = serializers.SerializerMethodField()
    property_info = serializers.SerializerMethodField()
    outstanding_balance = serializers.SerializerMethodField()

    class Meta:
        model = Users
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "property_info",
            "outstanding_balance",
        ]

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

    def get_property_info(self, obj):
        """Get property information for the tenant"""
        property_tenants = PropertyTenant.objects.filter(
            tenant_user=obj, is_deleted=False
        ).select_related("node", "currency")

        properties = []
        for pt in property_tenants:
            node = pt.node
            ancestors = node.get_ancestors(include_self=True)
            path = " -> ".join([a.name for a in ancestors])

            properties.append(
                {
                    "property_tenant_id": str(pt.id),
                    "unit": path,
                    "project_name": ancestors[0].name if ancestors else "",
                    "rent_amount": (
                        format_money_with_currency(float(pt.rent_amount))
                        if pt.rent_amount
                        else format_money_with_currency(0)
                    ),
                    "currency": {
                        "id": str(pt.currency.id),
                        "code": pt.currency.code,
                        "name": pt.currency.name,
                        "symbol": pt.currency.symbol,
                    },
                }
            )

        return properties

    def get_outstanding_balance(self, obj):
        """Calculate outstanding balance for the tenant"""
        # This would need to be implemented based on your invoice/payment logic
        return 0.0


class PenaltyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating penalties"""

    tenant_id = serializers.UUIDField(write_only=True, help_text="Tenant user ID")
    property_tenant_id = serializers.UUIDField(
        write_only=True, help_text="Property tenant assignment ID"
    )

    class Meta:
        model = Penalty
        fields = [
            "tenant_id",
            "property_tenant_id",
            "penalty_type",
            "amount",
            "amount_type",
            "currency",
            "date_applied",
            "due_date",
            "notes",
            "tenant_notes",
        ]

    def validate(self, data):
        """Validate penalty data and find the correct PropertyTenant"""
        tenant_id = data.get("tenant_id")
        property_tenant_id = data.get("property_tenant_id")

        # Find the PropertyTenant that matches both tenant_id and property_tenant_id
        try:
            property_tenant = PropertyTenant.objects.get(
                node_id=property_tenant_id, tenant_user_id=tenant_id, is_deleted=False
            )
        except PropertyTenant.DoesNotExist:
            raise serializers.ValidationError(
                "No active property tenant assignment found for the given tenant and property tenant IDs"
            )

        # Validate amount
        amount = data.get("amount")
        if amount and amount <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")

        # Validate due date
        due_date = data.get("due_date")
        date_applied = data.get("date_applied")

        if due_date and date_applied:
            if due_date < date_applied:
                raise serializers.ValidationError(
                    "Due date cannot be before date applied"
                )

        # Store the found PropertyTenant for use in create method
        data["property_tenant"] = property_tenant

        return data

    def create(self, validated_data):
        """Create penalty with proper penalty number generation"""
        # Remove the temporary fields
        tenant_id = validated_data.pop("tenant_id")
        property_tenant_id = validated_data.pop("property_tenant_id")
        property_tenant = validated_data.pop("property_tenant")

        # Set the property_tenant
        validated_data["property_tenant"] = property_tenant

        # Set created_by if available in context
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user

        # Set default date_applied if not provided
        if not validated_data.get("date_applied"):
            validated_data["date_applied"] = None

        # Set default due_date if not provided (30 days from date_applied)
        if not validated_data.get("due_date"):
            validated_data["due_date"] = validated_data["date_applied"] + timedelta(
                days=30
            )

        # Create the penalty (penalty number will be auto-generated in model's save method)
        with transaction.atomic():
            penalty = Penalty.objects.create(**validated_data)
            penalty.created_by = request.user
            penalty.save()

        return penalty


class PenaltyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating penalties - only allows updating specific fields"""

    class Meta:
        model = Penalty
        fields = [
            "penalty_type",
            "amount",
            "currency",
            "due_date",
            "notes",
            "tenant_notes",
        ]

    def validate(self, data):
        """Validate penalty data"""
        amount = data.get("amount")

        if amount and amount <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")

        # Validate due_date if provided
        due_date = data.get("due_date")
        if due_date:
            # Handle empty string case
            if isinstance(due_date, str) and due_date.strip() == "":
                data["due_date"] = None
            else:
                # Get the current penalty instance
                penalty = self.instance
                if penalty and penalty.date_applied and due_date < penalty.date_applied:
                    raise serializers.ValidationError(
                        "Due date cannot be before date applied"
                    )

        return data

    def update(self, instance, validated_data):
        """Update penalty with only allowed fields"""
        # Only update the allowed fields
        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()
        return instance


class PenaltyListSerializer(serializers.ModelSerializer):
    """Serializer for listing penalties"""

    tenant = serializers.SerializerMethodField()
    property = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()
    currency_info = serializers.SerializerMethodField()
    linked_invoice_info = serializers.SerializerMethodField()
    created_by_info = serializers.SerializerMethodField()
    waived_by_info = serializers.SerializerMethodField()

    class Meta:
        model = Penalty
        fields = [
            "id",
            "penalty_number",
            "tenant",
            "property",
            "penalty_type",
            "amount",
            "amount_type",
            "date_applied",
            "due_date",
            "status",
            "currency_info",
            "linked_invoice_info",
            "notes",
            "tenant_notes",
            "created_by_info",
            "created_at",
            "updated_at",
            "waived_at",
            "waived_by_info",
            "waived_reason",
        ]

    def get_tenant(self, obj):
        """Get tenant information"""
        tenant = obj.property_tenant.tenant_user
        return {
            "name": f"{tenant.first_name} {tenant.last_name}".strip(),
            "email": tenant.email,
            "phone": tenant.phone,
        }

    def get_property(self, obj):
        """Get property information"""
        node = obj.property_tenant.node
        ancestors = node.get_ancestors(include_self=True)
        path = " -> ".join([a.name for a in ancestors])

        return {
            "unit": path,
            "project_name": ancestors[0].name if ancestors else "",
        }

    def get_amount(self, obj):
        """Get formatted amount"""
        return format_money_with_currency(float(obj.amount))

    def get_linked_invoice_info(self, obj):
        """Get linked invoice information"""
        if obj.linked_invoice:
            return {
                "id": str(obj.linked_invoice.id),
                "invoice_number": obj.linked_invoice.invoice_number,
            }
        return None

    def get_created_by_info(self, obj):
        """Get created by user information"""
        if obj.created_by:
            return {
                "id": str(obj.created_by.id),
                "name": f"{obj.created_by.first_name} {obj.created_by.last_name}".strip(),
            }
        return None

    def get_currency_info(self, obj):
        """Get currency information"""
        if obj.currency:
            return {
                "id": str(obj.currency.id),
                "code": obj.currency.code,
                "name": obj.currency.name,
                "symbol": obj.currency.symbol,
            }
        return None

    def get_waived_by_info(self, obj):
        """Get waived by user information"""
        if obj.waived_by:
            return {
                "id": str(obj.waived_by.id),
                "name": f"{obj.waived_by.first_name} {obj.waived_by.last_name}".strip(),
            }
        return None


class PenaltyDetailSerializer(PenaltyListSerializer):
    """Serializer for detailed penalty view"""

    pass


class PenaltyWaiveSerializer(serializers.ModelSerializer):
    """Serializer for waiving penalties"""

    waived_reason = serializers.CharField(required=True)

    class Meta:
        model = Penalty
        fields = ["waived_reason"]

    def validate(self, data):
        """Validate waiver data"""
        penalty = self.instance

        if penalty.status != "pending":
            raise serializers.ValidationError("Only pending penalties can be waived")

        return data

    def update(self, instance, validated_data):
        """Update penalty with waiver information"""
        user = self.context["request"].user

        instance.status = "waived"
        instance.waived_at = timezone.now()
        instance.waived_by = user
        instance.waived_reason = validated_data["waived_reason"]
        instance.save()

        return instance


class PenaltyStatsSerializer(serializers.Serializer):
    """Serializer for penalty statistics"""

    total_penalties = serializers.IntegerField()
    pending_penalties = serializers.IntegerField()
    total_amount = serializers.CharField()
    waived_amount = serializers.CharField()
    applied_amount = serializers.CharField()
    paid_amount = serializers.CharField()


class PenaltySettingsSerializer(serializers.Serializer):
    """Serializer for penalty settings"""

    default_late_payment_amount = serializers.CharField()
    default_returned_payment_amount = serializers.CharField()
    default_lease_violation_amount = serializers.CharField()
    default_utility_overcharge_amount = serializers.CharField()
    grace_period_days = serializers.IntegerField()
    auto_apply_late_fees = serializers.BooleanField()
    notify_tenants = serializers.BooleanField()
    email_notifications = serializers.BooleanField()
    sms_notifications = serializers.BooleanField()
