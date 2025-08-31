from rest_framework import serializers
from properties.models import LocationNode
from accounts.models import Users
from sales.models import PaymentPlanTemplate


class PaymentPlanTemplateSerializer(serializers.ModelSerializer):
    """Serializer for payment plan templates"""

    category_display = serializers.SerializerMethodField()
    difficulty_display = serializers.SerializerMethodField()
    frequency_display = serializers.SerializerMethodField()
    total_duration_months = serializers.SerializerMethodField()

    class Meta:
        model = PaymentPlanTemplate
        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_display",
            "periods",
            "frequency",
            "frequency_display",
            "deposit_percentage",
            "difficulty",
            "difficulty_display",
            "is_featured",
            "sort_order",
            "usage_count",
            "last_used",
            "total_duration_months",
        ]

    def get_category_display(self, obj):
        """Get human-readable category name"""
        return obj.get_category_display()

    def get_difficulty_display(self, obj):
        """Get human-readable difficulty level"""
        return obj.get_difficulty_display()

    def get_frequency_display(self, obj):
        """Get human-readable frequency"""
        return obj.get_frequency_display()

    def get_total_duration_months(self, obj):
        """Calculate total duration in months"""
        return obj.get_total_duration_months()


class ProjectSearchSerializer(serializers.ModelSerializer):
    """Serializer for project search results"""

    project_detail = serializers.SerializerMethodField()
    city_name = serializers.SerializerMethodField()
    has_blocks = serializers.SerializerMethodField()
    has_houses = serializers.SerializerMethodField()

    class Meta:
        model = LocationNode
        fields = [
            "id",
            "name",
            "node_type",
            "property_type",
            "project_detail",
            "city_name",
            "has_blocks",
            "has_houses",
        ]

    def get_project_detail(self, obj):
        """Get project detail information"""
        try:
            if hasattr(obj, "project_detail") and obj.project_detail:
                detail = obj.project_detail
                return {
                    "city": detail.city.name if detail.city else None,
                    "area": detail.area,
                    "project_code": detail.project_code,
                    "address": detail.address,
                    "start_date": detail.start_date,
                    "end_date": detail.end_date,
                    "status": detail.status,
                    "description": detail.description,
                    "project_type": detail.project_type,
                    "management_fee": detail.management_fee,
                }
            return None
        except Exception:
            return None

    def get_city_name(self, obj):
        """Get city name from project detail"""
        try:
            if (
                hasattr(obj, "project_detail")
                and obj.project_detail
                and obj.project_detail.city
            ):
                return obj.project_detail.city.name
            return None
        except Exception:
            return None

    def get_has_blocks(self, obj):
        """Check if project has blocks"""
        try:
            return obj.children.filter(node_type="BLOCK").exists()
        except Exception:
            return False

    def get_has_houses(self, obj):
        """Check if project has houses"""
        try:
            return obj.children.filter(node_type="HOUSE").exists()
        except Exception:
            return False


class BlockStructureSerializer(serializers.ModelSerializer):
    """Serializer for block structure"""

    block_detail = serializers.SerializerMethodField()
    floors = serializers.SerializerMethodField()

    class Meta:
        model = LocationNode
        fields = ["id", "name", "node_type", "block_detail", "floors"]

    def get_block_detail(self, obj):
        """Get block detail information"""
        try:
            if hasattr(obj, "block_detail") and obj.block_detail:
                detail = obj.block_detail
                return {
                    "name": detail.name,
                    "description": detail.description,
                }
            return None
        except Exception:
            return None

    def get_floors(self, obj):
        """Get floors in this block that have units for sale"""
        try:
            floors = obj.children.filter(node_type="FLOOR")
            saleable_floors = []

            for floor in floors:
                # Check if this floor has any units for sale
                units = floor.children.filter(
                    node_type="UNIT",
                    unit_detail__management_status="for_sale",
                    unit_detail__sale_price__isnull=False,
                ).exclude(unit_detail__sale_price=0)

                # Only include floors that have saleable units
                if units.exists():
                    saleable_floors.append(floor)

            return FloorStructureSerializer(saleable_floors, many=True).data
        except Exception:
            return []


