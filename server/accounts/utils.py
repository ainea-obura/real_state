import json

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_permission_update(
    user_id, action, permissions=None, groups=None, message=None
):
    """
    Broadcast permission update to a specific user via WebSocket.

    Args:
        user_id: ID of the user to notify
        action: 'added', 'removed', 'updated'
        permissions: List of permission data
        groups: List of group data
        message: Optional message
    """
    print(f"Broadcasting permission update to user {user_id} with action {action}")
    channel_layer = get_channel_layer()

    # Send to specific user's permission room
    room_group_name = f"permissions_user_permissions_{user_id}"

    async_to_sync(channel_layer.group_send)(
        room_group_name,
        {
            "type": "user_permission_change",
            "target_user_id": str(user_id),
            "action": action,
            "permissions": permissions or [],
            "groups": groups or [],
            "message": message or f"Permissions {action}",
        },
    )


def broadcast_general_permission_update(
    user_id, action, permissions=None, groups=None, message=None
):
    """
    Broadcast general permission update to all connected users.

    Args:
        user_id: ID of the user whose permissions changed
        action: 'added', 'removed', 'updated'
        permissions: List of permission data
        groups: List of group data
        message: Optional message
    """
    channel_layer = get_channel_layer()

    # Send to all permission rooms (for admin notifications)
    async_to_sync(channel_layer.group_send)(
        "permissions_broadcast",
        {
            "type": "permission_update",
            "user_id": user_id,
            "action": action,
            "permissions": permissions or [],
            "groups": groups or [],
            "message": message or f"User {user_id} permissions {action}",
        },
    )


def get_user_permission_data(user):
    """
    Get formatted permission data for a user.

    Args:
        user: Django User instance

    Returns:
        dict: Formatted permission and group data
    """
    permissions = user.user_permissions.all()
    groups = user.groups.all()

    return {
        "permissions": list(
            permissions.values(
                "id",
                "name",
                "codename",
                "content_type__app_label",
                "content_type__model",
            )
        ),
        "groups": list(groups.values("id", "name")),
    }
