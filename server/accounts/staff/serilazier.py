from rest_framework import serializers

from accounts.models import Position, Users


class StaffSerializer(serializers.ModelSerializer):
    """Serializer for staff CRUD operations"""

    position = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    position_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Users
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "gender",
            "avatar",
            "position",
            "position_id",
            "is_verified",
            "status",
            "address",
            "city",
            "postal_code",
            "created_at",
            "modified_at",
        ]
        read_only_fields = ["id", "created_at", "modified_at"]

    def get_position(self, obj):
        """Return position object or null"""
        if obj.position:
            return {
                "id": str(obj.position.id),
                "name": obj.position.name,
            }
        return None

    def get_full_name(self, obj):
        return obj.get_full_name()

    def validate_email(self, value):
        """Ensure email is unique for staff users"""
        user_id = self.instance.id if self.instance else None
        if Users.objects.filter(email=value, type="staff").exclude(id=user_id).exists():
            raise serializers.ValidationError(
                "A staff member with this email already exists."
            )
        return value

    def validate_position_id(self, value):
        """Validate position_id exists"""
        if value and not Position.objects.filter(id=value, is_deleted=False).exists():
            raise serializers.ValidationError("Selected position does not exist.")
        return value

    def validate(self, data):
        """Custom validation for the entire data set"""
        # Ensure position_id is properly mapped to position
        position_id = data.get("position_id")
        if position_id:
            try:
                position = Position.objects.get(id=position_id, is_deleted=False)
                data["position"] = position
            except Position.DoesNotExist:
                raise serializers.ValidationError(
                    {"position_id": "Selected position does not exist."}
                )
        return data

    def create(self, validated_data):
        """Create a new staff member"""
        validated_data["type"] = "staff"
        validated_data["username"] = validated_data.get(
            "email"
        )  # Use email as username

        # Handle optional phone field
        if not validated_data.get("phone"):
            validated_data["phone"] = ""  # Set empty string if phone is not provided

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Update a staff member"""
        # Handle optional phone field
        if "phone" in validated_data and not validated_data.get("phone"):
            validated_data["phone"] = ""  # Set empty string if phone is cleared

        return super().update(instance, validated_data)


class StaffListSerializer(serializers.ModelSerializer):
    """Serializer for staff list with basic info"""

    position = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    group_count = serializers.SerializerMethodField()
    permission_count = serializers.SerializerMethodField()

    class Meta:
        model = Users
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "position",
            "is_active",
            "is_deleted",
            "group_count",
            "permission_count",
            "created_at",
            "modified_at",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_position(self, obj):
        """Return position object or null"""
        if obj.position:
            return {
                "id": str(obj.position.id),
                "name": obj.position.name,
            }
        return None

    def get_group_count(self, obj):
        """Get count of groups assigned to this user"""
        try:
            return obj.groups.count()
        except Exception as e:
            print(f"Error getting group count for user {obj.id}: {e}")
            return 0

    def get_permission_count(self, obj):
        """Get count of permissions assigned to this user (both from groups and direct)"""
        try:
            # Get permissions from groups
            group_permissions = set()
            for group in obj.groups.all():
                group_permissions.update(group.permissions.values_list("id", flat=True))

            # Get direct user permissions
            user_permissions = set(obj.user_permissions.values_list("id", flat=True))

            # Combine and count unique permissions
            all_permissions = group_permissions.union(user_permissions)
            return len(all_permissions)
        except Exception as e:
            print(f"Error getting permission count for user {obj.id}: {e}")
            return 0


class StaffStatsSerializer(serializers.Serializer):
    """Serializer for staff statistics"""

    total_staff = serializers.IntegerField()
    active_staff = serializers.IntegerField()
    suspended_staff = serializers.IntegerField()
    blocked_staff = serializers.IntegerField()
    verified_staff = serializers.IntegerField()
    unverified_staff = serializers.IntegerField()


class UserPermissionsSerializer(serializers.Serializer):
    """Serializer for user permissions details"""

    groups = serializers.SerializerMethodField()
    direct_permissions = serializers.SerializerMethodField()
    all_permissions = serializers.SerializerMethodField()

    def get_groups(self, obj):
        """Get groups assigned to user"""
        return [
            {
                "id": group.id,
                "name": group.name,
                "permission_count": group.permissions.count(),
            }
            for group in obj.groups.all()
        ]

    def get_direct_permissions(self, obj):
        """Get direct permissions assigned to user"""
        return [
            {
                "id": perm.id,
                "name": perm.name,
                "codename": perm.codename,
                "content_type": {
                    "app_label": perm.content_type.app_label,
                    "model": perm.content_type.model,
                },
            }
            for perm in obj.user_permissions.all()
        ]

    def get_all_permissions(self, obj):
        """Get all permissions (from groups and direct) grouped by app and model"""
        from django.contrib.auth.models import Permission
        from django.contrib.contenttypes.models import ContentType

        # Get all permissions from groups
        group_permissions = Permission.objects.filter(group__in=obj.groups.all())
        # Get direct permissions
        direct_permissions = obj.user_permissions.all()
        # Combine and get unique permissions
        all_permissions = group_permissions.union(direct_permissions)

        # Group by app and model
        permission_categories = {}
        for permission in all_permissions:
            app_label = permission.content_type.app_label
            model = permission.content_type.model
            key = f"{app_label}_{model}"

            if key not in permission_categories:
                permission_categories[key] = {
                    "app_label": app_label,
                    "model": model,
                    "display_name": f"{app_label.title()} - {model.title()}",
                    "permissions": [],
                }

            permission_categories[key]["permissions"].append(
                {
                    "id": permission.id,
                    "name": permission.name,
                    "codename": permission.codename,
                    "content_type": {
                        "id": permission.content_type.id,
                        "app_label": permission.content_type.app_label,
                        "model": permission.content_type.model,
                    },
                }
            )

        return list(permission_categories.values())
