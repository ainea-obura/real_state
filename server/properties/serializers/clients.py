from datetime import datetime, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Count, Max, Min, Q, Sum
from rest_framework import serializers

from accounts.models import Users, UserVerification
from payments.models import Invoice, Payout, Receipt
from properties.models import (
    LocationNode,
    MaintenanceRequest,
    Media,
    ProjectDetail,
    PropertyOwner,
    PropertyService,
    PropertyTenant,
    Service,
    UnitDetail,
    VillaDetail,
)
from utils.currency import get_serialized_default_currency
from utils.format import RobustDateTimeField, format_money_with_currency


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Users
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "gender",
            "is_active",
            "type",
            "created_at",
            "modified_at",
            "is_tenant_verified",
            "is_owner_verified",
        ]
        read_only_fields = ["id", "created_at", "modified_at"]

    def validate(self, attrs):
        # Enforce type=tenant
        attrs["type"] = "tenant"
        # Handle empty email values
        if "email" in attrs and (not attrs["email"] or attrs["email"].strip() == ""):
            attrs["email"] = None
        # Validate email format if provided
        elif "email" in attrs and attrs["email"]:
            try:
                validate_email(attrs["email"])
            except ValidationError:
                raise serializers.ValidationError({"email": "Invalid email format"})
        # Generate username from email or phone
        if "email" in attrs and attrs["email"]:
            attrs["username"] = attrs["email"].split("@")[0]
        elif "phone" in attrs:
            attrs["username"] = f"tenant_{attrs['phone']}"
        return attrs


###
# Owner Serializer
###
class OwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Users
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "gender",
            "is_active",
            "type",
            "created_at",
            "modified_at",
            "is_owner_verified",
        ]
        read_only_fields = ["id", "type", "created_at", "modified_at"]

    def validate(self, attrs):
        # Enforce type=owner
        attrs["type"] = "owner"
        # Handle empty email values
        if "email" in attrs and (not attrs["email"] or attrs["email"].strip() == ""):
            attrs["email"] = None
        # Validate email format if provided
        elif "email" in attrs and attrs["email"]:
            try:
                validate_email(attrs["email"])
            except ValidationError:
                raise serializers.ValidationError({"email": "Invalid email format"})
        # Generate username from email or phone
        if "email" in attrs and attrs["email"]:
            attrs["username"] = f"{attrs['email'].split('@')[0]}-{attrs['phone']}"
        elif "phone" in attrs:
            attrs["username"] = f"owner_{attrs['phone']}"
        return attrs