class FloorStructureSerializer(serializers.ModelSerializer):
    """Serializer for floor structure"""

    floor_detail = serializers.SerializerMethodField()
    units = serializers.SerializerMethodField()

    class Meta:
        model = LocationNode
        fields = ["id", "name", "node_type", "floor_detail", "units"]

    def get_floor_detail(self, obj):
        """Get floor detail information"""
        try:
            if hasattr(obj, "floor_detail") and obj.floor_detail:
                detail = obj.floor_detail
                return {
                    "number": detail.number,
                    "description": detail.description,
                }
            return None
        except Exception:
            return None

    def get_units(self, obj):
        """Get only units that are for sale on this floor"""
        try:
            units = obj.children.filter(
                node_type="UNIT",
                unit_detail__management_status="for_sale",
                unit_detail__sale_price__isnull=False,
            ).exclude(unit_detail__sale_price=0)

            serialized_units = UnitStructureSerializer(units, many=True).data
            return serialized_units
        except Exception:
            return []


class UnitStructureSerializer(serializers.ModelSerializer):
    """Serializer for unit structure - only for units for sale"""

    unit_detail = serializers.SerializerMethodField()

    class Meta:
        model = LocationNode
        fields = ["id", "name", "node_type", "unit_detail"]

    def get_unit_detail(self, obj):
        """Get unit detail information for all units (no filtering)"""
        try:
            if hasattr(obj, "unit_detail") and obj.unit_detail:
                detail = obj.unit_detail
                return {
                    "identifier": detail.identifier,
                    "size": detail.size,
                    "unit_type": detail.unit_type,
                    "sale_price": detail.sale_price,
                    "status": detail.status,
                    "description": detail.description,
                    "management_mode": detail.management_mode,
                    "management_status": detail.management_status,
                    "service_charge": detail.service_charge,
                }
            return None
        except Exception:
            return None


class HouseStructureSerializer(serializers.ModelSerializer):
    """Serializer for house structure"""

    house_detail = serializers.SerializerMethodField()

    class Meta:
        model = LocationNode
        fields = ["id", "name", "node_type", "house_detail"]

    def get_house_detail(self, obj):
        """Get house detail information"""
        try:
            if hasattr(obj, "villa_detail") and obj.villa_detail:
                detail = obj.villa_detail
                return {
                    "name": detail.name,
                    "management_mode": detail.management_mode,
                    "service_charge": detail.service_charge,
                }
            return None
        except Exception:
            return None


class ProjectStructureSerializer(serializers.ModelSerializer):
    """Serializer for complete project structure"""

    project_detail = serializers.SerializerMethodField()
    blocks = serializers.SerializerMethodField()
    houses = serializers.SerializerMethodField()

    class Meta:
        model = LocationNode
        fields = [
            "id",
            "name",
            "node_type",
            "property_type",
            "project_detail",
            "blocks",
            "houses",
        ]

    def get_project_detail(self, obj):
        """Get project detail information"""
        try:
            if hasattr(obj, "project_detail") and obj.project_detail:
                detail = obj.project_detail
                return {
                    "city": detail.city.name if detail.city else None,
                    "area": detail.area,
                    "project_code": detail.project_code,
                    "address": detail.address,
                    "start_date": detail.start_date,
                    "end_date": detail.end_date,
                    "status": detail.status,
                    "description": detail.description,
                    "project_type": detail.project_type,
                    "management_fee": detail.management_fee,
                }
            return None
        except Exception:
            return None

    def get_blocks(self, obj):
        """Get blocks in this project that have units for sale"""
        try:
            blocks = obj.children.filter(node_type="BLOCK")
            saleable_blocks = []

            for block in blocks:
                # Check if this block has any units for sale
                has_saleable_units = False
                floors = block.children.filter(node_type="FLOOR")

                for floor in floors:
                    units = floor.children.filter(
                        node_type="UNIT",
                        unit_detail__management_status="for_sale",
                        unit_detail__sale_price__isnull=False,
                    ).exclude(unit_detail__sale_price=0)

                    if units.exists():
                        has_saleable_units = True
                        break

                # Only include blocks that have saleable units
                if has_saleable_units:
                    saleable_blocks.append(block)

            return BlockStructureSerializer(saleable_blocks, many=True).data
        except Exception:
            return []

    def get_houses(self, obj):
        """Get houses in this project"""
        try:
            houses = obj.children.filter(node_type="HOUSE")
            return HouseStructureSerializer(houses, many=True).data
        except Exception:
            return []


