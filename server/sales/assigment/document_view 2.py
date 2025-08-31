from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from documents.models import ContractTemplate
from .document_serializer import DocumentTemplateListSerializer


class DocumentTemplateSearchView(ListAPIView):
    """
    Generic view for listing document templates by type only
    Supports: rent, offer_letter, sales_agreement
    """

    serializer_class = DocumentTemplateListSerializer

    def get_queryset(self):
        """Filter queryset by document type only"""
        document_type = self.request.query_params.get("document_type", "rent")

        # Validate document type
        valid_types = ["rent", "offer_letter", "sales_agreement"]
        if document_type not in valid_types:
            return ContractTemplate.objects.none()

        return ContractTemplate.objects.filter(
            template_type=document_type, is_active=True
        )

    def list(self, request, *args, **kwargs):
        """Custom list method to format response"""
        document_type = request.query_params.get("document_type", "rent")

        # Validate document type
        valid_types = ["rent", "offer_letter", "sales_agreement"]
        if document_type not in valid_types:
            return Response(
                {
                    "error": True,
                    "message": f"Invalid document_type. Must be one of: {valid_types}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        return Response(
            {
                "error": False,
                "message": f"Successfully fetched {document_type} templates",
                "data": {
                    "count": queryset.count(),
                    "results": serializer.data,
                },
            }
        )
