from rest_framework import serializers
from .models import (
    PropertySale,
    PaymentPlan,
    PaymentSchedule,
    SaleCommission,
    PaymentPlanTemplate,
    PropertySaleItem,
)
from properties.models import LocationNode, UnitDetail
from accounts.models import Users


class PaymentPlanTemplateSerializer(serializers.ModelSerializer):
    """Serializer for payment plan templates in sales context"""

    class Meta:
        model = PaymentPlanTemplate
        fields = [
            "id",
            "name",
            "description",
            "category",
            "periods",
            "frequency",
            "deposit_percentage",
            "difficulty",
            "is_featured",
        ]


class PropertySaleItemSerializer(serializers.ModelSerializer):
    """Serializer for individual property sale items"""

    property_node = serializers.SerializerMethodField()
    property_node_id = serializers.UUIDField(write_only=True)

    buyer = serializers.SerializerMethodField()
    buyer_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = PropertySaleItem
        fields = [
            "id",
            "property_node",
            "property_node_id",
            "buyer",
            "buyer_id",
            "sale_price",
            "down_payment",
            "down_payment_percentage",
            "ownership_percentage",
            "possession_date",
        ]

    def get_property_node(self, obj):
        """Get property node details"""
        if obj.property_node:
            return {
                "id": obj.property_node.id,
                "name": obj.property_node.name,
                "node_type": obj.property_node.node_type,
                "identifier": (
                    getattr(obj.property_node.unit_detail, "identifier", None)
                    if hasattr(obj.property_node, "unit_detail")
                    else None
                ),
                "size": (
                    getattr(obj.property_node.unit_detail, "size", None)
                    if hasattr(obj.property_node, "unit_detail")
                    else None
                ),
                "unit_type": (
                    getattr(obj.property_node.unit_detail, "unit_type", None)
                    if hasattr(obj.property_node, "unit_detail")
                    else None
                ),
                "sale_price": (
                    getattr(obj.property_node.unit_detail, "sale_price", None)
                    if hasattr(obj.property_node, "unit_detail")
                    else None
                ),
            }
        return None

    def get_buyer(self, obj):
        """Get buyer details"""
        if obj.buyer:
            return {
                "id": obj.buyer.id,
                "name": obj.buyer.get_full_name(),
                "email": obj.buyer.email,
                "phone": obj.buyer.phone,
            }
        return None


