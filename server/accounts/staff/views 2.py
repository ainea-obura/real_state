import secrets
import string

import django_filters

from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import Permission
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.filters import OrderingFilter
from rest_framework.generics import CreateAPIView, ListAPIView, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Users
from company.models import Owner
from utils.custom_pagination import CustomPageNumberPagination
from utils.email_utils import send_welcome_email
from utils.serilaizer import flatten_errors

from .serilazier import (
    StaffListSerializer,
    StaffSerializer,
    StaffStatsSerializer,
)


def generate_secure_password(length=12):
    """
    Generate a secure random password with letters, digits, and symbols.
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        password = "".join(secrets.choice(alphabet) for i in range(length))
        if (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
            and any(c in "!@#$%^&*" for c in password)
        ):
            return password


class StaffFilter(django_filters.FilterSet):
    """
    Filter for staff with search functionality.
    """

    q = django_filters.CharFilter(method="filter_q")
    first_name = django_filters.CharFilter(
        field_name="first_name", lookup_expr="icontains"
    )
    last_name = django_filters.CharFilter(
        field_name="last_name", lookup_expr="icontains"
    )
    email = django_filters.CharFilter(field_name="email", lookup_expr="icontains")
    status = django_filters.CharFilter(field_name="status")
    position = django_filters.UUIDFilter(field_name="position_id")
    is_deleted = django_filters.BooleanFilter(field_name="is_deleted")

    class Meta:
        model = Users
        fields = [
            "q",
            "first_name",
            "last_name",
            "email",
            "status",
            "position",
            "is_deleted",
        ]

    def filter_q(self, queryset, name, value):
        """
        Search in first_name, last_name, email, and phone fields.
        """
        return queryset.filter(
            Q(first_name__icontains=value)
            | Q(last_name__icontains=value)
            | Q(email__icontains=value)
            | Q(phone__icontains=value)
        )


@extend_schema(
    tags=["Staff"],
    description="List all staff members (paginated, filterable, searchable).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class StaffTableListView(ListAPIView):
    serializer_class = StaffListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = StaffFilter
    ordering_fields = ["first_name", "last_name", "email", "created_at", "modified_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """
        Get staff queryset with optional filtering.
        """
        return Users.objects.filter(type="staff", is_deleted=False)

    def list(self, request, *args, **kwargs):
        """
        List staff with pagination and filtering.
        """
        try:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)

            if page is not None:
                serializer = self.get_serializer(page, many=True)
                data = {
                    "count": queryset.count(),
                    "results": serializer.data,
                }
                return Response(
                    {"error": False, "data": data},
                    status=status.HTTP_200_OK,
                )

            serializer = self.get_serializer(queryset, many=True)
            data = {
                "count": queryset.count(),
                "results": serializer.data,
            }
            return Response(
                {"error": False, "data": data},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            print(f"Error fetching staff list: {str(e)}")
            return Response(
                {"error": True, "message": f"Error fetching staff list: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Staff"],
    request=StaffSerializer,
    responses={201: StaffSerializer},
    description="Create a new staff member.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class StaffCreateView(CreateAPIView):
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Create a new staff member with transaction support.
        """
        # Check if the requesting user has a company
        current_user_owner = request.user.owned_companies.first()
        if not current_user_owner:
            return Response(
                {
                    "error": True,
                    "message": "You cannot create staff members. You must be associated with a company first.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the company instance from the owner relationship
        current_user_company = current_user_owner.company

        # Set the type to "staff" automatically
        data = request.data.copy()
        data["type"] = "staff"
        data["is_verified"] = True

        # Check for existing soft-deleted staff user by email
        existing_user = Users.objects.filter(
            email=data.get("email"), type="staff", is_deleted=True
        ).first()
        if existing_user:
            # Reactivate and update the user
            serializer = self.get_serializer(existing_user, data=data, partial=True)
            if not serializer.is_valid():
                return Response(
                    {"error": True, "message": flatten_errors(serializer.errors)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            plain_password = generate_secure_password()
            updated_user = serializer.save(
                is_deleted=False,
                password=make_password(plain_password),
                force_password_change=True,
                is_verified=True,
                type="staff",
                username=data.get("email"),
            )
            # Ensure Owner association exists
            if not Owner.objects.filter(
                user=updated_user, company=current_user_owner.company
            ).exists():
                Owner.objects.create(
                    user=updated_user, company=current_user_owner.company
                )
            # Send welcome email
            send_welcome_email(
                recipient_email=updated_user.email,
                user_name=updated_user.username,
                user_password=plain_password,
                verification_url="https://hoyhub.net",
            )
            response_serializer = StaffListSerializer(updated_user)
            return Response(
                {
                    "error": False,
                    "message": "Staff member reactivated and updated successfully.",
                    "data": response_serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )

        # Normal creation flow
        serializer = self.get_serializer(data=data)

        if not serializer.is_valid():
            return Response(
                {"error": True, "message": flatten_errors(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate a secure password
        plain_password = generate_secure_password()

        # Save the staff member with hashed password
        staff_user = serializer.save(
            password=make_password(plain_password), force_password_change=True
        )

        # Log the credentials for admin reference
        print(f"Staff login credentials for {staff_user.email}:")
        print(f"Email: {staff_user.email}")
        print(f"Password: {plain_password}")
        print(f"Company: {current_user_company.name}")

        # Associate the staff member with the company using Owner model
        if not Owner.objects.filter(
            user=staff_user, company=current_user_company
        ).exists():
            Owner.objects.create(user=staff_user, company=current_user_company)

        # Return the created staff member
        response_serializer = StaffListSerializer(staff_user)
        send_welcome_email(
            recipient_email=staff_user.email,
            user_name=staff_user.username,
            user_password=plain_password,
            verification_url="https://hoyhub.net",
        )
        return Response(
            {
                "error": False,
                "message": "Staff member created successfully.",
                "data": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Staff"],
    request=StaffSerializer,
    responses={200: StaffSerializer},
    description="Update an existing staff member.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PATCH", block=True),
    name="dispatch",
)
class StaffUpdateView(UpdateAPIView):
    serializer_class = StaffSerializer
    lookup_url_kwarg = "staff_id"
    lookup_field = "id"

    def get_queryset(self):
        """
        Get staff queryset.
        """
        return Users.objects.filter(type="staff", is_deleted=False)

    def update(self, request, *args, **kwargs):
        """
        Update an existing staff member.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"error": True, "message": flatten_errors(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        staff = serializer.save()

        # Return the updated staff member
        response_serializer = StaffListSerializer(staff)
        return Response(
            {
                "error": False,
                "message": "Staff member updated successfully.",
                "data": response_serializer.data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Staff"],
    description="Delete a staff member (soft delete).",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="DELETE", block=True),
    name="dispatch",
)
class StaffDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, staff_id):
        """
        Soft delete a staff member.
        """
        staff = get_object_or_404(Users, id=staff_id, type="staff", is_deleted=False)

        # Soft delete the staff member
        staff.is_deleted = True
        staff.save()

        return Response(
            {
                "error": False,
                "message": "Staff member deleted successfully.",
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Staff"],
    description="Restore a soft-deleted staff member.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PATCH", block=True),
    name="dispatch",
)
class StaffRestoreView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, staff_id):
        """
        Restore a soft-deleted staff member.
        """
        staff = get_object_or_404(Users, id=staff_id, type="staff", is_deleted=True)

        # Restore the staff member
        staff.is_deleted = False
        staff.save()

        # Return the restored staff member
        response_serializer = StaffListSerializer(staff)
        return Response(
            {
                "error": False,
                "message": "Staff member restored successfully.",
                "data": response_serializer.data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Staff"],
    description="Get staff statistics.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class StaffStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get staff statistics.
        """
        staff_queryset = Users.objects.filter(type="staff", is_deleted=False)

        stats = {
            "total_staff": staff_queryset.count(),
            "active_staff": staff_queryset.filter(status="active").count(),
            "suspended_staff": staff_queryset.filter(status="suspended").count(),
            "blocked_staff": staff_queryset.filter(status="blocked").count(),
            "verified_staff": staff_queryset.filter(is_verified=True).count(),
            "unverified_staff": staff_queryset.filter(is_verified=False).count(),
        }

        serializer = StaffStatsSerializer(stats)
        return Response(
            {"error": False, "data": serializer.data},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Staff"],
    description="Get a specific staff member.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class StaffDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, staff_id):
        """
        Get a specific staff member.
        """
        try:
            staff = get_object_or_404(
                Users, id=staff_id, type="staff", is_deleted=False
            )
            serializer = StaffSerializer(staff)
            return Response(
                {"error": False, "data": serializer.data},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"error": True, "message": f"Error fetching staff member: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Staff"],
    description="Get user permissions details (groups and permissions).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class UserPermissionsView(APIView):
    """Get detailed permissions information for a user"""

    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        """Get user permissions details"""
        try:
            # Get the user
            user = Users.objects.get(id=user_id)

            # Get groups assigned to user
            groups = [
                {
                    "id": group.id,
                    "name": group.name,
                    "permission_count": group.permissions.count(),
                }
                for group in user.groups.all()
            ]

            # Get all permissions from groups
            group_permissions = Permission.objects.filter(group__in=user.groups.all())

            # Get direct permissions assigned to user
            direct_user_permissions = user.user_permissions.all()

            # Combine group and direct permissions
            all_permissions = group_permissions.union(direct_user_permissions)

            # Format all permissions into the required structure
            direct_permissions = [
                {
                    "id": perm.id,
                    "name": perm.name,
                    "codename": perm.codename,
                    "content_type": {
                        "app_label": perm.content_type.app_label,
                        "model": perm.content_type.model,
                    },
                }
                for perm in all_permissions
            ]

            # Prepare response data
            response_data = {
                "groups": groups,
                "direct_permissions": direct_permissions,
                "all_permissions": direct_permissions,
            }

            return Response(
                {"error": False, "data": response_data},
                status=status.HTTP_200_OK,
            )

        except Users.DoesNotExist:
            return Response(
                {"error": True, "message": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"Error fetching user permissions: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
