from django.contrib.gis.geos import Point
from django.db import transaction
from rest_framework import serializers

from properties.models import LocationNode, ProjectDetail
from utils.format import RobustDateTimeField, format_money_with_currency
from utils.currency import get_serialized_default_currency


class ProjectDetailListSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    node = serializers.SerializerMethodField()
    created_at = RobustDateTimeField()
    structure_count = serializers.SerializerMethodField()
    management_fee = serializers.SerializerMethodField()

    class Meta:
        model = ProjectDetail
        fields = [
            "id",
            "node",
            "project_code",
            "start_date",
            "end_date",
            "status",
            "description",
            "project_type",
            "location",
            "is_deleted",
            "created_at",
            "structure_count",
            "management_fee",
        ]
        read_only_fields = fields

    def get_location(self, obj):
        goe_location = {
            "lat": None,
            "long": None,
            "country": None,
            "city": None,
            "area": None,
            "address": None,
        }
        if obj.geo_location:
            goe_location["lat"] = obj.geo_location.y
            goe_location["long"] = obj.geo_location.x

        if obj.city:
            goe_location["country"] = {
                "id": obj.city.country.id,
                "name": obj.city.country.name,
            }
            goe_location["city"] = {
                "id": obj.city.id,
                "name": obj.city.name,
            }
        if obj.area:
            goe_location["area"] = obj.area
        if obj.address:
            goe_location["address"] = obj.address
        return goe_location

    def get_node(self, obj):
        return {
            "id": obj.node.id,
            "name": obj.node.name,
            "node_type": obj.node.node_type,
        }

    def get_structure_count(self, obj):
        blocks = LocationNode.objects.filter(parent=obj.node, node_type="BLOCK").count()
        houses = LocationNode.objects.filter(
            parent=obj.node, node_type="HOUSE"
        ).count()
        return {
            "total_blocks": blocks,
            "total_houses": houses,
        }

    def get_management_fee(self, obj):
        return format_money_with_currency(obj.management_fee)


class ProjectDetailWriteSerializer(serializers.ModelSerializer):
    lat = serializers.FloatField(write_only=True, required=False)
    long = serializers.FloatField(write_only=True, required=False)
    node_name = serializers.CharField(write_only=True)


    class Meta:
        model = ProjectDetail
        fields = [
            "node_name",
            "city",
            "area",
            "project_code",
            "address",
            "start_date",
            "end_date",
            "status",
            "description",
            "project_type",
            "management_fee",
            "geo_location",
            "lat",
            "long",
        ]
        extra_kwargs = {
            "start_date": {"required": False, "allow_null": True},
            "end_date": {"required": False, "allow_null": True},
        }
        read_only_fields = ["id", "node"]

    def create(self, validated_data):
        node_name = validated_data.pop("node_name")
        lat = validated_data.pop("lat", None)
        long = validated_data.pop("long", None)
        with transaction.atomic():
            node = LocationNode.objects.create(
                name=node_name,
                node_type="PROJECT",
            )
            project = ProjectDetail.objects.create(node=node, **validated_data)
            if lat is not None and long is not None:
                project.geo_location = Point(long, lat)
                project.save()
        return project

    def update(self, instance, validated_data):
        node_name = validated_data.pop("node_name", None)
        if node_name:
            instance.node.name = node_name
            instance.node.save()
        lat = validated_data.pop("lat", None)
        long = validated_data.pop("long", None)
        if lat is not None and long is not None:
            instance.geo_location = Point(long, lat)
            instance.save()
        return super().update(instance, validated_data)


class ProjectOverviewSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    lat = serializers.SerializerMethodField()
    long = serializers.SerializerMethodField()
    node = serializers.CharField(source="node.name")

    class Meta:
        model = ProjectDetail
        fields = [
            "node",
            "status",
            "lat",
            "long",
            "description",
        ]

    def get_status(self, obj):
        blocks = LocationNode.objects.filter(parent=obj.node, node_type="BLOCK").count()
        houses = LocationNode.objects.filter(parent=obj.node, node_type="HOUSE").count()
        return {
            "status": obj.status,
            "project_type": obj.project_type,
            "blocks": blocks,
            "houses": houses,
        }

    def get_lat(self, obj):
        if obj.geo_location:
            return obj.geo_location.y
        return None

    def get_long(self, obj):
        if obj.geo_location:
            return obj.geo_location.x
        return None