class OwnerRetrieveSerializer(serializers.ModelSerializer):
    """
    Comprehensive serializer for owner dashboard data.
    Groups data logically for frontend consumption - statistics and facts only.
    """

    # Main data sections
    owner = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = Users
        fields = [
            "owner",
            "stats",
        ]

    def get_owner(self, obj):
        """Owner basic information"""
        # Use RobustDateTimeField for date formatting
        created_at_field = RobustDateTimeField()
        modified_at_field = RobustDateTimeField()

        return {
            "id": str(obj.id),
            "email": obj.email,
            "first_name": obj.first_name,
            "last_name": obj.last_name,
            "phone": obj.phone,
            "gender": obj.gender,
            "type": obj.type,
            "is_active": obj.is_active,
            "is_owner_verified": obj.is_owner_verified,
            "created_at": (
                created_at_field.to_representation(obj.created_at)
                if obj.created_at
                else None
            ),
            "modified_at": (
                modified_at_field.to_representation(obj.modified_at)
                if obj.modified_at
                else None
            ),
        }

    def get_stats(self, obj):
        """Calculated statistics for the owner - key metrics only"""
        currency = get_serialized_default_currency()
        # Get owned properties count
        owned_properties_count = PropertyOwner.objects.filter(
            owner_user=obj, is_deleted=False
        ).count()

        # Calculate total income (sum of net_amount from completed payouts)
        now = datetime.now()
        total_income = Payout.objects.filter(
            owner=obj, status="completed", year=now.year
        ).aggregate(total=Sum("net_amount"))["total"] or Decimal("0")

        # Calculate monthly income (sum of net_amount from completed payouts in current month/year)

        # Calculate pending invoices (sum of outstanding balances for ISSUED, OVERDUE, PARTIAL)
        pending_invoices_qs = Invoice.objects.filter(
            owners__owner_user=obj,
            status__in=["ISSUED", "OVERDUE", "PARTIAL"],
            is_deleted=False,
        )

        now = datetime.now()
        current_month = now.month
        current_year = now.year

        def get_invoice_paid_amount(invoice):
            return Receipt.objects.filter(
                invoice=invoice,
                payment_date__year=current_year,
                payment_date__month=current_month,
            ).aggregate(total=Sum("paid_amount"))["total"] or Decimal("0")

        pending_total = Decimal("0")
        for invoice in pending_invoices_qs:
            paid = get_invoice_paid_amount(invoice)
            outstanding = invoice.total_amount - paid
            if outstanding < 0:
                outstanding = Decimal("0")
            pending_total += outstanding
        # pending_total now reflects the sum of all outstanding balances for relevant invoices

        # Count total documents
        owned_properties = PropertyOwner.objects.filter(
            owner_user=obj, is_deleted=False
        ).values_list("node", flat=True)

        # Calculate outstanding invoices
        total_outstanding = Payout.objects.filter(
            owner=obj, status="pending", month=now.month, year=now.year
        ).aggregate(total=Sum("net_amount"))["total"] or Decimal("0")

        # Calculate occupancy rate (properties with active tenants)
        now = datetime.now()
        occupied_properties = PropertyTenant.objects.filter(
            node__in=owned_properties,
            contract_start__lte=now.replace(day=1),
            contract_end__gte=now.replace(day=1),
            is_deleted=False,
        ).count()

        occupancy_rate = (
            (occupied_properties / owned_properties_count) * 100
            if owned_properties_count > 0
            else 0
        )

        # total_management_cost
        total_management_cost = Payout.objects.filter(
            owner=obj,
            month=now.month,
            year=now.year,
            status="completed",
        ).aggregate(total=Sum("management_fee"))["total"] or Decimal("0")

        # total services and expenses
        total_services_and_expenses = Payout.objects.filter(
            owner=obj,
            month=now.month,
            year=now.year,
            status="completed",
        ).aggregate(total=Sum("services_expenses"))["total"] or Decimal("0")

        return {
            "total_income": format_money_with_currency(total_income, currency),
            "pending_invoices": format_money_with_currency(pending_total, currency),
            "owned_properties": str(owned_properties_count),
            "total_outstanding": format_money_with_currency(
                total_outstanding, currency
            ),
            "occupancy_rate": str(round(occupancy_rate, 2)),
            "total_service_cost": format_money_with_currency(
                total_services_and_expenses, currency
            ),
            "total_management_cost": format_money_with_currency(
                total_management_cost, currency
            ),
        }


