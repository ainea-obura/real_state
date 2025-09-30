import json

import requests

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from requests.auth import HTTPBasicAuth
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import (
    CreateAPIView,
    DestroyAPIView,
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Account
from accounts.serializers import (
    AccountCreateSerializer,
    AccountSerializer,
    AccountUpdateSerializer,
)
from company.models import Company, Owner
from utils.blocked_ip import block_ip
from utils.custom_pagination import CustomPageNumberPagination
from utils.generate_otp import (
    email_otp_generator,
    otp_generator,
    password_reset_otp_generator,
)
from utils.refresh_token_helpers import blacklist_token, validate_and_decode_token
from utils.validate import validate_email

from .models import City, Country, Users
from .serializers import (
    CityListSerializer,
    CountryListSerializer,
    LoginSerializer,
    SignupSerializer,
    TokenRefreshSerializer,
)


@extend_schema(
    tags=["Authentication"],
    description="Login with email and password to receive a 2FA challenge.",
    request=LoginSerializer,
)
@method_decorator(
    ratelimit(key="ip", rate="10/1m", method="POST", block=True), name="dispatch"
)
class Login(APIView):
    permission_classes = [AllowAny]  # ✅ Allows public access
    serializer_class = LoginSerializer

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"error": True, "message": "username and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # authenticate user
        user = Users.objects.filter(email=email)

        if user.exists():
            user = user.first()
            if not user.is_active:
                # User is not active, block the IP and return this message
                block_ip(request)
                return Response(
                    {
                        "error": True,
                        "message": "Your account is not active, please contact support.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not user.is_verified:
                # User's email is not verified, return this message
                block_ip(request)
                return email_otp_generator(user, message="Your email is not verified.")

            if not check_password(password, user.password):
                block_ip(request)
                return Response(
                    {"error": True, "message": "Incorrect credentials"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # If both active and verified, proceed to OTP generation
            return otp_generator(user)

        block_ip(request)
        return Response(
            {"error": True, "message": "Incorrect credentials"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    def authenticate_user(self, email, password):
        """Authenticate user by email and password."""
        try:
            user = Users.objects.get(email=email)
            return authenticate(email=user.email, password=password)
        except Users.DoesNotExist:
            return None


@extend_schema(
    tags=["Authentication"],
    description="Securely refresh access tokens using a valid refresh token.",
    request=TokenRefreshSerializer,
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True), name="dispatch"
)
class TokenRefresh(APIView):
    permission_classes = [AllowAny]
    serializer_class = TokenRefreshSerializer

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh_token = serializer.validated_data["refresh_token"]

        try:
            # Validate and decode the refresh token
            token_payload = validate_and_decode_token(refresh_token)
            user_id = token_payload.get("user_id")

            if not user_id:
                return Response(
                    {
                        "error": True,
                        "message": "Refresh token, is not valid",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Fetch the User object
            user = Users.objects.get(id=user_id)

            # Blacklist the old refresh token
            blacklist_token(refresh_token)

            # Generate a new refresh token
            new_refresh = RefreshToken.for_user(user)
            new_access = new_refresh.access_token

            # Get company_id for company owners and staff members
            company = None
            if user.type in ["company", "staff"]:
                owner = Owner.objects.filter(user_id=user.id).first()
                if owner and owner.company:
                    company = owner.company.id

            return Response(
                {
                    "error": False,
                    "user": {
                        "email": user.email,
                        "username": user.username,
                        "company": company,
                        "type": user.type,
                        "id": user.id,
                        "force_password_change": user.force_password_change,
                    },
                    "access_token": str(new_access),
                    "refresh_token": str(new_refresh),
                },
                status=status.HTTP_200_OK,
            )

        except ValidationError as e:
            return Response(
                {"error": True, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST
            )
        except Users.DoesNotExist:
            return Response(
                {"error": True, "message": "User does not exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Account Types"],
    description="Get a list of account types",
    request=LoginSerializer,
)
@method_decorator(
    ratelimit(key="ip", rate="10/1m", method="GET", block=True), name="dispatch"
)
class GetAccountTypes(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        accounts = dict(Users.ACCOUNT_TYPES)

        return Response(
            {"error": False, "data": accounts},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Signup"],
    description="Login with email and password to receive a 2FA challenge.",
    request=LoginSerializer,
)
@method_decorator(
    ratelimit(key="ip", rate="10/1m", method="POST", block=True), name="dispatch"
)
class Signup(APIView):
    permission_classes = [AllowAny]  # ✅ Allows public access
    serializer_class = SignupSerializer

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"error": True, "message": "email and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not validate_email(email):
            return Response(
                {"error": True, "message": "invalid email address"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if a company exists in the database
        company = Company.objects.filter().exists()
        if company:
            return Response(
                {
                    "error": False,
                    "message": "Signup is disabled: a company already exists.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if the `email` exists
        check = Users.objects.filter(email=email)

        if check.exists():
            block_ip(request)
            return Response(
                {"error": True, "message": "Email is already in use."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # create user — **pass raw password** so `create_user` hashes it once
        username = email.split("@")[0]

        user = Users.objects.create_user(
            email=email, username=username, password=password, type="company"
        )

        return email_otp_generator(user)


@extend_schema(
    tags=["Authentication"],
    description="Resend OTP for email or verification",
    request=None,
)
@method_decorator(
    ratelimit(key="ip", rate="5/1m", method="POST", block=True), name="dispatch"
)
class ResendOTP(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        otp_type = request.data.get("otp_type")  # either 'verify_email' or 'verify_otp'

        if not email or not otp_type:
            return Response(
                {"error": True, "message": "Email and OTP type are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not validate_email(email):
            return Response(
                {"error": True, "message": "Invalid email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = Users.objects.get(email=email)
        except Users.DoesNotExist:
            block_ip(request)
            return Response(
                {"error": True, "message": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # if not user.is_active:
        #     block_ip(request)
        #     return Response(
        #         {"error": True, "message": "Your account is not active, please contact support."},
        #         status=status.HTTP_400_BAD_REQUEST,
        #     )

        # if not user.is_verified:
        #     block_ip(request)
        #     return email_otp_generator(user, message="Your email is not verified.")

        # Depending on OTP type, either send email OTP or verification OTP
        if otp_type == "verify_email":
            return email_otp_generator(user, message="Resending email OTP.")
        elif otp_type == "verify_otp":
            return otp_generator(user)  # Resending verification OTP
        else:
            return Response(
                {"error": True, "message": "Invalid OTP type specified."},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Authentication"],
    description="Request a password reset OTP. Sends an OTP to the user's email if the email exists.",
    request=None,
)
@method_decorator(
    ratelimit(key="ip", rate="5/1m", method="POST", block=True), name="dispatch"
)
class PasswordResetOTP(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response(
                {"error": False, "message": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not validate_email(email):
            return Response(
                {"error": False, "message": "Invalid email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = Users.objects.get(email=email)
        except Users.DoesNotExist:
            block_ip(request)
            return Response(
                {"error": False, "message": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Optionally, check if user is active, etc.
        return password_reset_otp_generator(user)


@extend_schema(
    tags=["Authentication"],
    description="Verify the OTP sent for password reset. Returns success/failure only, does not log in the user.",
    request=None,
)
@method_decorator(
    ratelimit(key="ip", rate="5/1m", method="POST", block=True), name="dispatch"
)
class VerifyPasswordResetOTP(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        otp_code = request.data.get("otp_code")
        if not email or not otp_code:
            return Response(
                {"error": True, "message": "Email and OTP code are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = Users.objects.get(email=email)
        except Users.DoesNotExist:
            return Response(
                {"error": True, "message": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        from otp.models import AdvancedOTPDevice

        if not AdvancedOTPDevice.objects.filter(user=user).exists():
            return Response(
                {"error": True, "message": "No OTP found for this user."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        device = AdvancedOTPDevice.objects.get(user=user, name="sms_otp_device")
        verification_result = device.verify_token(otp_code)
        if not verification_result["error"]:
            return Response(
                {"error": False, "message": "OTP verified successfully."},
                status=status.HTTP_200_OK,
            )
        else:
            error_response = {
                "error": True,
                "message": verification_result["message"],
            }
            if "retry_after" in verification_result:
                error_response["retry_after"] = verification_result["retry_after"]
                error_response["page"] = "Verify Password Reset OTP"
                error_response["email"] = email
            return Response(error_response, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=["Authentication"],
    description="Reset password after OTP verification. Accepts email and new_password, sets the new password if the user exists.",
    request=None,
)
@method_decorator(
    ratelimit(key="ip", rate="5/1m", method="POST", block=True), name="dispatch"
)
class ResetPasswordAfterOTP(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        new_password = request.data.get("new_password")
        if not email or not new_password:
            return Response(
                {"error": True, "message": "Email and new password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = Users.objects.get(email=email)
        except Users.DoesNotExist:
            return Response(
                {"error": True, "message": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response(
            {"error": False, "message": "Password reset successfully."},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Geo"],
    description="Get all countries with id and name.",
)
@method_decorator(
    ratelimit(key="ip", rate="50/1m", method="GET", block=True), name="dispatch"
)
class CountryList(APIView):
    permission_classes = [AllowAny]
    serializer_class = CountryListSerializer

    def get(self, request):
        """
        Get all countries.

        Returns:
            {
                "isError": false,
                "data": [
                    {"id": "uuid", "name": "Country Name"},
                    ...
                ]
            }
        """
        try:
            countries = Country.objects.all().order_by("name")
            serializer = CountryListSerializer(countries, many=True)

            return Response(
                {"isError": False, "data": serializer.data}, status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"isError": True, "data": []},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Geo"],
    description="Get cities for a specific country by country_id.",
)
@method_decorator(
    ratelimit(key="ip", rate="50/1m", method="GET", block=True), name="dispatch"
)
class CityList(APIView):
    serializer_class = CityListSerializer

    def get(self, request):
        """
        Get cities for a specific country.

        Query Parameters:
            country_id: UUID of the country

        Returns:
            {
                "isError": false,
                "data": [
                    {"id": "uuid", "name": "City Name", "country_id": "uuid"},
                    ...
                ]
            }
        """
        try:
            country_id = request.query_params.get("country_id")

            if not country_id:
                return Response(
                    {
                        "isError": True,
                        "message": "country_id query parameter is required",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            cities = City.objects.filter(country_id=country_id).order_by("name")
            serializer = CityListSerializer(cities, many=True)

            return Response(
                {"isError": False, "data": serializer.data}, status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"isError": True, "data": []},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Authentication"],
    description="Check if the access token is still valid.",
)
@method_decorator(
    ratelimit(key="ip", rate="100/1m", method="GET", block=True), name="dispatch"
)
class CheckTokenForMobile(APIView):
    def get(self, request):
        return Response(
            {"error": False, "message": "Hello Boss."},
            status=status.HTTP_200_OK,
        )


# Account Management Views
@extend_schema(
    tags=["Accounts"],
    description="List all accounts for the authenticated user.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class AccountListView(ListAPIView):
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        user_id = self.request.query_params.get("user_id")
        if not user_id:
            return Account.objects.none()

        return Account.objects.filter(user_id=user_id).order_by("-created_at")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            return Response(
                {
                    "error": False,
                    "data": paginated_response.data,
                },
                status=status.HTTP_200_OK,
            )
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "error": False,
                "data": {"results": serializer.data, "count": len(serializer.data)},
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Accounts"],
    description="Create a new account for the authenticated user.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True), name="dispatch"
)
class AccountCreateView(CreateAPIView):
    serializer_class = AccountCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user_id = self.request.data.get("user_id")
        if not user_id:
            raise ValueError("user_id is required")

        # Verify the user exists
        user = get_object_or_404(Users, id=user_id)
        serializer.save(user=user)


@extend_schema(
    tags=["Accounts"],
    description="Retrieve a specific account by ID.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class AccountRetrieveView(RetrieveAPIView):
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_id = self.request.query_params.get("user_id")
        if not user_id:
            return Account.objects.none()

        return Account.objects.filter(user_id=user_id)

    def get_object(self):
        user_id = self.request.query_params.get("user_id")
        account_id = self.kwargs.get("pk")

        if not user_id:
            return None

        return get_object_or_404(Account, id=account_id, user_id=user_id)


@extend_schema(
    tags=["Accounts"],
    description="Update a specific account by ID.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PUT", block=True), name="dispatch"
)
class AccountUpdateView(UpdateAPIView):
    serializer_class = AccountUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_id = self.request.data.get("user_id")
        if not user_id:
            return Account.objects.none()

        return Account.objects.filter(user_id=user_id)

    def get_object(self):
        user_id = self.request.data.get("user_id")
        account_id = self.kwargs.get("pk")

        if not user_id:
            return None

        return get_object_or_404(Account, id=account_id, user_id=user_id)


@extend_schema(
    tags=["Accounts"],
    description="Delete a specific account by ID (soft delete).",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="DELETE", block=True), name="dispatch"
)
class AccountDeleteView(DestroyAPIView):
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_id = self.request.query_params.get("user_id")
        if not user_id:
            return Account.objects.none()

        return Account.objects.filter(user_id=user_id)

    def get_object(self):
        user_id = self.request.query_params.get("user_id")
        account_id = self.kwargs.get("pk")

        if not user_id:
            return None

        return get_object_or_404(Account, id=account_id, user_id=user_id)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance:
            instance.delete()
            
            return Response(
                {
                    "error": False,
                    "message": "Account deleted successfully",
                },
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {
                    "error": True,
                    "message": "Account not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
