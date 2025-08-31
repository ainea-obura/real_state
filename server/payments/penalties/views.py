import django_filters

from django.core.cache import cache
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.filters import OrderingFilter
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

from accounts.models import Users
from payments.models import Penalty
from properties.models import PropertyTenant
from utils.custom_pagination import CustomPageNumberPagination
from utils.format import format_money_with_currency

from .serializers import (
    PenaltyCreateSerializer,
    PenaltyDetailSerializer,
    PenaltyListSerializer,
    PenaltySettingsSerializer,
    PenaltyStatsSerializer,
    PenaltyUpdateSerializer,
    PenaltyWaiveSerializer,
    TenantSearchSerializer,
)


class PenaltyFilter(django_filters.FilterSet):
    """Filter for penalties"""

    q = django_filters.CharFilter(method="filter_q")
    penalty_type = django_filters.CharFilter(
        field_name="penalty_type", lookup_expr="exact"
    )
    status = django_filters.CharFilter(field_name="status", lookup_expr="exact")
    date_from = django_filters.DateFilter(
        method="filter_date_from", input_formats=["%Y-%m-%d"]
    )
    date_to = django_filters.DateFilter(
        method="filter_date_to", input_formats=["%Y-%m-%d"]
    )
    due_date_from = django_filters.DateFilter(field_name="due_date", lookup_expr="gte")
    due_date_to = django_filters.DateFilter(field_name="due_date", lookup_expr="lte")
    tenant_name = django_filters.CharFilter(method="filter_tenant_name")
    property_unit = django_filters.CharFilter(method="filter_property_unit")

    class Meta:
        model = Penalty
        fields = [
            "q",
            "penalty_type",
            "status",
            "date_from",
            "date_to",
            "due_date_from",
            "due_date_to",
            "tenant_name",
            "property_unit",
        ]

    def filter_q(self, queryset, name, value):
        """General search filter"""
        return queryset.filter(
            Q(penalty_number__icontains=value)
            | Q(property_tenant__tenant_user__first_name__icontains=value)
            | Q(property_tenant__tenant_user__last_name__icontains=value)
            | Q(property_tenant__tenant_user__email__icontains=value)
            | Q(notes__icontains=value)
        )

    def filter_tenant_name(self, queryset, name, value):
        """Filter by tenant name"""
        return queryset.filter(
            Q(property_tenant__tenant_user__first_name__icontains=value)
            | Q(property_tenant__tenant_user__last_name__icontains=value)
        )

    def filter_property_unit(self, queryset, name, value):
        """Filter by property unit"""
        return queryset.filter(property_tenant__node__name__icontains=value)

    def filter_date_from(self, queryset, name, value):
        """Filter by date from (handles timezone)"""
        if value:
            from django.utils import timezone

            # Convert date to datetime at start of day in current timezone
            start_datetime = timezone.make_aware(
                timezone.datetime.combine(value, timezone.datetime.min.time())
            )
            return queryset.filter(created_at__gte=start_datetime)
        return queryset

    def filter_date_to(self, queryset, name, value):
        """Filter by date to (handles timezone)"""
        if value:
            from django.utils import timezone

            # Convert date to datetime at end of day in current timezone
            end_datetime = timezone.make_aware(
                timezone.datetime.combine(value, timezone.datetime.max.time())
            )
            return queryset.filter(created_at__lte=end_datetime)
        return queryset


