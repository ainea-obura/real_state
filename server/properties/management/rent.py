import random

from datetime import date

from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response

from properties.models import (
    LocationNode,
    ProjectDetail,
    PropertyTenant,
    UnitDetail,
    VillaDetail,
)
from utils.format import format_money_with_currency


class RentListView(ListAPIView):
    pagination_class = None  # No pagination

    def get(self, request, *args, **kwargs):
        project = request.query_params.get("project", "")
        block = request.query_params.get("block", "")
        date_from = request.query_params.get("from")
        date_to = request.query_params.get("to")
        today = date.today()

        # Step 1: Get the project node from ProjectDetail
        if project:
            try:
                project_detail = ProjectDetail.objects.get(id=project)
                project_node = project_detail.node
                node_filter = {
                    "tree_id": project_node.tree_id,
                    "lft__gt": project_node.lft,
                    "rght__lt": project_node.rght,
                    "node_type__in": ["UNIT", "HOUSE"],
                }
            except ProjectDetail.DoesNotExist:
                return Response({"error": False, "data": []})
        else:
            node_filter = {"node_type__in": ["UNIT", "HOUSE"]}

        nodes = LocationNode.objects.filter(**node_filter).select_related("unit_detail", "villa_detail")
        
        # Step 2: Filter by block if specified
        if block:
            try:
                block_node = LocationNode.objects.get(id=block)
                # Filter nodes to only include those that are descendants of the selected block
                block_filtered_nodes = []
                for node in nodes:
                    # Check if the node is a descendant of the selected block
                    if (node.tree_id == block_node.tree_id and 
                        node.lft > block_node.lft and 
                        node.rght < block_node.rght):
                        block_filtered_nodes.append(node)
                nodes = block_filtered_nodes
            except LocationNode.DoesNotExist:
                return Response({"error": False, "data": []})
        results = []
        for node in nodes:
            # Step 3: Only include nodes with details
            unit_detail = getattr(node, "unit_detail", None)
            villa_detail = getattr(node, "villa_detail", None)
            if not unit_detail and not villa_detail:
                continue  # skip nodes without details

            # Find active tenant (latest contract_end in the future or null)
            tenant_qs = PropertyTenant.objects.filter(node=node)
            if date_from:
                tenant_qs = tenant_qs.filter(contract_end__gte=parse_date(date_from))
            if date_to:
                tenant_qs = tenant_qs.filter(contract_start__lte=parse_date(date_to))
            tenant = tenant_qs.order_by("-contract_end").first()
            if not tenant:
                continue  # skip nodes without a tenant

            if unit_detail:
                type_ = getattr(unit_detail, "management_status", node.node_type)
                status = getattr(unit_detail, "status", "available")
                size = getattr(unit_detail, "size", "")
                identifier = getattr(unit_detail, "identifier", "")
                rental_price = float(getattr(unit_detail, "rental_price", 0) or 0)
            else:  # villa_detail
                type_ = getattr(villa_detail, "management_mode", node.node_type)
                status = "available"
                size = ""
                identifier = getattr(villa_detail, "name", "")
                rental_price = 0

            # Thumbnail: random media from node.media, or placeholder
            media_qs = node.media.all()
            if media_qs.exists():
                media_obj = random.choice(list(media_qs))
                thumbnail = media_obj.media.url if media_obj.media else ""
            else:
                thumbnail = ""

            # Traverse ancestors for block, floor, project
            block = floor = project_name = ""
            ancestor = node.parent
            while ancestor:
                if ancestor.node_type == "BLOCK":
                    block = ancestor.name
                elif ancestor.node_type == "FLOOR":
                    floor = ancestor.name
                elif ancestor.node_type == "PROJECT":
                    project_name = ancestor.name
                ancestor = ancestor.parent

            tenant_user = tenant.tenant_user
            tenant_info = {
                "id": str(tenant_user.id),
                "name": tenant_user.get_full_name() if hasattr(tenant_user, "get_full_name") else tenant_user.username,
                "contact": getattr(tenant_user, "email", ""),
            }
            agent_info = None
            if tenant.agent:
                agent_info = {
                    "id": str(tenant.agent.id),
                    "name": tenant.agent.get_full_name() if hasattr(tenant.agent, "get_full_name") else tenant.agent.username,
                    "contact": getattr(tenant.agent, "email", ""),
                }
            rental_start = tenant.contract_start.isoformat() if tenant.contract_start else None
            rental_end = tenant.contract_end.isoformat() if tenant.contract_end else None
            days_remaining = max((tenant.contract_end - today).days, 0) if tenant.contract_end else None
            status = "rented"

            results.append({
                "id": str(node.id),
                "name": node.name,
                "type": type_,
                "status": status,
                "rental_price": format_money_with_currency(rental_price),
                "size": size,
                "tenant": tenant_info,
                "agent": agent_info,
                "rental_start": rental_start,
                "rental_end": rental_end,
                "identifier": identifier,
                "project": project_name,
                "location_node": {"block": block, "floor": floor},
                "thumbnail": thumbnail,
                "days_remaining": days_remaining,
            })
        return Response({"error": False, "data": results})
