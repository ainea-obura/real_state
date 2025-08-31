import random
from dateutil.relativedelta import relativedelta
from rest_framework import serializers
from django.db import models
from django.utils import timezone
from django.db.models import Sum

from accounts.models import Users, UserVerification
from properties.models import (
    LocationNode,
    Media,
    PropertyOwner,
    PropertyTenant,
    PropertyService,
    MaintenanceRequest,
)
from payments.models import Invoice, Receipt, Expense, Payout
from utils.format import format_money_with_currency


class TenantUserSerializer(serializers.ModelSerializer):
    verification = serializers.SerializerMethodField()

    class Meta:
        model = Users
        fields = ["id", "email", "first_name", "last_name", "phone", "verification"]
        read_only_fields = ["id"]

    def get_queryset(self):
        return Users.objects.filter(type="tenant")

    def get_verification(self, obj):
        res = ""

        if not obj.is_tenant_verified:
            res = "Not Verified"

        if obj.is_tenant_verified:
            res = "Verified"

        return res


class TenantVerificationSerializer(serializers.ModelSerializer):
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
        read_only_fields = ["status", "created_at", "updated_at"]


class PropertyTenantSerializer(serializers.ModelSerializer):
    verification = serializers.SerializerMethodField()

    class Meta:
        model = PropertyTenant
        fields = [
            "id",
            "node",
            "tenant_user",
            "agent",
            "contract_start",
            "contract_end",
            "rent_amount",
            "deposit_amount",
            "commission",
            "currency",
            "verification",
        ]
        extra_kwargs = {
            "agent": {"required": False, "allow_null": True},
            "commission": {"required": False, "allow_null": True},
        }

    def get_verification(self, obj):
        # Return the latest verification for this tenant
        verif = (
            UserVerification.objects.filter(user=obj.tenant_user)
            .order_by("-created_at")
            .first()
        )
        if verif:
            return TenantVerificationSerializer(verif).data
        return None

    def validate(self, data):
        tenant = data.get("tenant_user")
        node = data.get("node")
        if not tenant:
            raise serializers.ValidationError(
                {"tenant_user": "Tenant user is required."}
            )
        # Check for existing active assignment for this node
        if node and PropertyTenant.objects.filter(node=node, is_deleted=False).exists():
            raise serializers.ValidationError(
                {
                    "node": "A property tenant with this node already exists (and is not deleted)."
                }
            )
        return data

    def create(self, validated_data):
        # Standard create logic
        return super().create(validated_data)


class TenantOverviewSerializer(serializers.ModelSerializer):
    verification = serializers.SerializerMethodField()

    class Meta:
        model = Users
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "gender",
            "type",
            "is_active",
            "is_tenant_verified",
            "created_at",
            "modified_at",
            "verification",
        ]
        read_only_fields = fields

    def get_verification(self, obj):
        # Get the latest verification record for this user
        latest_verif = (
            UserVerification.objects.filter(user=obj).order_by("-created_at").first()
        )
        if latest_verif:
            return {
                "id": str(latest_verif.id),
                "status": latest_verif.status.capitalize(),
                "id_number": latest_verif.id_number,
                "category": latest_verif.category,
                "document_image": (
                    latest_verif.document_image.url
                    if latest_verif.document_image
                    else None
                ),
                "user_image": (
                    latest_verif.user_image.url if latest_verif.user_image else None
                ),
                "created_at": latest_verif.created_at.isoformat(),
            }
        return {
            "id": None,
            "status": "Not Verified",
            "id_number": None,
            "category": None,
            "document_image": None,
            "user_image": None,
            "created_at": None,
        }


class PropertyAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationNode
        fields = [
            "id",
            "name",
            "node_type",
            "parent",
        ]


class PaymentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    date = serializers.DateField()
    status = serializers.CharField()


class InvoiceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    due_date = serializers.DateField()
    status = serializers.CharField()


class DocumentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    url = serializers.URLField()
    uploaded_at = serializers.DateTimeField()


