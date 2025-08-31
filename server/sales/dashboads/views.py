from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Q
from django.utils import timezone

from .serializers import (
    FeatureCardsSerializer,
    DashboardQuerySerializer,
    AvailabilitySerializer,
)
from properties.models import LocationNode
from sales.models import PropertySaleItem, PaymentSchedule


class FeatureCardsView(ListAPIView):
    """
    Generic view for sales dashboard feature cards data.

    Returns:
    - total_listings: Units with management_status = "for_sale"
    - sold_units: Units that have property sale entries
    - total_revenue: Total sale value from sold properties
    - outstanding_payments: Unpaid amounts within date range
    """

    serializer_class = FeatureCardsSerializer
    query_serializer_class = DashboardQuerySerializer

    def get_queryset(self):
        """Return empty queryset since we're not using it directly"""
        return []

    def list(self, request, *args, **kwargs):
        """Override list method to return custom data"""
        try:
            # Validate query parameters
            query_serializer = self.query_serializer_class(data=request.query_params)
            query_serializer.is_valid(raise_exception=True)

            from_date = query_serializer.validated_data.get("from_date")
            to_date = query_serializer.validated_data.get("to_date")
            project_id = query_serializer.validated_data.get("project_id")

            # If no date range provided, use current month
            if not from_date or not to_date:
                today = timezone.now().date()
                from_date = today.replace(day=1)
                to_date = today

            # Base queryset for project filtering
            project_filter = Q()
            if project_id:
                project_filter = Q(
                    Q(node_type="UNIT")
                    & Q(parent__parent__id=project_id)  # Unit -> Floor -> Project
                    | Q(node_type="HOUSE")
                    & Q(parent__id=project_id)  # House -> Project
                )

            # 1. Total Listings: Count of UNIT nodes with management_status = "for_sale"
            total_listings = (
                LocationNode.objects.filter(
                    node_type="UNIT", unit_detail__management_status="for_sale"
                )
                .filter(project_filter)
                .count()
            )

            # 2. Sold Units: Total count of PropertySaleItem
            sold_units = PropertySaleItem.objects.filter(project_filter).count()

            # 3. Total Revenue: Sum of all sale_price from PropertySaleItem
            total_revenue = (
                PropertySaleItem.objects.filter(project_filter).aggregate(
                    total=Sum("sale_price")
                )["total"]
                or 0
            )

            # 4. Outstanding Payments: Unpaid amounts within date range
            outstanding_payments = (
                PaymentSchedule.objects.filter(
                    status__in=["pending", "overdue"],
                    due_date__range=[from_date, to_date],
                )
                .filter(payment_plan__sale_item__property_node__node_type="UNIT")
                .filter(project_filter)
                .aggregate(total=Sum("amount"))["total"]
                or 0
            )

            # Prepare response data
            data = {
                "total_listings": total_listings,
                "sold_units": sold_units,
                "total_revenue": total_revenue,
                "outstanding_payments": outstanding_payments,
            }

            # Serialize and return
            serializer = self.get_serializer(data)
            return Response(
                {
                    "success": True,
                    "data": serializer.data,
                    "message": "Feature cards data retrieved successfully",
                }
            )

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": f"Error retrieving feature cards data: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AvailabilityView(ListAPIView):
    """
    View for property availability data.

    Returns transformed data answering:
    - Which units are available
    - Which units are booked
    - Which units have deposit paid
    - Which units are sold

    Accepts project_id parameter.
    If no project_id provided, loads first project.
    """

    serializer_class = AvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return empty queryset since we're not using it directly"""
        return []

    def list(self, request, *args, **kwargs):
        """Override list method to return transformed availability data"""
        print("🚀 Starting AvailabilityView.list() method")
        try:
            # Get query parameters
            project_id = request.query_params.get("project_id")
            print(f"📋 Query params - project_id: {project_id}")

            # Get projects with units for sale
            print("🔍 Step 1: Finding projects with units for sale...")
            projects_with_units = (
                LocationNode.objects.filter(node_type="PROJECT")
                .filter(
                    Q(
                        children__children__children__unit_detail__management_status="for_sale"
                    )  # Project -> Block -> Floor -> Unit
                    | Q(
                        children__children__unit_detail__management_status="for_sale"
                    )  # Project -> Floor -> Unit
                    | Q(
                        children__unit_detail__management_status="for_sale"
                    )  # Project -> Unit
                )
                .distinct()
            )
            print(
                f"📊 Found {projects_with_units.count()} projects with units for sale"
            )

            if not projects_with_units.exists():
                print("❌ No projects with units for sale found")
                return Response(
                    {
                        "success": False,
                        "message": "No projects with units for sale found",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # If project_id provided, filter to that project
            if project_id:
                print(f"🎯 Filtering to specific project: {project_id}")
                target_project = projects_with_units.filter(id=project_id).first()
                if not target_project:
                    print(f"❌ Project with ID {project_id} not found")
                    return Response(
                        {
                            "success": False,
                            "message": f"Project with ID {project_id} not found",
                        },
                        status=status.HTTP_404_NOT_FOUND,
                    )
                projects_to_process = [target_project]
                print(f"✅ Found target project: {target_project.name}")
            else:
                # Return ALL projects with units for sale (default behavior)
                print(
                    "🎯 No project_id provided, returning ALL projects with units for sale"
                )
                all_projects = list(projects_with_units)
                projects_to_process = all_projects
                print(f"✅ Found {len(all_projects)} projects with units for sale:")
                for project in all_projects:
                    print(f"   - {project.name} ({project.id})")

            # Transform data to answer the 4 key questions
            print("🔄 Step 2: Starting data transformation...")
            availability_data = []

            for project in projects_to_process:
                print(f"🏗️ Transforming project: {project.name} ({project.id})")
                project_data = self._transform_project_data(project)
                availability_data.append(project_data)
                print(f"✅ Project transformation complete: {project.name}")

            # Print to console as requested
            import json

            print("📤 Step 3: Preparing final response...")
            print("=== AVAILABILITY DATA ===")
            print(json.dumps(availability_data, indent=2, default=str))
            print("=========================")

            print("🎉 Successfully returning availability data")
            return Response(
                {
                    "success": True,
                    "data": availability_data,
                    "message": "Availability data retrieved successfully",
                }
            )

        except Exception as e:
            print(f"💥 ERROR in AvailabilityView.list(): {str(e)}")
            import traceback

            print(f"📚 Full traceback: {traceback.format_exc()}")
            return Response(
                {
                    "success": False,
                    "message": f"Error retrieving availability data: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _transform_project_data(self, project_node):
        """Transform project data to answer the 4 key questions"""
        print(f"🏗️ Starting project transformation for: {project_node.name}")
        project_data = {
            "id": project_node.id,
            "name": project_node.name,
            "node_type": project_node.node_type,
            "property_type": project_node.property_type,
            "project_detail": None,
            "blocks": [],  # Changed from units to blocks
        }
        print(f"📋 Created base project data structure for: {project_node.name}")

        # Add project detail if exists
        try:
            print(f"🔍 Checking for project_detail on: {project_node.name}")
            if hasattr(project_node, "project_detail") and project_node.project_detail:
                print(f"✅ Found project_detail for: {project_node.name}")
                project_data["project_detail"] = {
                    "city": (
                        str(project_node.project_detail.city)
                        if project_node.project_detail.city
                        else None
                    ),
                    "area": project_node.project_detail.area,
                    "project_code": project_node.project_detail.project_code,
                    "address": project_node.project_detail.address,
                    "start_date": project_node.project_detail.start_date,
                    "end_date": project_node.project_detail.end_date,
                    "status": project_node.project_detail.status,
                    "project_type": project_node.project_detail.project_type,
                    "management_fee": (
                        str(project_node.project_detail.management_fee)
                        if project_node.project_detail.management_fee
                        else None
                    ),
                }
                print(f"📊 Project detail populated for: {project_node.name}")
            else:
                print(f"❌ No project_detail found for: {project_node.name}")
        except Exception as e:
            print(f"💥 Error getting project_detail for {project_node.name}: {str(e)}")
            pass

        # Get all units for sale in this project
        print(f"🔍 Step 2.1: Finding units for sale in project: {project_node.name}")
        units = self._get_all_units_for_sale(project_node)
        print(f"📊 Found {len(units)} units for sale in project: {project_node.name}")

        # Group units by block and floor (this also transforms the units)
        print(
            f"🔄 Step 2.2: Grouping and transforming {len(units)} units by block and floor..."
        )
        blocks_data = self._group_units_by_block_and_floor(units)
        project_data["blocks"] = blocks_data

        print(f"🎉 Project transformation complete for: {project_node.name}")
        return project_data

    def _get_all_units_for_sale(self, project_node):
        """Get all units for sale in the project hierarchy"""
        print(f"🔍 Starting unit search in project: {project_node.name}")
        units = []

        # Recursively find all units
        def find_units(node):
            print(f"🔍 Checking node: {node.name} (type: {node.node_type})")
            if node.node_type == "UNIT":
                print(f"🎯 Found UNIT node: {node.name}")
                # Check if unit is for sale
                try:
                    print(f"🔍 Checking if {node.name} has unit_detail")
                    if hasattr(node, "unit_detail") and node.unit_detail:
                        print(f"✅ {node.name} has unit_detail")
                        print(
                            f"🔍 Checking management_status: {node.unit_detail.management_status}"
                        )
                        if node.unit_detail.management_status == "for_sale":
                            print(f"🎉 {node.name} is FOR SALE - adding to list")
                            units.append(node)
                        else:
                            print(
                                f"❌ {node.name} is NOT for sale (status: {node.unit_detail.management_status})"
                            )
                    else:
                        print(f"❌ {node.name} has no unit_detail")
                except Exception as e:
                    print(f"💥 Error checking unit_detail for {node.name}: {str(e)}")
                    pass
            else:
                print(f"🔍 {node.name} is not a UNIT, checking children...")
                # Recursively search children
                children = node.children.all()
                print(f"📊 {node.name} has {children.count()} children")
                for child in children:
                    print(f"🔄 Recursively checking child: {child.name}")
                    find_units(child)

        print(f"🚀 Starting recursive search in project: {project_node.name}")
        find_units(project_node)
        print(f"🎯 Unit search complete. Found {len(units)} units for sale")
        for unit in units:
            print(f"   - {unit.name} ({unit.id})")
        return units

    def _group_units_by_block_and_floor(self, units):
        """Group units by block and floor."""
        print("🔄 Starting unit grouping by block and floor...")
        blocks_data = {}

        for unit in units:
            print(f"🔍 Processing unit: {unit.name}")

            # Transform the unit first
            transformed_unit = self._transform_unit_data(unit)
            if not transformed_unit:
                print(f"⚠️ Skipping unit {unit.name} due to transformation failure.")
                continue

            block_letter, floor_number, unit_number = self._extract_block_and_floor(
                unit.name
            )
            if not block_letter or floor_number is None:
                print(f"⚠️ Skipping unit {unit.name} due to missing block/floor info.")
                continue

            block_key = f"{block_letter}"
            floor_key = f"{floor_number}"

            if block_key not in blocks_data:
                blocks_data[block_key] = {}
            if floor_key not in blocks_data[block_key]:
                blocks_data[block_key][floor_key] = []

            blocks_data[block_key][floor_key].append(transformed_unit)
            print(f"✅ Unit {unit.name} added to block {block_key}, floor {floor_key}")

        print("🎉 Unit grouping complete.")
        return blocks_data

    def _extract_block_and_floor(self, unit_name):
        """Extract block and floor from unit name (e.g., A101 -> Block A, Floor 1)"""
        import re

        if not unit_name:
            print(f"❌ No unit name provided for extraction")
            return None, None, None

        print(f"🔍 Extracting block/floor from unit name: {unit_name}")

        # Pattern: Letter + 2-3 digits (e.g., A101, B201, C1001)
        # First digit = floor, remaining digits = unit number
        match = re.match(r"^([A-Z])(\d{2,3})$", unit_name)
        if match:
            block_letter = match.group(1)
            full_number = match.group(2)

            print(f"✅ Match found: Block {block_letter}, Number {full_number}")

            # Extract floor: FIRST digit only
            if len(full_number) == 2:
                # A10 -> Floor 1, Unit 0
                floor = int(full_number[0])
                unit_num = int(full_number[1])
                print(f"📊 2-digit number: Floor {floor}, Unit {unit_num}")
            elif len(full_number) == 3:
                # A101 -> Floor 1, Unit 01
                floor = int(full_number[0])
                unit_num = int(full_number[1:])
                print(f"📊 3-digit number: Floor {floor}, Unit {unit_num}")
            else:
                # A1001 -> Floor 1, Unit 001
                floor = int(full_number[0])
                unit_num = int(full_number[1:])
                print(f"📊 4+ digit number: Floor {floor}, Unit {unit_num}")

            return block_letter, floor, unit_num
        else:
            print(f"❌ No regex match for unit name: {unit_name}")

        return None, None, None

    def _transform_unit_data(self, unit_node):
        """Transform unit data with status determination logic"""
        print(f"🔄 Starting unit transformation for: {unit_node.name}")
        try:
            # Get unit details
            print(f"🔍 Getting unit_detail for: {unit_node.name}")
            unit_detail = unit_node.unit_detail
            if not unit_detail:
                print(f"❌ No unit_detail found for: {unit_node.name}")
                return None

            print(f"✅ Found unit_detail for: {unit_node.name}")

            # Base unit data
            print(f"📋 Creating base unit data structure for: {unit_node.name}")

            # Extract block and floor information
            block_letter, floor_number, unit_number = self._extract_block_and_floor(
                unit_node.name
            )

            unit_data = {
                "id": unit_node.id,
                "name": unit_node.name,
                "node_type": unit_node.node_type,
                "property_type": unit_node.property_type,
                "block_info": {
                    "letter": block_letter,
                    "name": f"Block {block_letter}" if block_letter else None,
                },
                "floor_info": {
                    "number": floor_number,
                    "name": (
                        f"Floor {floor_number}" if floor_number is not None else None
                    ),
                },
                "unit_info": {"number": unit_number, "full_name": unit_node.name},
                "unit_detail": {
                    "identifier": unit_detail.identifier,
                    "size": unit_detail.size,
                    "unit_type": unit_detail.unit_type,
                    "sale_price": (
                        str(unit_detail.sale_price) if unit_detail.sale_price else None
                    ),
                    "description": unit_detail.description,
                    "management_mode": unit_detail.management_mode,
                    "management_status": unit_detail.management_status,
                    "service_charge": (
                        str(unit_detail.service_charge)
                        if unit_detail.service_charge
                        else None
                    ),
                    "currency": (
                        str(unit_detail.currency.id) if unit_detail.currency else None
                    ),
                },
                "status": "available",  # Default status
                "reservation_info": None,
                "sale_info": None,
                "buyer_info": None,
            }
            print(f"📊 Base unit data structure created for: {unit_node.name}")

            # Determine status using priority logic
            print(f"🔍 Step 3: Determining status for: {unit_node.name}")
            unit_data = self._determine_unit_status(unit_data)
            print(f"✅ Status determination complete for: {unit_node.name}")

            return unit_data

        except Exception as e:
            print(f"💥 Error transforming unit {unit_node.name}: {str(e)}")
            import traceback

            print(f"📚 Full traceback: {traceback.format_exc()}")
            return None

    def _determine_unit_status(self, unit_data):
        """Determine unit status using priority logic"""
        print(f"🔍 Starting status determination for: {unit_data['name']}")
        from sales.models import PropertyReservation, PropertySale
        from properties.models import LocationNode

        print(f"🔍 Getting LocationNode for unit: {unit_data['id']}")
        unit_node = LocationNode.objects.get(id=unit_data["id"])
        print(f"✅ Got LocationNode: {unit_node.name}")

        print(
            f"🔍 Determining status for unit: {unit_data['name']} ({unit_data['id']})"
        )

        # Priority 1: Check if unit is sold (PropertySale exists)
        try:
            print(
                f"🔍 Priority 1: Checking PropertySaleItem for unit: {unit_data['id']}"
            )
            sale_items = PropertySaleItem.objects.filter(property_node=unit_node)
            print(f"📊 Found {sale_items.count()} sale items for this unit")

            sale_item = sale_items.first()
            if sale_item:
                print(f"✅ Unit {unit_data['name']} is SOLD")
                print(f"   Sale ID: {sale_item.sale.id}")
                print(f"   Buyer: {sale_item.buyer.get_full_name()}")
                unit_data["status"] = "sold"
                unit_data["sale_info"] = {
                    "sale_id": str(sale_item.sale.id),
                    "sale_date": sale_item.sale.sale_date,
                    "sale_status": sale_item.sale.status,
                    "sale_price": str(sale_item.sale_price),
                    "down_payment": str(sale_item.down_payment),
                    "down_payment_percentage": str(sale_item.down_payment_percentage),
                    "possession_date": sale_item.possession_date,
                    "ownership_percentage": str(sale_item.ownership_percentage),
                }
                unit_data["buyer_info"] = {
                    "id": str(sale_item.buyer.id),
                    "name": sale_item.buyer.get_full_name(),
                    "email": sale_item.buyer.email,
                    "phone": sale_item.buyer.phone,
                }
                print(f"🎉 Unit {unit_data['name']} marked as SOLD")
                return unit_data
            else:
                print(f"❌ No sale items found for unit {unit_data['name']}")
        except Exception as e:
            print(f"❌ Error checking sale status: {str(e)}")
            import traceback

            print(f"📚 Sale status error traceback: {traceback.format_exc()}")
            pass

        # Priority 2: Check if unit is reserved (PropertyReservation exists)
        try:
            print(
                f"🔍 Priority 2: Checking PropertyReservation for unit: {unit_data['id']}"
            )
            # Fix: Use properties__id to properly check ManyToMany relationship
            reservations = PropertyReservation.objects.filter(
                properties__id=unit_node.id
            )
            print(f"📊 Found {reservations.count()} reservations for this unit")

            reservation = reservations.first()
            if reservation:
                print(f"📅 Found reservation: {reservation.id}")
                print(f"   Status: {reservation.status}")
                print(f"   Deposit Fee: {reservation.deposit_fee}")
                print(f"   Owner: {reservation.owner.get_full_name()}")

                if reservation.deposit_fee and reservation.deposit_fee > 0:
                    print(f"💰 Unit {unit_data['name']} has DEPOSIT PAID")
                    unit_data["status"] = "deposit_paid"
                else:
                    print(f"📅 Unit {unit_data['name']} is BOOKED")
                    unit_data["status"] = "booked"

                unit_data["reservation_info"] = {
                    "reservation_id": str(reservation.id),
                    "status": reservation.status,
                    "end_date": reservation.end_date,
                    "deposit_fee": (
                        str(reservation.deposit_fee)
                        if reservation.deposit_fee
                        else None
                    ),
                    "created_at": reservation.created_at,
                    "notes": reservation.notes,
                }
                unit_data["buyer_info"] = {
                    "id": str(reservation.owner.id),
                    "name": reservation.owner.get_full_name(),
                    "email": reservation.owner.email,
                    "phone": reservation.owner.phone,
                }
                print(f"🎉 Unit {unit_data['name']} marked as {unit_data['status']}")
                return unit_data
            else:
                print(f"❌ No reservations found for unit {unit_data['name']}")
        except Exception as e:
            print(f"❌ Error checking reservation status: {str(e)}")
            import traceback

            print(f"📚 Reservation status error traceback: {traceback.format_exc()}")
            pass

        # Priority 3: Unit is available (default status)
        print(
            f"🏠 Unit {unit_data['name']} is AVAILABLE (no sale or reservation found)"
        )
        unit_data["status"] = "available"
        print(f"🎉 Unit {unit_data['name']} marked as AVAILABLE")
        return unit_data
