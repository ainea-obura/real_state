from rest_framework import serializers
from properties.models import PropertyTenant, LocationNode
from utils.format import format_money_with_currency


class TenantSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    contact = serializers.CharField(required=False, allow_blank=True)


class AgentSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    contact = serializers.CharField(required=False, allow_blank=True)


class LocationNodeSerializer(serializers.Serializer):
    block = serializers.CharField()
    floor = serializers.CharField()


class RentSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    type = serializers.CharField()
    status = serializers.CharField()
    rental_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    size = serializers.CharField()
    tenant = TenantSerializer()
    agent = AgentSerializer(required=False, allow_null=True)
    rental_start = serializers.DateField()
    rental_end = serializers.DateField()
    identifier = serializers.CharField()
    project = serializers.CharField()
    location_node = LocationNodeSerializer()
    thumbnail = serializers.CharField(required=False, allow_blank=True)

    def to_representation(self, instance: PropertyTenant):
        node = instance.node
        unit_detail = getattr(node, "unit_detail", None)
        # Traverse ancestors for block, floor, project
        block = None
        floor = None
        project = None
        ancestor = node.parent
        while ancestor:
            if ancestor.node_type == "BLOCK":
                block = ancestor.name
            elif ancestor.node_type == "FLOOR":
                floor = ancestor.name
            elif ancestor.node_type == "PROJECT":
                project = ancestor.name
            ancestor = ancestor.parent
        # fallback for block/floor
        block = block or ""
        floor = floor or ""
        project = project or ""
        # Thumbnail: get first media with category 'thumbnail' or 'main'
        thumbnail = ""
        media_qs = node.media.filter(category__in=["thumbnail", "main"])
        if media_qs.exists():
            thumbnail = media_qs.first().media.url
        # Tenant
        tenant_user = instance.tenant_user
        tenant = {
            "id": str(tenant_user.id),
            "name": tenant_user.get_full_name()
            if hasattr(tenant_user, "get_full_name")
            else tenant_user.username,
            "contact": getattr(tenant_user, "email", ""),
        }
        # Agent
        agent = None
        if instance.agent:
            agent = {
                "id": str(instance.agent.id),
                "name": instance.agent.get_full_name()
                if hasattr(instance.agent, "get_full_name")
                else instance.agent.username,
                "contact": getattr(instance.agent, "email", ""),
            }
        # Compose representation
        return {
            "id": str(instance.id),
            "name": node.name,
            "type": getattr(unit_detail, "management_status", "")
            if unit_detail
            else node.node_type,
            "status": getattr(unit_detail, "status", "") if unit_detail else "",
            "rental_price": format_money_with_currency(
                float(instance.rent_amount)
            ),
            "size": getattr(unit_detail, "size", "") if unit_detail else "",
            "tenant": tenant,
            "agent": agent,
            "rental_start": instance.contract_start,
            "rental_end": instance.contract_end,
            "identifier": getattr(unit_detail, "identifier", "") if unit_detail else "",
            "project": project,
            "location_node": {"block": block, "floor": floor},
            "thumbnail": thumbnail,
        }