class TenantDashboardSerializer(serializers.Serializer):
    tenant = TenantOverviewSerializer()
    property_assignments = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()
    invoices = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    def get_property_assignments(self, obj):
        tenant = obj["tenant"]
        assignments = PropertyTenant.objects.filter(tenant_user=tenant)
        units = [
            a.node
            for a in assignments
            if a.node and getattr(a.node, "node_type", None) == "unit"
        ]
        return PropertyAssignmentSerializer(units, many=True).data

    def get_payments(self, obj):
        return []

    def get_invoices(self, obj):
        return []

    def get_documents(self, obj):
        return []

    def get_stats(self, obj):
        return {
            "total_rent_paid": 0,
            "total_outstanding": 0,
            "active_contracts": 0,
            "total_documents": 0,
        }


class PropertyTenantNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationNode
        fields = [
            "id",
            "name",
            "node_type",
            "parent",
            # Optionally add more fields if needed for details
        ]


class PropertyTenantUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = Users
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
        ]


class PropertyTenantListSerializer(serializers.ModelSerializer):
    node = PropertyTenantNodeSerializer()
    tenant_user = PropertyTenantUserSerializer()
    agent = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    rent_amount = serializers.SerializerMethodField()
    commission = serializers.SerializerMethodField()

    class Meta:
        model = PropertyTenant
        fields = [
            "id",
            "node",
            "tenant_user",
            "agent",
            "contract_start",
            "contract_end",
            "rent_amount",
            "deposit_amount",
            "commission",
            "currency",
        ]

    def get_agent(self, obj):
        if obj.agent:
            return {
                "id": str(obj.agent.id),
                "first_name": obj.agent.first_name,
                "last_name": obj.agent.last_name,
                "email": obj.agent.email,
                "phone": obj.agent.phone,
            }
        return None

    def get_currency(self, obj):
        return {
            "id": obj.currency.id,
            "name": obj.currency.name,
            "code": obj.currency.code,
            "symbol": obj.currency.symbol,
        }

    def get_rent_amount(self, obj):
        return format_money_with_currency(obj.rent_amount)

    def get_commission(self, obj):
        from utils.format import format_money_with_currency

        if obj.commission is not None:
            return format_money_with_currency(obj.commission)
        return None


class PropertyStatsSerializer(serializers.Serializer):
    total_tenants = serializers.IntegerField()
    active_tenants = serializers.IntegerField()
    inactive_tenants = serializers.IntegerField()
    total_units = serializers.IntegerField()
    occupied_units = serializers.IntegerField()
    available_units = serializers.IntegerField()
    total_houses = serializers.IntegerField()
    occupied_houses = serializers.IntegerField()
    available_houses = serializers.IntegerField()


class TenantProfileSerializer(serializers.ModelSerializer):
    stats = serializers.SerializerMethodField()
    verification = serializers.SerializerMethodField()

    class Meta:
        model = Users
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "is_active",
            "is_tenant_verified",
            "created_at",
            "modified_at",
            "stats",
            "verification",
            "last_login",
        ]
        read_only_fields = [
            "id",
            "phone",
            "is_active",
            "is_tenant_verified",
            "created_at",
            "modified_at",
            "stats",
            "verification",
        ]

    def get_stats(self, obj):
        assignments = PropertyTenant.objects.filter(tenant_user=obj, is_deleted=False)
        total_rent_paid = 0
        active_contracts = 0
        for a in assignments:
            if a.contract_end is None or a.contract_end >= a.contract_start:
                active_contracts += 1
            total_rent_paid += float(a.rent_amount or 0)
        total_outstanding = 0  # Placeholder for real logic
        total_documents = 0  # Placeholder for real logic
        return {
            "total_rent_paid": total_rent_paid,
            "total_outstanding": total_outstanding,
            "active_contracts": active_contracts,
            "total_documents": total_documents,
        }

    def get_verification(self, obj):
        latest_verif = (
            UserVerification.objects.filter(user=obj).order_by("-created_at").first()
        )
        if latest_verif:
            return {
                "id": str(latest_verif.id),
                "status": latest_verif.status.capitalize(),
                "id_number": latest_verif.id_number,
                "category": latest_verif.category,
                "document_image": (
                    latest_verif.document_image.url
                    if latest_verif.document_image
                    else None
                ),
                "user_image": (
                    latest_verif.user_image.url if latest_verif.user_image else None
                ),
                "created_at": latest_verif.created_at.isoformat(),
            }
        return None


