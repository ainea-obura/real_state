from django.urls import path

from .project_service_view import (
    ProjectServiceCreateView,
    ProjectServiceDeleteView,
    ProjectServiceListView,
    ProjectServiceOverviewView,
    ProjectServiceStatisticsView,
    ProjectServiceUpdateView,
)

urlpatterns = [
    # Project Service Overview and Statistics
    path(
        "<uuid:project_detail_id>/service-overview",
        ProjectServiceOverviewView.as_view(),
        name="project-service-overview",
    ),
    path(
        "<uuid:project_detail_id>/statistics",
        ProjectServiceStatisticsView.as_view(),
        name="project-service-statistics",
    ),
    # Project Service CRUD operations
    path(
        "<uuid:project_detail_id>/services",
        ProjectServiceListView.as_view(),
        name="project-service-list",
    ),
    path(
        "<uuid:project_detail_id>/services/create",
        ProjectServiceCreateView.as_view(),
        name="project-service-create",
    ),
    path(
        "<uuid:project_detail_id>/services/<uuid:id>/update",
        ProjectServiceUpdateView.as_view(),
        name="project-service-update",
    ),
    path(
        "<uuid:project_detail_id>/services/<uuid:id>/delete",
        ProjectServiceDeleteView.as_view(),
        name="project-service-delete",
    ),
]
