from django.contrib.auth.hashers import make_password
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from utils.serilaizer import flatten_errors

from .serializer import (
    ChangePasswordSerializer,
    PasswordChangeResponseSerializer,
)


@extend_schema(
    tags=["Change Password"],
    request=ChangePasswordSerializer,
    responses={200: PasswordChangeResponseSerializer},
    description="Change user password with current password verification.",
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class ChangePasswordView(APIView):
    """
    View for changing user password.
    Requires authentication and validates current password.
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        """
        Change user password.
        
        Validates:
        - Current password is correct
        - New password meets requirements
        - Confirm password matches new password
        - New password is different from current password
        """
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'user': request.user}
        )
        
        if not serializer.is_valid():
            return Response(
                {
                    "error": True,
                    "message": flatten_errors(serializer.errors)
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Get validated data
            new_password = serializer.validated_data['new_password']
            
            # Update user password and reset force_password_change
            request.user.password = make_password(new_password)
            request.user.force_password_change = False
            request.user.save(update_fields=['password', 'force_password_change'])
            
            # Prepare response data
            response_data = {
                "message": "Password changed successfully.",
                "user_id": request.user.id,
                "email": request.user.email,
                "changed_at": request.user.modified_at,
                "force_password_change": False,
            }
            
            return Response(
                {
                    "error": False,
                    "data": response_data,
                    "message": "Password changed successfully."
                },
                status=status.HTTP_200_OK,
            )
            
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"Failed to change password: {str(e)}"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            ) 