import datetime
import json

import django_filters

from django.core.cache import cache
from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
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

from properties.models import Currencies
from utils.custom_pagination import CustomPageNumberPagination
from utils.redis_cache_helper import clear_redis_cache

from .serializers.currency import (
    CurrencyCreateSerializer,
    CurrencySerializer,
    CurrencyStatsSerializer,
)


class CurrencyFilters(django_filters.FilterSet):
    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    code = django_filters.CharFilter(field_name="code", lookup_expr="icontains")

    class Meta:
        model = Currencies
        fields = ["name", "code"]


@extend_schema(
    tags=["Currencies"],
    description="List all currencies (paginated, cached, filterable).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class CurrencyListView(ListAPIView):
    serializer_class = CurrencySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = CurrencyFilters

    def get_queryset(self):
        return Currencies.objects.all()

    def list(self, request, *args, **kwargs):
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


@extend_schema(tags=["Currencies"], description="Create a new currency.")
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class CurrencyCreateView(CreateAPIView):
    serializer_class = CurrencyCreateSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        name = request.data.get("name", "").strip()
        code = request.data.get("code", "").strip()
        symbol = request.data.get("symbol", "").strip()
        
        if Currencies.objects.filter(name__iexact=name).exists():
            return Response(
                {"error": True, "message": "A currency with this name already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Currencies.objects.filter(code__iexact=code).exists():
            return Response(
                {"error": True, "message": "A currency with this code already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Currencies.objects.filter(symbol__iexact=symbol).exists():
            return Response(
                {"error": True, "message": "A currency with this symbol already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        currency = serializer.save()
        return Response(
            {
                "error": False,
                "message": "Currency created successfully",
                "data": CurrencySerializer(currency).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Currencies"], description="Retrieve a currency by ID (cached).")
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class CurrencyRetrieveView(RetrieveAPIView):
    serializer_class = CurrencySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Currencies.objects.all()

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(
            {"error": False, "data": serializer.data}, status=status.HTTP_200_OK
        )


@extend_schema(tags=["Currencies"], description="Update a currency by ID.")
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PUT", block=True),
    name="dispatch",
)
class CurrencyUpdateView(UpdateAPIView):
    serializer_class = CurrencySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Currencies.objects.all()

    def put(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        name = request.data.get("name", "").strip()
        code = request.data.get("code", "").strip()
        symbol = request.data.get("symbol", "").strip()
        if (
            Currencies.objects.filter(name__iexact=name)
            .exclude(pk=instance.pk)
            .exists()
        ):
            return Response(
                {"error": True, "message": "A currency with this name already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (
            Currencies.objects.filter(code__iexact=code)
            .exclude(pk=instance.pk)
            .exists()
        ):
            return Response(
                {"error": True, "message": "A currency with this code already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (
            Currencies.objects.filter(symbol__iexact=symbol)
            .exclude(pk=instance.pk)
            .exists()
        ):
            return Response(
                {
                    "error": True,
                    "message": "A currency with this symbol already exists.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            currency = serializer.save()
        return Response(
            {
                "error": False,
                "message": "Currency updated successfully",
                "data": CurrencySerializer(currency).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Currencies"],
    description="List all currencies for dropdown (cached, simplified).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class CurrencyDropdownView(ListAPIView):
    serializer_class = CurrencySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Currencies.objects.filter(default=True).only(
            "id", "name", "code", "symbol"
        )

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        data = serializer.data
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Currencies"],
    responses={200: CurrencyStatsSerializer},
    description="Get summary statistics for currencies (stat cards).",
)
class CurrencyStatsSummaryView(APIView):
    """
    API endpoint for currency stat card summary.
    Returns total currencies, default currency, most used currency, and most used count.
    Uses cache for performance.
    """

    def get(self, request, *args, **kwargs):
        qs = Currencies.objects.all()
        total_currencies = qs.count()
        # Default currency
        default_currency_obj = qs.filter(default=True).first()
        default_currency = default_currency_obj.code if default_currency_obj else "-"
        # Most used currency (by usage in PropertyTenant, PropertyService, etc.)
        # For demo, use the one with most PropertyTenant relations
        usage_counts = qs.annotate(
            tenant_count=Count("property_tenants"),
            service_count=Count("services"),
            property_service_count=Count("property_services"),
        ).annotate(
            total_usage=Count("property_tenants")
            + Count("services")
            + Count("property_services")
        )
        most_used = usage_counts.order_by("-total_usage").first()
        most_used_currency = most_used.code if most_used else ""
        most_used_count = most_used.total_usage if most_used else 0
        data = {
            "total_currencies": total_currencies,
            "default_currency": default_currency,
            "most_used_currency": most_used_currency,
            "most_used_count": most_used_count,
        }
        serializer = CurrencyStatsSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(tags=["Currencies"], description="Delete a currency by ID.")
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="DELETE", block=True),
    name="dispatch",
)
class CurrencyDeleteView(DestroyAPIView):
    serializer_class = CurrencySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Currencies.objects.all()

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        pk = instance.pk
        self.perform_destroy(instance)
        return Response(
            {
                "error": False,
                "message": "Currency deleted successfully",
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Currencies"],
    description="Set a currency as default. Unsets default for all others.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class CurrencySetDefaultView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            currency = Currencies.objects.get(pk=pk)
        except Currencies.DoesNotExist:
            return Response(
                {"error": True, "message": "Currency not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        with transaction.atomic():
            Currencies.objects.filter(default=True).exclude(pk=currency.pk).update(
                default=False
            )
            currency.default = True
            currency.save()
        return Response(
            {"error": False, "message": f"{currency.name} set as default."},
            status=status.HTTP_200_OK,
        )
