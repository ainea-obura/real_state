"""
API endpoint to clear KYC documents for a company
This allows starting fresh with KYC document uploads via API
"""

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction

from documents.models import KYCDocument, KYCSubmission
from company.models import Company


class ClearKYCDocumentsView(APIView):
    """Clear all KYC documents for a company to start fresh"""

    permission_classes = [IsAuthenticated]

    def delete(self, request, company_id):
        """Delete all KYC documents and submissions for a company"""
        company = get_object_or_404(Company, id=company_id)

        # Get all KYC documents for the company
        kyc_documents = KYCDocument.objects.filter(company=company)
        kyc_submissions = KYCSubmission.objects.filter(company=company)

        if kyc_documents.count() == 0 and kyc_submissions.count() == 0:
            return Response({
                "error": False,
                "message": "No KYC documents to delete",
                "data": {
                    "deleted_documents": 0,
                    "deleted_submissions": 0
                }
            })

        try:
            with transaction.atomic():
                # Delete KYC documents (this will also delete associated files)
                deleted_docs = 0
                deleted_files = []
                
                for doc in kyc_documents:
                    if doc.document_file:
                        try:
                            doc.document_file.delete(save=False)
                            deleted_files.append(doc.file_name)
                        except Exception as e:
                            # Log the error but continue with deletion
                            pass
                    doc.delete()
                    deleted_docs += 1

                # Delete KYC submissions
                deleted_submissions = kyc_submissions.count()
                kyc_submissions.delete()

                return Response({
                    "error": False,
                    "message": f"Successfully deleted {deleted_docs} KYC documents and {deleted_submissions} submissions",
                    "data": {
                        "deleted_documents": deleted_docs,
                        "deleted_submissions": deleted_submissions,
                        "deleted_files": deleted_files,
                        "company_name": company.name
                    }
                })

        except Exception as e:
            return Response({
                "error": True,
                "message": f"Error deleting KYC documents: {str(e)}",
                "data": None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
