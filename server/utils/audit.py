from functools import wraps
import uuid

from django.forms.models import model_to_dict
from rest_framework import serializers

from Users.models import AuditTrials, Users
from utils.device_detection import get_request_meta

def convert_uuid(data):
    """ Recursively convert UUID to string in data structures. """
    if isinstance(data, dict):
        return {k: convert_uuid(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_uuid(item) for item in data]
    elif isinstance(data, uuid.UUID):
        return str(data)
    return data

def audit_log(model_name):
    def decorator(func):
        @wraps(func)
        def wrapper(serializer, *args, **kwargs):
            request = serializer.context.get('request')

            # Extract validated_data whether it's in kwargs or args[1]
            validated_data = kwargs.get('validated_data') or (
                args[1] if len(args) > 1 else {}
            )

            # Extract user by email if provided, fallback to request.user
            email = validated_data.pop('email', None)
            user = None

            if email:
                try:
                    user = Users.objects.get(email=email).id
                except Users.DoesNotExist:
                    raise serializers.ValidationError({
                        "email": "No user found with this email."
                    })
            elif request and hasattr(request, 'user'):
                user = request.user.id
            else:
                user = None  # No user found in request context

            device_info = get_request_meta(request) if request else {}

            # Is it a create or an update?
            is_create = func.__name__ == 'create'

            # === CREATE ===
            if is_create:
                instance = func(serializer, *args, **kwargs)

                # Make sure DRF knows this instance
                serializer.instance = instance

                # Now, serializer.data runs safely on the instance
                # Exclude UUID field from serializer.data (it's already logged as record_id)
                # created_data = {k: v for k, v in serializer.data.items() if k != 'id'}
                # Convert UUIDs in data, exclude 'id' field
                created_data = convert_uuid({
                    k: v for k, v in serializer.data.items() if k != 'id'
                })

                AuditTrials.objects.create(
                    user_id=user,
                    action='Created',
                    module=model_name,
                    model_name=model_name,
                    record_id=instance.id,
                    changes={"created_data": created_data},
                    **device_info
                )

                return instance

            # === UPDATE ===
            # In DRF: update(self, instance, validated_data)
            instance_to_update = args[0]
            old_instance = instance_to_update.__class__.objects.get(pk=instance_to_update.pk)
            changes = {}

            # Compare field-by-field for differences
            for field, new_value in validated_data.items():
                old_value = getattr(old_instance, field, None)

                # If different, store the change
                if old_value != new_value:
                    changes[field] = {'old': old_value, 'new': new_value}

            updated_instance = func(serializer, *args, **kwargs)

            if changes:
                AuditTrials.objects.create(
                    user_id=user,
                    action='Updated',
                    module=model_name,
                    model_name=model_name,
                    record_id=updated_instance.pk,
                    changes=changes,
                    **device_info
                )

            return updated_instance

        return wrapper
    return decorator