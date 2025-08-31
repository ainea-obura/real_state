from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiExample
from django.utils import timezone
from django.core.files.base import ContentFile
from jinja2 import Template as JinjaTemplate
from weasyprint import HTML

from sales.models import AssignedDocument
from documents.models import ContractTemplate
from .contract_serializer import (
    ContractCreateRequestSerializer,
    ContractCreateResponseSerializer,
)
from utils.format import format_money_with_currency


class ContractCreateView(APIView):
    """API view for creating contracts from offer letters"""

    permission_classes = [IsAuthenticated]

    def generate_contract_pdf(self, contract, template):
        """Generate PDF for contract using WeasyPrint"""
        try:
            # Build context variables
            context = {
                "buyer_full_name": contract.buyer.get_full_name(),
                "buyer_email": contract.buyer.email,
                "buyer_phone": contract.buyer.phone,
                "property_name": contract.property_node.name,
                "project_name": self.get_project_name(contract.property_node),
                "contract_price": format_money_with_currency(contract.price),
                "down_payment": format_money_with_currency(contract.down_payment),
                "down_payment_percentage": f"{contract.down_payment_percentage:.1f}%",
                "due_date": contract.due_date.strftime("%B %d, %Y") if contract.due_date else "Not specified",
                "contract_date": contract.created_at.strftime("%B %d, %Y"),
                "notes": contract.notes or "",
                "document_type": "Sales Agreement",
                "document_title": contract.document_title,
                "contract_id": str(contract.id),
                "offer_letter_id": str(contract.related_document.id) if contract.related_document else "N/A",
            }
            
            # Add any custom variable values
            if contract.variable_values:
                context.update(contract.variable_values)
            
            # Render template with Jinja2
            jinja_template = JinjaTemplate(template.template_content)
            generated_html = jinja_template.render(**context)
            
            # Generate PDF with WeasyPrint
            pdf_bytes = HTML(string=generated_html).write_pdf()
            
            return pdf_bytes
            
        except Exception as e:
            print(f"Error generating PDF for contract: {e}")
            return None

    def get_project_name(self, property_node):
        """Get project name by traversing up the tree"""
        try:
            project_ancestor = (
                property_node.get_ancestors(include_self=True)
                .filter(node_type="PROJECT")
                .first()
            )
            return project_ancestor.name if project_ancestor else "Unknown Project"
        except Exception:
            return "Unknown Project"

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

            # Generate PDF for the contract
            try:
                pdf_bytes = self.generate_contract_pdf(contract, template)
                
                if pdf_bytes:
                    # Save PDF to document_file field
                    filename = f"contract_{contract.property_node.name}_{contract.buyer.get_full_name().replace(' ', '_')}.pdf"
                    contract.document_file.save(filename, ContentFile(pdf_bytes), save=False)
                    contract.save()  # Save to persist the PDF file reference
                    print(f"PDF generated successfully for contract {contract.id}")
                else:
                    print(f"Failed to generate PDF for contract {contract.id}")
            except Exception as e:
                print(f"Error generating PDF for contract {contract.id}: {str(e)}")
                # Continue without PDF - contract will still be created

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
                {
                    "success": False,
                    "message": "Offer letter not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except ContractTemplate.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Contract template not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": f"Error creating contract: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def put(self, request):
        """Regenerate PDF for existing contract"""
        try:
            contract_id = request.data.get('contract_id')
            if not contract_id:
                return Response(
                    {"success": False, "message": "contract_id is required"},
                    status=400
                )
            
            # Get the contract
            contract = AssignedDocument.objects.get(
                id=contract_id,
                document_type="sales_agreement"
            )
            
            # Check if it already has a PDF
            if contract.document_file:
                return Response(
                    {"success": True, "message": "PDF already exists", "url": contract.document_file.url},
                    status=200
                )
            
            # Generate PDF using the template
            pdf_bytes = self.generate_contract_pdf(contract, contract.template)
            
            if pdf_bytes:
                # Save PDF to document_file field
                filename = f"contract_{contract.property_node.name}_{contract.buyer.get_full_name().replace(' ', '_')}.pdf"
                contract.document_file.save(filename, ContentFile(pdf_bytes), save=False)
                contract.save()
                
                return Response(
                    {"success": True, "message": "PDF generated successfully", "url": contract.document_file.url},
                    status=200
                )
            else:
                return Response(
                    {"success": False, "message": "Failed to generate PDF"},
                    status=500
                )
                
        except AssignedDocument.DoesNotExist:
            return Response(
                {"success": False, "message": "Contract not found"},
                status=404
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"Error: {str(e)}"},
                status=500
            )
