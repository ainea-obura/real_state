from django.core.exceptions import ValidationError
from PIL import Image
import re


def validate_media(file, allowed_extensions=["jpg", "jpeg", "png"], max_size_mb=5):
    """
    Waxa uu kaa caawinaya inu uu kaa hubiyo sawrika
    - Sawirka nuuciisa
    - sawirka size-kiisa
    """
    # Nuuca Sawirka
    if allowed_extensions is None:
        allowed_extensions = ["jpg", "jpeg", "png"]

    # 1. Nuuca File-ka
    ext = file.name.split(".")[-1].lower()
    if ext not in allowed_extensions:
        raise ValidationError(f"Incorrect File Format: .{ext}")

    # 2. Cabirka Sawirka
    max_size_bytes = max_size_mb * 1024 * 1024  # Convert MB to bytes
    if file.size > max_size_bytes:
        raise ValidationError(f"File Size exceedes the limit {max_size_mb} Mb.")

    # 3. Sax ahaanshaha sawirka
    try:
        img = Image.open(file)
        img.verify()  # sawir corrpt ah inu yahay

    except Exception as e:
        raise ValidationError("Invalid Image.") from e


def validate_email(email):
    """
    Validates if the provided email is in a valid format.
    """
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not re.match(email_regex, email):
        return False

    return True
