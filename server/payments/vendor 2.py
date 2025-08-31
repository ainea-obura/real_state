import json

import django_filters

from django.core.cache import cache
from django.db import models
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import (
    CreateAPIView,
    DestroyAPIView,
    ListAPIView,
    UpdateAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from payments.models import Expense, Vendor
from utils.currency import get_serialized_default_currency
from utils.custom_pagination import CustomPageNumberPagination
from utils.format import format_money_with_currency

from .serializers.vendor import (
    VendorCreateSerializer,
    VendorSerializer,
    VendorStatsSerializer,
)


class VendorFilters(django_filters.FilterSet):
    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    email = django_filters.CharFilter(field_name="email", lookup_expr="icontains")

    class Meta:
        model = Vendor
        fields = ["name", "email"]


@extend_schema(
    tags=["Vendors"], description="List all vendors (paginated, filterable)."
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class VendorListView(ListAPIView):
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    filterset_class = VendorFilters

    def get_queryset(self):
        return Vendor.objects.all()

    def list(self, request, *args, **kwargs):
        is_dropdown = request.query_params.get("is_dropdown", False)
        qs = self.filter_queryset(self.get_queryset())

        if is_dropdown:
            serializer = self.get_serializer(qs, many=True)
            data = {
                "count": qs.count(),
                "results": serializer.data,
            }
            return Response({"error": False, "data": data}, status=status.HTTP_200_OK)

        page_number = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 10)
        params = request.query_params.dict()
        params.pop("page", None)
        params.pop("page_size", None)
        filters = json.dumps(params, sort_keys=True)
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            data = paginated_response.data
            return Response({"error": False, "data": data}, status=status.HTTP_200_OK)
        serializer = self.get_serializer(qs, many=True)
        data = {
            "count": qs.count(),
            "results": serializer.data,
        }
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)


@extend_schema(tags=["Vendors"], description="Create a new vendor.")
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True), name="dispatch"
)
class VendorCreateView(CreateAPIView):
    serializer_class = VendorCreateSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        name = request.data.get("name")
        email = request.data.get("email")
        if Vendor.objects.filter(name=name).exists():
            return Response(
                {"error": True, "message": "A vendor with this name already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Vendor.objects.filter(email=email).exists():
            return Response(
                {"error": True, "message": "A vendor with this email already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()
        return Response(
            {
                "error": False,
                "message": "Vendor created successfully",
                "data": VendorSerializer(vendor).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Vendors"], description="Update an existing vendor.")
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="PUT", block=True), name="dispatch"
)
class VendorUpdateView(UpdateAPIView):
    serializer_class = VendorCreateSerializer
    permission_classes = [IsAuthenticated]
    queryset = Vendor.objects.all()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        name = request.data.get("name")
        email = request.data.get("email")
        if Vendor.objects.filter(name=name).exclude(pk=instance.pk).exists():
            return Response(
                {"error": True, "message": "A vendor with this name already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Vendor.objects.filter(email=email).exclude(pk=instance.pk).exists():
            return Response(
                {"error": True, "message": "A vendor with this email already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        response = super().update(request, *args, **kwargs)
        vendor = self.get_object()
        return Response(
            {
                "error": False,
                "message": "Vendor updated successfully",
                "data": VendorSerializer(vendor).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Vendors"], description="Delete a vendor.")
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="DELETE", block=True), name="dispatch"
)
class VendorDeleteView(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Vendor.objects.all()

    def destroy(self, request, *args, **kwargs):
        response = super().destroy(request, *args, **kwargs)
        return Response(
            {
                "error": False,
                "message": "Vendor deleted successfully",
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Vendors"], description="Get vendor stat card summary.")
class VendorStatsSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        total_vendors = Vendor.objects.count()
        total_expenses = (
            Expense.objects.aggregate(total=models.Sum("amount"))["total"] or 0
        )
        total_expense_count = Expense.objects.count()
        data = {
            "total_vendors": total_vendors,
            "total_expenses": format_money_with_currency(total_expenses),
            "total_expense_count": total_expense_count,
            "currency": get_serialized_default_currency(),
        }
        serializer = VendorStatsSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)
