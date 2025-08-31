from rest_framework import serializers
from properties.models import Media, LocationNode


class ProjectNodeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = LocationNode
        fields = [
            "id",
            "name",
            "node_type",
            "property_type",
            "children",
        ]

    def get_children(self, obj):
        # Recursively serialize children
        children = obj.get_children()
        return ProjectNodeSerializer(children, many=True).data


class MediaUploadSerializer(serializers.Serializer):
    project = serializers.UUIDField(required=True)
    block = serializers.UUIDField(required=False, allow_null=True)
    unit = serializers.UUIDField(required=False, allow_null=True)
    house = serializers.UUIDField(required=False, allow_null=True)
    files = serializers.ListField(
        child=serializers.ImageField(), min_length=1, write_only=True
    )

    def validate(self, attrs):
        # Determine the most specific node
        node_id = (
            attrs.get("unit")
            or attrs.get("block")
            or attrs.get("house")
            or attrs.get("project")
        )
        try:
            node = LocationNode.objects.get(id=node_id)
        except LocationNode.DoesNotExist:
            raise serializers.ValidationError("Target location node does not exist.")
        attrs["location_node"] = node
        return attrs

    def create(self, validated_data):
        files = validated_data.pop("files")
        node = validated_data["location_node"]
        created = []
        for file in files:
            media = Media.objects.create(
                location_node=node,
                file_type="image",
                media=file,
            )
            created.append(media)
        return created


class MediaWithPropertySerializer(serializers.ModelSerializer):
    property = serializers.SerializerMethodField()

    class Meta:
        model = Media
        fields = [
            "id",
            "file_type",
            "category",
            "title",
            "description",
            "media",
            "created_at",
            "property",
        ]

    def get_property(self, obj):
        node = obj.location_node
        # Get ancestors for parent path (ordered from root to self)
        ancestors = list(node.get_ancestors(include_self=True))
        parent_path = " > ".join([ancestor.name for ancestor in ancestors])
        return {
            "id": str(node.id),
            "name": node.name,
            "node_type": node.node_type,
            "property_type": node.property_type,
            "parent_path": parent_path,
        }
