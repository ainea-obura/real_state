"""
Debug endpoint to test KYC document retrieval
"""

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from documents.models import KYCDocument, KYCSubmission, Company
from documents.kyc_documents.serializers import KYCDocumentSerializer


class DebugKYCView(APIView):
    """Debug endpoint to test KYC document retrieval"""

    permission_classes = [IsAuthenticated]

    def get(self, request, company_id):
        """Debug KYC documents for a company"""
        try:
            company = get_object_or_404(Company, id=company_id)
            
            # Get all KYC documents
            kyc_documents = KYCDocument.objects.filter(company=company)
            
            debug_info = {
                "company_name": company.name,
                "company_id": str(company.id),
                "total_documents": kyc_documents.count(),
                "documents": []
            }
            
            for doc in kyc_documents:
                try:
                    serializer = KYCDocumentSerializer(doc)
                    doc_data = serializer.data
                    debug_info["documents"].append({
                        "id": str(doc.id),
                        "document_type": doc.document_type,
                        "file_name": doc.file_name,
                        "file_size": doc.file_size,
                        "status": doc.status,
                        "document_file": str(doc.document_file) if doc.document_file else "None",
                        "is_direct_upload": doc_data.get("is_direct_upload", False),
                        "serialized_successfully": True
                    })
                except Exception as e:
                    debug_info["documents"].append({
                        "id": str(doc.id),
                        "document_type": doc.document_type,
                        "file_name": doc.file_name,
                        "serialized_successfully": False,
                        "error": str(e)
                    })
            
            return Response({
                "error": False,
                "message": "Debug info retrieved successfully",
                "data": debug_info
            })
            
        except Exception as e:
            return Response({
                "error": True,
                "message": f"Debug error: {str(e)}",
                "data": None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
