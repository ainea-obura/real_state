from django.urls import path
from .views import (
    KYCUploadView,
    KYCDocumentUpdateView,
    KYCCompanyDocumentsView,
    KYCSasaPaySubmissionView,
)

app_name = "kyc_documents"

urlpatterns = [
    # Upload KYC documents for a company
    path(
        "companies/<uuid:company_id>/upload/",
        KYCUploadView.as_view(),
        name="kyc-upload",
    ),
    # Update a single KYC document
    path(
        "documents/<uuid:document_id>/update/",
        KYCDocumentUpdateView.as_view(),
        name="document-update",
    ),
    # Get KYC documents for a company with submission details
    path(
        "companies/<uuid:company_id>/documents/",
        KYCCompanyDocumentsView.as_view(),
        name="company-documents",
    ),
    # Submit KYC to SasaPay
    path(
        "companies/<uuid:company_id>/submit-to-sasapay/",
        KYCSasaPaySubmissionView.as_view(),
        name="submit-to-sasapay",
    ),
]
