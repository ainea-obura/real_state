from rest_framework import serializers
from documents.models import TenantAgreement

class TenantAgreementSerializer(serializers.ModelSerializer):
    property_path = serializers.SerializerMethodField()
    document_url = serializers.FileField(source='document_file', read_only=True)

    class Meta:
        model = TenantAgreement
        fields = [
            'id', 'template_title_snapshot', 'status', 'created_at', 'document_url',
            'property_tenant', 'property_path'
        ]

    def get_property_path(self, obj):
        node = getattr(obj.property_tenant, 'node', None)
        path = []
        while node:
            path.append(node.name)
            node = node.parent
        return ' > '.join(reversed(path))
