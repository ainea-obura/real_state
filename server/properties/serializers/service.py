from rest_framework import serializers

class ServiceNameSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()

class ServiceCardSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    status = serializers.CharField()
    thumbnail = serializers.CharField(allow_blank=True, required=False)
    services = ServiceNameSerializer(many=True)
    start_date = serializers.CharField(allow_blank=True, required=False)
    end_date = serializers.CharField(allow_blank=True, required=False)
    descendant = serializers.CharField()
    project_id = serializers.CharField()

    def to_representation(self, instance):
        # instance is expected to be a dict with all fields
        return super().to_representation(instance)
