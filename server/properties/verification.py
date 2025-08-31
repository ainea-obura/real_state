from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Users, UserVerification
from properties.serializers.clients import (
    OwnerSerializer,
    TenantSerializer,
    UserVerificationListSerializer,
    UserVerificationSerializer,
)
from utils.exception_handler import flatten_errors


@extend_schema(
    tags=["Verification"],
    description="List all verification documents for a user (tenant or owner), including status, user info, and needs_document flag.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class UserVerificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user_id = request.query_params.get("user_id")
        user_type = request.query_params.get("user_type")
        if not user_id or not user_type:
            return Response(
                {
                    "error": True,
                    "message": "user_id and user_type are required query parameters.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = get_object_or_404(Users, id=user_id, type=user_type)
        verifications = UserVerification.objects.filter(user=user).order_by(
            "-created_at"
        )
        verif_data = UserVerificationSerializer(verifications, many=True).data

        # needs_document: true if no docs or all are expired/rejected
        needs_document = False
        if not verifications.exists():
            needs_document = True
        else:
            all_inactive = all(
                v.status in ["expired", "rejected"] for v in verifications
            )
            needs_document = all_inactive

        # is_verified: based on user_type
        is_verified = False
        if user_type == "tenant":
            is_verified = user.is_tenant_verified
        elif user_type == "owner":
            is_verified = user.is_owner_verified

        # user serializer
        user_serializer = (
            TenantSerializer(user) if user_type == "tenant" else OwnerSerializer(user)
        )

        resp = {
            "user": user_serializer.data,
            "verifications": verif_data,
            "needs_document": needs_document,
            "is_verified": is_verified,
            "user_type": user_type,
        }
        return Response({"error": False, "data": resp}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Verification"],
    description="Upload a new verification document for a user (tenant or owner).",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True), name="dispatch"
)
class UserVerificationUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, *args, **kwargs):
        user_id = request.data.get("user_id")
        user_type = request.data.get("user_type")
        if not user_id or not user_type:
            return Response(
                {
                    "error": True,
                    "message": "user_id and user_type are required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = get_object_or_404(Users, id=user_id, type=user_type)
        # Check needs_document logic
        verifications = UserVerification.objects.filter(user=user)
        needs_document = False
        if user_type == "tenant":
            needs_document = not user.is_tenant_verified
        elif user_type == "owner":
            needs_document = not user.is_owner_verified

        if not needs_document:
            return Response(
                {
                    "error": True,
                    "message": "User does not need a new document upload.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate and create
        serializer = UserVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "error": True,
                    "message": flatten_errors(serializer.errors),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save(user=user, status="pending")
        if user_type == "tenant":
            user.is_tenant_verified = True
        elif user_type == "owner":
            user.is_owner_verified = True
        user.save(update_fields=[f"is_{user_type}_verified"])
        # Return updated list
        all_verifs = UserVerification.objects.filter(user=user).order_by("-created_at")
        resp = {
            "user": TenantSerializer(user).data
            if user_type == "tenant"
            else OwnerSerializer(user).data,
            "verifications": UserVerificationSerializer(all_verifs, many=True).data,
            "needs_document": needs_document,
            "is_verified": user.is_tenant_verified
            if user_type == "tenant"
            else user.is_owner_verified,
            "user_type": user_type,
        }
        return Response({"error": False, "data": resp}, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Verification"],
    description="Update the status of a verification document (approve, reject, expire).",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True), name="dispatch"
)
class UserVerificationStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def post(self, request, *args, **kwargs):
        verification_id = request.data.get("verification_id")
        action = request.data.get("action")  # approve, reject, expire
        user_type = request.data.get("user_type")
        if not verification_id or not action or not user_type:
            return Response(
                {
                    "error": True,
                    "message": "verification_id, action, and user_type are required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            verification = UserVerification.objects.get(id=verification_id)
        except UserVerification.DoesNotExist:
            return Response(
                {"error": True, "message": "Verification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = verification.user

        if action == "approve":
            verification.status = "approved"
            verification.save(update_fields=["status"])
            if user_type == "tenant":
                user.is_tenant_verified = True
            elif user_type == "owner":
                user.is_owner_verified = True
            user.save(update_fields=[f"is_{user_type}_verified"])
        elif action == "reject":
            verification.status = "rejected"
            verification.save(update_fields=["status"])
            if user_type == "tenant":
                user.is_tenant_verified = False
            elif user_type == "owner":
                user.is_owner_verified = False
            user.save(update_fields=[f"is_{user_type}_verified"])
        elif action == "expire":
            verification.status = "expired"
            verification.save(update_fields=["status"])
            if user_type == "tenant":
                user.is_tenant_verified = False
            elif user_type == "owner":
                user.is_owner_verified = False
            user.save(update_fields=[f"is_{user_type}_verified"])
        else:
            return Response(
                {"error": True, "message": "Invalid action."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Return updated list
        all_verifs = UserVerification.objects.filter(user=user).order_by("-created_at")
        resp = {
            "user": TenantSerializer(user).data if user_type == "tenant" else OwnerSerializer(user).data,
            "verifications": UserVerificationSerializer(all_verifs, many=True).data,
            "needs_document": not user.is_tenant_verified if user_type == "tenant" else not user.is_owner_verified,
            "is_verified": user.is_tenant_verified if user_type == "tenant" else user.is_owner_verified,
            "user_type": user_type,
        }
        return Response({"error": False, "data": resp}, status=status.HTTP_200_OK)
