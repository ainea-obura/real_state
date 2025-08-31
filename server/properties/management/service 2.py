import random

from datetime import date

from django.utils.dateparse import parse_date
from rest_framework.generics import ListAPIView
from rest_framework.response import Response

from properties.models import (
    LocationNode,
    ProjectDetail,
    PropertyService,
)
from properties.serializers.service import ServiceCardSerializer


class ServiceCardListView(ListAPIView):
    pagination_class = None
    serializer_class = ServiceCardSerializer

    def get(self, request, *args, **kwargs):
        project = request.query_params.get("project", "")
        block = request.query_params.get("block", "")
        # Filter nodes by project if provided
        if project:
            try:
                project_detail = ProjectDetail.objects.get(id=project)
                project_node = project_detail.node
                node_filter = {
                    "tree_id": project_node.tree_id,
                    "lft__gt": project_node.lft,
                    "rght__lt": project_node.rght,
                }
            except ProjectDetail.DoesNotExist:
                return Response({"error": False, "data": []})
        else:
            node_filter = {}

        # Find all nodes with at least one PropertyService
        service_nodes = (
            LocationNode.objects.filter(**node_filter)
            .filter(services__isnull=False)
            .distinct()
        )
        
        # Filter by block if specified
        if block:
            try:
                block_node = LocationNode.objects.get(id=block)
                # Filter nodes to only include those that are descendants of the selected block
                block_filtered_nodes = []
                for node in service_nodes:
                    # Check if the node is a descendant of the selected block
                    if (node.tree_id == block_node.tree_id and 
                        node.lft > block_node.lft and 
                        node.rght < block_node.rght):
                        block_filtered_nodes.append(node)
                service_nodes = block_filtered_nodes
            except LocationNode.DoesNotExist:
                return Response({"error": False, "data": []})
        results = []
        for node in service_nodes:
            property_services = node.services.all()
            if not property_services:
                continue
            # Compose descendant path
            block = floor = house = ""
            block_id = ""
            ancestor = node.parent
            project_node = None
            while ancestor:
                if ancestor.node_type == "BLOCK":
                    block = ancestor.name
                    block_id = str(ancestor.id)
                elif ancestor.node_type == "FLOOR":
                    floor = ancestor.name
                elif ancestor.node_type == "HOUSE":
                    house = ancestor.name
                    if not block_id:  # If no block found, use house as block
                        block_id = str(ancestor.id)
                elif ancestor.node_type == "PROJECT":
                    project_node = ancestor
                ancestor = ancestor.parent
            descendant = " → ".join(filter(None, [block, floor, house]))
            # Thumbnail
            media_qs = node.media.all()
            if media_qs.exists():
                media_obj = random.choice(list(media_qs))
                thumbnail = media_obj.media.url if media_obj.media else ""
            else:
                thumbnail = ""
            # Services
            services = [
                {"id": str(ps.service.id), "name": ps.service.name}
                for ps in property_services
            ]
            # Use first PropertyService for status/start/end
            first_ps = property_services[0]
            status = first_ps.status.lower()
            start_date = first_ps.start_date.isoformat() if first_ps.start_date else ""
            end_date = first_ps.end_date.isoformat() if first_ps.end_date else ""
            # ProjectDetail id
            if project_node:
                try:
                    project_detail_id = str(project_node.project_detail.id)
                except Exception:
                    project_detail_id = ""
            else:
                project_detail_id = ""
            # Compose card
            card = {
                "id": str(node.id),
                "name": node.name,
                "status": status,
                "thumbnail": thumbnail,
                "services": services,
                "start_date": start_date,
                "end_date": end_date,
                "descendant": descendant,
                "project_id": project_detail_id,
                "block_id": block_id,
            }
            results.append(card)
        serializer = self.get_serializer(results, many=True)
        return Response({"error": False, "data": serializer.data})
