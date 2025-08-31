from django.urls import path

from properties.maintenance import (
    MaintenanceRequestCreateView,
    MaintenanceRequestDeleteView,
    MaintenanceRequestDetailView,
    MaintenanceRequestListView,
    MaintenanceRequestStatsView,
    MaintenanceRequestStatusUpdateView,
    MaintenanceRequestUpdateView,
)

urlpatterns = [
    # List and create (GET, POST)
    path("", MaintenanceRequestListView.as_view(), name="maintenance-list"),
    path("create", MaintenanceRequestCreateView.as_view(), name="maintenance-create"),
    # Stats
    path("stats", MaintenanceRequestStatsView.as_view(), name="maintenance-stats"),
    # Detail, update, delete
    path("<str:id>", MaintenanceRequestDetailView.as_view(), name="maintenance-detail"),
    # path(
    #     "<str:id>/update",
    #     MaintenanceRequestUpdateView.as_view(),
    #     name="maintenance-update",
    # ),
    path(
        "<str:id>/delete",
        MaintenanceRequestDeleteView.as_view(),
        name="maintenance-delete",
    ),
    # Status update
    path(
        "<str:id>/status/",
        MaintenanceRequestStatusUpdateView.as_view(),
        name="maintenance-status-update",
    ),
]
