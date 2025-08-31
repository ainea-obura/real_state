from django.contrib import admin
from documents.models import (
    ContractTemplate,
    TemplateVariable,
    TenantAgreement,
    KYCDocument,
    KYCSubmission,
)

# Register your models here.


@admin.register(ContractTemplate)
class ContractTemplateAdmin(admin.ModelAdmin):
    list_display = [
        "template_title",
        "template_type",
        "is_active",
        "is_default",
        "version_number",
        "created_by",
    ]
    list_filter = ["template_type", "is_active", "is_default", "created_at"]
    search_fields = ["template_title", "template_description"]
    readonly_fields = ["version_number", "created_at", "updated_at"]
    fieldsets = (
        (
            "Basic Information",
            {"fields": ("template_title", "template_description", "template_type")},
        ),
        ("Content", {"fields": ("template_content", "available_variables")}),
        ("Settings", {"fields": ("is_active", "is_default")}),
        (
            "Metadata",
            {
                "fields": ("version_number", "created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )


@admin.register(TemplateVariable)
class TemplateVariableAdmin(admin.ModelAdmin):
    list_display = [
        "display_name",
        "variable_name",
        "category",
        "data_type",
        "is_required",
        "is_active",
    ]
    list_filter = ["category", "data_type", "is_required", "is_active"]
    search_fields = ["display_name", "variable_name", "description"]
    readonly_fields = ["created_at", "updated_at"]
    fieldsets = (
        (
            "Basic Information",
            {"fields": ("display_name", "variable_name", "category", "data_type")},
        ),
        ("Details", {"fields": ("description", "placeholder_text", "default_value")}),
        ("Settings", {"fields": ("is_required", "is_active")}),
        (
            "Metadata",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(TenantAgreement)
class TenantAgreementAdmin(admin.ModelAdmin):
    list_display = [
        "tenant_name",
        "template_title_snapshot",
        "status",
        "created_by",
        "created_at",
    ]
    list_filter = ["status", "created_at", "template"]
    search_fields = ["tenant_name__name", "template_title_snapshot"]
    readonly_fields = [
        "template_title_snapshot",
        "template_version",
        "original_template_content",
        "generated_content",
        "created_at",
        "updated_at",
    ]
    fieldsets = (
        (
            "Basic Information",
            {"fields": ("template", "tenant_name", "property_tenant", "status")},
        ),
        (
            "Content",
            {
                "fields": (
                    "variable_values",
                    "original_template_content",
                    "generated_content",
                ),
                "classes": ("collapse",),
            },
        ),
        ("Document", {"fields": ("document_file",)}),
        (
            "Metadata",
            {
                "fields": (
                    "template_title_snapshot",
                    "template_version",
                    "created_by",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )


@admin.register(KYCDocument)
class KYCDocumentAdmin(admin.ModelAdmin):
    list_display = [
        "company",
        "document_type",
        "status",
        "file_size_mb",
        "created_at",
    ]
    list_filter = [
        "document_type",
        "status",
        "created_at",
    ]
    search_fields = ["company__name", "file_name"]
    readonly_fields = [
        "id",
        "file_name",
        "file_size",
        "file_size_mb",
        "file_type",
        "created_at",
        "updated_at",
    ]
    fieldsets = (
        (
            "Basic Information",
            {"fields": ("company", "document_type", "status")},
        ),
        (
            "File Information",
            {"fields": ("document_file", "file_name", "file_size_mb", "file_type")},
        ),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("company")

    def file_size_mb(self, obj):
        """Display file size in MB"""
        if obj.file_size:
            return f"{obj.file_size / (1024 * 1024):.2f} MB"
        return "0 MB"

    file_size_mb.short_description = "File Size"


@admin.register(KYCSubmission)
class KYCSubmissionAdmin(admin.ModelAdmin):
    list_display = [
        "company",
        "status",
        "documents_count_html",
        "is_complete_html",
        "created_at",
    ]
    list_filter = ["status", "created_at"]
    search_fields = ["company__name"]
    readonly_fields = [
        "id",
        "documents_count",
        "required_documents_count",
        "approved_documents_count",
        "rejected_documents_count",
        "pending_documents_count",
        "under_review_documents_count",
        "is_complete",
        "created_at",
        "updated_at",
    ]
    fieldsets = (
        ("Basic Information", {"fields": ("company", "status")}),
        (
            "Document Statistics",
            {
                "fields": (
                    "documents_count",
                    "required_documents_count",
                    "approved_documents_count",
                    "rejected_documents_count",
                    "pending_documents_count",
                    "under_review_documents_count",
                    "is_complete",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("company")

    def documents_count_html(self, obj):
        """Display documents count with color coding"""
        count = obj.documents_count
        required = obj.required_documents_count
        if count == required:
            return f'<span style="color: green;">{count}/{required}</span>'
        elif count > 0:
            return f'<span style="color: orange;">{count}/{required}</span>'
        else:
            return f'<span style="color: red;">{count}/{required}</span>'

    documents_count_html.short_description = "Documents"
    documents_count_html.allow_tags = True

    def is_complete_html(self, obj):
        """Display completion status with color coding"""
        if obj.is_complete:
            return '<span style="color: green;">✓ Complete</span>'
        else:
            return '<span style="color: red;">✗ Incomplete</span>'

    is_complete_html.short_description = "Complete"
    is_complete_html.allow_tags = True