class TenantLeaseNodeSerializer(serializers.ModelSerializer):
    parent = serializers.SerializerMethodField()

    class Meta:
        model = LocationNode
        fields = ["id", "name", "node_type", "parent"]

    def get_parent(self, obj):
        if obj.parent:
            return {
                "id": str(obj.parent.id),
                "name": obj.parent.name,
                "node_type": obj.parent.node_type,
            }
        return None


class TenantLeaseSummarySerializer(serializers.Serializer):
    unit = serializers.CharField()
    property = serializers.CharField()
    rent = serializers.CharField()
    deposit = serializers.CharField()
    currency = serializers.CharField(allow_blank=True, required=False)
    contract_start = serializers.DateField()
    contract_end = serializers.DateField()


class PenaltySummarySerializer(serializers.Serializer):
    type = serializers.CharField()
    amount = serializers.CharField()
    status = serializers.CharField()
    due = serializers.DateField()


class InvoiceSummarySerializer(serializers.Serializer):
    number = serializers.CharField()
    type = serializers.CharField()
    status = serializers.CharField()
    due = serializers.DateField()
    amount = serializers.CharField()


class PaymentSummarySerializer(serializers.Serializer):
    ref = serializers.CharField()
    date = serializers.DateField()
    amount = serializers.CharField()
    method = serializers.CharField()
    status = serializers.CharField()


class TenantFinanceStatSerializer(serializers.Serializer):
    total_billed = serializers.CharField()
    total_paid = serializers.CharField()
    outstanding = serializers.CharField()
    overdue = serializers.CharField()
    paid_invoices = serializers.IntegerField()
    overdue_invoices = serializers.IntegerField()
    penalties = serializers.CharField()
    avg_payment_delay = serializers.IntegerField()
    next_bill_due = serializers.DateField(allow_null=True, required=False)


class TenantFinanceSummarySerializer(serializers.Serializer):
    stats = TenantFinanceStatSerializer()
    lease = TenantLeaseSummarySerializer()
    penalties = PenaltySummarySerializer(many=True)
    recent_invoices = InvoiceSummarySerializer(many=True)
    recent_payments = PaymentSummarySerializer(many=True)
    bill_health_score = serializers.IntegerField()


class TenantLeaseStatsSerializer(serializers.Serializer):
    total_rent_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    active_leases = serializers.IntegerField()
    total_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)

    @classmethod
    def for_tenant(cls, tenant):
        assignments = PropertyTenant.objects.filter(
            tenant_user=tenant, is_deleted=False
        )
        # Get all PropertyTenant IDs for this tenant
        assignment_ids = assignments.values_list("id", flat=True)
        # Sum all completed payments for these assignments
        total_rent_paid = 0
        active_leases = assignments.count()
        total_outstanding = 0  # Placeholder, implement logic if available
        return cls(
            {
                "total_rent_paid": total_rent_paid,
                "active_leases": active_leases,
                "total_outstanding": total_outstanding,
            }
        )


class PropertyAssignmentDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for PropertyTenant that matches the PropertyAssignmentSchema structure.
    Includes nested node information and optional floor/block details.
    """

    id = serializers.UUIDField(read_only=True)
    node = serializers.SerializerMethodField()
    floor = serializers.SerializerMethodField()
    block = serializers.SerializerMethodField()
    contract_start = serializers.DateField()
    contract_end = serializers.DateField(allow_null=True, required=False)
    rent_amount = serializers.SerializerMethodField()
    currency = serializers.CharField(max_length=3)
    created_at = serializers.DateTimeField(read_only=True)

    # Enhanced data fields
    owner = serializers.SerializerMethodField()
    agent = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    financial_summary = serializers.SerializerMethodField()

    class Meta:
        model = PropertyTenant
        fields = [
            "id",
            "node",
            "floor",
            "block",
            "contract_start",
            "contract_end",
            "rent_amount",
            "currency",
            "created_at",
            "owner",
            "agent",
            "image",
            "financial_summary",
        ]

    def get_node(self, obj):
        """Return nested node information with parent details."""
        if not obj.node:
            return None

        node_data = {
            "id": str(obj.node.id),
            "name": obj.node.name,
            "node_type": obj.node.node_type,
        }

        # Add parent information if exists
        if obj.node.parent:
            node_data["parent"] = {
                "id": str(obj.node.parent.id),
                "name": obj.node.parent.name,
            }
        else:
            node_data["parent"] = None

        return node_data

    def get_floor(self, obj):
        """Get floor information if the node is a unit under a floor."""
        if not obj.node or obj.node.node_type != "UNIT":
            return None

        # Find the floor parent
        floor_ancestor = obj.node.get_ancestors().filter(node_type="FLOOR").first()
        if floor_ancestor:
            return floor_ancestor.name
        return None

    def get_block(self, obj):
        """Get block information if the node is under a block."""
        if not obj.node:
            return None

        # Find the block ancestor
        block_ancestor = obj.node.get_ancestors().filter(node_type="BLOCK").first()
        if block_ancestor:
            return block_ancestor.name
        return None

    def get_rent_amount(self, obj):
        """Format rent amount with currency using format_money_with_currency."""
        return format_money_with_currency(obj.rent_amount)

    def get_owner(self, obj):
        """Get owner information if available."""
        owner = PropertyOwner.objects.filter(node=obj.node).first()

        if owner:
            owner = owner.owner_user
            return {
                "id": str(owner.id),
                "name": f"{owner.first_name} {owner.last_name}",
                "email": owner.email,
                "phone": owner.phone,
                "profile_image": owner.avatar.url if owner.avatar else None,
            }
        return None

    def get_agent(self, obj):
        """Get agent information if available."""
        try:
            # The agent is directly stored in PropertyTenant model
            if obj.agent:
                return {
                    "id": str(obj.agent.id),
                    "name": f"{obj.agent.first_name} {obj.agent.last_name}",
                    "email": obj.agent.email,
                    "phone": obj.agent.phone,
                    "profile_image": obj.agent.avatar.url if obj.agent.avatar else None,
                }
        except Exception:
            pass
        return None

    def get_image(self, obj):
        print(f"obj.node: {obj.node.id}")
        """Get property image if available."""
        try:
            # First try to find image in the current node
            current_node_images = Media.objects.filter(
                location_node=obj.node.id,
                file_type="image",
                is_deleted=False,
            )

            if current_node_images.exists():
                random_image = random.choice(current_node_images)
                print(f"random_image: {random_image}")

                if random_image and random_image.media:
                    return random_image.media.url

            # If no image in current node, search in parent nodes
            current_node = obj.node
            while current_node.parent:
                current_node = current_node.parent
                parent_images = Media.objects.filter(
                    location_node=current_node.id,
                    file_type="image",
                    is_deleted=False,
                )

                if parent_images.exists():
                    parent_image = random.choice(parent_images)
                    print(f"parent_image: {parent_image}")

                    if parent_image and parent_image.media:
                        return parent_image.media.url

        except Exception as e:
            print(f"Error getting image: {e}")
            pass
        return None

    def get_financial_summary(self, obj):
        """Get financial summary data if available."""
        request = self.context.get("request")
        if request and hasattr(request, "enhanced_data"):
            return request.enhanced_data
        return None

    def validate(self, data):
        """Validate the property tenant assignment."""
        # Check for existing active assignment for this node
        node = data.get("node")
        if node and PropertyTenant.objects.filter(node=node, is_deleted=False).exists():
            raise serializers.ValidationError(
                {
                    "node": "A property tenant with this node already exists (and is not deleted)."
                }
            )
        return data

    def create(self, validated_data):
        """Create a new property tenant assignment."""
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Update an existing property tenant assignment."""
        return super().update(instance, validated_data)


class TenantPropertyAssignmentSerializer(serializers.ModelSerializer):
    node = serializers.SerializerMethodField()
    floor = serializers.SerializerMethodField()
    block = serializers.SerializerMethodField()
    rent_amount = serializers.SerializerMethodField()

    class Meta:
        model = PropertyTenant
        fields = [
            "id",
            "node",
            "floor",
            "block",
            "contract_start",
            "contract_end",
            "rent_amount",
            "currency",
            "created_at",
        ]

    def get_node(self, obj):
        if not obj.node:
            return None
        node_data = {
            "id": str(obj.node.id),
            "name": obj.node.name,
            "node_type": obj.node.node_type,
        }
        if obj.node.parent:
            node_data["parent"] = {
                "id": str(obj.node.parent.id),
                "name": obj.node.parent.name,
            }
        else:
            node_data["parent"] = None
        return node_data

    def get_floor(self, obj):
        if not obj.node or obj.node.node_type != "UNIT":
            return None
        floor_ancestor = obj.node.get_ancestors().filter(node_type="FLOOR").first()
        if floor_ancestor:
            return floor_ancestor.name
        return None

    def get_block(self, obj):
        if not obj.node:
            return None
        block_ancestor = obj.node.get_ancestors().filter(node_type="BLOCK").first()
        if block_ancestor:
            return block_ancestor.name
        return None

    def get_rent_amount(self, obj):
        """Format rent amount with currency using format_money_with_currency."""
        return format_money_with_currency(obj.rent_amount)


