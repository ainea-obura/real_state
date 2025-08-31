import json

import django_filters

from django.db import transaction
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import (
    CreateAPIView,
    DestroyAPIView,
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from properties.models import ProjectDetail
from utils.custom_pagination import CustomPageNumberPagination

from .serializers.project_details import (
    ProjectDetailListSerializer,
    ProjectDetailWriteSerializer,
    ProjectOverviewSerializer,
)


class ProjectDetailFilters(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status", lookup_expr="iexact")
    project_type = django_filters.CharFilter(
        field_name="project_type", lookup_expr="iexact"
    )
    city = django_filters.CharFilter(field_name="city__name", lookup_expr="icontains")

    class Meta:
        model = ProjectDetail
        fields = ["status", "project_type", "city"]


@extend_schema(
    tags=["Projects"],
    description="List all projects (paginated, cached, filterable, not deleted).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class ProjectDetailListView(ListAPIView):
    serializer_class = ProjectDetailListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = ProjectDetailFilters

    def get_queryset(self):
        return ProjectDetail.objects.select_related("node", "city").filter(
            is_deleted=False
        )

    def list(self, request, *args, **kwargs):
        is_dropdown = request.query_params.get("is_dropdown", False)

        if is_dropdown:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(
                {"error": False, "data": serializer.data}, status=status.HTTP_200_OK
            )

        page_number = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 10)
        params = request.query_params.dict()
        params.pop("page", None)
        params.pop("page_size", None)
        filters = json.dumps(params, sort_keys=True)
        # cache_key = (
        #     f"projects-list:page:{page_number}:page_size:{page_size}:filters:{filters}"
        # )
        # cached = cache.get(cache_key)
        # if cached:
        #     return Response({"error": False, "data": cached}, status=status.HTTP_200_OK)
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            data = paginated_response.data
            # cache.set(cache_key, data, timeout=600)
            return Response({"error": False, "data": data}, status=status.HTTP_200_OK)
        serializer = self.get_serializer(qs, many=True)
        data = serializer.data
        # cache.set(cache_key, data, timeout=600)
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Projects"],
    description="Create a new project (with automatic location node creation).",
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class ProjectDetailCreateView(CreateAPIView):
    serializer_class = ProjectDetailWriteSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Validate project_code uniqueness before serializer validation
        project_code = request.data.get("project_code")
        if project_code:
            if ProjectDetail.objects.filter(
                project_code=project_code, is_deleted=False
            ).exists():
                return Response(
                    {
                        "error": True,
                        "message": "A project with this project_code already exists.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        # clear_redis_cache("projects-list:*")
        # clear_redis_cache(f"project-detail:{project.pk}")
        return Response(
            {
                "error": False,
                "message": "Project created successfully",
                "data": {
                    "count": 0,
                    "results": [ProjectDetailListSerializer(project).data],
                },
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Projects"], description="Retrieve a project by ID (not deleted, cached)."
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class ProjectDetailRetrieveView(RetrieveAPIView):
    serializer_class = ProjectDetailListSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return ProjectDetail.objects.select_related("node", "city").filter(
            is_deleted=False
        )

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        # cache_key = f"project-detail:{pk}"
        # cached = cache.get(cache_key)
        # if cached:
        #     return Response(
        #         {"error": False, "data": {"count": 0, "results": json.loads(cached)}},
        #         status=status.HTTP_200_OK,
        #     )
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        # cache.set(cache_key, json.dumps(serializer.data, default=str), timeout=600)
        return Response(
            {"error": False, "data": {"count": 0, "results": serializer.data}},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Projects"], description="Update a project by ID.")
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PUT", block=True),
    name="dispatch",
)
class ProjectDetailUpdateView(UpdateAPIView):
    serializer_class = ProjectDetailWriteSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return ProjectDetail.objects.select_related("node", "city").filter(
            is_deleted=False
        )

    @transaction.atomic
    def put(self, request, *args, **kwargs):
        with transaction.atomic():
            instance = self.get_object()

            # Validate project_code uniqueness before serializer validation
            project_code = request.data.get("project_code")
            if project_code:
                existing_project = (
                    ProjectDetail.objects.filter(
                        project_code=project_code, is_deleted=False
                    )
                    .exclude(id=instance.id)
                    .first()
                )
                if existing_project:
                    return Response(
                        {
                            "error": True,
                            "message": "A project with this project_code already exists.",
                            "data": None,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # If you want to allow updating the node, handle it here
            # Otherwise, just update the project detail
            serializer = self.get_serializer(instance, data=request.data, partial=False)
            serializer.is_valid(raise_exception=True)
            project = serializer.save()
        # clear_redis_cache("projects-list:*")
        # clear_redis_cache(f"project-detail:{instance.pk}")
        return Response(
            {
                "error": False,
                "message": "Project updated successfully",
                "data": {
                    "count": 0,
                    "results": [ProjectDetailListSerializer(project).data],
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Projects"],
    description="Delete a project by ID (soft delete, sets is_deleted=True).",
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="DELETE", block=True),
    name="dispatch",
)
class ProjectDetailDeleteView(DestroyAPIView):
    serializer_class = ProjectDetailListSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return ProjectDetail.objects.select_related("node", "city").filter(
            is_deleted=False
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()
        # clear_redis_cache("projects-list:*")
        # clear_redis_cache(f"project-detail:{instance.pk}")


class ProjectOverviewView(RetrieveAPIView):
    serializer_class = ProjectOverviewSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return ProjectDetail.objects.filter(is_deleted=False)

    def retrieve(self, request, pk):
        # cache_key = f"project_overview_{pk}"
        # data = cache.get(cache_key)
        # if not data:
        try:
            project = ProjectDetail.objects.get(pk=pk)
        except ProjectDetail.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        serializer = ProjectOverviewSerializer(project)
        data = serializer.data
        # cache.set(cache_key, data, 60 * 5)  # Cache for 5 minutes
        return Response(data)
