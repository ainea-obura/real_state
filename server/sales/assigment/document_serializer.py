from rest_framework import serializers
from documents.models import ContractTemplate


class DocumentTemplateListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing document templates"""

    name = serializers.CharField(source="template_title", read_only=True)

    class Meta:
        model = ContractTemplate
        fields = [
            "id",
            "name",
        ]
        read_only_fields = fields