class TenantPropertyAssignmentStatsSerializer(serializers.Serializer):
    uniqueProperties = serializers.IntegerField(read_only=True)
    longestTenure = serializers.CharField(read_only=True)
    leaseRenewals = serializers.IntegerField(read_only=True)
    mostRecentStart = serializers.CharField(read_only=True)

    def to_representation(self, tenant):
        # Accept either a tenant instance or tenant_id
        tenant_id = getattr(tenant, "id", None) or tenant
        assignments = PropertyTenant.objects.filter(
            tenant_user_id=tenant_id, is_deleted=False
        )

        # uniqueProperties: count of unique property nodes
        unique_properties = (
            assignments.values_list("node_id", flat=True).distinct().count()
        )

        # longestTenure: find the max contract duration
        longest_months = 0
        for a in assignments:
            if a.contract_start and a.contract_end:
                delta = relativedelta(a.contract_end, a.contract_start)
                months = delta.years * 12 + delta.months
                if months > longest_months:
                    longest_months = months
        years = longest_months // 12
        months = longest_months % 12
        if years and months:
            longest_tenure = f"{years} years {months} months"
        elif years:
            longest_tenure = f"{years} years"
        elif months:
            longest_tenure = f"{months} months"
        else:
            longest_tenure = "-"

        # leaseRenewals: count of assignments with same node for this tenant (if renewal field exists, use it; else, count >1 assignments per node)
        # For now, count total assignments as renewals (minus 1)
        lease_renewals = max(assignments.count() - 1, 0)

        # mostRecentStart: latest contract_start, formatted
        most_recent = assignments.order_by("-contract_start").first()
        if most_recent and most_recent.contract_start:
            most_recent_start = most_recent.contract_start.strftime("%b %d, %Y")
        else:
            most_recent_start = "-"

        return {
            "uniqueProperties": unique_properties,
            "longestTenure": longest_tenure,
            "leaseRenewals": lease_renewals,
            "mostRecentStart": most_recent_start,
        }


class TenantFinanceLeaseSerializer(serializers.Serializer):
    unit = serializers.CharField(allow_blank=True, required=False)
    property = serializers.CharField(allow_blank=True, required=False)
    rent = serializers.CharField()
    deposit = serializers.CharField()
    currency = serializers.CharField()
    contract_start = serializers.DateField(allow_null=True, required=False)
    contract_end = serializers.DateField(allow_null=True, required=False)


