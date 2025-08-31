from django.shortcuts import get_object_or_404
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
import mimetypes

from utils.get_sassa_pay_token import token

from documents.models import KYCDocument, KYCSubmission
from company.models import Company, BusinessOnboarding
from accounts.models import Users
from utils.payments import submit_kyc_to_sasapay
from .serializers import (
    KYCUploadSerializer,
    KYCDocumentUpdateSerializer,
    KYCCompanyDocumentsSerializer,
)


class KYCUploadView(APIView):
    """Create/Upload KYC documents for a company"""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, company_id):
        """Upload KYC documents for a company"""
        company = get_object_or_404(Company, id=company_id)

        # Get or create KYC submission for the company
        submission, created = KYCSubmission.objects.get_or_create(
            company=company, defaults={"status": "draft"}
        )

        serializer = KYCUploadSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # Create or update documents for each file
                document_mapping = {
                    "cr12": "cr12",
                    "proof_of_address": "proof_of_address",
                    "board_resolution": "board_resolution",
                    "kra_pin": "kra_pin",
                    "certificate_of_incorporation": "certificate_of_incorporation",
                    "bank_confirmation_letter": "bank_confirmation_letter",
                    "tax_compliance_certificate": "tax_compliance_certificate",
                }

                # Process company documents
                for field_name, document_type in document_mapping.items():
                    if field_name in request.FILES:
                        file = request.FILES[field_name]
                        self._process_document(company, submission, document_type, file)

                # Process director documents
                # Handle both directors array and individual director fields
                directors_data = request.data.get("directors", [])

                # Also check for individual director fields (director_1_id_card_front, etc.)
                for key, file in request.FILES.items():
                    if key.startswith("director_"):
                        # Extract director number and document type from key
                        # e.g., "director_1_id_card_front" -> director_num=1, doc_type="id_card_front"
                        parts = key.split("_")
                        if len(parts) >= 4:
                            director_num = parts[1]
                            doc_type = "_".join(
                                parts[2:]
                            )  # id_card_front, id_card_back, kra_pin
                            document_type = f"director_{director_num}_{doc_type}"
                            self._process_document(
                                company, submission, document_type, file
                            )

                # Update submission status
                submission.status = "submitted"
                submission.save()

                # Return company documents with submission details
                company_serializer = KYCCompanyDocumentsSerializer(company)
                return Response({"data": company_serializer.data})

            except Exception as e:
                return Response(
                    {"message": f"Error uploading documents: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _process_document(self, company, submission, document_type, file):
        """Helper method to process a single document file."""
        try:
            # Get content type from file extension
            file_extension = file.name.split(".")[-1].lower()
            content_type = (
                mimetypes.guess_type(f"file.{file_extension}")[0]
                or "application/octet-stream"
            )

            # Extract director number for director documents
            director_number = None
            if document_type.startswith("director_"):
                try:
                    parts = document_type.split("_")
                    if len(parts) >= 2:
                        director_number = int(parts[1])
                except (ValueError, IndexError) as e:
                    pass

            # Check if document already exists
            try:
                existing_document = KYCDocument.objects.get(
                    company=company, document_type=document_type
                )
                # Delete the old file if it exists
                if existing_document.document_file:
                    try:
                        existing_document.document_file.delete(save=False)
                    except Exception as e:
                        # Log the error but continue with the update
                        pass

                # Update existing document
                existing_document.document_file = file
                existing_document.kyc_submission = submission
                existing_document.status = "pending"
                existing_document.file_name = file.name.split("/")[-1]
                existing_document.file_size = file.size
                existing_document.file_type = content_type
                if director_number:
                    existing_document.director_number = director_number
                existing_document.save()
                document = existing_document
            except KYCDocument.DoesNotExist:
                # Create new document
                document = KYCDocument.objects.create(
                    company=company,
                    document_type=document_type,
                    document_file=file,
                    kyc_submission=submission,
                    status="pending",
                    file_name=file.name.split("/")[-1],
                    file_size=file.size,
                    file_type=content_type,
                    director_number=director_number,
                )
        except Exception as e:
            pass


class KYCDocumentUpdateView(APIView):
    """Update a single KYC document (replace the original file)"""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def put(self, request, document_id):
        """Update a single KYC document"""
        document = get_object_or_404(KYCDocument, id=document_id)

        serializer = KYCDocumentUpdateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                file = serializer.validated_data["document_file"]

                # Get content type from file extension
                file_extension = file.name.split(".")[-1].lower()
                content_type = (
                    mimetypes.guess_type(f"file.{file_extension}")[0]
                    or "application/octet-stream"
                )

                # Delete the old file if it exists
                if document.document_file:
                    try:
                        document.document_file.delete(save=False)
                    except Exception as e:
                        # Log the error but continue with the update
                        pass

                # Update the document file and details
                document.document_file = file
                document.status = "pending"  # Reset status to pending
                document.file_name = file.name.split("/")[-1]
                document.file_size = file.size
                document.file_type = content_type
                document.save()

                # Update submission status
                if document.kyc_submission:
                    document.kyc_submission.update_overall_status()

                # Return updated document
                from .serializers import KYCDocumentSerializer

                document_serializer = KYCDocumentSerializer(document)
                return Response({"data": document_serializer.data})

            except Exception as e:
                return Response(
                    {"message": f"Error updating document: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class KYCCompanyDocumentsView(APIView):
    """Get list of KYC documents for a company with submission details"""

    permission_classes = [IsAuthenticated]

    def get(self, request, company_id):
        """Get KYC documents for a company with submission details"""
        company = get_object_or_404(Company, id=company_id)

        serializer = KYCCompanyDocumentsSerializer(company)
        return Response({"data": serializer.data})


class KYCSasaPaySubmissionView(APIView):
    """
    Submit KYC documents to SasaPay for business onboarding

    IMPORTANT: SasaPay API only accepts JPG or PNG image files.
    PDF files are NOT supported and will cause the submission to fail.

    Required documents:
    - Company: 7 documents (CR12, Proof of Address, Board Resolution, KRA PIN,
               Certificate of Incorporation, Bank Confirmation Letter, Tax Compliance Certificate)
    - Directors: At least 1 director with ID Card Front, ID Card Back, and KRA PIN

    All documents must be JPG or PNG format.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, company_id):
        """Submit KYC to SasaPay"""
        company = get_object_or_404(Company, id=company_id)

        # Get business onboarding data to get merchant code
        try:
            business_onboarding = company.business_onboardings.first()
            if not business_onboarding or not business_onboarding.merchantCode:
                return Response(
                    {
                        "error": True,
                        "message": "Company not onboarded with SasaPay. Please complete business onboarding first.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            merchant_code = business_onboarding.merchantCode
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": "Company not onboarded with SasaPay. Please complete business onboarding first.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get all KYC documents for this company
        kyc_documents = company.kyc_documents.all()

        # Get company documents
        company_docs = kyc_documents.exclude(document_type__startswith="director_")

        # Get director documents
        director_docs = kyc_documents.filter(document_type__startswith="director_")

        # Check if we have minimum required documents (7 company + 3 director = 10)
        if company_docs.count() < 7:
            return Response(
                {"message": "Insufficient company KYC documents. Need at least 7."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if director_docs.count() < 3:
            return Response(
                {"message": "Insufficient director KYC documents. Need at least 3."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Extract company documents for API
        company_document_files = {}
        document_mapping = {
            "kra_pin": "businessKraPin",
            "certificate_of_incorporation": "businessRegistrationCertificate",
            "board_resolution": "boardResolution",
            "proof_of_address": "proofOfAddressDocument",
            "bank_confirmation_letter": "proofOfBankDocument",
            "cr12": "cr12Document",
            "tax_compliance_certificate": "taxComplianceCertificate",
        }

        missing_documents = []
        invalid_files = []
        for doc_type, api_field in document_mapping.items():
            try:
                doc = company_docs.get(document_type=doc_type)
                if doc and doc.document_file:
                    # Validate file type (must be JPG or PNG)
                    file_name = doc.document_file.name.lower()
                    if not (
                        file_name.endswith(".jpg")
                        or file_name.endswith(".jpeg")
                        or file_name.endswith(".png")
                    ):
                        invalid_files.append(f"{doc_type} (must be JPG/PNG)")
                        continue

                    # Use the original file object directly to prevent WAF blocking
                    # This preserves file metadata and prevents corruption
                    try:
                        company_document_files[api_field] = doc.document_file
                    except Exception as file_error:
                        return Response(
                            {
                                "error": True,
                                "message": f"Error accessing file {doc_type}: {str(file_error)}",
                                "file_path": doc.document_file.name,
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                else:
                    missing_documents.append(doc_type)
            except KYCDocument.DoesNotExist:
                missing_documents.append(doc_type)

        # Check for invalid file types
        if invalid_files:
            return Response(
                {
                    "error": True,
                    "message": f"The following documents must be JPG or PNG format (PDF files are not accepted by SasaPay): {', '.join(invalid_files)}. Please convert these documents to JPG or PNG and re-upload.",
                    "invalid_documents": invalid_files,
                    "required_format": "JPG or PNG only (no PDF files)",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if we have all required company documents
        if missing_documents:
            return Response(
                {
                    "error": True,
                    "message": f"Missing required company documents: {', '.join(missing_documents)}",
                    "missing_documents": missing_documents,
                    "required_documents": list(document_mapping.keys()),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the actual directors data from BusinessOnboarding
        try:
            # Get from BusinessOnboarding (this is the correct model)
            business_onboarding = company.business_onboardings.first()

            if business_onboarding and business_onboarding.directors:
                # Get the actual directors from the onboarding data
                actual_directors = business_onboarding.directors
                if not isinstance(actual_directors, list):
                    actual_directors = []
                print(f"Found directors in BusinessOnboarding: {len(actual_directors)}")
            else:
                actual_directors = []
                print("No directors found in BusinessOnboarding")

        except Exception as e:
            print(f"Error getting director data: {e}")
            actual_directors = []
            business_onboarding = None

        print(f"=== DIRECTOR DATA TRACING ===")
        print(f"Business Onboarding found: {business_onboarding is not None}")
        if business_onboarding:
            print(f"Business Onboarding ID: {business_onboarding.id}")
            print(f"Directors field: {business_onboarding.directors}")
            print(f"Directors type: {type(business_onboarding.directors)}")
            if business_onboarding.directors:
                print(f"Directors content: {business_onboarding.directors}")

                # Show each director's data structure
                for i, director in enumerate(actual_directors):
                    print(f"  Director {i}: {director}")
                    if isinstance(director, dict):
                        print(f"    Keys: {list(director.keys())}")
                        if "directorKraPin" in director:
                            print(f"    Director KRA PIN: {director['directorKraPin']}")
                        if "directorName" in director:
                            print(f"    Director Name: {director['directorName']}")
                        if "director_number" in director:
                            print(f"    Director Number: {director['director_number']}")
                        elif "directorNumber" in director:
                            print(f"    Director Number: {director['directorNumber']}")

        # Check if there are other director-related models
        print(f"Company name: {company.name}")
        print(f"Company ID: {company.id}")

        # Check if company has any director-related fields
        company_fields = [field.name for field in company._meta.fields]
        print(f"Company fields: {company_fields}")

        # Check if there are any related director models
        try:
            # Look for any director-related models that might be related to company
            from django.apps import apps

            all_models = apps.get_models()
            director_models = [
                model.__name__
                for model in all_models
                if "director" in model.__name__.lower()
            ]
            print(f"Available director models: {director_models}")
        except Exception as e:
            print(f"Error checking models: {e}")

        # Extract director documents for API
        directors_kyc = []

        # Get all director numbers that have documents
        raw_director_numbers = list(
            director_docs.values_list("director_number", flat=True)
        )
        print(f"Raw director numbers from query: {raw_director_numbers}")

        director_numbers_with_docs = director_docs.values_list(
            "director_number", flat=True
        ).distinct()

        if not director_numbers_with_docs:
            return Response(
                {"error": True, "message": "No director documents found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Convert to list and remove duplicates (extra safety)
        director_numbers_with_docs = list(set(director_numbers_with_docs))

        print(f"After distinct(): {list(director_numbers_with_docs)}")
        print(f"After set(): {director_numbers_with_docs}")

        for director_num in director_numbers_with_docs:
            if director_num is None:
                continue

            print(f"Processing director number: {director_num}")

            # Try to get director data from submission/onboarding
            director_onboarding_data = None
            if actual_directors:
                # If we have directors but no director numbers, use the first director
                # (since your data shows directors without director_number field)
                if len(actual_directors) > 0 and director_num == 1:
                    director_onboarding_data = actual_directors[0]
                    print(
                        f"  Using first director (no director_number field): {director_onboarding_data}"
                    )
                else:
                    # Try to match by director_number if it exists
                    for director in actual_directors:
                        if director.get("director_number") == director_num:
                            director_onboarding_data = director
                            print(
                                f"  Found director data by director_number: {director}"
                            )
                            break
                        # Also check if director_number is stored as string
                        elif str(director.get("director_number")) == str(director_num):
                            director_onboarding_data = director
                            print(
                                f"  Found director data by director_number (string match): {director}"
                            )
                            break

            director_docs_for_num = director_docs.filter(director_number=director_num)
            print(
                f"  Found {director_docs_for_num.count()} documents for director {director_num}"
            )

            # Debug: Show what document types we found
            doc_types = list(
                director_docs_for_num.values_list("document_type", flat=True)
            )
            print(f"    Document types found: {doc_types}")

            # Get KRA PIN number from onboarding data or use default
            if director_onboarding_data and director_onboarding_data.get(
                "directorKraPin"
            ):
                director_kra_pin_number = director_onboarding_data.get("directorKraPin")
                print(f"  Using KRA PIN from onboarding: {director_kra_pin_number}")
            else:
                # Use default KRA PIN if not found in onboarding data
                director_kra_pin_number = f"DIRECTOR_{director_num}_KRA_PIN"
                print(f"  Using default KRA PIN: {director_kra_pin_number}")
                print(f"  Director onboarding data: {director_onboarding_data}")

            director_kyc_data = {
                "directorKraPinNumber": director_kra_pin_number,
                "directorIdCardFront": None,
                "directorIdCardBack": None,
                "directorKraPin": None,
            }

            # Map director documents
            for doc in director_docs_for_num:
                print(f"    Processing document: {doc.document_type}")

                # Validate file type (must be JPG or PNG)
                file_name = doc.document_file.name.lower()
                if not (
                    file_name.endswith(".jpg")
                    or file_name.endswith(".jpeg")
                    or file_name.endswith(".png")
                ):
                    print(f"      Skipping {doc.document_type} - not JPG/PNG")
                    continue

                # Read the actual file content from Minio
                try:
                    # Send the original file object directly instead of reading and recreating
                    # This prevents file metadata corruption and WAF blocking
                    if "id_card_front" in doc.document_type:
                        director_kyc_data["directorIdCardFront"] = doc.document_file
                        print(f"      Set ID Card Front (original file)")
                    elif "id_card_back" in doc.document_type:
                        director_kyc_data["directorIdCardBack"] = doc.document_file
                        print(f"      Set ID Card Back (original file)")
                    elif "kra_pin" in doc.document_type:
                        director_kyc_data["directorKraPin"] = doc.document_file
                        print(f"      Set KRA PIN Document (original file)")
                except Exception as e:
                    print(f"      Error setting file for {doc.document_type}: {str(e)}")
                    continue

            # Only add if we have at least some documents
            has_documents = any(
                v is not None
                for v in director_kyc_data.values()
                if v != director_kra_pin_number
            )

            if has_documents:
                directors_kyc.append(director_kyc_data)
                print(f"  Added director {director_num} to submission")
            else:
                print(f"  Skipping director {director_num} - no valid documents")

        # Debug: Log what directors we found
        print(f"Found {len(directors_kyc)} directors with valid documents:")
        for i, director in enumerate(directors_kyc):
            print(f"  Director {i+1}: KRA PIN = {director.get('directorKraPinNumber')}")
            print(
                f"    - ID Card Front: {'Yes' if director.get('directorIdCardFront') else 'No'}"
            )
            print(
                f"    - ID Card Back: {'Yes' if director.get('directorIdCardBack') else 'No'}"
            )
            print(
                f"    - KRA PIN Doc: {'Yes' if director.get('directorKraPin') else 'No'}"
            )

        # Validate we have at least one director with documents
        if not directors_kyc:
            return Response(
                {"error": True, "message": "No valid director KYC documents found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate each director has minimum required documents
        incomplete_directors = []
        for i, director in enumerate(directors_kyc):
            missing_docs = []
            if not director.get("directorIdCardFront"):
                missing_docs.append("ID Card Front")
            if not director.get("directorIdCardBack"):
                missing_docs.append("ID Card Back")
            if not director.get("directorKraPin"):
                missing_docs.append("KRA PIN")

            if missing_docs:
                incomplete_directors.append(
                    f"Director {i+1}: {', '.join(missing_docs)}"
                )

        if incomplete_directors:
            return Response(
                {
                    "error": True,
                    "message": f"Incomplete director documents: {'; '.join(incomplete_directors)}",
                    "incomplete_directors": incomplete_directors,
                    "required_per_director": [
                        "ID Card Front",
                        "ID Card Back",
                        "KRA PIN",
                    ],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        get_token = token()
        if get_token:
            print("=== KYC SUBMISSION DEBUG ===")
            print(f"Company: {company.name}")
            print(f"Merchant Code: {merchant_code}")
            print(f"Request ID: {company.id}")
            print(f"Company Documents: {list(company_document_files.keys())}")
            print(f"Directors to submit: {len(directors_kyc)}")

            print(f"Token for api test {get_token} ")
            # Debug: Show file objects being sent
            print(f"=== FILE OBJECTS DEBUG ===")
            for key, file_obj in company_document_files.items():
                if file_obj:
                    print(
                        f"Company {key}: {type(file_obj)} - {file_obj.name if hasattr(file_obj, 'name') else 'No name'}"
                    )
                else:
                    print(f"Company {key}: None")

            for i, director in enumerate(directors_kyc):
                print(f"Director {i} files:")
                for key, file_obj in director.items():
                    if key != "directorKraPinNumber" and file_obj:
                        print(
                            f"  {key}: {type(file_obj)} - {file_obj.name if hasattr(file_obj, 'name') else 'No name'}"
                        )
                    elif key == "directorKraPinNumber":
                        print(f"  {key}: {file_obj}")

            # Call SasaPay API with actual file objects
            api_response = submit_kyc_to_sasapay(
                token=get_token,
                merchantCode=merchant_code,
                requestId=str(company.id),
                businessKraPin=company_document_files.get("businessKraPin"),
                businessRegistrationCertificate=company_document_files.get(
                    "businessRegistrationCertificate"
                ),
                boardResolution=company_document_files.get("boardResolution"),
                proofOfAddressDocument=company_document_files.get(
                    "proofOfAddressDocument"
                ),
                proofOfBankDocument=company_document_files.get("proofOfBankDocument"),
                cr12Document=company_document_files.get("cr12Document"),
                taxComplianceCertificate=company_document_files.get(
                    "taxComplianceCertificate"
                ),
                directorsKyc=directors_kyc,
            )
            # Validate that we got a proper response
            if api_response is None:
                return Response(
                    {
                        "error": True,
                        "message": "SasaPay API returned no response. This is a system error.",
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Check if API call was successful
            if api_response.get("responseCode") == "0":
                return Response(
                    {
                        "error": False,
                        "message": "KYC documents submitted to SasaPay successfully",
                        "data": api_response,
                        "submission_summary": {
                            "company_documents_submitted": len(company_document_files),
                            "directors_submitted": len(directors_kyc),
                            "total_documents": len(company_document_files)
                            + (len(directors_kyc) * 3),
                            "merchant_code": merchant_code,
                            "request_id": str(company.id),
                        },
                    },
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(
                    {
                        "error": True,
                        "message": f"SasaPay API error: {api_response.get('message', 'Unknown error')}",
                        "data": api_response,
                        "troubleshooting": {
                            "check_merchant_code": merchant_code,
                            "check_request_id": str(company.id),
                            "check_document_count": len(company_document_files),
                            "check_director_count": len(directors_kyc),
                            "api_response_code": api_response.get("responseCode"),
                            "suggestion": "Verify all documents are JPG/PNG format and try again",
                        },
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        else:
            return Response(
                {
                    "error": True,
                    "message": "Failed to get SasaPay authentication token. Please check your SasaPay credentials.",
                    "troubleshooting": {
                        "check_environment": "Verify CLIENT_ID and CLIENT_SECRET are set",
                        "check_network": "Verify internet connection to SasaPay",
                        "check_credentials": "Verify SasaPay credentials are valid",
                    },
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Final safety check - this should never be reached
        return Response(
            {
                "error": True,
                "message": "Unexpected error in KYC submission view. Please try again.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
