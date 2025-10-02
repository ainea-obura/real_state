from django.urls import path
from .views import (
    KYCUploadView,
    KYCDocumentUpdateView,
    KYCCompanyDocumentsView,
    KYCSasaPaySubmissionView,
)
from .clear_kyc_view import ClearKYCDocumentsView
from .debug_kyc_view import DebugKYCView

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
    # Clear all KYC documents for a company
    path(
        "companies/<uuid:company_id>/clear-documents/",
        ClearKYCDocumentsView.as_view(),
        name="clear-kyc-documents",
    ),
    # Debug KYC documents
    path(
        "companies/<uuid:company_id>/debug/",
        DebugKYCView.as_view(),
        name="debug-kyc-documents",
    ),
]
