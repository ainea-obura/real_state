from django.urls import path

from .views import (
    AllPermissionsView,
    AssignUserRolesView,
    CreateGroupView,
    DeleteGroupView,
    GroupListView,
    GroupPermissionsView,
    UpdateGroupPermissionsView,
)

app_name = "roles"

urlpatterns = [
    # API 1: List all groups
    path("groups", GroupListView.as_view(), name="group-list"),
    # API 2: Get permissions for a specific group
    path(
        "groups/<int:group_id>/permissions",
        GroupPermissionsView.as_view(),
        name="group-permissions",
    ),
    # Create new group
    path("groups/create", CreateGroupView.as_view(), name="create-group"),
    # Update group permissions
    path(
        "groups/update-permissions",
        UpdateGroupPermissionsView.as_view(),
        name="update-group-permissions",
    ),
    # Get all available permissions
    path("permissions", AllPermissionsView.as_view(), name="all-permissions"),
    # Delete a group
    path("groups/<int:group_id>", DeleteGroupView.as_view(), name="delete-group"),
    # Assign roles and permissions to a user
    path("users/<str:user_id>/assign", AssignUserRolesView.as_view(), name="assign-user-roles"),
]