#########################################
# Owner Search Serializer
#########################################


class OwnerSearchSerializer(serializers.ModelSerializer):
    """Serializer for user search results (owners, agents, and staff)"""

    full_name = serializers.SerializerMethodField()
    city_name = serializers.SerializerMethodField()
    account_type_display = serializers.SerializerMethodField()

    # Staff-specific fields
    position_name = serializers.SerializerMethodField()
    sales_person_data = serializers.SerializerMethodField()
    assigned_projects_count = serializers.SerializerMethodField()
    availability_status = serializers.SerializerMethodField()
    performance_metrics = serializers.SerializerMethodField()

    class Meta:
        model = Users
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "phone",
            "avatar",
            "type",
            "account_type_display",
            "city_name",
            "address",
            "is_verified",
            "is_owner_verified",
            # Staff-specific fields
            "position_name",
            "sales_person_data",
            "assigned_projects_count",
            "availability_status",
            "performance_metrics",
        ]

    def get_full_name(self, obj):
        """Get full name of the user"""
        return obj.get_full_name()

    def get_city_name(self, obj):
        """Get city name from user's city"""
        try:
            if obj.city:
                return obj.city.name
            return None
        except Exception:
            return None

    def get_account_type_display(self, obj):
        """Get human-readable account type"""
        return obj.get_type_display() if hasattr(obj, "get_type_display") else obj.type

    def get_position_name(self, obj):
        """Get position name for staff users"""
        try:
            if obj.type == "staff" and obj.position:
                return obj.position.name
            return None
        except Exception:
            return None

    def get_sales_person_data(self, obj):
        """Get sales person profile data if exists"""
        try:
            if hasattr(obj, "sales_person_profile") and obj.sales_person_profile:
                profile = obj.sales_person_profile
                return {
                    "employee_id": profile.employee_id,
                    "total_sales": profile.total_sales,
                    "total_collection_rate": float(profile.total_collection_rate),
                    "total_commission_earned": float(profile.total_commission_earned),
                    "commission_paid": float(profile.commission_paid),
                    "commission_pending": float(profile.commission_pending),
                    "is_available": profile.is_available,
                    "is_active": profile.is_active,
                }
            return None
        except Exception:
            return None

    def get_assigned_projects_count(self, obj):
        """Get count of assigned projects for staff users"""
        try:
            if (
                obj.type == "staff"
                and hasattr(obj, "sales_person_profile")
                and obj.sales_person_profile
            ):
                from sales.models import PropertySale

                assigned_count = PropertySale.objects.filter(
                    assigned_sales_person=obj.sales_person_profile,
                    status__in=["pending", "active"],
                ).count()
                return assigned_count
            return 0
        except Exception:
            return 0

    def get_availability_status(self, obj):
        """Get availability status for staff users"""
        try:
            if (
                obj.type == "staff"
                and hasattr(obj, "sales_person_profile")
                and obj.sales_person_profile
            ):
                profile = obj.sales_person_profile
                return {
                    "is_available": profile.is_available,
                    "is_active": profile.is_active,
                    "current_workload": self.get_assigned_projects_count(obj),
                    "max_workload": 15,  # Default max workload
                }
            return None
        except Exception:
            return None

    def get_performance_metrics(self, obj):
        """Get performance metrics for staff users"""
        try:
            if (
                obj.type == "staff"
                and hasattr(obj, "sales_person_profile")
                and obj.sales_person_profile
            ):
                profile = obj.sales_person_profile
                return {
                    "rating": 4.5,  # Default rating - can be enhanced later
                    "properties_sold": profile.total_sales,
                    "active_contracts": self.get_assigned_projects_count(obj),
                    "completion_rate": float(profile.total_collection_rate),
                    "total_commission": float(profile.total_commission_earned),
                    "pending_commission": float(profile.commission_pending),
                }
            return None
        except Exception:
            return None
