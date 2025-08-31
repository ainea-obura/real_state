from rest_framework import status
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiExample

from .offer_letter_serializer import OfferLetterSerializer


@extend_schema(
    tags=["Offer Letters"],
    description="Create a new offer letter for properties",
    request=OfferLetterSerializer,
    responses={
        201: OfferLetterSerializer,
        400: {
            "type": "object",
            "properties": {
                "success": {"type": "boolean"},
                "message": {"type": "string"},
            },
        },
    },
    examples=[
        OpenApiExample(
            "Create Offer Letter",
            value={
                "property_ids": ["uuid1", "uuid2"],
                "buyer_ids": ["buyer_uuid1", "buyer_uuid2"],
                "template_id": "template_uuid",
                "offer_price": "5000000.00",
                "down_payment": "1000000.00",
                "due_date": "2024-12-31",
                "notes": "Special offer for new clients",
            },
            request_only=True,
        ),
    ],
)
class CreateOfferLetterView(CreateAPIView):
    """Create a new offer letter"""

    serializer_class = OfferLetterSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """Override create method to provide custom response format"""
        try:
            serializer = self.get_serializer(data=request.data)

            if not serializer.is_valid():
                errors = serializer.errors
                error_messages = []

                for field, field_errors in errors.items():
                    if isinstance(field_errors, list):
                        for error in field_errors:
                            error_messages.append(f"{field}: {error}")
                    else:
                        error_messages.append(f"{field}: {error}")

                detailed_message = "Validation failed: " + "; ".join(error_messages)

                response_data = {
                    "success": False,
                    "message": detailed_message,
                }

                return Response(
                    response_data,
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create the offer letter
            offer_letter = serializer.save()

            response_data = {
                "success": True,
                "message": "Offer letter created successfully",
                "data": {
                    "id": offer_letter.id,
                    "document_type": offer_letter.document_type,
                    "status": offer_letter.status,
                    "price": str(offer_letter.price),
                    "down_payment": str(offer_letter.down_payment),
                    "down_payment_percentage": str(
                        offer_letter.down_payment_percentage
                    ),
                    "due_date": (
                        offer_letter.due_date.strftime("%Y-%m-%d")
                        if offer_letter.due_date
                        else None
                    ),
                    "notes": offer_letter.notes,
                    "created_at": offer_letter.created_at.isoformat(),
                    "updated_at": offer_letter.updated_at.isoformat(),
                },
            }

            return Response(
                response_data,
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            response_data = {
                "success": False,
                "message": (
                    "An error occurred while creating the offer letter: " f"{str(e)}"
                ),
            }
            return Response(
                response_data,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
