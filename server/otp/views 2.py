from django.utils import timezone
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Users
from company.models import Owner

from .models import AdvancedOTPDevice
from .serializers import Verify2FASerializer, VerifyEmailSerializer


@extend_schema(
    tags=["Authentication"],
    description="Verify 2FA - OTP -",
    request=Verify2FASerializer,
)
@method_decorator(
    ratelimit(key="user_or_ip", rate="5/1m", method="POST", block=True),
    name="dispatch",
)
class Verify2Fa(APIView):
    permission_classes = [AllowAny]
    serializer_class = Verify2FASerializer

    def post(self, request):
        serializer = Verify2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        code = serializer.validated_data["otp_code"]

        try:
            user = Users.objects.get(email=email)
            if not AdvancedOTPDevice.objects.filter(user=user).exists():
                return Response(
                    {"error": True, "message": "No code Found, please login in again"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            device = AdvancedOTPDevice.objects.get(user=user, name="sms_otp_device")

            verification_result = device.verify_token(code)
            if not verification_result["error"]:
                refresh = RefreshToken.for_user(user)

                avatar_url = None
                if user.avatar:
                    avatar_url = request.build_absolute_uri(user.avatar.url)

                user.last_login = timezone.localtime(timezone.now())
                user.save()

                # Get company_id for company owners and staff members
                company = None
                if user.type in ["company", "staff"]:
                    owner = Owner.objects.filter(user_id=user.id).first()
                    if owner and owner.company:
                        company = owner.company.id
                    elif user.type == "staff":
                        # Staff must have a company association
                        return Response(
                            {
                                "error": True,
                                "message": "Staff member is not associated with any company. Please contact your administrator.",
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                return Response(
                    {
                        "error": False,
                        "user": {
                            "email": user.email,
                            "username": user.username,
                            "full_name": user.get_full_name(),
                            "avatar": avatar_url,
                            "company": company,
                            "type": user.type,
                            "id": user.id,
                            "force_password_change": user.force_password_change,
                        },
                        "access_token": str(refresh.access_token),
                        "refresh_token": str(refresh),
                    },
                    status=status.HTTP_200_OK,
                )
            else:
                # Check if the error includes retry information
                error_response = {
                    "error": True,
                    "message": verification_result["message"],
                }
                if "retry_after" in verification_result:
                    error_response["retry_after"] = verification_result["retry_after"]
                    error_response["page"] = "Verify OTP"
                    error_response["email"] = email

                return Response(error_response, status=status.HTTP_400_BAD_REQUEST)
        except Users.DoesNotExist:
            return Response(
                {"error": True, "message": "User not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Authentication"],
    description="Verify Email Address - OTP -",
    request=VerifyEmailSerializer,
)
@method_decorator(
    ratelimit(key="user_or_ip", rate="5/1m", method="POST", block=True),
    name="dispatch",
)
class VerifyEmailAddress(APIView):
    permission_classes = [AllowAny]
    serializer_class = VerifyEmailSerializer

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        code = serializer.validated_data["otp_code"]

        try:
            user = Users.objects.get(email=email)
            if not AdvancedOTPDevice.objects.filter(user=user).exists():
                return Response(
                    {"error": True, "message": "No code Found, please login in again"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            device = AdvancedOTPDevice.objects.get(user=user, name="sms_otp_device")

            verification_result = device.verify_token(code)
            if not verification_result["error"]:
                user.is_verified = True
                user.save()

                return Response(
                    {
                        "error": False,
                        "user": {
                            "email": user.email,
                            "username": user.username,
                        },
                        "email_verified": True,
                    },
                    status=status.HTTP_200_OK,
                )
            else:
                # Check if the error includes retry information
                error_response = {
                    "error": True,
                    "message": verification_result["message"],
                }
                if "retry_after" in verification_result:
                    error_response["retry_after"] = verification_result["retry_after"]
                    error_response["page"] = "Verify Email"
                    error_response["email"] = email

                return Response(error_response, status=status.HTTP_400_BAD_REQUEST)
        except Users.DoesNotExist:
            return Response(
                {"error": True, "message": "User not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )
