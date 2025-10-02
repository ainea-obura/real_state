from rest_framework import serializers
from documents.models import KYCDocument, KYCSubmission, Company
from accounts.models import Users


class KYCDocumentSerializer(serializers.ModelSerializer):
    """Serializer for KYC Document model"""

    document_type_display = serializers.CharField(
        source="get_document_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    file_size_mb = serializers.SerializerMethodField()
    reviewed_by_name = serializers.CharField(
        source="reviewed_by.get_full_name", read_only=True
    )
    rejected_by_name = serializers.CharField(
        source="rejected_by.get_full_name", read_only=True
    )

    # Director information
    is_director_document = serializers.SerializerMethodField()
    director_number = serializers.IntegerField(read_only=True)
    director_document_type = serializers.SerializerMethodField()

    class Meta:
        model = KYCDocument
        fields = [
            "id",
            "company",
            "kyc_submission",
            "document_type",
            "document_type_display",
            "document_file",
            "file_name",
            "file_size",
            "file_size_mb",
            "file_type",
            "status",
            "status_display",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "review_notes",
            "rejection_reason",
            "rejected_at",
            "rejected_by",
            "rejected_by_name",
            "resubmitted_at",
            "previous_version",
            "created_at",
            "updated_at",
            # Director fields
            "is_director_document",
            "director_number",
            "director_document_type",
            # Direct upload field
            "is_direct_upload",
        ]
        read_only_fields = [
            "id",
            "company",
            "kyc_submission",
            "file_name",
            "file_size",
            "file_size_mb",
            "file_type",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "rejected_at",
            "rejected_by",
            "rejected_by_name",
            "resubmitted_at",
            "previous_version",
            "created_at",
            "updated_at",
            "is_direct_upload",
        ]

    def get_file_size_mb(self, obj):
        """Convert file size to MB"""
        if obj.file_size:
            return round(obj.file_size / (1024 * 1024), 2)
        return 0

    def get_is_director_document(self, obj):
        """Check if this is a director document"""
        return obj.document_type.startswith("director_")

    def get_director_document_type(self, obj):
        """Get the type of director document (id_card_front, id_card_back, kra_pin)"""
        if obj.document_type.startswith("director_"):
            parts = obj.document_type.split("_")
            if len(parts) >= 4:
                return "_".join(parts[2:])  # id_card_front, id_card_back, kra_pin
        return None

    def to_representation(self, instance):
        """Custom representation to handle direct upload (no local file storage)"""
        try:
            data = super().to_representation(instance)
            
            # For direct upload, document_file is None but we still have metadata
            if instance.document_file is None and instance.file_name:
                # Create a placeholder URL or indicate direct upload
                data['document_file'] = f"direct_upload://{instance.file_name}"
                data['is_direct_upload'] = True
            else:
                data['is_direct_upload'] = False
                
            return data
        except Exception as e:
            # Fallback if serialization fails
            return {
                "id": str(instance.id),
                "document_type": instance.document_type,
                "file_name": instance.file_name or "Unknown",
                "file_size": instance.file_size or 0,
                "status": instance.status,
                "document_file": None,
                "is_direct_upload": True,
                "error": str(e)
            }

    def validate_document_file(self, value):
        """Validate file size and type"""
        if value:
            # Check file size (1MB limit)
            if value.size > 1024 * 1024:
                raise serializers.ValidationError("File size must be less than 1MB")

            # Check file type
            allowed_types = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
            if value.content_type not in allowed_types:
                raise serializers.ValidationError(
                    "Only PDF, JPG, and PNG files are allowed"
                )

        return value


class KYCUploadSerializer(serializers.Serializer):
    """Serializer for KYC file uploads - supports individual or all documents"""

    cr12 = serializers.FileField(required=False)
    proof_of_address = serializers.FileField(required=False)
    board_resolution = serializers.FileField(required=False)
    kra_pin = serializers.FileField(required=False)
    certificate_of_incorporation = serializers.FileField(required=False)
    bank_confirmation_letter = serializers.FileField(required=False)
    tax_compliance_certificate = serializers.FileField(required=False)

    # Director KYC documents - individual fields for better compatibility
    director_1_id_card_front = serializers.FileField(required=False)
    director_1_id_card_back = serializers.FileField(required=False)
    director_1_kra_pin = serializers.FileField(required=False)
    director_2_id_card_front = serializers.FileField(required=False)
    director_2_id_card_back = serializers.FileField(required=False)
    director_2_kra_pin = serializers.FileField(required=False)
    director_3_id_card_front = serializers.FileField(required=False)
    director_3_id_card_back = serializers.FileField(required=False)
    director_3_kra_pin = serializers.FileField(required=False)
    director_4_id_card_front = serializers.FileField(required=False)
    director_4_id_card_back = serializers.FileField(required=False)
    director_4_kra_pin = serializers.FileField(required=False)
    director_5_id_card_front = serializers.FileField(required=False)
    director_5_id_card_back = serializers.FileField(required=False)
    director_5_kra_pin = serializers.FileField(required=False)

    # Director KYC documents - dynamic array structure (for backward compatibility)
    directors = serializers.ListField(
        child=serializers.DictField(
            child=serializers.FileField(required=False), allow_empty=True
        ),
        required=False,
        help_text="Array of director documents. Each director should have: id_card_front, id_card_back, kra_pin",
    )

    def validate(self, data):
        """Validate that at least one document is provided and validate file types"""
        if not any(data.values()):
            raise serializers.ValidationError("At least one document must be provided")

        # Validate all file fields
        for field_name, value in data.items():
            if value and isinstance(value, list):
                # Handle directors array
                if field_name == "directors":
                    self._validate_directors_array(value)
            elif value and hasattr(value, "size"):
                # Handle individual file fields
                self._validate_file(value, field_name)

        return data

    def _validate_file(self, file, field_name):
        """Validate a single file"""
        # Check file size (1MB limit)
        if file.size > 1024 * 1024:
            raise serializers.ValidationError(
                f"{field_name.replace('_', ' ').title()}: File size must be less than 1MB"
            )

        # Check file type
        allowed_types = [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
        ]
        if file.content_type not in allowed_types:
            raise serializers.ValidationError(
                f"{field_name.replace('_', ' ').title()}: Only PDF, JPG, and PNG files are allowed"
            )

    def _validate_directors_array(self, directors):
        """Validate directors array"""
        for i, director in enumerate(directors):
            if not isinstance(director, dict):
                raise serializers.ValidationError(f"Director {i+1} must be an object")

            # Check if director has any documents
            has_documents = any(director.values())
            if not has_documents:
                continue  # Skip directors with no documents

            # Validate each director document
            for doc_type, file in director.items():
                if file:
                    self._validate_file(file, f"Director {i+1} {doc_type}")


class KYCDocumentUpdateSerializer(serializers.Serializer):
    """Serializer for updating a single KYC document"""

    document_file = serializers.FileField(required=True)

    def validate_document_file(self, value):
        """Validate file size and type"""
        if value:
            # Check file size (1MB limit)
            if value.size > 1024 * 1024:
                raise serializers.ValidationError("File size must be less than 1MB")

            # Check file type
            allowed_types = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
            if value.content_type not in allowed_types:
                raise serializers.ValidationError(
                    "Only PDF, JPG, and PNG files are allowed"
                )

        return value


class KYCCompanyDocumentsSerializer(serializers.ModelSerializer):
    """Serializer for company KYC documents with submission details"""

    # Submission details - use SerializerMethodField to handle None case
    submission_status = serializers.SerializerMethodField()
    submission_status_display = serializers.SerializerMethodField()
    submission_created_at = serializers.SerializerMethodField()
    submission_updated_at = serializers.SerializerMethodField()

    # Document counts - use SerializerMethodField to handle None case
    documents_count = serializers.SerializerMethodField()
    required_documents_count = serializers.SerializerMethodField()
    approved_documents_count = serializers.SerializerMethodField()
    rejected_documents_count = serializers.SerializerMethodField()
    pending_documents_count = serializers.SerializerMethodField()
    under_review_documents_count = serializers.SerializerMethodField()
    is_complete = serializers.SerializerMethodField()

    # All 7 KYC documents as objects
    cr12_document = serializers.SerializerMethodField()
    proof_of_address_document = serializers.SerializerMethodField()
    board_resolution_document = serializers.SerializerMethodField()
    kra_pin_document = serializers.SerializerMethodField()
    certificate_of_incorporation_document = serializers.SerializerMethodField()
    bank_confirmation_letter_document = serializers.SerializerMethodField()
    tax_compliance_certificate_document = serializers.SerializerMethodField()

    # Director KYC documents - dynamic array structure
    directors = serializers.SerializerMethodField()

    # All KYC documents as a flat list (including director documents)
    all_documents = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            # Submission details
            "submission_status",
            "submission_status_display",
            "submission_created_at",
            "submission_updated_at",
            # Document counts
            "documents_count",
            "required_documents_count",
            "approved_documents_count",
            "rejected_documents_count",
            "pending_documents_count",
            "under_review_documents_count",
            "is_complete",
            # Individual documents
            "cr12_document",
            "proof_of_address_document",
            "board_resolution_document",
            "kra_pin_document",
            "certificate_of_incorporation_document",
            "bank_confirmation_letter_document",
            "tax_compliance_certificate_document",
            # Director documents
            "directors",
            # All documents flat list
            "all_documents",
        ]

    def get_submission_status(self, obj):
        """Get submission status with None handling"""
        if hasattr(obj, "kyc_submission") and obj.kyc_submission:
            return obj.kyc_submission.status
        return "draft"

    def get_submission_status_display(self, obj):
        """Get submission status display with None handling"""
        if hasattr(obj, "kyc_submission") and obj.kyc_submission:
            return obj.kyc_submission.get_status_display()
        return "Draft"

    def get_submission_created_at(self, obj):
        """Get submission created at with None handling"""
        if hasattr(obj, "kyc_submission") and obj.kyc_submission:
            return obj.kyc_submission.created_at
        return None

    def get_submission_updated_at(self, obj):
        """Get submission updated at with None handling"""
        if hasattr(obj, "kyc_submission") and obj.kyc_submission:
            return obj.kyc_submission.updated_at
        return None

    def get_documents_count(self, obj):
        """Get documents count with None handling"""
        if hasattr(obj, "kyc_submission") and obj.kyc_submission:
            return obj.kyc_submission.documents_count
        return 0

    def get_required_documents_count(self, obj):
        """Get required documents count with None handling"""
        if hasattr(obj, "kyc_submission") and obj.kyc_submission:
            return obj.kyc_submission.required_documents_count
        return 7  # Total number of required KYC documents

    def get_approved_documents_count(self, obj):
        """Get approved documents count with None handling"""
        if hasattr(obj, "kyc_submission") and obj.kyc_submission:
            return obj.kyc_submission.approved_documents_count
        return 0

    def get_rejected_documents_count(self, obj):
        """Get rejected documents count with None handling"""
        if hasattr(obj, "kyc_submission") and obj.kyc_submission:
            return obj.kyc_submission.rejected_documents_count
        return 0

    def get_pending_documents_count(self, obj):
        """Get pending documents count with None handling"""
        if hasattr(obj, "kyc_submission") and obj.kyc_submission:
            return obj.kyc_submission.pending_documents_count
        return 0

    def get_under_review_documents_count(self, obj):
        """Get under review documents count with None handling"""
        if hasattr(obj, "kyc_submission") and obj.kyc_submission:
            return obj.kyc_submission.under_review_documents_count
        return 0

    def get_is_complete(self, obj):
        """Get completion status with None handling"""
        if hasattr(obj, "kyc_submission") and obj.kyc_submission:
            return obj.kyc_submission.is_complete
        return False

    def get_cr12_document(self, obj):
        """Get CR12 document details"""
        try:
            document = obj.kyc_documents.get(document_type="cr12")
            return KYCDocumentSerializer(document).data
        except KYCDocument.DoesNotExist:
            return None

    def get_proof_of_address_document(self, obj):
        """Get Proof of Address document details"""
        try:
            document = obj.kyc_documents.get(document_type="proof_of_address")
            return KYCDocumentSerializer(document).data
        except KYCDocument.DoesNotExist:
            return None

    def get_board_resolution_document(self, obj):
        """Get Board Resolution document details"""
        try:
            document = obj.kyc_documents.get(document_type="board_resolution")
            return KYCDocumentSerializer(document).data
        except KYCDocument.DoesNotExist:
            return None

    def get_kra_pin_document(self, obj):
        """Get KRA PIN document details"""
        try:
            document = obj.kyc_documents.get(document_type="kra_pin")
            return KYCDocumentSerializer(document).data
        except KYCDocument.DoesNotExist:
            return None

    def get_certificate_of_incorporation_document(self, obj):
        """Get Certificate of Incorporation document details"""
        try:
            document = obj.kyc_documents.get(
                document_type="certificate_of_incorporation"
            )
            return KYCDocumentSerializer(document).data
        except KYCDocument.DoesNotExist:
            return None

    def get_bank_confirmation_letter_document(self, obj):
        """Get Bank Confirmation Letter document details"""
        try:
            document = obj.kyc_documents.get(document_type="bank_confirmation_letter")
            return KYCDocumentSerializer(document).data
        except KYCDocument.DoesNotExist:
            return None

    def get_tax_compliance_certificate_document(self, obj):
        """Get Tax Compliance Certificate document details"""
        try:
            document = obj.kyc_documents.get(document_type="tax_compliance_certificate")
            return KYCDocumentSerializer(document).data
        except KYCDocument.DoesNotExist:
            return None

    # Director KYC document getter methods
    def get_directors(self, obj):
        """Get all director documents for a company, organized by director"""
        directors_data = {}

        # Get all director documents
        director_documents = obj.kyc_documents.filter(
            document_type__startswith="director_"
        ).select_related()

        for doc in director_documents:
            if doc.director_number:
                director_key = f"director_{doc.director_number}"

                if director_key not in directors_data:
                    directors_data[director_key] = {
                        "director_number": doc.director_number,
                        "id_card_front": None,
                        "id_card_back": None,
                        "kra_pin": None,
                        "documents": [],
                    }

                # Add the document to the director's documents list
                directors_data[director_key]["documents"].append(
                    KYCDocumentSerializer(doc).data
                )

                # Map specific document types
                if "id_card_front" in doc.document_type:
                    directors_data[director_key]["id_card_front"] = (
                        KYCDocumentSerializer(doc).data
                    )
                elif "id_card_back" in doc.document_type:
                    directors_data[director_key]["id_card_back"] = (
                        KYCDocumentSerializer(doc).data
                    )
                elif "kra_pin" in doc.document_type:
                    directors_data[director_key]["kra_pin"] = KYCDocumentSerializer(
                        doc
                    ).data

        # Convert to list and sort by director number
        result = list(directors_data.values())
        result.sort(key=lambda x: x["director_number"])

        return result

    def get_all_documents(self, obj):
        """Get all KYC documents as a flat list including director documents"""
        all_docs = []

        # Get all KYC documents
        kyc_documents = obj.kyc_documents.all().select_related()

        for doc in kyc_documents:
            doc_data = KYCDocumentSerializer(doc).data

            # Add director information for director documents
            if doc.document_type.startswith("director_"):
                doc_data["is_director_document"] = True
                doc_data["director_number"] = doc.director_number

                # Extract document type (id_card_front, id_card_back, kra_pin)
                parts = doc.document_type.split("_")
                if len(parts) >= 4:
                    doc_data["director_document_type"] = "_".join(parts[2:])

                # Create a friendly display name
                if doc.director_number:
                    doc_data["display_name"] = (
                        f"Director {doc.director_number} - {doc.get_document_type_display()}"
                    )
                else:
                    doc_data["display_name"] = doc.get_document_type_display()
            else:
                doc_data["is_director_document"] = False
                doc_data["display_name"] = doc.get_document_type_display()

            all_docs.append(doc_data)

        # Sort by creation date (newest first)
        all_docs.sort(key=lambda x: x["created_at"], reverse=True)

        return all_docs