class PropertyDetailsSerializer(serializers.Serializer):
    """Serializer for comprehensive property details including financial, tenant, services, and maintenance data."""

    # Property basic information
    property = serializers.SerializerMethodField()

    # Financial summary
    financial_summary = serializers.SerializerMethodField()

    # Tenant information
    tenant_information = serializers.SerializerMethodField()

    # Services and utilities
    services_utilities = serializers.SerializerMethodField()

    # Maintenance and repairs
    maintenance = serializers.SerializerMethodField()

    def get_property(self, obj):
        """Get basic property information."""
        try:
            # Get project details if this is a project node
            project_detail = None
            if obj.node_type == "PROJECT":
                try:
                    project_detail = obj.project_detail
                except:
                    pass

            # Get unit details if this is a unit node
            unit_detail = None
            if obj.node_type == "UNIT":
                try:
                    unit_detail = obj.unit_detail
                except:
                    pass

            # Get parent project address
            project_address = ""
            if obj.node_type != "PROJECT":
                project_node = obj.get_ancestors().filter(node_type="PROJECT").first()
                if project_node:
                    try:
                        project_detail = project_node.project_detail
                        project_address = (
                            project_detail.address if project_detail else ""
                        )
                    except:
                        pass

            return {
                "id": str(obj.id),
                "name": obj.name,
                "node_type": obj.node_type,
                "property_type": getattr(obj, "property_type", None),
                "address": project_address,
                "status": getattr(unit_detail, "status", "available")
                if unit_detail
                else "available",
                "management_mode": getattr(
                    unit_detail, "management_mode", "SERVICE_ONLY"
                )
                if unit_detail
                else "SERVICE_ONLY",
                "size": getattr(unit_detail, "size", ""),
                "rental_price": float(getattr(unit_detail, "rental_price", 0))
                if unit_detail
                else 0,
                "sale_price": float(getattr(unit_detail, "sale_price", 0))
                if unit_detail
                else 0,
                "deposit": float(getattr(unit_detail, "deposit", 0))
                if unit_detail
                else 0,
                "currency": getattr(unit_detail, "currency", None),
                "total_units": self._get_total_units(obj),
                "occupied_units": self._get_occupied_units(obj),
                "vacant_units": self._get_vacant_units(obj),
                "occupancy_rate": self._get_occupancy_rate(obj),
            }
        except Exception as e:
            print(f"Error in get_property: {e}")
            return {}

    def get_financial_summary(self, obj):
        """Get simplified financial summary for the property from owner's perspective."""
        try:
            current_date = timezone.now()

            # Get all UNIT nodes under this property for calculations
            if obj.node_type == "UNIT":
                unit_nodes = [obj]
            elif obj.node_type in ["PROJECT", "BLOCK", "FLOOR"]:
                unit_nodes = LocationNode.objects.filter(
                    lft__gte=obj.lft,
                    rght__lte=obj.rght,
                    tree_id=obj.tree_id,
                    node_type="UNIT",
                    is_deleted=False,
                )
            else:
                unit_nodes = []

            # 1. TOTAL COLLECTED FROM TENANTS (all time)
            total_collected = 0
            if unit_nodes:
                unit_ids = [unit.id for unit in unit_nodes]
                property_tenants = PropertyTenant.objects.filter(
                    node_id__in=unit_ids, 
                    is_deleted=False
                )
                if property_tenants.exists():
                    tenant_ids = list(property_tenants.values_list('id', flat=True))
                    receipts = Receipt.objects.filter(
                        invoice__tenants__id__in=tenant_ids,
                        is_deleted=False
                    )
                    total_collected = (
                        receipts.aggregate(total=Sum("paid_amount"))["total"] or 0
                    )

            # 2. TOTAL EXPENSES ATTACHED TO THIS PROPERTY (all time)
            total_expenses = 0
            if unit_nodes:
                unit_ids = [unit.id for unit in unit_nodes]
                if obj.node_type != "UNIT":
                    unit_ids.append(obj.id)
                
                expenses = Expense.objects.filter(
                    location_node_id__in=unit_ids,
                    is_deleted=False
                )
                total_expenses = expenses.aggregate(total=Sum("total_amount"))["total"] or 0

            # 3. PAYOUTS SENT TO OWNER (all time)
            payouts_sent = 0
            if unit_nodes:
                unit_ids = [unit.id for unit in unit_nodes]
                if obj.node_type != "UNIT":
                    unit_ids.append(obj.id)
                
                # Get payouts for this property
                payouts = Payout.objects.filter(
                    property_node_id__in=unit_ids,
                    status="completed",
                    is_deleted=False
                )
                payouts_sent = payouts.aggregate(total=Sum("net_amount"))["total"] or 0

            return {
                "total_collected": format_money_with_currency(total_collected),
                "total_expenses": format_money_with_currency(total_expenses),
                "payouts_sent": format_money_with_currency(payouts_sent),
                "currency": "KES",
                "last_updated": current_date.isoformat(),
            }
        except Exception as e:
            print(f"Error in get_financial_summary: {e}")
            return {
                "total_collected": "KES 0.00",
                "total_expenses": "KES 0.00",
                "payouts_sent": "KES 0.00",
                "currency": "KES",
                "last_updated": timezone.now().isoformat(),
            }

    def get_tenant_information(self, obj):
        """Get current tenant information."""
        try:
            # Get current tenant assignment
            current_tenant = PropertyTenant.objects.filter(
                node=obj,
                is_deleted=False,
                contract_end__isnull=True,  # Active lease
            ).first()

            if current_tenant:
                return {
                    "has_tenant": True,
                    "tenant_name": current_tenant.tenant_user.get_full_name(),
                    "tenant_email": current_tenant.tenant_user.email,
                    "tenant_phone": current_tenant.tenant_user.phone,
                    "contract_start": current_tenant.contract_start.isoformat(),
                    "contract_end": current_tenant.contract_end.isoformat()
                    if current_tenant.contract_end
                    else None,
                    "monthly_rent": format_money_with_currency(
                        current_tenant.rent_amount
                    ),
                    "deposit": format_money_with_currency(
                        getattr(current_tenant, "deposit_amount", 0)
                    ),
                    "currency": current_tenant.currency.code
                    if current_tenant.currency
                    else "KES",
                    "lease_status": "Active",
                }
            else:
                return {
                    "has_tenant": False,
                    "tenant_name": None,
                    "tenant_email": None,
                    "tenant_phone": None,
                    "contract_start": None,
                    "contract_end": None,
                    "monthly_rent": None,
                    "deposit": None,
                    "currency": None,
                    "lease_status": "Vacant",
                }
        except Exception as e:
            print(f"Error in get_tenant_information: {e}")
            return {
                "has_tenant": False,
                "tenant_name": None,
                "tenant_email": None,
                "tenant_phone": None,
                "contract_start": None,
                "contract_end": None,
                "monthly_rent": None,
                "deposit": None,
                "currency": None,
                "lease_status": "Error",
            }

    def get_services_utilities(self, obj):
        """Get active services and utilities for the property."""
        try:
            # Get active property services
            active_services = PropertyService.objects.filter(
                property_node=obj, status="ACTIVE", is_deleted=False
            ).select_related("service")

            services_list = []
            total_monthly_cost = 0

            for prop_service in active_services:
                service = prop_service.service
                monthly_cost = self._calculate_service_monthly_cost(prop_service)
                total_monthly_cost += monthly_cost

                services_list.append(
                    {
                        "name": service.name,
                        "type": service.pricing_type,
                        "frequency": service.frequency,
                        "monthly_cost": format_money_with_currency(monthly_cost),
                        "is_metered": prop_service.is_metered,
                        "description": service.description,
                    }
                )

            return {
                "active_services": services_list,
                "total_monthly_cost": format_money_with_currency(total_monthly_cost),
                "services_count": len(services_list),
            }
        except Exception as e:
            print(f"Error in get_services_utilities: {e}")
            return {
                "active_services": [],
                "total_monthly_cost": "KES 0.00",
                "services_count": 0,
            }

    def get_maintenance(self, obj):
        """Get maintenance and repair information."""
        try:
            # Get maintenance requests for this property
            maintenance_requests = MaintenanceRequest.objects.filter(
                node=obj, is_deleted=False
            ).order_by("-created_at")

            open_requests = maintenance_requests.filter(
                status__in=["open", "in_progress"]
            )
            resolved_requests = maintenance_requests.filter(status="resolved")

            # Get recent maintenance items
            recent_items = []
            for req in maintenance_requests[:5]:  # Last 5 requests
                recent_items.append(
                    {
                        "id": str(req.id),
                        "title": req.title,
                        "description": req.description,
                        "status": req.status,
                        "priority": req.priority,
                        "created_at": req.created_at.isoformat(),
                        "vendor": req.vendor.name if req.vendor else None,
                    }
                )

            return {
                "open_requests": open_requests.count(),
                "resolved_count": resolved_requests.count(),
                "total_requests": maintenance_requests.count(),
                "recent_items": recent_items,
            }
        except Exception as e:
            print(f"Error in get_maintenance: {e}")
            return {
                "open_requests": 0,
                "resolved_count": 0,
                "total_requests": 0,
                "recent_items": [],
            }

    def _get_total_units(self, obj):
        """Calculate total units for this property node."""
        try:
            if obj.node_type == "UNIT":
                return 1
            elif obj.node_type in ["PROJECT", "BLOCK", "FLOOR"]:
                # Count all UNIT nodes under this node
                return LocationNode.objects.filter(
                    lft__gte=obj.lft,
                    rght__lte=obj.rght,
                    tree_id=obj.tree_id,
                    node_type="UNIT",
                    is_deleted=False,
                ).count()
            return 0
        except:
            return 0

    def _get_occupied_units(self, obj):
        """Calculate occupied units for this property node."""
        try:
            if obj.node_type == "UNIT":
                return (
                    1
                    if PropertyTenant.objects.filter(
                        node=obj, is_deleted=False
                    ).exists()
                    else 0
                )
            elif obj.node_type in ["PROJECT", "BLOCK", "FLOOR"]:
                # Count all UNIT nodes under this node that have tenants
                unit_ids = LocationNode.objects.filter(
                    lft__gte=obj.lft,
                    rght__lte=obj.rght,
                    tree_id=obj.tree_id,
                    node_type="UNIT",
                    is_deleted=False,
                ).values_list("id", flat=True)
                return PropertyTenant.objects.filter(
                    node_id__in=unit_ids, is_deleted=False
                ).count()
            return 0
        except:
            return 0

    def _get_vacant_units(self, obj):
        """Calculate vacant units for this property node."""
        total = self._get_total_units(obj)
        occupied = self._get_occupied_units(obj)
        return max(0, total - occupied)

    def _get_occupancy_rate(self, obj):
        """Calculate occupancy rate for this property node."""
        total = self._get_total_units(obj)
        if total == 0:
            return 0.0
        occupied = self._get_occupied_units(obj)
        return round((occupied / total) * 100, 1)

    def _calculate_monthly_rent(self, obj):
        """Calculate total monthly rent from active tenants."""
        try:
            if obj.node_type == "UNIT":
                tenant = PropertyTenant.objects.filter(
                    node=obj, is_deleted=False
                ).first()
                return float(tenant.rent_amount) if tenant else 0
            elif obj.node_type in ["PROJECT", "BLOCK", "FLOOR"]:
                # Sum rent from all UNIT nodes under this node
                unit_ids = LocationNode.objects.filter(
                    lft__gte=obj.lft,
                    rght__lte=obj.rght,
                    tree_id=obj.tree_id,
                    node_type="UNIT",
                    is_deleted=False,
                ).values_list("id", flat=True)
                total_rent = (
                    PropertyTenant.objects.filter(
                        node_id__in=unit_ids, is_deleted=False
                    ).aggregate(total=models.Sum("rent_amount"))["total"]
                    or 0
                )
                return float(total_rent)
            return 0
        except:
            return 0

    def _calculate_monthly_expenses(self, obj):
        """Calculate monthly expenses for the property."""
        try:
            from datetime import datetime
            
            current_date = timezone.now()
            current_month = current_date.month
            current_year = current_date.year
            
            # Get all UNIT nodes under this property for calculations
            if obj.node_type == "UNIT":
                unit_nodes = [obj]
            elif obj.node_type in ["PROJECT", "BLOCK", "FLOOR"]:
                unit_nodes = LocationNode.objects.filter(
                    lft__gte=obj.lft,
                    rght__lte=obj.rght,
                    tree_id=obj.tree_id,
                    node_type="UNIT",
                    is_deleted=False,
                )
            else:
                unit_nodes = []
            
            if not unit_nodes:
                return 0
            
            # Get expenses for these units and their parent nodes
            unit_ids = [unit.id for unit in unit_nodes]
            # Also include the current node if it's not a UNIT
            if obj.node_type != "UNIT":
                unit_ids.append(obj.id)
            
            # Get current month expenses
            monthly_expenses = Expense.objects.filter(
                location_node_id__in=unit_ids,
                invoice_date__month=current_month,
                invoice_date__year=current_year,
                is_deleted=False
            ).aggregate(total=Sum("total_amount"))["total"] or 0
            
            return float(monthly_expenses)
        except Exception as e:
            print(f"Error calculating monthly expenses: {e}")
            return 0

    def _calculate_service_monthly_cost(self, prop_service):
        """Calculate monthly cost for a property service."""
        try:
            service = prop_service.service
            if service.pricing_type == "FIXED":
                if service.frequency == "MONTHLY":
                    return float(service.base_price or 0)
                elif service.frequency == "YEARLY":
                    return float(service.base_price or 0) / 12
                elif service.frequency == "WEEKLY":
                    return (
                        float(service.base_price or 0) * 4.33
                    )  # Average weeks per month
                else:
                    return float(service.base_price or 0)
            elif service.pricing_type == "PERCENTAGE":
                # For percentage-based services, we'd need the base amount
                # For now, return a mock value
                return 1000
            else:
                return float(prop_service.custom_price or service.base_price or 0)
        except:
            return 0
