from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from properties.models import LocationNode, Media
from .serializers import (
    ProjectNodeSerializer,
    MediaUploadSerializer,
    MediaWithPropertySerializer,
)
from django.db import models
from rest_framework.parsers import MultiPartParser, FormParser


class ProjectSearchView(APIView):
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response(
                {"detail": 'Query parameter "q" is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        projects = LocationNode.objects.filter(node_type="PROJECT").filter(
            models.Q(name__icontains=query)
            | models.Q(project_detail__project_code__icontains=query)
        )
        serializer = ProjectNodeSerializer(projects, many=True)
        return Response(
            {
                "error": False,
                "message": "Projects fetched successfully",
                "data": {
                    "count": projects.count(),
                    "results": serializer.data,
                },
            },
            status=status.HTTP_200_OK,
        )


class MediaUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = MediaUploadSerializer(data=request.data)
        if serializer.is_valid():
            created = serializer.save()
            # Serialize created media info
            data = [
                {
                    "id": str(m.id),
                    "file_type": m.file_type,
                    "location_node": str(m.location_node_id),
                    "media": m.media.url if m.media else None,
                    "created_at": m.created_at,
                }
                for m in created
            ]
            return Response(
                {"success": True, "media": data}, status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MediaListView(APIView):
    def get(self, request):
        images = Media.objects.filter(file_type="image").select_related("location_node")
        # Group images by property (location_node)
        property_map = {}
        for image in images:
            node = image.location_node
            if node.id not in property_map:
                # Use the serializer to get property details (including parent structure)
                property_data = MediaWithPropertySerializer(image).data["property"]
                property_map[node.id] = {**property_data, "images": []}
            # Serialize image (excluding property key to avoid duplication)
            image_data = MediaWithPropertySerializer(image).data
            image_data.pop("property", None)
            property_map[node.id]["images"].append(image_data)
        results = list(property_map.values())
        return Response(
            {
                "error": False,
                "message": "Media fetched successfully",
                "data": {"count": len(results), "results": results},
            },
            status=status.HTTP_200_OK,
        )


class MediaDeleteView(APIView):
    def delete(self, request, id):
        if not id:
            return Response(
                {"detail": "Missing 'id' parameter in URL."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            media = Media.objects.filter(id=id)
            media.delete()
            return Response(
                {"success": True, "message": "Media deleted."},
                status=status.HTTP_200_OK,
            )
        except Media.DoesNotExist:
            return Response(
                {"detail": "Media not found."}, status=status.HTTP_404_NOT_FOUND
            )