class OwnerPropertiesSerializer(serializers.ModelSerializer):
    """
    Returns summary and property details for the owner's properties dashboard.
    """

    summary = serializers.SerializerMethodField()
    properties = serializers.SerializerMethodField()

    class Meta:
        model = Users
        fields = [
            "summary",
            "properties",
        ]

    def get_summary(self, obj):
        # Get all properties owned by the owner
        owned_properties = PropertyOwner.objects.filter(
            owner_user=obj, is_deleted=False
        ).select_related("node")
        property_nodes = [po.node for po in owned_properties]
        total_properties = len(property_nodes)

        # Active tenants (contracts active today)
        now = datetime.now().date()
        active_tenants = PropertyTenant.objects.filter(
            node__in=property_nodes,
            contract_start__lte=now,
            contract_end__gte=now,
            is_deleted=False,
        ).count()

        occupancy_rate = (
            (active_tenants / total_properties) * 100 if total_properties > 0 else 0
        )

        # All maintenance requests attached to these properties
        maintenance_qs = MaintenanceRequest.objects.filter(node__in=property_nodes)
        total_maintenance = maintenance_qs.count()
        total_emergency_maintenance = maintenance_qs.filter(priority="urgent").count()

        return {
            "total_properties": total_properties,
            "active_tenants": active_tenants,
            "occupancy_rate": round(occupancy_rate, 2),
            "total_maintenance": total_maintenance,
            "total_emergency_maintenance": total_emergency_maintenance,
        }

    def get_properties(self, obj):
        # Return property details for each owned property
        owned_properties = PropertyOwner.objects.filter(
            owner_user=obj, is_deleted=False
        ).select_related("node")
        properties = []
        now = datetime.now().date()
        created_at_field = RobustDateTimeField()
        updated_at_field = RobustDateTimeField()
        for po in owned_properties:
            node = po.node
            # Maintenance requests for this property
            maintenance_requests = list(
                MaintenanceRequest.objects.filter(node=node).values(
                    "id", "title", "status", "priority", "created_at"
                )
            )
            # Format maintenance created_at
            for m in maintenance_requests:
                m["created_at"] = created_at_field.to_representation(m["created_at"])
            # Current tenant (contract active today)
            tenant_qs = PropertyTenant.objects.filter(
                node=node,
                contract_start__lte=now,
                contract_end__gte=now,
                is_deleted=False,
            ).select_related("tenant_user")
            current_tenant = None
            if tenant_qs.exists():
                tenant = tenant_qs.first()
                current_tenant = {
                    "id": str(tenant.tenant_user.id),
                    "name": tenant.tenant_user.get_full_name(),
                    "contract_start": tenant.contract_start,
                    "contract_end": tenant.contract_end,
                    "rent_amount": format_money_with_currency(
                        tenant.rent_amount, getattr(tenant, "currency", None)
                    ),
                }

            # Build property_node string for hierarchy (parent and grandparent only)
            def get_property_node_string(node):
                # Traverse up to project, but skip the current node's name
                names = []
                current = node.parent  # start from parent
                while current is not None:
                    if current.node_type == "PROJECT":
                        names.insert(0, current.name)
                        break
                    elif current.node_type in ["BLOCK", "HOUSE"]:
                        names.insert(0, current.name)
                    current = current.parent
                return " > ".join(names) if names else None

            properties.append(
                {
                    "id": str(node.id),
                    "name": node.name,
                    "node_type": node.node_type,
                    "parent": node.parent.name if node.parent else None,
                    "property_node": get_property_node_string(node),
                    "created_at": created_at_field.to_representation(node.created_at),
                    "updated_at": updated_at_field.to_representation(node.updated_at),
                    "maintenance_requests": maintenance_requests,
                    "current_tenant": current_tenant,
                }
            )
        return properties


class PropertyOwnerIncomeDetailSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for owner income dashboard.
    Provides only the required data structure using only the Payout model.
    """

    class Meta:
        model = Users
        fields = []  # Not used, as we override to_representation

    def to_representation(self, obj):
        import calendar

        now = datetime.now()
        owner = obj
        currency = get_serialized_default_currency()

        # Total Income (sum of net_amount from completed payouts)
        total_income = Payout.objects.filter(owner=owner, status="completed").aggregate(
            total=Sum("net_amount")
        )["total"] or Decimal("0")

        # Management Fee (sum of management_fee from completed payouts)
        management_fee = Payout.objects.filter(
            owner=owner, status="completed"
        ).aggregate(total=Sum("management_fee"))["total"] or Decimal("0")

        # Outstanding Payments (sum of net_amount from pending payouts)
        outstanding_payments = Payout.objects.filter(
            owner=owner, status="pending"
        ).aggregate(total=Sum("net_amount"))["total"] or Decimal("0")

        # Monthly Average Income (average of net_amount per month for completed payouts)
        payouts = Payout.objects.filter(owner=owner, status="completed")
        if payouts.exists():
            months = payouts.values_list("year", "month").distinct().count()
            monthly_average_income = float(total_income) / months if months > 0 else 0
        else:
            monthly_average_income = 0

        # Income Transactions (last 10 completed payouts)
        income_transactions = [
            {
                "payout_number": p.payout_number,
                "amount": format_money_with_currency(p.net_amount, currency),
                "date": p.payout_date.isoformat() if p.payout_date else None,
                "property": str(p.property_node) if p.property_node else None,
                "status": p.status,
            }
            for p in Payout.objects.filter(owner=owner, status="completed").order_by(
                "-payout_date"
            )[:10]
        ]

        # Last 3 Months Income Trend
        last_3_months_trend = []
        for i in range(3):
            month_date = now - timedelta(days=now.day - 1) - timedelta(days=30 * i)
            year = month_date.year
            month = month_date.month
            month_label = f"{year}-{month:02d}"
            month_income = Payout.objects.filter(
                owner=owner, status="completed", year=year, month=month
            ).aggregate(total=Sum("net_amount"))["total"] or Decimal("0")
            month_fee = Payout.objects.filter(
                owner=owner, status="completed", year=year, month=month
            ).aggregate(total=Sum("management_fee"))["total"] or Decimal("0")
            last_3_months_trend.append(
                {
                    "month": month_label,
                    "income": format_money_with_currency(month_income, currency),
                    "management_fee": format_money_with_currency(month_fee, currency),
                }
            )

        return {
            "total_income": format_money_with_currency(total_income, currency),
            "management_fee": format_money_with_currency(management_fee, currency),
            "monthly_average_income": format_money_with_currency(
                monthly_average_income, currency
            ),
            "outstanding_payments": format_money_with_currency(
                outstanding_payments, currency
            ),
            "income_transactions": income_transactions,
            "last_3_months_trend": last_3_months_trend,
        }


# owner invoices


class OwnerInvoiceSerializer(serializers.ModelSerializer):
    property_name = serializers.SerializerMethodField()
    receipts = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "description",
            "status",
            "total_amount",
            "issue_date",
            "due_date",
            "property_name",
            "receipts",
            "balance",
        ]

    def get_invoice_number(self, obj):
        # Format: INV-YY-XXXX
        try:
            year = obj.issue_date.year % 100  # last two digits
            return f"INV-{year:02d}-{obj.invoice_number:04d}"
        except Exception:
            return str(obj.invoice_number)

    def get_property_name(self, obj):
        return str(obj.property) if obj.property else None

    def get_receipts(self, obj):

        now = datetime.now()
        current_month = now.month
        current_year = now.year
        currency = get_serialized_default_currency()
        receipts_qs = Receipt.objects.filter(
            invoice=obj,
            payment_date__year=current_year,
            payment_date__month=current_month,
        ).order_by("-payment_date")
        payment_date_field = RobustDateTimeField()
        return [
            {
                "id": str(r.id),
                "paid_amount": format_money_with_currency(r.paid_amount, currency),
                "payment_date": payment_date_field.to_representation(r.payment_date),
                "receipt_number": (
                    f"RV-{r.payment_date.year}-{str(r.receipt_number).zfill(4)}"
                    if r.receipt_number is not None
                    else str(r.receipt_number)
                ),
                "notes": r.notes,
            }
            for r in receipts_qs
        ]

    def get_balance(self, obj):

        now = datetime.now()
        current_month = now.month
        current_year = now.year
        currency = get_serialized_default_currency()
        paid = Receipt.objects.filter(
            invoice=obj,
            payment_date__year=current_year,
            payment_date__month=current_month,
        ).aggregate(total=Sum("paid_amount"))["total"] or Decimal("0")
        balance = Decimal(obj.total_amount) - paid
        if balance < 0:
            balance = Decimal("0")
        return format_money_with_currency(balance, currency)

    def to_representation(self, instance):
        data = super().to_representation(instance)

        currency = get_serialized_default_currency()
        data["total_amount"] = format_money_with_currency(
            instance.total_amount, currency
        )
        return data


class OwnerInvoiceSummarySerializer(serializers.Serializer):
    total_outstanding = serializers.CharField()
    total_paid = serializers.CharField()
    total_invoices = serializers.IntegerField(read_only=True)
    total_receipts = serializers.IntegerField(read_only=True)
    invoices = OwnerInvoiceSerializer(many=True)

    def to_representation(self, instance):
        owner = instance["owner"]
        currency = instance["currency"]

        now = datetime.now()
        current_month = now.month
        current_year = now.year

        # Get all invoices for this owner for the current month and year
        invoices_qs = Invoice.objects.filter(
            owners__owner_user=owner,
            is_deleted=False,
            issue_date__year=current_year,
            issue_date__month=current_month,
        )

        # Helper: sum of receipts for an invoice (filtered by current month/year)
        def get_invoice_paid_amount(invoice):
            return Receipt.objects.filter(
                invoice=invoice,
                payment_date__year=current_year,
                payment_date__month=current_month,
            ).aggregate(total=Sum("paid_amount"))["total"] or Decimal("0")

        # Calculate summary using receipts
        total_paid = Decimal("0")
        total_outstanding = Decimal("0")
        total_invoices = invoices_qs.count()
        total_receipts = Receipt.objects.filter(
            invoice__in=invoices_qs,
            payment_date__year=current_year,
            payment_date__month=current_month,
        ).count()

        for invoice in invoices_qs:
            paid = get_invoice_paid_amount(invoice)
            outstanding = invoice.total_amount - paid
            if outstanding < 0:
                outstanding = Decimal("0")
            total_paid += paid  # Always add paid, regardless of status
            total_outstanding += (
                outstanding  # Always add outstanding, regardless of status
            )

        # Serialize invoices (filtered by current month/year)
        invoices = OwnerInvoiceSerializer(invoices_qs, many=True).data

        return {
            "total_outstanding": format_money_with_currency(
                total_outstanding, currency
            ),
            "total_paid": format_money_with_currency(total_paid, currency),
            "total_invoices": total_invoices,
            "total_receipts": total_receipts,
            "invoices": invoices,
        }


class ProjectOwnerReadSerializer(serializers.ModelSerializer):
    """
    Comprehensive serializer for project owners view.
    Provides all data needed for the projectOwners.tsx component.
    Matches the mock data structure exactly.
    """

    project_owners = serializers.SerializerMethodField()

    class Meta:
        model = ProjectDetail
        fields = [
            "project_owners",
        ]

    def get_project_owners(self, obj):
        """Get all project owners with their owned properties"""
        # obj is the ProjectDetail instance, so we need to get the project node
        # and find all property owners where the node is a descendant of this project node
        project_node = obj.node

        project_owners = (
            PropertyOwner.objects.filter(
                node__in=project_node.get_descendants(include_self=True),
                is_deleted=False,
            )
            .select_related("owner_user", "node", "node__parent")
            .prefetch_related("node__children", "node__children__children")
        )

        # Group by owner
        owners_data = {}

        for property_owner in project_owners:
            owner_user = property_owner.owner_user
            if not owner_user:
                continue

            owner_id = str(owner_user.id)

            if owner_id not in owners_data:
                owners_data[owner_id] = {
                    "id": owner_id,
                    "name": owner_user.get_full_name(),
                    "email": owner_user.email,
                    "phone": owner_user.phone,
                    "owned_properties": [],
                    "status": "active" if owner_user.is_active else "inactive",
                }

            # Get property information
            property_node = property_owner.node
            owned_property = self._get_property_data(property_node)
            owners_data[owner_id]["owned_properties"].append(owned_property)

        return list(owners_data.values())

    def _get_property_data(self, node):
        """Get detailed property information"""
        # Get nested counts
        nested_units = 0
        nested_rooms = 0
        nested_floors = 0

        # Count children based on node type
        if node.node_type in ["BLOCK", "HOUSE"]:
            # Count floors
            floors = node.children.filter(node_type="FLOOR")
            nested_floors = floors.count()

            # Count units under floors
            for floor in floors:
                units = floor.children.filter(node_type="UNIT")
                nested_units += units.count()

                # Count rooms under units
                for unit in units:
                    rooms = unit.children.filter(node_type="ROOM")
                    nested_rooms += rooms.count()

        elif node.node_type == "UNIT":
            # Count rooms under unit
            rooms = node.children.filter(node_type="ROOM")
            nested_rooms = rooms.count()

        # Get parent information for context
        parent_name = None
        if node.parent:
            if node.parent.node_type == "FLOOR":
                # Unit under floor
                parent_name = f"{node.parent.name} - {node.parent.parent.name if node.parent.parent else 'Unknown Block'}"
            elif node.parent.node_type in ["BLOCK", "HOUSE"]:
                # Floor under block/house
                parent_name = f"{node.parent.name}"

        return {
            "id": str(node.id),
            "name": node.name,
            "node_type": node.node_type,
            "parent_name": parent_name,
            "nested_units": nested_units,
            "nested_rooms": nested_rooms,
            "nested_floors": nested_floors,
        }


class ProjectOwnerSearchSerializer(serializers.ModelSerializer):
    """
    Serializer for searching owners by name or phone.
    Returns basic owner information for the add owner modal.
    """

    class Meta:
        model = Users
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "type",
            "is_active",
        ]
        read_only_fields = ["id", "type", "is_active"]

    def to_representation(self, instance):
        """Custom representation to include full name"""
        data = super().to_representation(instance)
        data["name"] = instance.get_full_name()
        return data

    def validate(self, attrs):
        """Ensure we only return owners"""
        attrs["type"] = "owner"
        return attrs


class ProjectOwnerAssignSerializer(serializers.ModelSerializer):
    """
    Comprehensive serializer for assigning owners to properties.
    Handles validation and data preparation for the view to create assignments.
    """

    # Input fields for assignment
    owner_id = serializers.UUIDField(write_only=True, required=True)
    properties = serializers.ListField(
        child=serializers.DictField(), required=False, write_only=True
    )
    houses = serializers.ListField(
        child=serializers.DictField(), required=False, write_only=True
    )

    # Response fields
    success = serializers.BooleanField(read_only=True)
    created_assignments = serializers.IntegerField(read_only=True)
    errors = serializers.ListField(child=serializers.CharField(), read_only=True)
    assignments = serializers.ListField(child=serializers.DictField(), read_only=True)

    class Meta:
        model = PropertyOwner
        fields = [
            "id",
            "owner_id",
            "properties",
            "houses",
            "success",
            "created_assignments",
            "errors",
            "assignments",
        ]
        read_only_fields = [
            "id",
            "success",
            "created_assignments",
            "errors",
            "assignments",
        ]

    def validate(self, attrs):
        """Validate the assignment data and prepare for creation"""
        # Check if this is a single assignment or bulk assignment
        if "owner_user" in attrs and "node" in attrs:
            # Single assignment - use existing logic
            return self._validate_single_assignment(attrs)
        else:
            # Bulk assignment - use new logic
            return self._validate_bulk_assignment(attrs)

    def _validate_single_assignment(self, attrs):
        """Validate single PropertyOwner assignment"""
        node = attrs.get("node")
        owner_user = attrs.get("owner_user")

        if not node or not owner_user:
            raise serializers.ValidationError("Both node and owner_user are required")

        # Check hierarchy ownership for single assignment
        hierarchy_errors = self._check_hierarchy_ownership(node, owner_user)
        if hierarchy_errors:
            raise serializers.ValidationError(hierarchy_errors)

        return attrs

    def _validate_bulk_assignment(self, attrs):
        """Validate bulk assignment data and prepare validated properties"""
        owner_id = attrs.get("owner_id")
        properties = attrs.get("properties", [])
        houses = attrs.get("houses", [])

        # Ensure we have at least one property to assign
        if not properties and not houses:
            raise serializers.ValidationError(
                "At least one property must be specified for assignment"
            )

        # Validate owner exists and is an owner type
        try:
            owner = Users.objects.get(id=owner_id, type="owner", is_deleted=False)
            attrs["owner"] = owner
        except Users.DoesNotExist:
            raise serializers.ValidationError(
                f"Owner with ID {owner_id} not found or is not an owner"
            )

        # Get project detail ID from context (passed by view)
        project_detail_id = self.context.get("project_detail_id")
        if not project_detail_id:
            raise serializers.ValidationError("Project detail ID is required")

        # Validate project exists and get its location node
        try:
            project = ProjectDetail.objects.get(id=project_detail_id, is_deleted=False)
            project_node = project.node
            attrs["project"] = project
            attrs["project_node"] = project_node
        except ProjectDetail.DoesNotExist:
            raise serializers.ValidationError(
                f"Project with ID {project_detail_id} not found"
            )

        # Validate all properties exist and are under the project
        validated_properties = []

        # Process houses
        for house_data in houses:
            house_id = house_data.get("house_id")
            if not house_id:
                raise serializers.ValidationError(
                    "house_id is required for house assignments"
                )

            try:
                # Find house location node by ID
                house_node = LocationNode.objects.get(
                    id=house_id,
                    node_type="HOUSE",
                    is_deleted=False,
                    tree_id=project_node.tree_id,
                    lft__gt=project_node.lft,
                    rght__lt=project_node.rght,
                )

                # Check hierarchy ownership for house
                hierarchy_errors = self._check_hierarchy_ownership(house_node, owner)
                if hierarchy_errors:
                    raise serializers.ValidationError(hierarchy_errors)

                validated_properties.append(
                    {"node": house_node, "type": "HOUSE", "detail": None}
                )

            except LocationNode.DoesNotExist:
                raise serializers.ValidationError(
                    f"House with ID {house_id} not found under this project"
                )

        # Process properties array (can contain both houses and units)
        for property_data in properties:
            property_type = property_data.get("type")

            if property_type == "HOUSE":
                house_id = property_data.get("house_id")
                if not house_id:
                    raise serializers.ValidationError(
                        "house_id is required for HOUSE type"
                    )

                try:
                    # Find house location node by ID
                    house_node = LocationNode.objects.get(
                        id=house_id,
                        node_type="HOUSE",
                        is_deleted=False,
                        tree_id=project_node.tree_id,
                        lft__gt=project_node.lft,
                        rght__lt=project_node.rght,
                    )

                    # Check hierarchy ownership for house
                    hierarchy_errors = self._check_hierarchy_ownership(
                        house_node, owner
                    )
                    if hierarchy_errors:
                        raise serializers.ValidationError(hierarchy_errors)

                    validated_properties.append(
                        {"node": house_node, "type": "HOUSE", "detail": None}
                    )

                except LocationNode.DoesNotExist:
                    raise serializers.ValidationError(
                        f"House with ID {house_id} not found under this project"
                    )

            elif property_type == "UNIT":
                unit_id = property_data.get("unit_id")
                if not unit_id:
                    raise serializers.ValidationError(
                        "unit_id is required for UNIT type"
                    )

                try:
                    # Find unit location node by ID
                    unit_node = LocationNode.objects.get(
                        id=unit_id,
                        node_type="UNIT",
                        is_deleted=False,
                        tree_id=project_node.tree_id,
                        lft__gt=project_node.lft,
                        rght__lt=project_node.rght,
                    )

                    # Check hierarchy ownership for unit
                    hierarchy_errors = self._check_hierarchy_ownership(unit_node, owner)
                    if hierarchy_errors:
                        raise serializers.ValidationError(hierarchy_errors)

                    validated_properties.append(
                        {"node": unit_node, "type": "UNIT", "detail": None}
                    )

                except LocationNode.DoesNotExist:
                    raise serializers.ValidationError(
                        f"Unit with ID {unit_id} not found under this project"
                    )

            else:
                raise serializers.ValidationError(
                    f"Invalid property type: {property_type}"
                )

        # Store validated properties for the view to use
        attrs["validated_properties"] = validated_properties
        return attrs

    def _check_hierarchy_ownership(self, target_node, new_owner):
        """
        Check hierarchy ownership rules:
        1. No two owners at the same node
        2. Parent ownership controls child ownership
        3. Child ownership conflicts with parent ownership
        """
        errors = []

        # 1. Check if target node is already owned by someone else
        existing_owner = PropertyOwner.objects.filter(
            node=target_node, is_deleted=False
        ).first()

        if existing_owner and existing_owner.owner_user != new_owner:
            errors.append(
                f"{target_node.node_type} '{target_node.name}' is already owned by {existing_owner.owner_user.get_full_name()}"
            )

        # 2. Check if any parent node is owned by someone else
        parent_owners = self._get_parent_owners(target_node)
        for parent_node, parent_owner in parent_owners:
            if parent_owner != new_owner:
                errors.append(
                    f"Cannot assign {target_node.node_type} '{target_node.name}' because parent {parent_node.node_type} '{parent_node.name}' is owned by {parent_owner.get_full_name()}"
                )

        # 3. Check if any child nodes are owned by different owners
        child_owners = self._get_child_owners(target_node)
        for child_node, child_owner in child_owners:
            if child_owner != new_owner:
                errors.append(
                    f"Cannot assign {target_node.node_type} '{target_node.name}' because child {child_node.node_type} '{child_node.name}' is owned by {child_owner.get_full_name()}"
                )

        return errors

    def _get_parent_owners(self, node):
        """Get all parent nodes that have owners"""
        parent_owners = []
        current_node = node

        while current_node.parent:
            parent_owner = PropertyOwner.objects.filter(
                node=current_node.parent, is_deleted=False
            ).first()

            if parent_owner:
                parent_owners.append((current_node.parent, parent_owner.owner_user))

            current_node = current_node.parent

        return parent_owners

    def _get_child_owners(self, node):
        """Get all child nodes that have owners"""
        child_owners = []

        # Get all descendants of this node
        descendants = LocationNode.objects.filter(
            tree_id=node.tree_id, lft__gt=node.lft, rght__lt=node.rght, is_deleted=False
        )

        # Check which descendants have owners
        for descendant in descendants:
            owner = PropertyOwner.objects.filter(
                node=descendant, is_deleted=False
            ).first()

            if owner:
                child_owners.append((descendant, owner.owner_user))

        return child_owners

    def to_representation(self, instance):
        """Return the assignment results"""
        if isinstance(instance, dict):
            return instance

        # For single assignment, return basic info
        return {
            "id": str(instance.id),
            "node_name": instance.node.name,
            "node_type": instance.node.node_type,
            "owner_name": (
                instance.owner_user.get_full_name()
                if instance.owner_user
                else "Unknown"
            ),
            "success": True,
            "created_assignments": 1,
            "errors": [],
            "assignments": [
                {
                    "id": str(instance.id),
                    "node_name": instance.node.name,
                    "node_type": instance.node.node_type,
                    "owner_name": (
                        instance.owner_user.get_full_name()
                        if instance.owner_user
                        else "Unknown"
                    ),
                }
            ],
        }


class AgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Users
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "gender",
            "is_active",
            "type",
            "created_at",
            "modified_at",
            "is_owner_verified",
        ]
        read_only_fields = ["id", "created_at", "modified_at"]

    def validate(self, attrs):
        # Enforce type=agency
        attrs["type"] = "agency"
        # Handle empty email values
        if "email" in attrs and (not attrs["email"] or attrs["email"].strip() == ""):
            attrs["email"] = None
        # Validate email format if provided
        elif "email" in attrs and attrs["email"]:
            try:
                validate_email(attrs["email"])
            except ValidationError:
                raise serializers.ValidationError({"email": "Invalid email format"})
        # Generate username from email or phone
        if "email" in attrs and attrs["email"]:
            attrs["username"] = attrs["email"].split("@")[0]
        elif "phone" in attrs:
            attrs["username"] = f"agent_{attrs['phone']}"
        return attrs


class UserVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserVerification
        fields = [
            "id",
            "category",
            "id_number",
            "document_image",
            "user_image",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class UserVerificationListSerializer(serializers.Serializer):
    user = TenantSerializer()  # or OwnerSerializer, depending on context
    verifications = UserVerificationSerializer(many=True)
    needs_document = serializers.BooleanField()
    is_verified = serializers.BooleanField()
    user_type = serializers.CharField()
