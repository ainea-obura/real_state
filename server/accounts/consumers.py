import json
import logging
from datetime import datetime
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.exceptions import ObjectDoesNotExist
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)


class PermissionConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time permission updates.
    Handles user connections and broadcasts permission changes.
    Prevents duplicate connections per user.
    """

    # Class-level connection tracking
    active_connections = {}  # user_id -> connection_info

    async def connect(self):
        """Handle WebSocket connection with duplicate prevention."""
        self.user_id = None
        self.user = None
        self.room_name = None
        self.room_group_name = None

        try:
            # Get token from query params
            query_string = self.scope.get("query_string", b"").decode()
            token = None

            if query_string:
                try:
                    # Use parse_qs for better URL parameter parsing
                    params = parse_qs(query_string)
                    token = params.get("token", [None])[0]
                except Exception as e:
                    logger.error(f"Error parsing query string: {e}")

            if not token:
                logger.warning("WebSocket connection attempted without token")
                await self.close(code=4001)  # Unauthorized
                return

            # Validate token before accepting connection
            try:
                access_token = AccessToken(token)
                user_id = str(access_token["user_id"])

                # Get user to verify existence and active status
                user = await self.get_user_by_id(user_id)
                if not user or not user.is_active:
                    logger.warning(
                        f"Invalid or inactive user attempted connection: {user_id}"
                    )
                    await self.close(code=4001)  # Unauthorized
                    return

            except (InvalidToken, TokenError) as e:
                logger.warning(f"Invalid token in WebSocket connection: {e}")
                await self.close(code=4001)  # Unauthorized
                return
            except Exception as e:
                logger.error(f"Token validation error: {e}")
                await self.close(code=4000)  # Bad request
                return

            # Check for existing connection and close it safely
            if user_id in self.active_connections:
                old_connection = self.active_connections[user_id]
                logger.info(f"Closing existing connection for user {user_id}")
                try:
                    old_consumer = old_connection["consumer"]
                    # Only close if it's not already closed
                    if (
                        hasattr(old_consumer, "channel_name")
                        and old_consumer.channel_name
                    ):
                        await old_consumer.safe_close(code=4002)  # Connection replaced
                except Exception as e:
                    logger.error(f"Error closing old connection: {e}")
                finally:
                    # Remove from active connections regardless of close success
                    self.active_connections.pop(user_id, None)

            # Accept the new connection
            await self.accept()

            # Store connection info
            self.user_id = user_id
            self.user = user
            self.room_name = f"user_permissions_{user_id}"
            self.room_group_name = f"permissions_{self.room_name}"

            # Store in active connections
            self.active_connections[user_id] = {
                "consumer": self,
                "channel_name": self.channel_name,
                "connected_at": datetime.now(),
                "user_email": getattr(user, "email", None),
            }

            # Join the room group
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)

            # Send connection success
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "connection_success",
                        "message": "Connected successfully",
                        "user_id": user_id,
                        "timestamp": datetime.now().isoformat(),
                    }
                )
            )

            logger.info(
                f"WebSocket connected for user {user_id} ({getattr(user, 'email', 'Unknown')})"
            )

        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            # Don't call close here if we haven't accepted yet
            if hasattr(self, "_accepted") and self._accepted:
                await self.safe_close(code=4000)
            else:
                # Just reject the connection
                await self.close(code=4000)

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection with proper cleanup."""
        try:
            # Remove from active connections
            if (
                hasattr(self, "user_id")
                and self.user_id
                and self.user_id in self.active_connections
            ):
                connection_info = self.active_connections.get(self.user_id, {})
                user_email = connection_info.get("user_email", "Unknown")

                # Only remove if this is the current connection
                if (
                    connection_info.get("consumer") is self
                    or connection_info.get("channel_name") == self.channel_name
                ):
                    self.active_connections.pop(self.user_id, None)
                    logger.info(
                        f"WebSocket disconnected for user {self.user_id} ({user_email}) - Code: {close_code}"
                    )

            # Leave room group
            if hasattr(self, "room_group_name") and hasattr(self, "channel_name"):
                if self.room_group_name and self.channel_name:
                    await self.channel_layer.group_discard(
                        self.room_group_name, self.channel_name
                    )

        except Exception as e:
            logger.error(f"WebSocket disconnect cleanup error: {e}")

    async def safe_close(self, code=1000, reason=None):
        """Safely close WebSocket connection without throwing errors."""
        try:
            if hasattr(self, "_closed") and self._closed:
                return  # Already closed

            await self.close(code=code, reason=reason)
            self._closed = True
        except Exception as e:
            logger.debug(f"Safe close error (expected): {e}")
            # Mark as closed even if close() failed
            self._closed = True

    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            # Only accept messages from authenticated connections
            if not hasattr(self, "user_id") or not self.user_id:
                await self.send(
                    text_data=json.dumps(
                        {"type": "error", "message": "Connection not authenticated"}
                    )
                )
                await self.safe_close(code=4001)
                return

            text_data_json = json.loads(text_data)
            message_type = text_data_json.get("type")

            if message_type == "ping":
                # Handle ping messages for connection health
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "pong",
                            "message": "pong",
                            "timestamp": datetime.now().isoformat(),
                        }
                    )
                )
            elif message_type == "get_permissions":
                # Send current user permissions
                permissions_data = await self.get_user_permissions(self.user_id)
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "permissions_data",
                            "data": permissions_data,
                            "timestamp": datetime.now().isoformat(),
                        }
                    )
                )
            else:
                logger.warning(f"Unknown message type received: {message_type}")

        except json.JSONDecodeError:
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Invalid JSON format"}
                )
            )
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Message processing error"}
                )
            )

    async def permission_update(self, event):
        """
        Handle permission update events.
        This method is called when permission changes are broadcast.
        """
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "permission_update",
                        "user_id": event.get("user_id"),
                        "action": event.get("action"),  # 'added', 'removed', 'updated'
                        "permissions": event.get("permissions", []),
                        "groups": event.get("groups", []),
                        "message": event.get("message", "Permissions updated"),
                        "timestamp": datetime.now().isoformat(),
                    }
                )
            )
        except Exception as e:
            logger.error(f"Error sending permission update: {e}")

    async def user_permission_change(self, event):
        """
        Handle user-specific permission changes.
        """
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "user_permission_change",
                        "user_id": event.get("target_user_id"),
                        "action": event.get("action"),
                        "permissions": event.get("permissions", []),
                        "groups": event.get("groups", []),
                        "message": event.get(
                            "message", "Your permissions have been updated"
                        ),
                        "timestamp": datetime.now().isoformat(),
                    }
                )
            )
        except Exception as e:
            logger.error(f"Error sending user permission change: {e}")

    @database_sync_to_async
    def get_user_by_id(self, user_id):
        """Get user by ID."""
        from accounts.models import Users as User

        try:
            return User.objects.get(id=user_id, is_active=True)
        except ObjectDoesNotExist:
            return None

    @database_sync_to_async
    def get_user_permissions(self, user_id):
        """Get user permissions from database."""
        from accounts.models import Users as User

        try:
            user = User.objects.get(id=user_id)
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
        except ObjectDoesNotExist:
            return {"permissions": [], "groups": []}

    @classmethod
    def get_active_connections_count(cls):
        """Get count of active connections."""
        return len(cls.active_connections)

    @classmethod
    def get_connected_users(cls):
        """Get list of connected user IDs."""
        return list(cls.active_connections.keys())
