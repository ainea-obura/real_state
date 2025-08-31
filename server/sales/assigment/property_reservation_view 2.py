from rest_framework import status
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiExample

from .property_reservation_serializer import PropertyReservationSerializer


@extend_schema(
    tags=["Property Reservations"],
    description="Create a new property reservation",
    request=PropertyReservationSerializer,
    responses={
        201: PropertyReservationSerializer,
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
            "Create Reservation",
            value={
                "property_ids": ["uuid1", "uuid2"],
                "owner_id": "owner_uuid",
                "end_date": "2024-12-31",
                "deposit_fee": "1000.00",
                "notes": "Reservation for new client",
            },
            request_only=True,
        ),
    ],
)
class CreatePropertyReservationView(CreateAPIView):
    """Create a new property reservation"""

    serializer_class = PropertyReservationSerializer
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

            # Create the reservation
            serializer.save()

            response_data = {
                "success": True,
                "message": "Property reservation created successfully",
                "data": serializer.data,
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            response_data = {
                "success": False,
                "message": (
                    "An error occurred while creating the reservation: " f"{str(e)}"
                ),
            }
            return Response(
                response_data,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
