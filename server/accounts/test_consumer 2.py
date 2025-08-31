import json

from channels.generic.websocket import AsyncWebsocketConsumer


class TestConsumer(AsyncWebsocketConsumer):
    """
    Simple test consumer for debugging WebSocket connections.
    """

    async def connect(self):
        """Handle WebSocket connection."""
        await self.accept()

        # Send connection confirmation
        await self.send(
            text_data=json.dumps(
                {
                    "type": "test_connection",
                    "message": "Test WebSocket connection established",
                }
            )
        )

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        pass

    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get("type")

            if message_type == "ping":
                await self.send(
                    text_data=json.dumps({"type": "pong", "message": "pong"})
                )
            elif message_type == "echo":
                message = text_data_json.get("message", "")
                await self.send(
                    text_data=json.dumps(
                        {"type": "echo_response", "message": f"Echo: {message}"}
                    )
                )
            else:
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "unknown_message",
                            "message": f"Unknown message type: {message_type}",
                        }
                    )
                )

        except json.JSONDecodeError:
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Invalid JSON format"}
                )
            )
