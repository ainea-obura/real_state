from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from .assign_sales_person_serializer import AssignSalesPersonSerializer


@extend_schema(
    tags=["SalesPersonAssignment"],
    description="Assign a sales person to a property sale with commission details.",
    request={
        "application/json": {
            "example": {
                "salesItemId": "9a8d5c88-ae79-49ea-977e-44deed0a7183",
                "staffId": "74c323c1-c4b0-42b1-923c-0b52585d1b59",
                "commissionType": "percentage",
                "commissionAmount": "10",
                "paymentSetting": "per_payment",
                "notes": "Assigning sales person for better follow-up",
            }
        }
    },
    responses={
        200: {
            "description": "Sales person assigned successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Sales person assigned successfully",
                        "data": {
                            "sale_id": "uuid-string",
                            "sale_item_id": "9a8d5c88-ae79-49ea-977e-44deed0a7183",
                            "sales_person_id": "74c323c1-c4b0-42b1-923c-0b52585d1b59",
                            "sales_person_name": "John Doe",
                            "commission_type": "percentage",
                            "commission_amount": "10",
                            "payment_setting": "per_payment",
                            "notes": "Assigning sales person for better follow-up",
                            "assigned_at": "2024-01-15T10:30:00Z",
                        },
                    }
                }
            },
        },
        400: {
            "description": "Bad request - validation error",
            "content": {
                "application/json": {
                    "example": {
                        "success": False,
                        "message": "Validation failed: salesItemId: This property sale already has John Doe assigned as the sales person. Please remove the existing assignment first or choose a different property sale.",
                    }
                }
            },
        },
        404: {
            "description": "Not found",
            "content": {
                "application/json": {
                    "example": {
                        "success": False,
                        "message": "Property sale item not found",
                        "error": "Property sale item not found",
                    }
                }
            },
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "success": False,
                        "message": "Failed to assign sales person",
                        "error": "Database transaction failed",
                    }
                }
            },
        },
    },
)
class AssignSalesPersonView(APIView):
    """
    API view to assign sales persons to property sales.
    Handles commission type, amount, and payment settings.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Assign a sales person to a property sale"""
        try:
            # Validate the request data
            serializer = AssignSalesPersonSerializer(data=request.data)

            if not serializer.is_valid():
                # Get detailed error information
                errors = serializer.errors
                error_messages = []

                print(f"=== DEBUG: Serializer validation failed ===")
                print(f"Raw errors: {errors}")
                print(f"Errors type: {type(errors)}")
                print(f"Errors keys: {list(errors.keys()) if errors else 'None'}")

                # Format field-specific errors
                for field, field_errors in errors.items():
                    print(f"Field: {field}, Errors: {field_errors}")
                    if isinstance(field_errors, list):
                        for error in field_errors:
                            error_messages.append(f"{field}: {error}")
                    else:
                        error_messages.append(f"{field}: {error}")

                print(f"Formatted error messages: {error_messages}")

                # Create a simplified error response with details in message
                detailed_message = "Validation failed: " + "; ".join(error_messages)

                response_data = {
                    "success": False,
                    "message": detailed_message,
                }

                print(f"Final response data: {response_data}")

                return Response(
                    response_data,
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Assign the sales person
            result = serializer.assign_sales_person()
            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            # Handle any unexpected errors
            print(f"=== DEBUG: Unexpected error: {e} ===")
            return Response(
                {
                    "success": False,
                    "message": "An unexpected error occurred",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
