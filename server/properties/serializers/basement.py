from rest_framework import serializers

class AssignSlotToUnitsSerializer(serializers.Serializer):
    slot_id = serializers.UUIDField()
    unit_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False
    )

class SlotAssignmentSlotSerializer(serializers.Serializer):
    slot_id = serializers.UUIDField()
    slot_name = serializers.CharField()
    assigned_at = serializers.DateTimeField()

class SlotAssignmentListSerializer(serializers.Serializer):
    unit_id = serializers.UUIDField()
    unit_name = serializers.CharField()
    slots = SlotAssignmentSlotSerializer(many=True)

class DeleteSlotAssignmentSerializer(serializers.Serializer):
    slot_id = serializers.UUIDField()
    unit_id = serializers.UUIDField()

class DeleteAllUnitAssignmentsSerializer(serializers.Serializer):
    unit_id = serializers.UUIDField()

class AssignSlotsToUnitSerializer(serializers.Serializer):
    unit_id = serializers.UUIDField()
    slot_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False
    )
