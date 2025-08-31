from rest_framework import serializers
from .models import ContractTemplate, TemplateVariable


class ContractTemplateSerializer(serializers.ModelSerializer):
    created_by = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = ContractTemplate
        fields = [
            "id",
            "template_title",
            "template_description",
            "template_type",
            "template_content",
            "available_variables",
            "is_active",
            "is_default",
            "version_number",
            "created_by",
            "created_at",
            "updated_at",
        ]


class DocumentVariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateVariable
        fields = [
            "variable_name",
            "display_name",
            "category",
            "data_type",
            "is_required",
            "description",
        ]


class ContractTemplateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractTemplate
        fields = [
            "template_title",
            "template_description",
            "template_type",
            "template_content",
            "available_variables",
            "is_active",
            "is_default",
        ]
