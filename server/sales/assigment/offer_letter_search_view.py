from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiExample
from django.core.files.base import ContentFile

from sales.models import AssignedDocument
from .offer_letter_search_serializer import (
    OfferLetterSearchRequestSerializer,
    OfferLetterSearchResponseSerializer,
)


class OfferLetterSearchView(APIView):
    """
    Search for offer letters based on owner IDs and property IDs.
    Returns a list of offer letters that match the criteria.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Sales - Offer Letters"],
        summary="Search Offer Letters by Owner and Property IDs",
        description="""
        Search for existing offer letters based on:
        - Owner/buyer IDs (array of UUIDs)
        - Property IDs (array of UUIDs)
        
        Returns offer letters that match any combination of the provided owners and properties.
        Useful for finding existing offers before creating contracts.
        """,
        request=OfferLetterSearchRequestSerializer,
        responses={
            200: OfferLetterSearchResponseSerializer(many=True),
            400: {
                "type": "object",
                "properties": {
                    "error": {"type": "boolean"},
                    "message": {"type": "string"},
                    "details": {"type": "object"},
                },
            },
        },
        examples=[
            OpenApiExample(
                "Search Request",
                value={
                    "owner_ids": ["550e8400-e29b-41d4-a716-446655440000"],
                    "property_ids": ["550e8400-e29b-41d4-a716-446655440001"],
                },
                request_only=True,
            ),
            OpenApiExample(
                "Success Response",
                value={
                    "success": True,
                    "message": "Successfully found 2 offer letters",
                    "data": {
                        "count": 2,
                        "results": [
                            {
                                "id": "550e8400-e29b-41d4-a716-446655440002",
                                "document_title": "Offer Letter for Unit A1",
                                "buyer_name": "John Doe",
                                "property_name": "Unit A1",
                                "project_name": "Sunset Gardens",
                                "price_formatted": "KES 5,000,000.00",
                                "down_payment_formatted": "KES 1,000,000.00",
                                "due_date_formatted": "December 31, 2024",
                            }
                        ],
                    },
                },
                response_only=True,
            ),
        ],
    )
    def post(self, request):
        """Search for offer letters by owner and property IDs"""

        # Validate request data
        serializer = OfferLetterSearchRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Invalid request data",
                    "details": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        owner_ids = serializer.validated_data.get("owner_ids", [])
        property_ids = serializer.validated_data.get("property_ids", [])

        # Validate that at least one ID is provided
        if not owner_ids and not property_ids:
            return Response(
                {
                    "success": False,
                    "message": "At least one owner ID or property ID must be provided",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Build flexible search: find offer letters that match ANY of the criteria
            search_query = Q(document_type="offer_letter")

            # Add owner filter if provided
            if owner_ids:
                search_query |= Q(buyer_id__in=owner_ids)

            # Add property filter if provided
            if property_ids:
                search_query |= Q(property_node_id__in=property_ids)

            # Execute query
            offer_letters = (
                AssignedDocument.objects.filter(search_query)
                .select_related(
                    "buyer",
                    "property_node",
                    "template",
                )
                .order_by("-created_at")
            )

            # Serialize results
            response_serializer = OfferLetterSearchResponseSerializer(
                offer_letters, many=True
            )

            return Response(
                {
                    "success": True,
                    "message": f"Successfully found {offer_letters.count()} offer letters",
                    "data": {
                        "count": offer_letters.count(),
                        "results": response_serializer.data,
                    },
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": f"Error searching offer letters: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def get(self, request):
        """Test endpoint to list all offer letters without filters"""
        try:
            # Get all offer letters for debugging
            all_offer_letters = (
                AssignedDocument.objects.filter(document_type="offer_letter")
                .select_related("buyer", "property_node")
                .order_by("-created_at")
            )

            # Serialize results
            response_serializer = OfferLetterSearchResponseSerializer(
                all_offer_letters, many=True
            )

            return Response(
                {
                    "success": True,
                    "message": f"Found {all_offer_letters.count()} offer letters",
                    "data": {
                        "count": all_offer_letters.count(),
                        "results": response_serializer.data,
                    },
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": f"Error listing offer letters: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request):
        """Regenerate PDF for existing offer letter"""
        try:
            offer_letter_id = request.data.get('offer_letter_id')
            if not offer_letter_id:
                return Response(
                    {"error": True, "message": "offer_letter_id is required"},
                    status=400
                )
            
            # Get the offer letter
            offer_letter = AssignedDocument.objects.get(
                id=offer_letter_id,
                document_type="offer_letter"
            )
            
            # Check if it already has a PDF
            if offer_letter.document_file:
                return Response(
                    {"error": False, "message": "PDF already exists", "url": offer_letter.document_file.url},
                    status=200
                )
            
            # Generate PDF using the serializer logic
            from .offer_letter_serializer import OfferLetterSerializer
            serializer = OfferLetterSerializer()
            
            # Generate PDF
            pdf_bytes = serializer.generate_offer_letter_pdf(offer_letter, offer_letter.template)
            
            if pdf_bytes:
                # Save PDF to document_file field
                filename = f"offer_letter_{offer_letter.property_node.name}_{offer_letter.buyer.get_full_name().replace(' ', '_')}.pdf"
                offer_letter.document_file.save(filename, ContentFile(pdf_bytes), save=False)
                offer_letter.save()
                
                return Response(
                    {"error": False, "message": "PDF generated successfully", "url": offer_letter.document_file.url},
                    status=200
                )
            else:
                return Response(
                    {"error": True, "message": "Failed to generate PDF"},
                    status=500
                )
                
        except AssignedDocument.DoesNotExist:
            return Response(
                {"error": True, "message": "Offer letter not found"},
                status=404
            )
        except Exception as e:
            return Response(
                {"error": True, "message": f"Error: {str(e)}"},
                status=500
            )
