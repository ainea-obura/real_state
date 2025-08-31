from rest_framework.exceptions import ValidationError

from Users.models import Users


def FindUserByEmail(email: str):
    if not email:
        raise ValidationError(
            {"email": "This field is required to determine the creator."}
        )

    try:
        user = Users.objects.get(email=email)
    except Users.DoesNotExist:
        raise ValidationError({"email": "No user found with this email."})

    return user
