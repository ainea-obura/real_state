from datetime import datetime

from dateutil.relativedelta import relativedelta
from django.db.models import Sum
from rest_framework import serializers

from accounts.models import Users, UserVerification
from properties.models import LocationNode, PropertyTenant
from utils.format import format_price, format_money_with_currency


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