class PropertySaleSerializer(serializers.ModelSerializer):
    """Main serializer for property sales - handles multiple properties and buyers"""

    # Sale items (multiple properties and buyers)
    sale_items = PropertySaleItemSerializer(many=True, read_only=True)

    # Frontend data for creating sale items
    property_buyer_pairs = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        help_text="List of {property_node_id, buyer_id, ownership_percentage} pairs",
    )

    # Total amounts (for calculation)
    total_property_price = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        write_only=True,
        help_text="Total property price to be distributed among owners",
    )
    total_down_payment = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        write_only=True,
        help_text="Total down payment to be distributed among owners",
    )

    # Agent Details
    agent = serializers.SerializerMethodField()
    agent_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    # Payment plan data (embedded in the same request)
    payment_plan_start_date = serializers.DateField(write_only=True)
    payment_plan_frequency = serializers.ChoiceField(
        choices=[
            ("monthly", "Monthly"),
            ("quarterly", "Quarterly"),
            ("semi-annual", "Semi-Annual"),
            ("annual", "Annual"),
        ],
        write_only=True,
    )
    payment_plan_installment_count = serializers.IntegerField(
        write_only=True, min_value=1
    )
    payment_plan_template_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True
    )

    # Commission data (embedded in the same request)
    agent_commission_type = serializers.ChoiceField(
        choices=[("%", "Percentage"), ("fixed", "Fixed Amount")],
        write_only=True,
        required=False,
    )
    agent_commission_rate = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        write_only=True,
        required=False,
        min_value=0,
        allow_null=True,
    )
    agent_commission_amount = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        write_only=True,
        required=False,
        min_value=0,
        allow_null=True,
    )

    class Meta:
        model = PropertySale
        fields = [
            "id",
            "sale_date",
            "status",
            "agent",
            "agent_id",
            "notes",
            "sale_items",
            "property_buyer_pairs",
            # Total amounts for calculation
            "total_property_price",
            "total_down_payment",
            # Payment plan fields
            "payment_plan_start_date",
            "payment_plan_frequency",
            "payment_plan_installment_count",
            "payment_plan_template_id",
            # Commission fields
            "agent_commission_type",
            "agent_commission_rate",
            "agent_commission_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_agent(self, obj):
        """Get agent details"""
        if obj.agent:
            return {
                "id": obj.agent.id,
                "name": obj.agent.get_full_name(),
                "email": obj.agent.email,
                "phone": obj.agent.phone,
            }
        return None

    def validate(self, data):
        """Validate sale data"""
        # Ensure property-buyer pairs are provided
        property_buyer_pairs = data.get("property_buyer_pairs", [])
        if not property_buyer_pairs:
            raise serializers.ValidationError(
                "At least one property-buyer pair must be provided"
            )

        # Validate total amounts
        total_property_price = data.get("total_property_price")
        total_down_payment = data.get("total_down_payment")

        if not total_property_price or total_property_price <= 0:
            raise serializers.ValidationError(
                "Total property price must be greater than 0"
            )

        if not total_down_payment or total_down_payment < 0:
            raise serializers.ValidationError("Total down payment must be 0 or greater")

        if total_down_payment > total_property_price:
            raise serializers.ValidationError(
                "Total down payment cannot exceed total property price"
            )

        # Validate each property-buyer pair
        total_percentage = 0
        for pair in property_buyer_pairs:
            if not pair.get("property_node_id"):
                raise serializers.ValidationError(
                    "Property node ID is required for each pair"
                )
            if not pair.get("buyer_id"):
                raise serializers.ValidationError("Buyer ID is required for each pair")

            ownership_percentage = pair.get("ownership_percentage", 100)
            if ownership_percentage <= 0 or ownership_percentage > 100:
                raise serializers.ValidationError(
                    "Ownership percentage must be between 0 and 100"
                )

            total_percentage += ownership_percentage

        # Validate total ownership percentage equals 100%
        if abs(total_percentage - 100) > 0.01:  # Allow small floating point differences
            raise serializers.ValidationError(
                f"Total ownership percentage must equal 100%, got {total_percentage}%"
            )

        # Validate payment plan fields
        if not data.get("payment_plan_start_date"):
            raise serializers.ValidationError("Payment plan start date is required")

        if not data.get("payment_plan_frequency"):
            raise serializers.ValidationError("Payment plan frequency is required")

        if not data.get("payment_plan_installment_count"):
            raise serializers.ValidationError(
                "Payment plan installment count is required"
            )

        # Validate commission data if agent is provided
        if data.get("agent_id"):
            if not data.get("agent_commission_type"):
                raise serializers.ValidationError(
                    "Commission type is required when agent is selected"
                )

            commission_type = data.get("agent_commission_type")
            commission_rate = data.get("agent_commission_rate")
            commission_amount = data.get("agent_commission_amount")

            if commission_type == "%":
                # Percentage commission: rate is required and must be 0-100
                if not commission_rate:
                    raise serializers.ValidationError(
                        "Commission rate is required for percentage type"
                    )
                if commission_rate < 0 or commission_rate > 100:
                    raise serializers.ValidationError(
                        "Commission rate must be between 0% and 100%"
                    )
            elif commission_type == "fixed":
                # Fixed commission: rate should not be provided
                if commission_rate:
                    raise serializers.ValidationError(
                        "Commission rate should not be provided for fixed type"
                    )
                # Fixed commission: amount is required
                if not commission_amount:
                    raise serializers.ValidationError(
                        "Commission amount is required for fixed type"
                    )
                if commission_amount < 0:
                    raise serializers.ValidationError(
                        "Commission amount must be 0 or greater"
                    )

        return data

    def create(self, validated_data):
        """Create a new property sale with individual payment plans for each owner"""
        # Extract embedded data
        property_buyer_pairs = validated_data.pop("property_buyer_pairs", [])
        total_property_price = validated_data.pop("total_property_price")
        total_down_payment = validated_data.pop("total_down_payment")

        payment_plan_start_date = validated_data.pop("payment_plan_start_date")
        payment_plan_frequency = validated_data.pop("payment_plan_frequency")
        payment_plan_installment_count = validated_data.pop(
            "payment_plan_installment_count"
        )
        payment_plan_template_id = validated_data.pop("payment_plan_template_id", None)

        agent_commission_type = validated_data.pop("agent_commission_type", None)
        agent_commission_rate = validated_data.pop("agent_commission_rate", None)
        agent_commission_amount = validated_data.pop("agent_commission_amount", None)

        agent_id = validated_data.pop("agent_id", None)

        # Get the agent if provided
        agent = None
        if agent_id:
            try:
                agent = Users.objects.get(id=agent_id)
            except Users.DoesNotExist:
                raise serializers.ValidationError("Agent not found")

        # Create the main sale record
        sale = PropertySale.objects.create(agent=agent, **validated_data)

        # Get the template if provided
        template = None
        if payment_plan_template_id:
            try:
                template = PaymentPlanTemplate.objects.get(id=payment_plan_template_id)
            except PaymentPlanTemplate.DoesNotExist:
                pass

        # Create sale items and individual payment plans for each property-buyer pair
        for pair in property_buyer_pairs:
            property_node_id = pair["property_node_id"]
            buyer_id = pair["buyer_id"]
            ownership_percentage = pair.get("ownership_percentage", 100)
            possession_date = pair.get("possession_date")

            # Calculate individual amounts based on ownership percentage
            individual_sale_price = (total_property_price * ownership_percentage) / 100
            individual_down_payment = (total_down_payment * ownership_percentage) / 100

            # Get the property node
            try:
                property_node = LocationNode.objects.get(id=property_node_id)
            except LocationNode.DoesNotExist:
                raise serializers.ValidationError(
                    f"Property {property_node_id} not found"
                )

            # Get the buyer
            try:
                buyer = Users.objects.get(id=buyer_id)
            except Users.DoesNotExist:
                raise serializers.ValidationError(f"Buyer {buyer_id} not found")

            # Calculate down payment percentage
            down_payment_percentage = (
                individual_down_payment / individual_sale_price
            ) * 100

            # Create the sale item with calculated individual amounts
            sale_item = PropertySaleItem.objects.create(
                sale=sale,
                property_node=property_node,
                buyer=buyer,
                sale_price=individual_sale_price,
                down_payment=individual_down_payment,
                down_payment_percentage=down_payment_percentage,
                ownership_percentage=ownership_percentage,
                possession_date=possession_date,
            )

            # Create individual payment plan for this owner-property combination
            payment_plan = PaymentPlan.objects.create(
                sale_item=sale_item,
                payment_type="installments",
                start_date=payment_plan_start_date,
                frequency=payment_plan_frequency,
                installment_count=payment_plan_installment_count,
                template=template,
                is_custom=template is None,
            )

            # Create individual payment schedule entries for this owner
            if (
                payment_plan.payment_type == "installments"
                and payment_plan.installment_count
            ):
                from dateutil.relativedelta import relativedelta

                remaining_amount = sale_item.sale_price - sale_item.down_payment
                installment_amount = remaining_amount / payment_plan.installment_count

                for i in range(1, payment_plan.installment_count + 1):
                    # Calculate due date based on frequency
                    if payment_plan.frequency == "monthly":
                        due_date = payment_plan.start_date + relativedelta(months=i - 1)
                    elif payment_plan.frequency == "quarterly":
                        due_date = payment_plan.start_date + relativedelta(
                            months=(i - 1) * 3
                        )
                    elif payment_plan.frequency == "semi-annual":
                        due_date = payment_plan.start_date + relativedelta(
                            months=(i - 1) * 6
                        )
                    elif payment_plan.frequency == "annual":
                        due_date = payment_plan.start_date + relativedelta(
                            months=(i - 1) * 12
                        )
                    else:
                        due_date = payment_plan.start_date + relativedelta(months=i - 1)

                    # Create payment schedule entry
                    PaymentSchedule.objects.create(
                        payment_plan=payment_plan,
                        payment_number=i,
                        due_date=due_date,
                        amount=installment_amount,
                        status="pending",
                    )

        # Create commission if agent is provided
        if agent and agent_commission_type:
            if agent_commission_type == "%" and agent_commission_rate:
                # Percentage commission: calculate amount from total property price
                commission_amount = (total_property_price * agent_commission_rate) / 100
                SaleCommission.objects.create(
                    sale=sale,
                    agent=agent,
                    commission_type=agent_commission_type,
                    commission_rate=agent_commission_rate,
                    commission_amount=commission_amount,
                    status="pending",
                )
            elif agent_commission_type == "fixed":
                # Fixed commission: amount should be provided separately
                if agent_commission_amount:
                    SaleCommission.objects.create(
                        sale=sale,
                        agent=agent,
                        commission_type=agent_commission_type,
                        commission_rate=agent_commission_rate,
                        commission_amount=agent_commission_amount,
                        status="pending",
                    )

        return sale