@extend_schema(
    tags=["Penalties"],
    description="List all penalties with filtering and pagination. Supports filtering by type, status, date ranges, tenant name, and property unit.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class PenaltyListView(ListAPIView):
    """List penalties with filtering and pagination"""

    serializer_class = PenaltyListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = PenaltyFilter
    ordering_fields = [
        "created_at",
        "date_applied",
        "due_date",
        "amount",
        "penalty_number",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Get penalties queryset with related data"""
        return Penalty.objects.select_related(
            "property_tenant__tenant_user",
            "property_tenant__node",
            "property_tenant__currency",
            "currency",
            "created_by",
            "waived_by",
            "linked_invoice",
        )

    def list(self, request, *args, **kwargs):
        """List penalties"""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)

            if page is not None:
                serializer = self.get_serializer(page, many=True)
                data = self.get_paginated_response(serializer.data).data
            else:
                serializer = self.get_serializer(queryset, many=True)
                data = {
                    "count": queryset.count(),
                    "results": serializer.data,
                }

            return Response({"error": False, "data": data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": str(e),
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Penalties"],
    request=PenaltyCreateSerializer,
    responses={201: PenaltyCreateSerializer},
    description="Create a new penalty. Requires tenant_id and property_tenant_id. Auto-generates penalty number.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class PenaltyCreateView(CreateAPIView):
    """Create new penalty"""

    serializer_class = PenaltyCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """Create penalty with validation"""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            penalty = serializer.save()

            return Response(
                {
                    "error": False,
                    "message": "Penalty created successfully",
                    "data": PenaltyDetailSerializer(penalty).data,
                },
                status=status.HTTP_201_CREATED,
            )
        except serializers.ValidationError as e:
            # Extract the first error message from validation errors
            if isinstance(e.detail, dict):
                # Get the first error message from any field
                first_error = None
                for field, errors in e.detail.items():
                    if errors:
                        if isinstance(errors, list):
                            first_error = errors[0]
                        else:
                            first_error = str(errors)
                        break
                error_message = first_error if first_error else "Validation error"
            else:
                error_message = str(e.detail)

            return Response(
                {
                    "error": True,
                    "message": error_message,
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": str(e),
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Penalties"],
    responses={200: PenaltyDetailSerializer},
    description="Get detailed information about a specific penalty.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class PenaltyDetailView(RetrieveAPIView):
    """Get penalty details"""

    serializer_class = PenaltyDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        """Get penalty with related data"""
        return Penalty.objects.select_related(
            "property_tenant__tenant_user",
            "property_tenant__node",
            "property_tenant__currency",
            "currency",
            "created_by",
            "waived_by",
            "linked_invoice",
        )

    def retrieve(self, request, *args, **kwargs):
        """Get penalty details"""
        try:
            penalty = self.get_object()
            serializer = self.get_serializer(penalty)

            return Response(
                {"error": False, "data": serializer.data}, status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": str(e),
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Penalties"],
    request=PenaltyUpdateSerializer,
    responses={200: PenaltyDetailSerializer},
    description="Update an existing penalty. Only allows updating: penalty_type, amount, currency, due_date, notes, tenant_notes.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PUT", block=True),
    name="dispatch",
)
class PenaltyUpdateView(UpdateAPIView):
    """Update penalty"""

    serializer_class = PenaltyUpdateSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        """Get penalty with related data"""
        return Penalty.objects.select_related(
            "property_tenant__tenant_user",
            "property_tenant__node",
            "property_tenant__currency",
            "currency",
            "created_by",
            "waived_by",
            "linked_invoice",
        )

    def update(self, request, *args, **kwargs):
        """Update penalty"""
        try:
            penalty = self.get_object()
            serializer = self.get_serializer(penalty, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)

            updated_penalty = serializer.save()

            return Response(
                {
                    "error": False,
                    "message": "Penalty updated successfully",
                    "data": PenaltyDetailSerializer(updated_penalty).data,
                },
                status=status.HTTP_200_OK,
            )
        except serializers.ValidationError as e:
            # Extract the first error message from validation errors
            if isinstance(e.detail, dict):
                # Get the first error message from any field
                first_error = None
                for field, errors in e.detail.items():
                    if errors:
                        if isinstance(errors, list):
                            first_error = errors[0]
                        else:
                            first_error = str(errors)
                        break
                error_message = first_error if first_error else "Validation error"
            else:
                error_message = str(e.detail)

            return Response(
                {
                    "error": True,
                    "message": error_message,
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": str(e),
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Penalties"],
    request=PenaltyWaiveSerializer,
    responses={200: PenaltyWaiveSerializer},
    description="Waive a pending penalty. Requires waived_reason. Only pending penalties can be waived.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class PenaltyWaiveView(UpdateAPIView):
    """Waive penalty"""

    serializer_class = PenaltyWaiveSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        """Get penalty with related data"""
        return Penalty.objects.select_related(
            "property_tenant__tenant_user",
            "property_tenant__node",
            "property_tenant__currency",
            "created_by",
            "waived_by",
            "linked_invoice",
        )

    def update(self, request, *args, **kwargs):
        """Waive penalty"""
        try:
            penalty = self.get_object()
            serializer = self.get_serializer(penalty, data=request.data)
            serializer.is_valid(raise_exception=True)

            waived_penalty = serializer.save()

            return Response(
                {
                    "error": False,
                    "message": "Penalty waived successfully",
                    "data": PenaltyDetailSerializer(waived_penalty).data,
                },
                status=status.HTTP_200_OK,
            )
        except serializers.ValidationError as e:
            # Extract the first error message from validation errors
            if isinstance(e.detail, dict):
                # Get the first error message from any field
                first_error = None
                for field, errors in e.detail.items():
                    if errors:
                        if isinstance(errors, list):
                            first_error = errors[0]
                        else:
                            first_error = str(errors)
                        break
                error_message = first_error if first_error else "Validation error"
            else:
                error_message = str(e.detail)

            return Response(
                {
                    "error": True,
                    "message": error_message,
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": str(e),
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Penalties"],
    description="Delete a penalty. Only pending penalties can be deleted.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="DELETE", block=True),
    name="dispatch",
)
class PenaltyDeleteView(DestroyAPIView):
    """Delete penalty"""

    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        """Get penalty queryset"""
        return Penalty.objects.all()

    def destroy(self, request, *args, **kwargs):
        """Delete penalty"""
        try:
            penalty = self.get_object()

            if penalty.status != "pending":
                return Response(
                    {"error": True, "message": "Only pending penalties can be deleted"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            penalty.delete()

            return Response(
                {"error": False, "message": "Penalty deleted successfully"},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": str(e),
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Penalties"],
    responses={200: PenaltyStatsSerializer},
    description="Get penalty statistics for dashboard. Supports date range filtering with ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class PenaltyStatsView(APIView):
    """Get penalty statistics"""

    permission_classes = [IsAuthenticated]

    def parse_date(self, date_str, param_name):
        """Parse date string"""
        try:
            from datetime import datetime

            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError(f"Invalid {param_name} date format. Use YYYY-MM-DD")

    def get(self, request, *args, **kwargs):
        """Get penalty statistics"""
        try:
            params = request.query_params
            from_date = params.get("date_from")
            to_date = params.get("date_to")

            queryset = Penalty.objects.all()

            # Apply date filters with timezone handling
            if from_date:
                try:
                    from_date = self.parse_date(from_date, "from")
                    # Convert date to datetime at start of day in current timezone
                    start_datetime = timezone.make_aware(
                        timezone.datetime.combine(
                            from_date, timezone.datetime.min.time()
                        )
                    )
                    queryset = queryset.filter(created_at__gte=start_datetime)
                except ValueError as e:
                    return Response(
                        {"error": True, "message": str(e)},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            if to_date:
                try:
                    to_date = self.parse_date(to_date, "to")
                    # Convert date to datetime at end of day in current timezone
                    end_datetime = timezone.make_aware(
                        timezone.datetime.combine(to_date, timezone.datetime.max.time())
                    )
                    queryset = queryset.filter(created_at__lte=end_datetime)
                except ValueError as e:
                    return Response(
                        {"error": True, "message": str(e)},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Calculate statistics
            total_penalties = queryset.count()
            pending_penalties = queryset.filter(status="pending").count()

            # Debug: Print queryset info
            print(f"Stats queryset count: {total_penalties}")
            print(f"Date range: {from_date} to {to_date}")

            # Debug: Print some sample penalties with their creation dates
            sample_penalties = queryset[:3]
            for penalty in sample_penalties:
                print(
                    f"Penalty {penalty.id}: created_at = {penalty.created_at}, amount = {penalty.amount}"
                )

            # Amount calculations
            total_amount = queryset.aggregate(total=Sum("amount"))["total"] or 0
            waived_amount = (
                queryset.filter(status="waived").aggregate(total=Sum("amount"))["total"]
                or 0
            )
            applied_amount = (
                queryset.filter(status="applied_to_invoice").aggregate(
                    total=Sum("amount")
                )["total"]
                or 0
            )
            paid_amount = (
                queryset.filter(status="paid").aggregate(total=Sum("amount"))["total"]
                or 0
            )

            stats = {
                "total_penalties": total_penalties,
                "pending_penalties": pending_penalties,
                "total_amount": format_money_with_currency(float(total_amount)),
                "waived_amount": format_money_with_currency(float(waived_amount)),
                "applied_amount": format_money_with_currency(float(applied_amount)),
                "paid_amount": format_money_with_currency(float(paid_amount)),
            }

            return Response(
                {"error": False, "data": {"count": 1, "results": [stats]}},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": str(e),
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Penalties"],
    responses={200: PenaltySettingsSerializer},
    description="Get penalty settings for configuration.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class PenaltySettingsView(APIView):
    """Get penalty settings"""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Get penalty settings"""
        try:
            # This would typically come from a settings model or configuration
            # For now, returning default values
            settings = {
                "default_late_payment_amount": format_money_with_currency(50.00),
                "default_returned_payment_amount": format_money_with_currency(25.00),
                "default_lease_violation_amount": format_money_with_currency(100.00),
                "default_utility_overcharge_amount": format_money_with_currency(75.00),
                "grace_period_days": 5,
                "auto_apply_late_fees": True,
                "notify_tenants": True,
                "email_notifications": True,
                "sms_notifications": False,
            }

            return Response(
                {"error": False, "data": settings}, status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": str(e),
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    def put(self, request, *args, **kwargs):
        """Update penalty settings"""
        try:
            serializer = PenaltySettingsSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # This would typically save to a settings model
            # For now, just return the validated data

            return Response(
                {
                    "error": False,
                    "message": "Settings updated successfully",
                    "data": serializer.validated_data,
                },
                status=status.HTTP_200_OK,
            )
        except serializers.ValidationError as e:
            return Response(
                {
                    "error": True,
                    "message": e.detail,
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": str(e),
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class TenantSearchFilter(django_filters.FilterSet):
    """Filter for tenant search"""

    q = django_filters.CharFilter(method="filter_q")
    email = django_filters.CharFilter(field_name="email", lookup_expr="icontains")
    phone = django_filters.CharFilter(field_name="phone", lookup_expr="icontains")

    class Meta:
        model = Users
        fields = ["q", "email", "phone"]

    def filter_q(self, queryset, name, value):
        """General search filter"""
        return queryset.filter(
            Q(first_name__icontains=value)
            | Q(last_name__icontains=value)
            | Q(email__icontains=value)
            | Q(phone__icontains=value)
        )


@extend_schema(
    tags=["Penalties"],
    description="Search tenants for penalty creation. 'q' (min 3 chars) is used for general search (name, email, phone). If 'q' is missing or less than 3 chars, returns empty. No pagination. Cached.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class TenantSearchView(ListAPIView):
    """Search tenants for penalty creation"""

    serializer_class = TenantSearchSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # No pagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = TenantSearchFilter

    def get_queryset(self):
        """Get tenants with property information"""
        return Users.objects.filter(type="tenant", is_deleted=False).prefetch_related(
            "rented_nodes__node", "rented_nodes__currency"
        )

    def list(self, request, *args, **kwargs):
        """List tenants"""
        try:
            params = request.query_params.dict()
            q = params.get("q", None)

            # Enforce q is always required and at least 3 chars
            if not q or len(q.strip()) < 3:
                return Response(
                    {"error": False, "data": {"count": 0, "results": []}},
                    status=status.HTTP_200_OK,
                )

            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)

            data = {
                "count": queryset.count(),
                "results": serializer.data,
            }

            return Response({"error": False, "data": data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": str(e),
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
