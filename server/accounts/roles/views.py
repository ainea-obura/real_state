from django.contrib.auth.models import Group, Permission
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Users
from accounts.utils import broadcast_permission_update, get_user_permission_data
from utils.serilaizer import flatten_errors

from .serializers import (
    AssignUserRolesSerializer,
    CreateGroupSerializer,
    GroupListSerializer,
    UpdateGroupPermissionsSerializer,
)

wanted_apps = [
    "menupermissions",
]


@extend_schema(
    tags=["Roles"],
    description="Get all Django permission groups with user and permission counts",
)
@method_decorator(
    ratelimit(key="ip", rate="50/1m", method="GET", block=True), name="dispatch"
)
class GroupListView(APIView):
    """API 1: List all Django built permission groups"""

    permission_classes = [IsAuthenticated]
    serializer_class = GroupListSerializer

    def get(self, request):
        """Get all groups with user and permission counts"""
        try:
            # Get all groups
            groups = Group.objects.all().order_by("name")

            # Serialize the groups
            serializer = GroupListSerializer(groups, many=True)

            data = {
                "count": len(serializer.data),
                "results": serializer.data,
            }
            return Response(
                {"error": False, "data": data},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": True, "message": f"Error fetching groups: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Roles"],
    description="Get all permissions with checked status for a specific group",
)
@method_decorator(
    ratelimit(key="ip", rate="50/1m", method="GET", block=True), name="dispatch"
)
class GroupPermissionsView(APIView):
    """API 2: Get all permissions with checked status for a group"""

    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        """Get all permissions with checked status for a specific group"""
        try:
            # Validate group exists
            try:
                group = Group.objects.get(id=group_id)
            except Group.DoesNotExist:
                return Response(
                    {"error": True, "message": "Group not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Get all permissions, including only wanted apps
            all_permissions = (
                Permission.objects.select_related("content_type")
                .filter(content_type__app_label__in=wanted_apps)
                .order_by("content_type__app_label", "content_type__model", "name")
            )

            # Get group's current permissions
            group_permissions = set(group.permissions.values_list("id", flat=True))

            # Prepare permissions with checked status
            permissions_data = []
            for permission in all_permissions:
                permissions_data.append(
                    {
                        "id": permission.id,
                        "name": permission.name,
                        "codename": permission.codename,
                        "content_type": {
                            "id": permission.content_type.id,
                            "app_label": permission.content_type.app_label,
                            "model": permission.content_type.model,
                        },
                        "is_checked": permission.id in group_permissions,
                    }
                )

            # Group permissions by app and model
            permission_categories = {}
            for perm_data in permissions_data:
                app_label = perm_data["content_type"]["app_label"]
                model = perm_data["content_type"]["model"]
                key = f"{app_label}_{model}"

                if key not in permission_categories:
                    permission_categories[key] = {
                        "app_label": app_label,
                        "model": model,
                        "display_name": f"{app_label.title()} - {model.title()}",
                        "permissions": [],
                    }

                permission_categories[key]["permissions"].append(perm_data)

            # Convert to list format
            categories_list = list(permission_categories.values())

            data = {
                "group": {"id": group.id, "name": group.name},
                "permissions": permissions_data,
                "categories": categories_list,
            }
            return Response(
                {"error": False, "data": data},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": True, "message": f"Error fetching permissions: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Roles"],
    description="Create a new group",
)
@method_decorator(
    ratelimit(key="ip", rate="20/1m", method="POST", block=True), name="dispatch"
)
class CreateGroupView(APIView):
    """Create a new group"""

    permission_classes = [IsAuthenticated]
    serializer_class = CreateGroupSerializer

    def post(self, request):
        """Create a new group"""
        try:
            serializer = CreateGroupSerializer(data=request.data)
            if serializer.is_valid():
                group = serializer.save()

                data = GroupListSerializer(group).data
                return Response(
                    {
                        "error": False,
                        "message": "Group created successfully",
                        "data": data,
                    },
                    status=status.HTTP_201_CREATED,
                )
            else:
                return Response(
                    {
                        "error": True,
                        "message": "Validation error",
                        "errors": serializer.errors,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as e:
            return Response(
                {"error": True, "message": f"Error creating group: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Roles"],
    description="Update group permissions",
)
@method_decorator(
    ratelimit(key="ip", rate="20/1m", method="POST", block=True), name="dispatch"
)
class UpdateGroupPermissionsView(APIView):
    """Update permissions for a specific group"""

    permission_classes = [IsAuthenticated]
    serializer_class = UpdateGroupPermissionsSerializer

    def post(self, request):
        """Update group permissions"""
        try:
            serializer = UpdateGroupPermissionsSerializer(data=request.data)
            if serializer.is_valid():
                group_id = serializer.validated_data["group_id"]
                permission_ids = serializer.validated_data["permission_ids"]

                # Get the group
                try:
                    group = Group.objects.get(id=group_id)
                except Group.DoesNotExist:
                    return Response(
                        {"error": True, "message": "Group not found"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                # Get the permissions
                permissions = Permission.objects.filter(id__in=permission_ids)

                # Clear existing permissions and set new ones
                group.permissions.clear()
                group.permissions.add(*permissions)

                # Send WebSocket notifications to all users in this group
                try:
                    # Get all users in this group
                    group_users = group.user_set.all()

                    for group_user in group_users:
                        # Get updated permission data for this user
                        updated_permission_data = get_user_permission_data(group_user)

                        # Send notification to each user in the group
                        broadcast_permission_update(
                            user_id=group_user.id,
                            action="updated",
                            permissions=updated_permission_data["permissions"],
                            groups=updated_permission_data["groups"],
                            message=f"Your group '{group.name}' permissions have been updated",
                        )
                except Exception as e:
                    # Log the error but don't fail the request
                    print(f"WebSocket notification failed for group update: {str(e)}")

                data = {
                    "group_id": group_id,
                    "permission_count": len(permission_ids),
                }
                return Response(
                    {
                        "error": False,
                        "message": "Group permissions updated successfully",
                        "data": data,
                    },
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(
                    {
                        "error": True,
                        "message": "Validation error",
                        "errors": serializer.errors,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"Error updating group permissions: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Roles"],
    description="Get all available permissions grouped by app and model",
)
@method_decorator(
    ratelimit(key="ip", rate="50/1m", method="GET", block=True), name="dispatch"
)
class AllPermissionsView(APIView):
    """Get all available permissions grouped by app and model"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all permissions grouped by app and model"""
        try:
            # Get all permissions, including only wanted apps
            permissions = (
                Permission.objects.select_related("content_type")
                .filter(content_type__app_label__in=wanted_apps)
                .order_by("content_type__app_label", "content_type__model", "name")
            )

            # Group by app and model
            permission_categories = {}
            for permission in permissions:
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

            # Convert to list format
            categories_list = list(permission_categories.values())

            data = {
                "count": len(categories_list),
                "results": categories_list,
            }
            return Response(
                {"error": False, "data": data},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": True, "message": f"Error fetching permissions: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Roles"],
    description="Delete a group",
)
@method_decorator(
    ratelimit(key="ip", rate="20/1m", method="DELETE", block=True), name="dispatch"
)
class DeleteGroupView(APIView):
    """Delete a specific group"""

    permission_classes = [IsAuthenticated]

    def delete(self, request, group_id):
        """Delete a group"""
        try:
            # Get the group
            try:
                group = Group.objects.get(id=group_id)
            except Group.DoesNotExist:
                return Response(
                    {"error": True, "message": "Group not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Check if group has users
            user_count = group.custom_user_groups.count()
            if user_count > 0:
                return Response(
                    {
                        "error": True,
                        "message": f"Cannot delete group. It has {user_count} user(s) assigned to it.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Delete the group
            group_name = group.name
            group.delete()

            return Response(
                {
                    "error": False,
                    "message": f"Group '{group_name}' deleted successfully",
                    "data": None,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": True, "message": f"Error deleting group: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Roles"],
    description="Assign groups and permissions to a user",
)
@method_decorator(
    ratelimit(key="ip", rate="20/1m", method="POST", block=True), name="dispatch"
)
class AssignUserRolesView(APIView):
    """Assign groups and permissions to a specific user"""

    permission_classes = [IsAuthenticated]
    serializer_class = AssignUserRolesSerializer

    def post(self, request, user_id):
        """Assign groups and permissions to a user"""
        try:
            user = Users.objects.get(id=user_id)
        except Users.DoesNotExist:
            return Response(
                {"error": True, "message": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate request data
        serializer = AssignUserRolesSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "error": True,
                    "message": flatten_errors(serializer.errors),
                }
            )

        groups_to_add = serializer.validated_data.get("groups_to_add", [])
        groups_to_remove = serializer.validated_data.get("groups_to_remove", [])
        permissions_to_add = serializer.validated_data.get("permissions_to_add", [])
        permissions_to_remove = serializer.validated_data.get(
            "permissions_to_remove", []
        )

        # Get groups and permissions
        groups_to_add_objs = (
            Group.objects.filter(id__in=groups_to_add) if groups_to_add else []
        )
        groups_to_remove_objs = (
            Group.objects.filter(id__in=groups_to_remove) if groups_to_remove else []
        )
        permissions_to_add_objs = (
            Permission.objects.filter(id__in=permissions_to_add)
            if permissions_to_add
            else []
        )
        permissions_to_remove_objs = (
            Permission.objects.filter(id__in=permissions_to_remove)
            if permissions_to_remove
            else []
        )

        # Apply changes: remove first, then add
        if groups_to_remove_objs:
            user.groups.remove(*groups_to_remove_objs)

        if permissions_to_remove_objs:
            user.user_permissions.remove(*permissions_to_remove_objs)

        if groups_to_add_objs:
            user.groups.add(*groups_to_add_objs)

        if permissions_to_add_objs:
            user.user_permissions.add(*permissions_to_add_objs)

        # Send WebSocket notification for permission updates
        try:
            # Get updated user permission data
            updated_permission_data = get_user_permission_data(user)

            # Determine the action type for the notification
            if groups_to_add or permissions_to_add:
                if groups_to_remove or permissions_to_remove:
                    action = "updated"
                    message = f"Your permissions and groups have been updated"
                else:
                    action = "added"
                    message = f"New permissions and groups have been assigned to you"
            elif groups_to_remove or permissions_to_remove:
                action = "removed"
                message = (
                    f"Some permissions and groups have been removed from your account"
                )
            else:
                action = "updated"
                message = f"Your permissions have been updated"

            # Broadcast the permission update to the user
            broadcast_permission_update(
                user_id=user.id,
                action=action,
                permissions=updated_permission_data["permissions"],
                groups=updated_permission_data["groups"],
                message=message,
            )
        except Exception as e:
            # Log the error but don't fail the request
            print(f"WebSocket notification failed: {str(e)}")

        # Prepare response data
        response_data = {
            "user_id": str(user.id),
            "user_name": user.get_full_name(),
            "groups_added": len(groups_to_add),
            "groups_removed": len(groups_to_remove),
            "permissions_added": len(permissions_to_add),
            "permissions_removed": len(permissions_to_remove),
            "groups_added_details": [
                {"id": group.id, "name": group.name} for group in groups_to_add_objs
            ],
            "groups_removed_details": [
                {"id": group.id, "name": group.name} for group in groups_to_remove_objs
            ],
            "permissions_added_details": [
                {"id": perm.id, "name": perm.name} for perm in permissions_to_add_objs
            ],
            "permissions_removed_details": [
                {"id": perm.id, "name": perm.name}
                for perm in permissions_to_remove_objs
            ],
        }

        return Response(
            {
                "error": False,
                "message": f"Roles assigned successfully to {user.get_full_name()}",
                "data": response_data,
            },
            status=status.HTTP_200_OK,
        )
