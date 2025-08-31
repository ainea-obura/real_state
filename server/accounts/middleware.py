import json

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import Users


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom JWT authentication middleware for WebSocket connections.
    """

    async def __call__(self, scope, receive, send):
        # Get the token from headers
        headers = dict(scope.get("headers", []))
        auth_header = headers.get(b"authorization", b"").decode("utf-8")

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            scope["user"] = await self.get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user_from_token(self, token):
        """Get user from JWT token."""
        try:
            # Decode the token
            access_token = AccessToken(token)
            user_id = access_token["user_id"]

            # Get the user
            user = Users.objects.get(id=user_id)
            return user

        except (InvalidToken, TokenError, Users.DoesNotExist):
            return AnonymousUser()
