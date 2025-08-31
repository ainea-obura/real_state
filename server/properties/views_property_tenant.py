import json

from django.db import models, transaction
from django.db.models import Exists, OuterRef
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.generics import (
    CreateAPIView,
    DestroyAPIView,
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Users, UserVerification
from properties.models import LocationNode, PropertyDetail, PropertyTenant
from properties.serializers.property_tenant_serializer import (
    PropertyTenantSerializer,
    TenantUserSerializer,
)
from properties.serializers.tenant import TenantVerificationSerializer
from utils.custom_pagination import CustomPageNumberPagination

PROPERTY_TENANT_LIST_CACHE = "property-tenant-list:*"
PROPERTY_TENANT_DETAIL_CACHE = "property-tenant-detail:{}"


@extend_schema(
    tags=["PropertyTenant"],
    description="List all property-tenant assignments (paginated, cached).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class PropertyTenantListView(ListAPIView):
    serializer_class = PropertyTenantSerializer
    pagination_class = CustomPageNumberPagination
    queryset = PropertyTenant.objects.select_related("node", "node__parent", "tenant_user")

    def get_queryset(self):
        qs = super().get_queryset()
        property_id = self.request.query_params.get("property_id")
        if property_id:
            # Filter assignments where the node is under the given property_id in the MPTT tree
            # Use Exists subquery for efficient filtering
            property_id = PropertyDetail.objects.get(id=property_id).node.id
            print("PROPERTY ID",property_id)
            property_qs = LocationNode.objects.filter(
                id=property_id,
                node_type="PROPERTY",
                tree_id=OuterRef("node__tree_id"),
                lft__lte=OuterRef("node__lft"),
                rght__gte=OuterRef("node__rght"),
            )
            qs = qs.annotate(
                is_under_property=Exists(property_qs)
            ).filter(is_under_property=True)
        return qs

    def list(self, request, *args, **kwargs):
        page_number = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 10)
        params = request.query_params.dict()
        params.pop("page", None)
        params.pop("page_size", None)
        filters = json.dumps(params, sort_keys=True)
        # cache_key = f"property-tenant-list:page:{page_number}:page_size:{page_size}:filters:{filters}"

        # cached = cache.get(cache_key)
        # if cached:
        #     return Response({"error": False, "data": cached}, status=status.HTTP_200_OK)
        qs = self.get_queryset()
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            data = paginated_response.data
            # cache.set(cache_key, data, timeout=600)
            return Response({"error": False, "data": data}, status=status.HTTP_200_OK)
        serializer = self.get_serializer(qs, many=True)
        data = serializer.data
        # cache.set(cache_key, data, timeout=600)
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["PropertyTenant"], description="Create a new property-tenant assignment."
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True), name="dispatch"
)
class PropertyTenantCreateView(CreateAPIView):
    serializer_class = PropertyTenantSerializer

    queryset = PropertyTenant.objects.select_related("node", "tenant_user")

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save()
        # Update unit status to 'rented' if node is UNIT
        unit_node = assignment.node
        if unit_node.node_type == "UNIT" and hasattr(unit_node, "unit_detail"):
            unit_node.unit_detail.status = "rented"
            unit_node.unit_detail.save()
        return Response(
            {
                "error": False,
                "message": "Tenant assigned to unit successfully",
                "data": PropertyTenantSerializer(assignment).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["PropertyTenant"],
    description="Retrieve a property-tenant assignment by ID (cached).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class PropertyTenantRetrieveView(RetrieveAPIView):
    serializer_class = PropertyTenantSerializer

    lookup_field = "pk"
    queryset = PropertyTenant.objects.select_related("node", "tenant_user")

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        # cache_key = PROPERTY_TENANT_DETAIL_CACHE.format(pk)
        # from django.core.cache import cache
        # cached = cache.get(cache_key)
        # if cached:
        #     return Response(
        #         {"error": False, "data": json.loads(cached)}, status=status.HTTP_200_OK
        #     )
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        # cache.set(cache_key, json.dumps(serializer.data, default=str), timeout=600)
        return Response(
            {"error": False, "data": serializer.data}, status=status.HTTP_200_OK
        )


@extend_schema(
    tags=["PropertyTenant"], description="Update a property-tenant assignment by ID."
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PUT", block=True), name="dispatch"
)
class PropertyTenantUpdateView(UpdateAPIView):
    serializer_class = PropertyTenantSerializer

    lookup_field = "pk"
    queryset = PropertyTenant.objects.select_related("node", "tenant_user")

    def put(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            assignment = serializer.save()
        return Response(
            {
                "error": False,
                "message": "Tenant assignment updated successfully",
                "data": PropertyTenantSerializer(assignment).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["PropertyTenant"], description="Delete a property-tenant assignment by ID."
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="DELETE", block=True), name="dispatch"
)
class PropertyTenantDeleteView(DestroyAPIView):
    serializer_class = PropertyTenantSerializer

    lookup_field = "pk"
    queryset = PropertyTenant.objects.select_related("node", "tenant_user")

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        # Update unit status to 'available' if node is UNIT
        unit_node = instance.node
        if unit_node.node_type == "UNIT" and hasattr(unit_node, "unit_detail"):
            unit_node.unit_detail.status = "available"
            unit_node.unit_detail.save()
        instance.delete()
        return Response(
            {
                "error": False,
                "message": "Tenant assignment deleted successfully",
                "data": None,
            },
            # status=status.HTTP_204_NO_CONTENT,
        )

