from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers
from django.db.models import Count, Q
from accounts.models import Users


class ContentTypeSerializer(serializers.ModelSerializer):
    """Serializer for Django ContentType"""

    class Meta:
        model = ContentType
        fields = ["id", "app_label", "model"]


class PermissionSerializer(serializers.ModelSerializer):
    """Serializer for Django Permission"""

    content_type = ContentTypeSerializer(read_only=True)

    class Meta:
        model = Permission
        fields = ["id", "name", "codename", "content_type"]


class PermissionCategorySerializer(serializers.Serializer):
    """Serializer for grouping permissions by app and model"""

    app_label = serializers.CharField()
    model = serializers.CharField()
    display_name = serializers.CharField()
    permissions = PermissionSerializer(many=True)


class AppModelSerializer(serializers.Serializer):
    """Serializer for app-model relationships"""

    app_label = serializers.CharField()
    app_name = serializers.CharField()
    models = serializers.ListField(child=serializers.DictField())


class GroupListSerializer(serializers.ModelSerializer):
    """Serializer for listing groups with user and permission counts"""

    user_count = serializers.SerializerMethodField()
    permission_count = serializers.SerializerMethodField()
    is_position_group = serializers.SerializerMethodField()
    position_name = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    modified_at = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "user_count",
            "permission_count",
            "is_position_group",
            "position_name",
            "created_at",
            "modified_at",
        ]

    def get_user_count(self, obj):
        """Get count of users in this group"""
        return obj.custom_user_groups.count()

    def get_permission_count(self, obj):
        """Get count of permissions assigned to this group"""
        return obj.permissions.count()

    def get_is_position_group(self, obj):
        """Check if this group is associated with a position"""
        # This would need to be implemented based on your business logic
        # For now, returning False as placeholder
        return False

    def get_position_name(self, obj):
        """Get the position name if this is a position group"""
        # This would need to be implemented based on your business logic
        # For now, returning None as placeholder
        return None

    def get_created_at(self, obj):
        """Get created timestamp"""
        # Django Group model doesn't have created_at by default
        # You might need to extend the Group model or use a different approach
        return None

    def get_modified_at(self, obj):
        """Get modified timestamp"""
        # Django Group model doesn't have modified_at by default
        # You might need to extend the Group model or use a different approach
        return None


class GroupPermissionSerializer(serializers.Serializer):
    """Serializer for group permissions with checked status"""

    id = serializers.IntegerField()
    name = serializers.CharField()
    codename = serializers.CharField()
    content_type = ContentTypeSerializer()
    is_checked = serializers.BooleanField()


class CreateGroupSerializer(serializers.ModelSerializer):
    """Serializer for creating new groups"""

    class Meta:
        model = Group
        fields = ["name"]

    def validate_name(self, value):
        """Validate group name"""
        if Group.objects.filter(name=value).exists():
            raise serializers.ValidationError("A group with this name already exists.")
        return value


class UpdateGroupPermissionsSerializer(serializers.Serializer):
    """Serializer for updating group permissions"""

    group_id = serializers.IntegerField()
    permission_ids = serializers.ListField(child=serializers.IntegerField())

    def validate_group_id(self, value):
        """Validate that the group exists"""
        try:
            Group.objects.get(id=value)
        except Group.DoesNotExist:
            raise serializers.ValidationError("Group does not exist.")
        return value

    def validate_permission_ids(self, value):
        """Validate that all permission IDs exist"""
        existing_permissions = Permission.objects.filter(id__in=value)
        if len(existing_permissions) != len(value):
            raise serializers.ValidationError("One or more permission IDs are invalid.")
        return value


class AssignUserRolesSerializer(serializers.Serializer):
    """Serializer for assigning groups and permissions to a user"""

    groups_to_add = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=[]
    )
    groups_to_remove = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=[]
    )
    permissions_to_add = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=[]
    )
    permissions_to_remove = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=[]
    )

    def validate_groups_to_add(self, value):
        """Validate that all group IDs exist"""
        if value:
            existing_groups = Group.objects.filter(id__in=value)
            if len(existing_groups) != len(value):
                raise serializers.ValidationError(
                    "One or more group IDs to add are invalid."
                )
        return value

    def validate_groups_to_remove(self, value):
        """Validate that all group IDs exist"""
        if value:
            existing_groups = Group.objects.filter(id__in=value)
            if len(existing_groups) != len(value):
                raise serializers.ValidationError(
                    "One or more group IDs to remove are invalid."
                )
        return value

    def validate_permissions_to_add(self, value):
        """Validate that all permission IDs exist"""
        if value:
            existing_permissions = Permission.objects.filter(id__in=value)
            if len(existing_permissions) != len(value):
                raise serializers.ValidationError(
                    "One or more permission IDs to add are invalid."
                )
        return value

    def validate_permissions_to_remove(self, value):
        """Validate that all permission IDs exist"""
        if value:
            existing_permissions = Permission.objects.filter(id__in=value)
            if len(existing_permissions) != len(value):
                raise serializers.ValidationError(
                    "One or more permission IDs to remove are invalid."
                )
        return value

    def validate(self, attrs):
        """Validate that at least one change is provided"""
        has_changes = (
            attrs.get("groups_to_add")
            or attrs.get("groups_to_remove")
            or attrs.get("permissions_to_add")
            or attrs.get("permissions_to_remove")
        )
        if not has_changes:
            raise serializers.ValidationError("At least one change must be provided.")
        return attrs
