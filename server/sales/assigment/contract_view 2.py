from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiExample
from django.utils import timezone

from sales.models import AssignedDocument
from documents.models import ContractTemplate
from .contract_serializer import (
    ContractCreateRequestSerializer,
    ContractCreateResponseSerializer,
)


class ContractCreateView(APIView):
    """API view for creating contracts from offer letters"""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Sales - Contracts"],
        summary="Create Contract from Offer Letter",
        description=(
            "Create a new sales agreement contract based on an existing offer letter. "
            "The contract will inherit all financial details and buyer/property "
            "information from the offer letter."
        ),
        request=ContractCreateRequestSerializer,
        responses={
            201: ContractCreateResponseSerializer,
            400: {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "message": {"type": "string"},
                    "details": {"type": "object"},
                },
            },
            404: {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "message": {"type": "string"},
                },
            },
            500: {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "message": {"type": "string"},
                },
            },
        },
        examples=[
            OpenApiExample(
                "Create Contract Request",
                value={
                    "offer_letter_id": "550e8400-e29b-41d4-a716-446655440000",
                    "template_id": "550e8400-e29b-41d4-a716-446655440001",
                    "notes": "Contract created from offer letter",
                    "variable_values": {
                        "contract_date": "2024-12-20",
                        "special_terms": "None",
                    },
                },
                request_only=True,
            ),
            OpenApiExample(
                "Success Response",
                value={
                    "success": True,
                    "message": "Contract created successfully",
                    "data": {
                        "id": "550e8400-e29b-41d4-a716-446655440002",
                        "document_title": "Sales Agreement - A102 for Haji Ahmed",
                        "buyer_name": "Haji Ahmed",
                        "property_name": "A102",
                        "project_name": "Lavintong",
                        "template_name": "Standard Sales Agreement",
                        "price_formatted": "KES 1,000,000.00",
                        "down_payment_formatted": "KES 200,000.00",
                        "due_date_formatted": "December 31, 2024",
                        "related_offer_letter": {
                            "id": "550e8400-e29b-41d4-a716-446655440000",
                            "document_title": "Offer Letter - A102 for Haji Ahmed",
                            "status": "accepted",
                        },
                        "status": "draft",
                        "created_at": "2024-12-20T10:00:00Z",
                        "notes": "Contract created from offer letter",
                    },
                },
                response_only=True,
            ),
        ],
    )
    def post(self, request):
        """Create a new contract from an offer letter"""

        # Validate request data
        serializer = ContractCreateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Invalid request data",
                    "details": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        offer_letter_id = serializer.validated_data.get("offer_letter_id")
        template_id = serializer.validated_data.get("template_id")
        notes = serializer.validated_data.get("notes", "")
        variable_values = serializer.validated_data.get("variable_values", {})

        try:
            # Get the offer letter (status already updated in serializer validation)
            offer_letter = AssignedDocument.objects.get(
                id=offer_letter_id, document_type="offer_letter"
            )

            # Get the contract template
            template = ContractTemplate.objects.get(id=template_id)

            # Create the contract document
            contract = AssignedDocument.objects.create(
                document_type="sales_agreement",
                template=template,
                buyer=offer_letter.buyer,
                property_node=offer_letter.property_node,
                document_title=f"Sales Agreement - {offer_letter.property_node.name} for {offer_letter.buyer.get_full_name()}",
                price=offer_letter.price,
                down_payment=offer_letter.down_payment,
                down_payment_percentage=offer_letter.down_payment_percentage,
                due_date=offer_letter.due_date,
                status="draft",
                created_by=request.user,
                related_document=offer_letter,
                variable_values=variable_values,
                notes=notes,
            )

            # Generate document content from template (placeholder for now)
            # contract.generate_document_from_template()

            # Prepare response
            response_serializer = ContractCreateResponseSerializer(contract)

            return Response(
                {
                    "success": True,
                    "message": "Contract created successfully",
                    "data": response_serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )

        except AssignedDocument.DoesNotExist:
            return Response(
                {"success": False, "message": "Offer letter not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        except ContractTemplate.DoesNotExist:
            return Response(
                {"success": False, "message": "Contract template not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        except Exception as e:
            return Response(
                {"success": False, "message": f"Error creating contract: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
