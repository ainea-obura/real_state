from datetime import datetime, date
from decimal import Decimal, InvalidOperation

from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Q, Sum
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from jinja2 import Template as JinjaTemplate
from rest_framework import serializers, status
from rest_framework.generics import (
    CreateAPIView,
    DestroyAPIView,
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from weasyprint import HTML

from accounts.models import Users, UserVerification
from documents.models import ContractTemplate, TenantAgreement
from payments.models import Invoice, Penalty, Receipt, Payout, Expense
from properties.models import (
    LocationNode,
    Media,
    ProjectDetail,
    PropertyOwner,
    PropertyTenant,
    UnitDetail,
    MaintenanceRequest,
)
from utils.format import format_money_with_currency
from utils.serilaizer import flatten_errors

from .serializers.tenant import (
    PropertyAssignmentDetailSerializer,
    PropertyDetailsSerializer,
    PropertyStatsSerializer,
    PropertyTenantListSerializer,
    PropertyTenantSerializer,
    TenantDashboardSerializer,
    TenantFinanceSummarySerializer,
    TenantLeaseStatsSerializer,
    TenantLeaseSummarySerializer,
    TenantOverviewSerializer,
    TenantProfileSerializer,
    TenantPropertyAssignmentSerializer,
    TenantPropertyAssignmentStatsSerializer,
    TenantUserSerializer,
    TenantVerificationSerializer,
)


@extend_schema(
    tags=["TenantVerification"],
    summary="Submit tenant verification documents.",
    request=TenantVerificationSerializer,
    responses={
        201: TenantVerificationSerializer,
        400: "Already verified or has documents.",
    },
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True), name="dispatch"
)
class TenantVerificationView(CreateAPIView):
    serializer_class = TenantVerificationSerializer
    parser_classes = [MultiPartParser, JSONParser]
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        tenant_id = request.data.get("tenant_id")
        if tenant_id:
            try:
                user = Users.objects.get(id=tenant_id)
            except Users.DoesNotExist:
                return Response(
                    {
                        "error": True,
                        "message": "Tenant with this `id` does not exist.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            return Response(
                {"error": True, "message": "Tenant ID is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            user.is_verified
            and UserVerification.objects.filter(user=user, status="verified").exists()
        ):
            return Response(
                {
                    "error": True,
                    "message": "Already verified and has documents.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification = serializer.save(user=user)
        return Response(
            {
                "error": False,
                "message": "Verification submitted successfully.",
                "data": {
                    "count": 0,
                    "results": TenantVerificationSerializer(verification).data,
                },
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["TenantVerification"],
    summary="Update a tenant verification status using verification_id and action from JSON body",
    request=serializers.Serializer,
    responses={
        200: TenantVerificationSerializer,
        400: "Invalid data or not found.",
        404: "Verification not found.",
    },
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PUT", block=True), name="dispatch"
)
class TenantVerificationStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]  # Only accept JSON

    def put(self, request, *args, **kwargs):
        """
        Update verification status based on verification_id and action.

        Expected JSON body:
        {
            "verification_id": "uuid",
            "action": "approve" or "reject"
        }
        """
        verification_id = request.data.get("verification_id")
        action = request.data.get("action")

        # Validate required fields
        if not verification_id:
            return Response(
                {
                    "error": True,
                    "message": "verification_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not action:
            return Response(
                {
                    "error": True,
                    "message": "action is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate action value
        if action not in ["approve", "reject"]:
            return Response(
                {
                    "error": True,
                    "message": "action must be either 'approve' or 'reject'.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Import UserVerification model
            from accounts.models import UserVerification

            verification = UserVerification.objects.get(id=verification_id)
        except UserVerification.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Verification not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {
                    "error": True,
                    "message": "Invalid verification_id format.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if verification is already processed
        # if verification.status != "pending":
        #     return Response(
        #         {
        #             "error": True,
        #             "message": f"Verification is already {verification.status}.",
        #             "data": None,
        #         },
        #         status=status.HTTP_400_BAD_REQUEST,
        #     )

        try:
            user = verification.user
            # Perform the action
            if action == "approve":
                verification.approve()
                user.is_tenant_verified = True
                user.save()
                message = "Verification approved successfully."
            else:  # action == "reject"
                verification.reject()
                user.is_tenant_verified = False
                user.save()
                message = "Verification rejected successfully."

            return Response(
                {
                    "error": False,
                    "message": message,
                    "data": {
                        "count": 0,
                        "results": TenantVerificationSerializer(verification).data,
                    },
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"Error updating verification status: {str(e)}",
                    "data": None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["TenantDashboard"],
    summary="Get full dashboard data for a tenant (profile, assignments, payments, invoices, documents, stats).",
    responses={200: "Tenant dashboard data."},
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class TenantDashboardView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get(self, request, *args, **kwargs):
        tenant_id = kwargs.get("tenant_id") or request.query_params.get("tenant_id")
        if not tenant_id:
            return Response(
                {
                    "error": True,
                    "message": "tenant_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            tenant = Users.objects.get(id=tenant_id)
        except Users.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Tenant not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Property assignments
        assignments = PropertyTenant.objects.filter(tenant_user=tenant)
        property_assignments = [
            {
                "id": str(a.id),
                "node": {
                    "id": str(a.node.id),
                    "name": a.node.name,
                    "node_type": a.node.node_type,
                    "parent": (
                        {
                            "id": str(a.node.parent.id) if a.node.parent else None,
                            "name": a.node.parent.name if a.node.parent else None,
                        }
                        if a.node.parent
                        else None
                    ),
                },
                "contract_start": a.contract_start.isoformat(),
                "contract_end": a.contract_end.isoformat() if a.contract_end else None,
                "rent_amount": float(a.rent_amount),
                "currency": a.currency.code if a.currency else "",
                "created_at": a.created_at.isoformat(),
            }
            for a in assignments
        ]

        # Payments (example, adjust as needed)
        # payments = Payment.objects.filter(tenant__in=assignments)
        payment_list = []

        # Invoices (stub, adjust as needed)
        invoices = []

        # Documents (media)
        documents = Media.objects.filter(property_tenant__tenant_user=tenant)
        document_list = [
            {
                "id": str(d.id),
                "title": d.title,
                "file_type": d.file_type,
                "category": d.category,
                "media": d.media.url if d.media else None,
                "created_at": d.created_at.isoformat(),
            }
            for d in documents
        ]

        # Stats
        total_rent_paid = 0
        total_outstanding = 0  # You can calculate this based on unpaid invoices
        active_contracts = assignments.filter(contract_end__isnull=True).count()
        total_documents = documents.count()

        stats = {
            "total_rent_paid": float(total_rent_paid),
            "total_outstanding": float(total_outstanding),
            "active_contracts": active_contracts,
            "total_documents": total_documents,
        }

        return Response(
            {
                "error": False,
                "data": {
                    "tenant": TenantOverviewSerializer(tenant).data,
                    "property_assignments": property_assignments,
                    "payments": payment_list,
                    "invoices": invoices,
                    "documents": document_list,
                    "stats": stats,
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["TenantOverview"],
    summary="Get overview data for a tenant (profile only, for overview tab).",
    responses={200: TenantDashboardSerializer},
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class TenantOverviewView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TenantDashboardSerializer
    lookup_url_kwarg = "tenant_id"

    def get(self, request, *args, **kwargs):
        tenant_id = kwargs.get("tenant_id") or request.query_params.get("tenant_id")
        if not tenant_id:
            return Response(
                {
                    "error": True,
                    "message": "tenant_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            tenant = Users.objects.get(id=tenant_id)
        except Users.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Tenant not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(tenant)
        return Response(
            {
                "error": False,
                "data": {
                    "count": 0,
                    "results": TenantOverviewSerializer(tenant).data,
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["PropertyTenant"],
    summary="Search users by phone, email, or name (supports both tenants and owners)",
    responses={200: TenantUserSerializer(many=True)},
)
@method_decorator(
    ratelimit(key="ip", rate="30/m", method="GET", block=True), name="dispatch"
)
class TenantUserSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        q = request.query_params.get("q", "").strip()
        user_type = request.query_params.get("type", "tenant")

        # Validate user type
        valid_types = ["tenant", "owner", "agent"]
        if user_type not in valid_types:
            return Response(
                {
                    "error": True,
                    "message": f"Invalid type. Must be one of: {', '.join(valid_types)}",
                    "data": {"count": 0, "results": []},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not q:
            return Response(
                {
                    "error": False,
                    "data": {"count": 0, "results": []},
                },
                status=status.HTTP_200_OK,
            )

        users = (
            Users.objects.filter(type=user_type, is_deleted=False)
            .filter(
                Q(phone__icontains=q)
                | Q(email__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
            )
            .order_by("first_name", "last_name")[:20]
        )

        data = TenantUserSerializer(users, many=True).data
        return Response(
            {
                "error": False,
                "data": {"count": len(data), "results": data},
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["PropertyTenant"],
    summary="Create a new property tenant assignment",
    request=PropertyTenantSerializer,
    responses={
        201: PropertyTenantSerializer,
        400: "Invalid data or validation error.",
        404: "Node or tenant not found.",
    },
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True), name="dispatch"
)
class PropertyTenantCreateView(CreateAPIView):
    serializer_class = PropertyTenantSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def create(self, request, *args, **kwargs):
        project_id = request.data.get("project_id")
        structure_type = request.data.get("structure_type")
        tenant_user_id = request.data.get("tenant_user_id")

        # Validate required fields
        if not project_id:
            return Response(
                {
                    "error": True,
                    "message": "project_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not structure_type:
            return Response(
                {
                    "error": True,
                    "message": "structure_type is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if structure_type not in ["BLOCK", "HOUSE"]:
            return Response(
                {
                    "error": True,
                    "message": "structure_type must be either 'BLOCK' or 'HOUSE'.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not tenant_user_id:
            return Response(
                {
                    "error": True,
                    "message": "tenant_user_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate structure hierarchy based on type
        try:
            # Check if project exists
            project = ProjectDetail.objects.get(id=project_id, is_deleted=False)
            project = LocationNode.objects.get(
                id=project.node.id, node_type="PROJECT", is_deleted=False
            )

            apartment = None

            if structure_type == "BLOCK":
                block = request.data.get("block")
                floor = request.data.get("floor")
                apartment = request.data.get("apartment")

                if not block:
                    return Response(
                        {
                            "error": True,
                            "message": "block is required for BLOCK structure type.",
                            "data": None,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if not floor:
                    return Response(
                        {
                            "error": True,
                            "message": "floor is required for BLOCK structure type.",
                            "data": None,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if not apartment:
                    return Response(
                        {
                            "error": True,
                            "message": "apartment is required for BLOCK structure type.",
                            "data": None,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Validate block belongs to project
                block = LocationNode.objects.get(
                    id=block, node_type="BLOCK", parent=project, is_deleted=False
                )

                # Validate floor belongs to block
                floor = LocationNode.objects.get(
                    id=floor, node_type="FLOOR", parent=block, is_deleted=False
                )

                # Validate apartment belongs to floor
                apartment = LocationNode.objects.get(
                    id=apartment, node_type="UNIT", parent=floor, is_deleted=False
                )

            elif structure_type == "HOUSE":
                house = request.data.get("house")

                if not house:
                    return Response(
                        {
                            "error": True,
                            "message": "house is required for HOUSE structure type.",
                            "data": None,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Validate house belongs to project
                house = LocationNode.objects.get(
                    id=house, node_type="HOUSE", parent=project, is_deleted=False
                )

        except LocationNode.DoesNotExist as err:
            return Response(
                {
                    "error": True,
                    "message": "Invalid structure hierarchy. Please check your node IDs.",
                    "data": str(err),
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except ProjectDetail.DoesNotExist as err:
            return Response(
                {
                    "error": True,
                    "message": "Project not found.",
                    "data": str(err),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if tenant exists©
        try:
            tenant_user = Users.objects.get(id=tenant_user_id, type="tenant")
        except Users.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Tenant user not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not tenant_user.is_tenant_verified:
            return Response(
                {
                    "error": True,
                    "message": "Tenant is not verified.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if this unit is already assigned
        target_node = apartment if structure_type == "BLOCK" else house
        if PropertyTenant.objects.filter(node=target_node, is_deleted=False).exists():
            return Response(
                {
                    "error": True,
                    "message": "This unit is already assigned to a tenant.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if tenant is already assigned to another unit
        if PropertyTenant.objects.filter(
            tenant_user=tenant_user, is_deleted=False
        ).exists():
            return Response(
                {
                    "error": True,
                    "message": "This tenant is already assigned to another unit.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = {
            "node": apartment.id if apartment else house.id,
            "tenant_user": tenant_user.id,
            "contract_start": request.data.get("contract_start"),
            "contract_end": request.data.get("contract_end"),
            "rent_amount": request.data.get("rent_amount"),
            "currency": request.data.get("currency", ""),
        }

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        property_tenant = serializer.save()

        # Set unit status to 'rented' if assigning to a UNIT
        if apartment:
            try:
                unit_detail = UnitDetail.objects.get(node=apartment)
                unit_detail.status = "rented"
                unit_detail.save(update_fields=["status"])
            except UnitDetail.DoesNotExist:
                pass

        # Clear cache
        target_node_id = apartment.id if apartment else house.id
        # Invalidate property stats cache
        project_id_for_cache = project.id if project else None
        if project_id_for_cache:
            pass  # cache clearing removed

        return Response(
            {
                "error": False,
                "message": "Property tenant assignment created successfully.",
                "data": {
                    "count": 0,
                    "results": PropertyTenantSerializer(property_tenant).data,
                },
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["PropertyTenant"],
    summary="Get all property tenant assignments",
    responses={200: PropertyTenantSerializer(many=True)},
)
@method_decorator(
    ratelimit(key="ip", rate="30/m", method="GET", block=True), name="dispatch"
)
class PropertyTenantListView(ListAPIView):
    serializer_class = PropertyTenantSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get_queryset(self):
        return PropertyTenant.objects.select_related("node", "tenant_user").filter(
            is_deleted=False
        )

    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        return Response(
            {
                "error": False,
                "data": {
                    "count": queryset.count(),
                    "results": serializer.data,
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["PropertyTenant"],
    summary="Get a specific property tenant assignment",
    responses={200: PropertyTenantSerializer},
)
@method_decorator(
    ratelimit(key="ip", rate="30/m", method="GET", block=True), name="dispatch"
)
class PropertyTenantDetailView(RetrieveAPIView):
    serializer_class = PropertyTenantSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    lookup_url_kwarg = "assignment_id"

    def get(self, request, *args, **kwargs):
        assignment_id = kwargs.get("assignment_id")
        if not assignment_id:
            return Response(
                {
                    "error": True,
                    "message": "assignment_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            property_tenant = PropertyTenant.objects.get(
                id=assignment_id, is_deleted=False
            )
        except PropertyTenant.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Property tenant assignment not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(property_tenant)
        return Response(
            {
                "error": False,
                "data": {
                    "count": 0,
                    "results": serializer.data,
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["PropertyTenant"],
    summary="Update a property tenant assignment",
    request=PropertyTenantSerializer,
    responses={200: PropertyTenantSerializer},
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PUT", block=True), name="dispatch"
)
class PropertyTenantUpdateView(UpdateAPIView):
    serializer_class = PropertyTenantSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    lookup_url_kwarg = "assignment_id"

    def update(self, request, *args, **kwargs):
        assignment_id = kwargs.get("assignment_id")
        if not assignment_id:
            return Response(
                {
                    "error": True,
                    "message": "assignment_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            property_tenant = PropertyTenant.objects.get(id=assignment_id)
        except PropertyTenant.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Property tenant assignment not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(
            property_tenant, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        updated_property_tenant = serializer.save()

        # Clear cache
        # clear_redis_cache("tenants-list:*")
        # clear_redis_cache(f"property-tenant-{property_tenant.node.id}:*")

        return Response(
            {
                "error": False,
                "message": "Property tenant assignment updated successfully.",
                "data": {
                    "count": 0,
                    "results": PropertyTenantSerializer(updated_property_tenant).data,
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["PropertyTenant"],
    summary="Delete a property tenant assignment",
    responses={204: "Assignment deleted successfully."},
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="DELETE", block=True), name="dispatch"
)
class PropertyTenantDeleteView(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    lookup_url_kwarg = "assignment_id"

    def destroy(self, request, *args, **kwargs):
        assignment_id = kwargs.get("assignment_id")
        if not assignment_id:
            return Response(
                {
                    "error": True,
                    "message": "assignment_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            property_tenant = PropertyTenant.objects.get(
                id=assignment_id, is_deleted=False
            )
        except PropertyTenant.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Property tenant assignment not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        node_id = property_tenant.node.id
        property_tenant.is_deleted = True
        property_tenant.save(update_fields=["is_deleted"])

        # If the node is a UNIT, set its UnitDetail.status to 'available'
        if property_tenant.node.node_type == "UNIT":
            try:
                unit_detail = UnitDetail.objects.get(node=property_tenant.node)
                unit_detail.status = "available"
                unit_detail.save(update_fields=["status"])
            except UnitDetail.DoesNotExist:
                pass

        # Clear cache
        # clear_redis_cache("tenants-list:*")
        # clear_redis_cache(f"property-tenant-{node_id}:*")
        # Invalidate property stats cache
        # Find project id for this node
        project_id_for_cache = None
        try:
            # Traverse up the tree to find the project node
            node = property_tenant.node
            while node.parent:
                node = node.parent
            if node.node_type == "PROJECT":
                project = ProjectDetail.objects.get(node=node)
                project_id_for_cache = project.id
        except Exception:
            pass
        if project_id_for_cache:
            pass  # cache clearing removed

        return Response(
            {
                "error": False,
                "message": "Property tenant assignment deleted successfully.",
                "data": None,
            },
            status=status.HTTP_204_NO_CONTENT,
        )


@extend_schema(
    tags=["PropertyTenant"],
    summary="Vacate a tenant from a unit (soft delete)",
    responses={
        200: "Tenant vacated successfully.",
        400: "Validation error.",
        404: "Not found.",
    },
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True), name="dispatch"
)
class VacateTenantView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request, assignment_id):
        """
        Vacate a tenant from a unit by setting is_deleted=True
        This is a soft delete operation that marks the tenant as vacated
        """
        if not assignment_id:
            return Response(
                {
                    "error": True,
                    "message": "assignment_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            property_tenant = PropertyTenant.objects.get(
                id=assignment_id, is_deleted=False
            )
        except PropertyTenant.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Property tenant assignment not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Mark tenant as vacated (soft delete)
        property_tenant.is_deleted = True
        property_tenant.save(update_fields=["is_deleted"])

        # If the node is a UNIT, set its UnitDetail.status to 'available'
        if property_tenant.node.node_type == "UNIT":
            try:
                unit_detail = UnitDetail.objects.get(node=property_tenant.node)
                unit_detail.status = "available"
                unit_detail.save(update_fields=["status"])
            except UnitDetail.DoesNotExist:
                pass

        # Clear cache (commented out as in the original)
        # clear_redis_cache("tenants-list:*")
        # clear_redis_cache(f"property-tenant-{property_tenant.node.id}:*")

        return Response(
            {
                "error": False,
                "message": "Tenant vacated successfully.",
                "data": {
                    "assignment_id": assignment_id,
                    "vacated_at": property_tenant.updated_at.isoformat(),
                    "unit_status": "available" if property_tenant.node.node_type == "UNIT" else None
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["PropertyTenant"],
    summary="Assign a tenant to a unit or house (with full hierarchy validation)",
    request=PropertyTenantSerializer,
    responses={
        201: PropertyTenantSerializer,
        400: "Validation error.",
        404: "Not found.",
    },
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True), name="dispatch"
)
class AssignTenantToUnitView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @transaction.atomic
    def post(self, request, project_id):
        data = request.data
        property_type = data.get("property_type")
        tenant_user_id = data.get("tenant_user")
        contract_start = data.get("contract_start")
        contract_end = data.get("contract_end")
        rent_amount = data.get("rent_amount")
        deposit_amount = data.get("deposit_amount")
        currency = data.get("currency", "USD")
        block_id = data.get("block")
        floor_id = data.get("floor")
        unit_id = data.get("unit")
        house_id = data.get("house")
        agent_user_id = data.get("agent_user")
        commission = data.get("commission", None)
        agreement_id = data.get("agreement_id")

        commission = data.get("commission", None)
        if commission in ("", None):
            commission = None
        else:
            try:
                commission = Decimal(commission)
            except (InvalidOperation, TypeError):
                commission = None  # or handle error as needed

        agent_user = None
        if agent_user_id:
            try:
                agent_user = Users.objects.get(id=agent_user_id, type__iexact="agent")
            except Users.DoesNotExist:
                return Response(
                    {"error": True, "message": "Agent user not found.", "data": None},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # Validate project
        try:
            project = ProjectDetail.objects.get(id=project_id)
            project_node = LocationNode.objects.get(
                id=project.node.id, node_type="PROJECT"
            )
        except (ProjectDetail.DoesNotExist, LocationNode.DoesNotExist):
            return Response(
                {"error": True, "message": "Project not found.", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate tenant
        try:
            tenant_user = Users.objects.get(id=tenant_user_id, type="tenant")
        except Users.DoesNotExist:
            return Response(
                {"error": True, "message": "Tenant user not found.", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not tenant_user.is_tenant_verified:
            return Response(
                {"error": True, "message": "Tenant is not verified.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate structure and get target node
        target_node = None
        try:
            if property_type == "BLOCK":
                if not (block_id and floor_id and unit_id):
                    return Response(
                        {
                            "error": True,
                            "message": "block, floor, and unit are required for BLOCK type.",
                            "data": None,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                block = LocationNode.objects.get(
                    id=block_id, node_type="BLOCK", parent=project_node
                )
                floor = LocationNode.objects.get(
                    id=floor_id, node_type="FLOOR", parent=block
                )
                unit = LocationNode.objects.get(
                    id=unit_id, node_type="UNIT", parent=floor
                )
                # --- MANAGEMENT MODE VALIDATION ---
                try:
                    unit_detail = unit.unit_detail
                except Exception:
                    return Response(
                        {
                            "error": True,
                            "message": "Unit detail not found for this unit.",
                            "data": None,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if unit_detail.management_mode != "FULL_MANAGEMENT":
                    return Response(
                        {
                            "error": True,
                            "message": "Cannot assign tenant: Unit is not in FULL_MANAGEMENT mode.",
                            "data": None,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                target_node = unit
            elif property_type == "HOUSE":
                if not house_id:
                    return Response(
                        {
                            "error": True,
                            "message": "house is required for HOUSE type.",
                            "data": None,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                house = LocationNode.objects.get(
                    id=house_id, node_type="HOUSE", parent=project_node
                )
                target_node = house
            else:
                return Response(
                    {
                        "error": True,
                        "message": "property_type must be 'BLOCK' or 'HOUSE'.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except LocationNode.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Invalid structure hierarchy. Check node IDs.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if already assigned
        if PropertyTenant.objects.filter(node=target_node, is_deleted=False).exists():
            return Response(
                {
                    "error": True,
                    "message": "This apartment/house is already assigned to a tenant.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prepare data for serializer
        serializer_data = {
            "node": target_node.id,
            "tenant_user": tenant_user.id,
            "contract_start": contract_start,
            "contract_end": contract_end,
            "rent_amount": rent_amount,
            "deposit_amount": deposit_amount,
            "currency": currency,
        }
        if agent_user:
            serializer_data["agent"] = agent_user.id
        if commission is not None:
            serializer_data["commission"] = commission
        serializer = PropertyTenantSerializer(data=serializer_data)
        serializer.is_valid(raise_exception=True)
        property_tenant = serializer.save()

        # AGREEMENT GENERATION STARTS HERE
        if not agreement_id:
            return Response(
                {"error": True, "message": "Agreement ID is required.", "data": None},
                status=400,
            )
        try:
            contract_template = ContractTemplate.objects.get(
                id=agreement_id, is_active=True
            )
        except ContractTemplate.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Contract template not found.",
                    "data": None,
                },
                status=404,
            )
        template_content = contract_template.template_content

        # 1. Build variable mapping (ENHANCED)
        tenant = property_tenant.tenant_user
        node = property_tenant.node
        lease = property_tenant
        # Find top-level project node
        project_node = node
        while (
            project_node.parent is not None
            and getattr(project_node, "node_type", None) != "PROJECT"
        ):
            project_node = project_node.parent
        project_address = ""
        if getattr(project_node, "node_type", None) == "PROJECT":
            try:
                project_detail = ProjectDetail.objects.get(node=project_node)
                project_address = project_detail.address or ""
            except ProjectDetail.DoesNotExist:
                project_address = ""
        # Get tenant id_number from UserVerification (approved, not expired)
        tenant_id_number = ""
        verif = (
            UserVerification.objects.filter(user=tenant, status="approved")
            .order_by("-created_at")
            .first()
        )
        if verif:
            tenant_id_number = verif.id_number or ""
        # agreement_date
        agreement_date = datetime.date.today().isoformat()
        # Owner
        owner = PropertyOwner.objects.filter(node=node, is_deleted=False).first()
        # Build variable mapping
        variable_values = {
            "tenant_full_name": tenant.get_full_name(),
            "tenant_email": tenant.email,
            "tenant_phone": tenant.phone,
            "tenant_address": project_address,
            "tenant_id_number": tenant_id_number,
            "property_address": project_address,
            "property_type": getattr(node, "property_type", ""),
            "lease_start_date": str(lease.contract_start),
            "lease_end_date": str(lease.contract_end) if lease.contract_end else "",
            "monthly_rent": format_money_with_currency(lease.rent_amount),
            "security_deposit": format_money_with_currency(
                getattr(lease, "deposit_amount", 0)
            ),
            "agreement_date": agreement_date,
            # Owner info
            "landlord_full_name": owner.owner_user.get_full_name()
            if owner and owner.owner_user
            else "",
            "landlord_email": owner.owner_user.email
            if owner and owner.owner_user
            else "",
            "landlord_phone": owner.owner_user.phone
            if owner and owner.owner_user
            else "",
            "landlord_address": owner.owner_user.address
            if owner and owner.owner_user
            else "",
            "landlord_id_number": getattr(owner.owner_user, "id_number", "")
            if owner and owner.owner_user
            else "",
            # Add more as needed
        }
        # Only keep variables present in the template
        import re

        pattern = re.compile(r"\{\{(\w+)\}\}")
        used_vars = set(pattern.findall(template_content))
        filtered_variable_values = {
            k: v for k, v in variable_values.items() if k in used_vars
        }

        # 2. Render contract HTML with Jinja2
        jinja_template = JinjaTemplate(template_content)
        generated_html = jinja_template.render(**filtered_variable_values)

        # 3. Generate PDF with WeasyPrint
        pdf_bytes = HTML(string=generated_html).write_pdf()

        # 4. Save TenantAgreement
        agreement = TenantAgreement(
            template=contract_template,
            tenant_name=tenant,
            property_tenant=property_tenant,
            variable_values=filtered_variable_values,
            original_template_content=template_content,
            generated_content=generated_html,
            template_title_snapshot=contract_template.template_title,
            template_version=contract_template.version_number,
            created_by=request.user,
        )
        agreement.save()
        agreement.document_file.save("agreement.pdf", ContentFile(pdf_bytes))
        agreement.save()

        return Response(
            {
                "error": False,
                "message": "Property tenant assignment and agreement created successfully.",
                "data": {
                    "count": 0,
                    "results": PropertyTenantSerializer(property_tenant).data,
                    "agreement_id": str(agreement.id),
                },
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["PropertyTenant"],
    summary="List all property tenant assignments (with node and tenant details)",
    responses={200: PropertyTenantListSerializer(many=True)},
)
@method_decorator(
    ratelimit(key="ip", rate="30/m", method="GET", block=True), name="dispatch"
)
class PropertyTenantListAllView(ListAPIView):
    serializer_class = PropertyTenantListSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get_queryset(self):
        queryset = PropertyTenant.objects.select_related("node", "tenant_user").filter(
            is_deleted=False
        )
        project_id = self.request.query_params.get("project_id")
        if project_id:
            try:
                project = ProjectDetail.objects.get(id=project_id)
                project_node = project.node
                # Get all descendant nodes (including the project node itself)
                descendant_ids = LocationNode.objects.filter(
                    lft__gte=project_node.lft,
                    rght__lte=project_node.rght,
                    tree_id=project_node.tree_id,
                ).values_list("id", flat=True)
                queryset = queryset.filter(node_id__in=descendant_ids)
            except ProjectDetail.DoesNotExist:
                queryset = queryset.none()
        return queryset.order_by("-contract_start")

    def list(self, request, *args, **kwargs):
        project_id = request.query_params.get("project_id")
        # cache_key = f"tenants-list:{project_id or 'all'}"
        # cached = cache.get(cache_key)
        # if cached:
        #     return Response(cached, status=status.HTTP_200_OK)

        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        response_data = {
            "error": False,
            "data": {
                "count": queryset.count(),
                "results": serializer.data,
            },
        }
        # cache.set(cache_key, response_data, timeout=60)
        return Response(response_data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["PropertyStats"],
    summary="Get property-level statistics for tenants, units, and houses.",
    responses={200: PropertyStatsSerializer},
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="GET", block=True), name="dispatch"
)
class PropertyStatsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get(self, request, *args, **kwargs):
        project_id = request.query_params.get("project_id")
        if not project_id:
            return Response(
                {"error": True, "message": "project_id is required.", "data": None},
                status=400,
            )
        try:
            project = ProjectDetail.objects.get(id=project_id, is_deleted=False)
            project_node = project.node
            # Get all descendant nodes (including the project node itself)
            descendant_ids = LocationNode.objects.filter(
                lft__gte=project_node.lft,
                rght__lte=project_node.rght,
                tree_id=project_node.tree_id,
                is_deleted=False,
            ).values_list("id", flat=True)
            # Tenants
            tenants_qs = PropertyTenant.objects.filter(
                node_id__in=descendant_ids, is_deleted=False
            )
            total_tenants = tenants_qs.count()
            active_tenants = tenants_qs.filter(tenant_user__is_active=True).count()
            inactive_tenants = tenants_qs.filter(tenant_user__is_active=False).count()
            # Units
            units_qs = LocationNode.objects.filter(
                id__in=descendant_ids, node_type="UNIT", is_deleted=False
            )
            total_units = units_qs.count()
            occupied_units = tenants_qs.filter(node__node_type="UNIT").count()
            available_units = total_units - occupied_units
            # Houses
            houses_qs = LocationNode.objects.filter(
                id__in=descendant_ids, node_type="HOUSE", is_deleted=False
            )
            total_houses = houses_qs.count()
            occupied_houses = tenants_qs.filter(node__node_type="HOUSE").count()
            available_houses = total_houses - occupied_houses
            stats = {
                "total_tenants": total_tenants,
                "active_tenants": active_tenants,
                "inactive_tenants": inactive_tenants,
                "total_units": total_units,
                "occupied_units": occupied_units,
                "available_units": available_units,
                "total_houses": total_houses,
                "occupied_houses": occupied_houses,
                "available_houses": available_houses,
            }
            # cache_key = f"property-stats:{project_id}"
            # cached = cache.get(cache_key)
            # if cached:
            #     return Response(cached, status=200)
            serializer = PropertyStatsSerializer(stats)
            response_data = {
                "error": False,
                "data": {
                    "count": 0,
                    "results": serializer.data,
                },
            }
            # cache.set(cache_key, response_data, timeout=60)
            return Response(response_data, status=200)
        except ProjectDetail.DoesNotExist:
            return Response(
                {"error": True, "message": "Project not found.", "data": None},
                status=404,
            )


@extend_schema(
    tags=["TenantProfile"],
    summary="Retrieve or update tenant profile (name, email, stats)",
    request=TenantProfileSerializer,
    responses={200: TenantProfileSerializer},
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class TenantProfileView(RetrieveAPIView, UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TenantProfileSerializer
    parser_classes = [JSONParser]
    lookup_url_kwarg = "tenant_id"

    def get_object(self):
        tenant_id = self.kwargs.get("tenant_id") or self.request.query_params.get(
            "tenant_id"
        )
        if not tenant_id:
            raise serializers.ValidationError({"tenant_id": "tenant_id is required."})
        try:
            return Users.objects.get(id=tenant_id)
        except Users.DoesNotExist:
            raise serializers.ValidationError({"tenant_id": "Tenant not found."})

    def get(self, request, *args, **kwargs):
        tenant_id = self.kwargs.get("tenant_id") or self.request.query_params.get(
            "tenant_id"
        )
        # cache_key = f"tenant-profile:{tenant_id}"
        # cached = cache.get(cache_key)
        # if cached:
        #     return Response(cached, status=status.HTTP_200_OK)
        tenant = self.get_object()
        serializer = self.get_serializer(tenant)
        response_data = {
            "error": False,
            "data": {
                "count": 0,
                "results": serializer.data,
            },
        }
        # cache.set(cache_key, response_data, timeout=60)
        return Response(response_data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["TenantLeaseSummary"],
    summary="Get all current property assignments (leases) for a tenant.",
    responses={200: TenantLeaseSummarySerializer(many=True)},
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class TenantLeaseSummaryView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TenantLeaseSummarySerializer
    parser_classes = [JSONParser]

    def get_queryset(self):
        tenant_id = self.kwargs.get("tenant_id") or self.request.query_params.get(
            "tenant_id"
        )
        return PropertyTenant.objects.select_related("node").filter(
            tenant_user_id=tenant_id, is_deleted=False
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "error": False,
                "data": {
                    "count": queryset.count(),
                    "results": serializer.data,
                },
            }
        )


@extend_schema(
    tags=["TenantLeaseStats"],
    summary="Get lease stats (total rent paid, active leases, total outstanding) for a tenant.",
    responses={200: TenantLeaseStatsSerializer},
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class TenantLeaseStatsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get(self, request, tenant_id):
        try:
            tenant = Users.objects.get(id=tenant_id)
        except Users.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Tenant not found.",
                    "data": None,
                },
                status=404,
            )
        stats = TenantLeaseStatsSerializer.for_tenant(tenant).data
        return Response(
            {
                "error": False,
                "data": {
                    "count": 0,
                    "results": stats,
                },
            }
        )


@extend_schema(
    tags=["PropertyAssignment"],
    summary="Get property assignment details with nested node information",
    responses={200: PropertyAssignmentDetailSerializer},
)
@method_decorator(
    ratelimit(key="ip", rate="30/m", method="GET", block=True), name="dispatch"
)
class PropertyAssignmentDetailView(RetrieveAPIView):
    serializer_class = PropertyAssignmentDetailSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    lookup_url_kwarg = "assignment_id"

    def get(self, request, *args, **kwargs):
        assignment_id = kwargs.get("assignment_id")
        if not assignment_id:
            return Response(
                {
                    "error": True,
                    "message": "assignment_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            property_tenant = PropertyTenant.objects.get(
                id=assignment_id, is_deleted=False
            )
        except PropertyTenant.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Property tenant assignment not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(property_tenant)
        return Response(
            {
                "error": False,
                "data": {
                    "count": 0,
                    "results": serializer.data,
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["PropertyAssignment"],
    summary="List all property assignments with detailed node information, financial data, owner and agent info",
    responses={200: PropertyAssignmentDetailSerializer(many=True)},
)
@method_decorator(
    ratelimit(key="ip", rate="30/m", method="GET", block=True), name="dispatch"
)
class PropertyAssignmentListView(ListAPIView):
    serializer_class = PropertyAssignmentDetailSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get_queryset(self):
        queryset = PropertyTenant.objects.select_related("node", "tenant_user").filter(
            is_deleted=False
        )

        # Filter by project if provided
        project_id = self.request.query_params.get("project_id")
        if project_id:
            try:
                project = ProjectDetail.objects.get(id=project_id)
                project_node = project.node
                # Get all descendant nodes (including the project node itself)
                descendant_ids = LocationNode.objects.filter(
                    lft__gte=project_node.lft,
                    rght__lte=project_node.rght,
                    tree_id=project_node.tree_id,
                ).values_list("id", flat=True)
                queryset = queryset.filter(node_id__in=descendant_ids)
            except ProjectDetail.DoesNotExist:
                queryset = queryset.none()

        # Filter by tenant if provided
        tenant_id = self.request.query_params.get("tenant_id")
        if tenant_id:
            queryset = queryset.filter(tenant_user_id=tenant_id)

        return queryset.order_by("-created_at")

    def list(self, request, *args, **kwargs):
        project_id = request.query_params.get("project_id")
        tenant_id = request.query_params.get("tenant_id")

        queryset = self.get_queryset()

        # Get enhanced data if tenant_id is provided
        if tenant_id:
            try:
                # Get payment data for total amount spent and last payment
                payments = Receipt.objects.filter(
                    invoice__tenants__tenant_user_id=tenant_id, is_deleted=False
                ).order_by("-payment_date")

                # Calculate total amount spent
                total_amount_spent = sum(
                    float(payment.paid_amount)
                    for payment in payments
                    if payment.invoice and payment.invoice.status == "PAID"
                )

                # Get last payment
                last_paid = payments.filter(invoice__status="PAID").first()

                # Store enhanced data in request for serializer to access
                request.enhanced_data = {
                    "total_amount_spent": total_amount_spent,
                    "last_payment": {
                        "amount": float(last_paid.paid_amount) if last_paid else 0,
                        "currency": "USD",
                        "date": last_paid.payment_date.isoformat()
                        if last_paid
                        else None,
                        "status": last_paid.invoice.status
                        if last_paid and last_paid.invoice
                        else None,
                    }
                    if last_paid
                    else None,
                }

            except Exception as e:
                print(f"Error getting enhanced data: {e}")
                # Continue without enhanced data

        serializer = self.get_serializer(
            queryset, many=True, context={"request": request}
        )

        response_data = {
            "error": False,
            "data": {
                "count": queryset.count(),
                "results": serializer.data,
            },
        }

        return Response(response_data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["PropertyAssignment"],
    summary="List all property assignments for a tenant (frontend schema)",
    responses={200: TenantPropertyAssignmentSerializer(many=True)},
)
class TenantPropertyAssignmentListView(ListAPIView):
    serializer_class = TenantPropertyAssignmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get_queryset(self):
        tenant_id = self.request.query_params.get("tenant_id")
        if not tenant_id:
            return PropertyTenant.objects.none()
        return PropertyTenant.objects.filter(
            tenant_user_id=tenant_id, is_deleted=False
        ).select_related("node")

    def list(self, request, *args, **kwargs):
        tenant_id = request.query_params.get("tenant_id")
        if not tenant_id:
            return Response(
                {"error": True, "message": "tenant_id is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        print(f"🔍 DEBUG: Response data = {serializer.data}")
        return Response(
            {
                "error": False,
                "data": {"count": queryset.count(), "results": serializer.data},
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["PropertyAssignment"],
    summary="Get property assignment stats for a tenant (uniqueProperties, longestTenure, leaseRenewals, mostRecentStart)",
    responses={200: TenantPropertyAssignmentStatsSerializer},
)
class TenantPropertyAssignmentStatsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get(self, request, *args, **kwargs):
        tenant_id = request.query_params.get("tenant_id")
        if not tenant_id:
            return Response(
                {"error": True, "message": "tenant_id is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = TenantPropertyAssignmentStatsSerializer()
        data = serializer.to_representation(tenant_id)
        return Response(
            {"error": False, "data": data},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Tenants"],
    summary="Get finance summary for a tenant (stat cards, lease, penalties, recent invoices/payments, bill health)",
    responses={200: TenantFinanceSummarySerializer},
)
class TenantFinanceSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tenant_id):
        # Get the PropertyTenant assignments for this tenant
        assignments = PropertyTenant.objects.filter(
            tenant_user=tenant_id, is_deleted=False
        )
        if not assignments.exists():
            return Response({"error": False, "data": None})
        # Use the most recent/active lease
        lease_obj = assignments.order_by("-contract_start").first()
        currency = ""
        # Lease summary
        lease = {
            "unit": lease_obj.node.name if lease_obj.node else "",
            "property": (
                lease_obj.node.parent.name
                if lease_obj.node and lease_obj.node.parent
                else ""
            ),
            "rent": format_money_with_currency(lease_obj.rent_amount),
            "deposit": format_money_with_currency(
                getattr(lease_obj, "deposit_amount", 0)
            ),
            "currency": currency,
            "contract_start": lease_obj.contract_start,
            "contract_end": lease_obj.contract_end,
        }
        # Invoices for this tenant (limit 5 recent)
        invoices_qs = Invoice.objects.filter(
            tenants__tenant_user=lease_obj.tenant_user
        ).order_by("-issue_date")
        recent_invoices = []
        for inv in invoices_qs[:5]:
            recent_invoices.append(
                {
                    "number": f"INV-{inv.issue_date.strftime('%y%m')}-{inv.invoice_number:04d}",
                    "type": "INV",
                    "status": inv.status.upper(),
                    "due": inv.due_date,
                    "amount": format_money_with_currency(inv.total_amount),
                }
            )
        # Payments (receipts) for this tenant's invoices (limit 5 recent)
        receipts_qs = Receipt.objects.filter(invoice__in=invoices_qs).order_by(
            "-payment_date"
        )
        recent_payments = []
        for rec in receipts_qs[:5]:
            recent_payments.append(
                {
                    "ref": str(rec.receipt_number),
                    "date": rec.payment_date.date(),
                    "amount": format_money_with_currency(rec.paid_amount),
                    "method": rec.payment_method,
                    "status": "COMPLETED",
                }
            )
        # Penalties for this tenant
        penalties_qs = Penalty.objects.filter(
            property_tenant__tenant_user=lease_obj.tenant_user
        )
        penalties = []
        for p in penalties_qs:
            penalties.append(
                {
                    "type": p.get_penalty_type_display(),
                    "amount": format_money_with_currency(p.amount),
                    "status": p.status.capitalize(),
                    "due": p.due_date,
                }
            )
        # Stats aggregation
        total_billed = invoices_qs.aggregate(total=Sum("total_amount"))["total"] or 0
        total_paid = receipts_qs.aggregate(total=Sum("paid_amount"))["total"] or 0
        outstanding = invoices_qs.aggregate(total=Sum("balance"))["total"] or 0
        overdue = (
            invoices_qs.filter(status__iexact="OVERDUE").aggregate(
                total=Sum("total_amount")
            )["total"]
            or 0
        )
        paid_invoices = invoices_qs.filter(status__iexact="PAID").count()
        overdue_invoices = invoices_qs.filter(status__iexact="OVERDUE").count()
        penalties_total = penalties_qs.aggregate(total=Sum("amount"))["total"] or 0
        # Avg payment delay (days between due_date and payment_date for paid invoices)
        paid_inv = invoices_qs.filter(status__iexact="PAID")
        delays = []
        for inv in paid_inv:
            receipt = inv.receipts.order_by("payment_date").first()
            if receipt and inv.due_date:
                delay = (receipt.payment_date.date() - inv.due_date).days
                delays.append(max(delay, 0))
        avg_payment_delay = int(sum(delays) / len(delays)) if delays else 0
        # Next bill due
        next_bill = (
            invoices_qs.filter(due_date__gte=date.today()).order_by("due_date").first()
        )
        next_bill_due = next_bill.due_date if next_bill else None
        # Bill health score (simple: 100 - min(outstanding/total_billed*100, 100))
        bill_health_score = 100
        if total_billed:
            bill_health_score = int(
                100 - min((float(outstanding) / float(total_billed)) * 100, 100)
            )
        # Format stats
        stats = {
            "total_billed": format_money_with_currency(total_billed),
            "total_paid": format_money_with_currency(total_paid),
            "outstanding": format_money_with_currency(outstanding),
            "overdue": format_money_with_currency(overdue),
            "paid_invoices": paid_invoices,
            "overdue_invoices": overdue_invoices,
            "penalties": format_money_with_currency(penalties_total),
            "avg_payment_delay": avg_payment_delay,
            "next_bill_due": next_bill_due,
        }
        data = {
            "stats": stats,
            "lease": lease,
            "penalties": penalties,
            "recent_invoices": recent_invoices,
            "recent_payments": recent_payments,
            "bill_health_score": bill_health_score,
        }
        serializer = TenantFinanceSummarySerializer(data=data)
        if not serializer.is_valid():
            print(flatten_errors(serializer.errors))
            return Response(
                {"error": True, "message": "Invalid data", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"error": False, "data": serializer.data})


@extend_schema(
    tags=["PropertyDetails"],
    summary="Get detailed property information for a specific node (unit or house).",
    responses={200: PropertyDetailsSerializer},
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class PropertyDetailsView(RetrieveAPIView):
    serializer_class = PropertyDetailsSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    lookup_url_kwarg = "node_id"

    def get(self, request, *args, **kwargs):
        node_id = kwargs.get("node_id")
        if not node_id:
            return Response(
                {
                    "error": True,
                    "message": "node_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            node = LocationNode.objects.get(id=node_id, is_deleted=False)
        except LocationNode.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Property node not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(node)
        return Response(
            {
                "error": False,
                "data": {
                    "count": 0,
                    "results": serializer.data,
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["OwnerOverview"],
    summary="Get comprehensive owner overview dashboard data including profile, stats, properties, financials, recent activity, and pending items.",
    responses={200: "Owner overview dashboard data."},
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class OwnerOverviewView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get(self, request, *args, **kwargs):
        owner_id = kwargs.get("pk") or request.query_params.get("owner_id")
        if not owner_id:
            return Response(
                {
                    "error": True,
                    "message": "owner_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            owner = Users.objects.get(id=owner_id, type="owner")
        except Users.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Owner not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get all properties owned by this owner
        owned_properties = PropertyOwner.objects.filter(
            owner_user=owner, is_deleted=False
        ).select_related("node")
        
        property_nodes = [po.node for po in owned_properties]
        
        # 1. OWNER PROFILE SECTION
        owner_profile = {
            "id": str(owner.id),
            "email": owner.email,
            "first_name": owner.first_name,
            "last_name": owner.last_name,
            "phone": owner.phone,
            "gender": owner.gender,
            "is_active": owner.is_active,
            "is_owner_verified": owner.is_owner_verified,
            "created_at": owner.created_at.isoformat() if owner.created_at else None,
            "modified_at": owner.modified_at.isoformat() if owner.modified_at else None,
        }

        # 2. QUICK STATS SECTION
        now = datetime.now()
        current_month = now.month
        current_year = now.year
        
        # Total properties count
        total_properties = len(property_nodes)
        
        # Occupancy rate
        occupied_properties = PropertyTenant.objects.filter(
            node__in=property_nodes,
            contract_start__lte=now.date(),
            contract_end__gte=now.date(),
            is_deleted=False,
        ).count()
        
        occupancy_rate = (
            (occupied_properties / total_properties) * 100 if total_properties > 0 else 0
        )
        
        # Financial stats
        total_income = Payout.objects.filter(
            owner=owner, status="completed", year=current_year
        ).aggregate(total=Sum("net_amount"))["total"] or Decimal("0")
        
        pending_invoices = Invoice.objects.filter(
            owners__owner_user=owner,
            status__in=["ISSUED", "OVERDUE", "PARTIAL"],
            is_deleted=False,
        ).aggregate(total=Sum("total_amount"))["total"] or Decimal("0")
        
        total_outstanding = Payout.objects.filter(
            owner=owner, status="pending", month=current_month, year=current_year
        ).aggregate(total=Sum("net_amount"))["total"] or Decimal("0")
        
        # 3. PROPERTIES OVERVIEW SECTION
        properties_overview = []
        for po in owned_properties:
            node = po.node
            try:
                # Get current tenant if any
                current_tenant = PropertyTenant.objects.filter(
                    node=node, is_deleted=False
                ).first()
                
                # Get maintenance requests
                maintenance_requests = MaintenanceRequest.objects.filter(
                    node=node, is_deleted=False
                ).order_by("-created_at")[:3]  # Last 3 requests
                
                # Get recent expenses
                recent_expenses = Expense.objects.filter(
                    location_node=node, is_deleted=False
                ).order_by("-created_at")[:3]  # Last 3 expenses
                
                property_data = {
                    "id": str(node.id),
                    "name": node.name,
                    "node_type": node.node_type,
                    "property_type": node.property_type,
                    "parent": {
                        "id": str(node.parent.id),
                        "name": node.parent.name,
                        "node_type": node.parent.node_type,
                    } if node.parent else None,
                    "current_tenant": {
                        "id": str(current_tenant.tenant_user.id),
                        "name": current_tenant.tenant_user.get_full_name(),
                        "email": current_tenant.tenant_user.email,
                        "phone": current_tenant.tenant_user.phone,
                        "contract_start": current_tenant.contract_start.isoformat(),
                        "contract_end": current_tenant.contract_end.isoformat() if current_tenant.contract_end else None,
                        "rent_amount": str(current_tenant.rent_amount),
                        "currency": current_tenant.currency.code if current_tenant.currency else "KES",
                    } if current_tenant else None,
                    "maintenance_requests": [
                        {
                            "id": str(mr.id),
                            "title": mr.title,
                            "description": mr.description,
                            "status": mr.status,
                            "priority": mr.priority,
                            "created_at": mr.created_at.isoformat(),
                        } for mr in maintenance_requests
                    ],
                    "recent_expenses": [
                        {
                            "id": str(exp.id),
                            "description": exp.description,
                            "amount": str(exp.total_amount),
                            "status": exp.status,
                            "due_date": exp.due_date.isoformat(),
                            "paid_date": exp.paid_date.isoformat() if exp.paid_date else None,
                        } for exp in recent_expenses
                    ],
                }
                properties_overview.append(property_data)
            except Exception as e:
                print(f"Error processing property {node.id}: {e}")
                continue

        # 4. FINANCIAL OVERVIEW SECTION
        # Recent payouts
        recent_payouts = Payout.objects.filter(
            owner=owner, is_deleted=False
        ).order_by("-created_at")[:5]
        
        financial_overview = {
            "total_income": format_money_with_currency(total_income),
            "pending_invoices": format_money_with_currency(pending_invoices),
            "total_outstanding": format_money_with_currency(total_outstanding),
            "recent_payouts": [
                {
                    "id": str(payout.id),
                    "payout_number": payout.payout_number,
                    "amount": str(payout.net_amount),
                    "status": payout.status,
                    "month": payout.month,
                    "year": payout.year,
                    "payout_date": payout.payout_date.isoformat() if payout.payout_date else None,
                    "rent_collected": str(payout.rent_collected),
                    "services_expenses": str(payout.services_expenses),
                } for payout in recent_payouts
            ],
        }

        # 5. RECENT ACTIVITY SECTION
        recent_activity = []
        
        # Recent invoices
        recent_invoices = Invoice.objects.filter(
            owners__owner_user=owner, is_deleted=False
        ).order_by("-created_at")[:5]
        
        for invoice in recent_invoices:
            recent_activity.append({
                "type": "invoice",
                "id": str(invoice.id),
                "title": f"Invoice #{invoice.invoice_number}",
                "description": f"Amount: {format_money_with_currency(invoice.total_amount)}",
                "status": invoice.status,
                "date": invoice.issue_date.isoformat(),
                "amount": str(invoice.total_amount),
            })
        
        # Recent maintenance requests
        all_maintenance = MaintenanceRequest.objects.filter(
            node__in=property_nodes, is_deleted=False
        ).order_by("-created_at")[:5]
        
        for mr in all_maintenance:
            recent_activity.append({
                "type": "maintenance",
                "id": str(mr.id),
                "title": mr.title,
                "description": mr.description[:100] + "..." if len(mr.description) > 100 else mr.description,
                "status": mr.status,
                "priority": mr.priority,
                "date": mr.created_at.isoformat(),
            })
        
        # Recent expenses
        all_expenses = Expense.objects.filter(
            location_node__in=property_nodes, is_deleted=False
        ).order_by("-created_at")[:5]
        
        for exp in all_expenses:
            recent_activity.append({
                "type": "expense",
                "id": str(exp.id),
                "title": f"Expense: {exp.description[:50]}...",
                "description": f"Amount: {format_money_with_currency(exp.total_amount)}",
                "status": exp.status,
                "date": exp.created_at.isoformat(),
                "amount": str(exp.total_amount),
            })
        
        # Sort by date (most recent first)
        recent_activity.sort(key=lambda x: x["date"], reverse=True)
        recent_activity = recent_activity[:10]  # Top 10 most recent

        # 6. PENDING ITEMS SECTION
        pending_items = []
        
        # Pending invoices
        pending_invoices_list = Invoice.objects.filter(
            owners__owner_user=owner,
            status__in=["ISSUED", "OVERDUE", "PARTIAL"],
            is_deleted=False,
        ).order_by("due_date")[:5]
        
        for invoice in pending_invoices_list:
            pending_items.append({
                "type": "invoice",
                "id": str(invoice.id),
                "title": f"Pending Invoice #{invoice.invoice_number}",
                "description": f"Due: {invoice.due_date.strftime('%Y-%m-%d')}",
                "status": invoice.status,
                "amount": str(invoice.total_amount),
                "due_date": invoice.due_date.isoformat(),
            })
        
        # Pending maintenance requests
        pending_maintenance = MaintenanceRequest.objects.filter(
            node__in=property_nodes,
            status__in=["open", "in_progress"],
            is_deleted=False,
        ).order_by("-priority")[:5]
        
        for mr in pending_maintenance:
            priority_order = {"urgent": 4, "high": 3, "medium": 2, "low": 1}
            pending_items.append({
                "type": "maintenance",
                "id": str(mr.id),
                "title": mr.title,
                "description": mr.description[:100] + "..." if len(mr.description) > 100 else mr.description,
                "status": mr.status,
                "priority": mr.priority,
                "priority_order": priority_order.get(mr.priority, 1),
                "date": mr.created_at.isoformat(),
            })
        
        # Pending expenses
        pending_expenses = Expense.objects.filter(
            location_node__in=property_nodes,
            status__in=["pending", "waiting_for_approval"],
            is_deleted=False,
        ).order_by("due_date")[:5]
        
        for exp in pending_expenses:
            pending_items.append({
                "type": "expense",
                "id": str(exp.id),
                "title": f"Pending Expense: {exp.description[:50]}...",
                "description": f"Due: {exp.due_date.strftime('%Y-%m-%d')}",
                "status": exp.status,
                "amount": str(exp.total_amount),
                "due_date": exp.due_date.isoformat(),
            })
        
        # Sort pending items by priority/urgency
        pending_items.sort(key=lambda x: (
            x.get("priority_order", 0) if x["type"] == "maintenance" else 0,
            x.get("due_date", "9999-12-31")
        ), reverse=True)

        # 7. COMPREHENSIVE OVERVIEW DATA
        overview_data = {
            "owner_profile": owner_profile,
            "quick_stats": {
                "total_properties": total_properties,
                "occupied_properties": occupied_properties,
                "occupancy_rate": round(occupancy_rate, 2),
                "total_income": format_money_with_currency(total_income),
                "pending_invoices": format_money_with_currency(pending_invoices),
                "total_outstanding": format_money_with_currency(total_outstanding),
            },
            "properties_overview": properties_overview,
            "financial_overview": financial_overview,
            "recent_activity": recent_activity,
            "pending_items": pending_items,
        }

        # Debug: Print the response structure
        response_data = {
            "error": False,
            "data": {
                "count": 1,
                "results": [overview_data],
            },
        }
        
        print(f"OwnerOverviewView: Response structure: {response_data.keys()}")
        print(f"OwnerOverviewView: Data keys: {response_data['data'].keys()}")
        print(f"OwnerOverviewView: Results length: {len(response_data['data']['results'])}")
        if response_data['data']['results']:
            print(f"OwnerOverviewView: First result keys: {response_data['data']['results'][0].keys()}")
            print(f"OwnerOverviewView: Owner profile keys: {response_data['data']['results'][0]['owner_profile'].keys()}")
            print(f"OwnerOverviewView: Quick stats keys: {response_data['data']['results'][0]['quick_stats'].keys()}")
            print(f"OwnerOverviewView: Financial overview keys: {response_data['data']['results'][0]['financial_overview'].keys()}")
        
        return Response(response_data, status=status.HTTP_200_OK)
