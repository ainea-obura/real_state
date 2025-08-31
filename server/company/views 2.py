import os
from django.db import transaction
from django.http import Http404
from django.shortcuts import get_object_or_404
from django_ratelimit.decorators import ratelimit
from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from utils.email_utils import send_company_creation_confirmation
from utils.payments import submit_business_details, business_onboarding_confirmation
from utils.get_sassa_pay_token import token

from .models import Branch, Company, Owner, BusinessOnboarding
from .serializers import (
    BranchMinimalSerializer,
    CompanyCreateSerializer,
    CompanyDetailSerializer,
    CompanyMinimalSerializer,
    CompanyUpdateSerializer,
    BusinessOnboardingSerializer,
)


class GetAllCompaniesView(ListAPIView):
    serializer_class = CompanyMinimalSerializer
    queryset = Company.objects.all()

    def list(self, request, *args, **kwargs):
        companies = self.get_queryset()
        return Response(
            {"isError": False, "data": self.get_serializer(companies, many=True).data},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Company"],
    description="Create a new company with automatic main branch.",
)
class CreateCompanyView(CreateAPIView):
    serializer_class = CompanyCreateSerializer

    def post(self, request, *args, **kwargs):
        # we'll just call super().post() inside a transaction, but also create owner & main branch
        with transaction.atomic():
            # validate and save company
            company = self.perform_create_and_get_instance(request)
            # create owner
            ownser = Owner.objects.create(user=request.user, company=company)
            ownser.user.type = "company"
            ownser.user.save()

        # Send company creation confirmation email
        try:
            from datetime import datetime

            registration_date = datetime.now().strftime("%B %d, %Y")

            email_sent = send_company_creation_confirmation(
                recipient_email=request.user.email,
                admin_name=request.user.get_full_name() or request.user.username,
                company_name=company.name,
                registration_date=registration_date,
            )

            if email_sent:
                print(
                    f"✅ Company creation confirmation email sent to {request.user.email}"
                )
            else:
                print(
                    f"❌ Failed to send company creation confirmation email to {request.user.email}"
                )

        except Exception as e:
            print(f"❌ Error sending company creation confirmation email: {str(e)}")

        data = CompanyDetailSerializer(company).data
        return Response(
            {"isError": False, "message": "Company created successfully", "data": data},
            status=status.HTTP_201_CREATED,
        )

    def perform_create_and_get_instance(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return serializer.save(status="active")


@extend_schema(
    tags=["Company"],
    description="Create a new company with automatic main branch.",
)
class CompanyDetailView(RetrieveAPIView):
    serializer_class = CompanyDetailSerializer

    # only non-deleted companies
    def get_queryset(self):
        return Company.objects.filter(is_deleted=False)

    def retrieve(self, request, *args, **kwargs):
        company_data = self.get_object()  # looks up by pk
        return Response(
            {"isError": False, "data": self.get_serializer(company_data).data},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Company"],
    description="Get all branches of a company.",
)
class CompanyBranchesView(RetrieveAPIView):
    serializer_class = BranchMinimalSerializer

    def get_queryset(self):
        return Branch.objects.filter(
            company=self.kwargs["pk"], is_deleted=False
        ).order_by("name")

    def retrieve(self, request, *args, **kwargs):
        branches = self.get_queryset()
        return Response(
            {
                "isError": False,
                "error": False,  # Adding this for frontend schema compatibility
                "message": "Branches fetched successfully",
                "data": self.get_serializer(branches, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Company"],
    description="Get company details for current user.",
)
class CurrentUserCompanyView(RetrieveAPIView):
    serializer_class = CompanyDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # Get the company associated with the current user through Owner model
        try:
            owner = Owner.objects.get(user=self.request.user, company__is_deleted=False)
            return owner.company
        except Owner.DoesNotExist:
            raise Http404("No company found for this user")

    def retrieve(self, request, *args, **kwargs):
        try:
            company = self.get_object()
            return Response(
                {"isError": False, "data": self.get_serializer(company).data},
                status=status.HTTP_200_OK,
            )
        except Http404:
            return Response(
                {
                    "isError": True,
                    "message": "User is not associated with any company",
                },
                status=status.HTTP_404_NOT_FOUND,
            )


@extend_schema(
    tags=["Company"],
    description="Update company details.",
)
class CompanyUpdateView(UpdateAPIView):
    serializer_class = CompanyUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Company.objects.filter(is_deleted=False)

    def update(self, request, *args, **kwargs):
        company = self.get_object()
        serializer = self.get_serializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "isError": False,
                "message": "Company updated successfully",
                "data": CompanyDetailSerializer(company).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Company"],
    description="Submit business onboarding details for SasaPay integration.",
)
class submitBusinessDetailsView(CreateAPIView):
    serializer_class = BusinessOnboardingSerializer

    def post(self, request, *args, **kwargs):
        # Check if this is an OTP confirmation request
        action = kwargs.get("action")
        if action == "confirm_otp":
            return self.confirm_otp(request, *args, **kwargs)

        # Regular business onboarding submission
        try:
            # Get the company associated with the current user
            owner = Owner.objects.get(user=request.user, company__is_deleted=False)
            company = owner.company

            # Validate the incoming data
            serializer = self.get_serializer(
                data=request.data, context={"company": company, "user": request.user}
            )
            serializer.is_valid(raise_exception=True)

            # Call the SasaPay API FIRST before saving to database
            api_response = None
            api_success = False
            api_message = ""

            try:
                # Get the token from the utility function
                get_token = token()
                if not get_token:
                    return Response(
                        {"isError": True, "message": "Failed to get SasaPay token"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                # Call the SasaPay business onboarding API
                print("token", get_token)
                api_response = submit_business_details(
                    token=get_token,  # Fixed: use get_token instead of token
                    merchant_code=request.data.get("merchantCode"),
                    business_name=request.data.get("businessName"),
                    billNumber=request.data.get("billNumber"),
                    description=request.data.get("description"),
                    productType=request.data.get("productType"),
                    countryId=request.data.get("countryId"),
                    subregionId=request.data.get("subregionId"),
                    industryId=request.data.get("industryId"),
                    subIndustryId=request.data.get("subIndustryId"),
                    bankCode=request.data.get("bankId"),
                    bankAccountNumber=request.data.get("bankAccountNumber"),
                    mobileNumber=request.data.get("mobileNumber"),
                    businessTypeId=request.data.get("businessTypeId"),
                    businessEmail=request.data.get("email"),
                    registrationNumber=request.data.get("registrationNumber"),
                    KraPin=request.data.get("kraPin"),
                    referralCode=request.data.get("referralCode"),
                    dealerNumber=request.data.get("dealerNumber"),
                    purpose=request.data.get("purpose"),
                    natureOfBusiness=request.data.get("natureOfBusiness"),
                    physicalAddress=request.data.get("physicalAddress"),
                    estimatedMonthlyTransactionAmount=request.data.get(
                        "estimatedMonthlyTransactionAmount"
                    ),
                    estimatedMonthlyTransactionCount=request.data.get(
                        "estimatedMonthlyTransactionCount"
                    ),
                    CallbackUrl=os.environ.get("CALLBACK_URL_FOR_BUSINESS_ONBOARDING"),
                    directors=request.data.get("directors"),
                )

                print("response", api_response)

                # Check if API call was successful (responseCode == '0')
                if api_response and api_response.get("responseCode") == "0":
                    api_success = True
                    api_message = api_response.get("message", "API call successful")

                    # Only save to database if API call is successful
                    business_onboarding = serializer.save()

                    # Update the business onboarding record with API response
                    business_onboarding.update_from_api_response(api_response)
                    business_onboarding.status = True
                    business_onboarding.save()

                    print("✅ Business onboarding saved to database successfully")

                else:
                    # API call failed - don't save to database
                    api_success = False
                    api_message = (
                        api_response.get("message", "API call failed")
                        if api_response
                        else "No response from API"
                    )

                    # Return error response without saving to database
                    return Response(
                        {
                            "isError": True,
                            "message": f"SasaPay API Error: {api_message}",
                            "api_response": api_response,
                            "error_code": (
                                api_response.get("responseCode")
                                if api_response
                                else "UNKNOWN"
                            ),
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            except Exception as api_error:
                print(f"❌ Error calling SasaPay API: {str(api_error)}")
                return Response(
                    {
                        "isError": True,
                        "message": f"Error calling SasaPay API: {str(api_error)}",
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        except Owner.DoesNotExist:
            return Response(
                {"isError": True, "message": "User is not associated with any company"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            print(f"❌ Error processing business onboarding: {str(e)}")
            return Response(
                {
                    "isError": True,
                    "message": f"Error processing business onboarding: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Return response after all processing is complete
        return Response(
            {
                "isError": False,
                "message": "Business onboarding details submitted successfully",
                "data": {
                    "id": str(business_onboarding.id),
                    "company_id": str(company.id),
                    "user_id": str(request.user.id),
                    "database_status": "saved",
                    "api_call": {
                        "success": api_success,
                        "message": api_message,
                        "response": api_response,
                    },
                    "business_onboarding": {
                        "status": business_onboarding.status,
                        "requestId": str(business_onboarding.requestId),
                        "merchantCode": business_onboarding.merchantCode,
                        "responseCode": business_onboarding.responseCode,
                        "message": business_onboarding.message,
                        "updated_fields": {
                            "requestId": str(business_onboarding.requestId),
                            "responseCode": business_onboarding.responseCode,
                            "message": business_onboarding.message,
                        },
                    },
                },
            },
            status=status.HTTP_201_CREATED,
        )

    def confirm_otp(self, request, *args, **kwargs):
        """
        Confirm business onboarding with OTP verification.
        This is called after receiving the first response with OTP.
        """
        try:
            # Get the OTP from request
            otp = request.data.get("otp")

            if not otp:
                return Response(
                    {"isError": True, "message": "OTP is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get the company associated with the current user
            try:
                owner = Owner.objects.get(user=request.user, company__is_deleted=False)
                company = owner.company
            except Owner.DoesNotExist:
                return Response(
                    {
                        "isError": True,
                        "message": "User is not associated with any company",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Find the business onboarding record for this user and company
            try:
                business_onboarding = BusinessOnboarding.objects.get(
                    company=company, user=request.user, is_deleted=False
                )
            except BusinessOnboarding.DoesNotExist:
                return Response(
                    {
                        "isError": True,
                        "message": "No business onboarding record found for this user",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Get the requestId from the business onboarding record
            request_id = business_onboarding.requestId
            if not request_id:
                return Response(
                    {
                        "isError": True,
                        "message": "No request ID found in business onboarding record",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get the token and call the confirmation API
            try:
                get_token = token()
                if not get_token:
                    return Response(
                        {"isError": True, "message": "Failed to get SasaPay token"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                # Call the OTP confirmation API
                print(f"🔐 Calling OTP confirmation with:")
                print(f"  - token: {get_token[:20]}...")
                print(f"  - merchant_code: {business_onboarding.merchantCode}")
                print(f"  - otp: {otp}")
                print(f"  - requestId: {request_id} (type: {type(request_id)})")

                # Ensure merchantCode is available
                merchant_code = business_onboarding.merchantCode or os.environ.get(
                    "MERCHANT_CODE"
                )
                if not merchant_code:
                    return Response(
                        {
                            "isError": True,
                            "message": "Merchant code not found in business onboarding record or environment",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                print(f"🔐 Using merchant code: {merchant_code}")
                print(
                    f"🔐 Source: {'Database' if business_onboarding.merchantCode else 'Environment'}"
                )

                confirmation_response = business_onboarding_confirmation(
                    token=get_token,
                    merchant_code=merchant_code,
                    otp=otp,
                    requestId=str(request_id),
                )

                print(f"🔐 OTP Confirmation Response: {confirmation_response}")
                print(f"🔐 Response type: {type(confirmation_response)}")
                print(
                    f"🔐 Response keys: {confirmation_response.keys() if isinstance(confirmation_response, dict) else 'Not a dict'}"
                )

                # Update the business onboarding record with confirmation response
                if confirmation_response:
                    try:
                        business_onboarding.update_from_api_response(
                            confirmation_response
                        )
                        print(f"✅ Successfully updated business onboarding record")
                    except Exception as update_error:
                        print(
                            f"❌ Error updating business onboarding record: {str(update_error)}"
                        )
                        # Continue with the response even if update fails

                    # Update status based on confirmation response
                    if (
                        confirmation_response.get("status") == True
                        and confirmation_response.get("responseCode") == "0"
                    ):
                        business_onboarding.status = True
                        business_onboarding.save()

                        return Response(
                            {
                                "isError": False,
                                "message": "OTP confirmed successfully",
                                "data": {
                                    "requestId": str(request_id),
                                    "status": business_onboarding.status,
                                    "message": confirmation_response.get(
                                        "message", "OTP confirmed"
                                    ),
                                    "accountStatus": confirmation_response.get(
                                        "data", {}
                                    ).get("accountStatus", "unknown"),
                                    "merchantCode": confirmation_response.get(
                                        "data", {}
                                    ).get("merchantCode", ""),
                                    "accountNumber": confirmation_response.get(
                                        "data", {}
                                    ).get("accountNumber", ""),
                                    "displayName": confirmation_response.get(
                                        "data", {}
                                    ).get("displayName", ""),
                                    "accountBalance": confirmation_response.get(
                                        "data", {}
                                    ).get("accountBalance", 0.0),
                                },
                            },
                            status=status.HTTP_200_OK,
                        )
                    else:
                        # OTP confirmation failed
                        business_onboarding.status = False
                        business_onboarding.save()

                        return Response(
                            {
                                "isError": True,
                                "message": confirmation_response.get(
                                    "message", "OTP confirmation failed"
                                ),
                                "data": {
                                    "requestId": str(request_id),
                                    "status": False,
                                    "responseCode": confirmation_response.get(
                                        "responseCode", "unknown"
                                    ),
                                },
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

            except Exception as api_error:
                print(f"❌ Error calling OTP confirmation API: {str(api_error)}")
                return Response(
                    {
                        "isError": True,
                        "message": f"Error confirming OTP: {str(api_error)}",
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        except Exception as e:
            print(f"❌ Error processing OTP confirmation: {str(e)}")
            return Response(
                {
                    "isError": True,
                    "message": f"Error processing OTP confirmation: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Company"],
    description="Get business onboarding details for the current user's company.",
)
class GetBusinessOnboardingView(RetrieveAPIView):
    serializer_class = BusinessOnboardingSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # Get the company associated with the current user
        try:
            owner = Owner.objects.get(user=self.request.user, company__is_deleted=False)
            return owner.company
        except Owner.DoesNotExist:
            raise Http404("No company found for this user")

    def retrieve(self, request, *args, **kwargs):
        try:
            company = self.get_object()

            # Get business onboarding data from database
            try:
                business_onboarding = BusinessOnboarding.objects.get(
                    company=company, user=request.user, is_deleted=False
                )

                return Response(
                    {
                        "isError": False,
                        "message": "Business onboarding data retrieved successfully",
                        "data": self.get_serializer(business_onboarding).data,
                    },
                    status=status.HTTP_200_OK,
                )
            except BusinessOnboarding.DoesNotExist:
                return Response(
                    {"isError": True, "message": "No business onboarding data found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        except Http404:
            return Response(
                {"isError": True, "message": "User is not associated with any company"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {
                    "isError": True,
                    "message": f"Error retrieving business onboarding data: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Company"],
    description="Handle SasaPay business onboarding callback after OTP confirmation.",
)
class BusinessOnboardingCallBackView(CreateAPIView):
    authentication_classes = []  # Allow any authentication (no authentication required)
    permission_classes = []  # No permission checks required for webhook
    """
    Handle callback from SasaPay after business onboarding OTP confirmation.
    This updates the business onboarding record with the final status and account details.
    """

    def post(self, request, *args, **kwargs):
        try:
            # Extract callback data from SasaPay
            callback_data = request.data

            print(f"📞 Business Onboarding Callback Received: {callback_data}")

            # Validate callback data
            if not callback_data:
                return Response(
                    {"isError": True, "message": "No callback data received"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Extract requestId from callback data
            request_id = None
            if callback_data.get("data") and callback_data["data"].get("requestId"):
                request_id = callback_data["data"]["requestId"]
            elif callback_data.get("requestId"):
                request_id = callback_data["requestId"]

            if not request_id:
                return Response(
                    {
                        "isError": True,
                        "message": "Request ID not found in callback data",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Find the business onboarding record by requestId
            try:
                business_onboarding = BusinessOnboarding.objects.get(
                    requestId=request_id, is_deleted=False
                )
            except BusinessOnboarding.DoesNotExist:
                return Response(
                    {
                        "isError": True,
                        "message": f"Business onboarding record not found for requestId: {request_id}",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Update the business onboarding record with callback data
            business_onboarding.update_from_api_response(callback_data)

            # Update status based on callback response
            if (
                callback_data.get("status") == True
                and callback_data.get("responseCode") == "0"
            ):
                business_onboarding.status = True
                # You can add additional status field if needed
                # business_onboarding.accountStatus = callback_data.get("data", {}).get("accountStatus", "pending")
            else:
                business_onboarding.status = False

            business_onboarding.save()

            print(
                f"✅ Business onboarding record updated successfully for requestId: {request_id}"
            )

            return Response(
                {
                    "isError": False,
                    "message": "Callback processed successfully",
                    "data": {
                        "requestId": request_id,
                        "status": business_onboarding.status,
                        "message": callback_data.get("message", "Callback processed"),
                        "accountStatus": callback_data.get("data", {}).get(
                            "accountStatus", "unknown"
                        ),
                    },
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            print(f"❌ Error processing business onboarding callback: {str(e)}")
            return Response(
                {
                    "isError": True,
                    "message": f"Error processing callback: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
