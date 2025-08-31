from django.urls import path

from .views import (
    PenaltyListView,
    PenaltyCreateView,
    PenaltyDetailView,
    PenaltyUpdateView,
    PenaltyWaiveView,
    PenaltyDeleteView,
    PenaltyStatsView,
    PenaltySettingsView,
    TenantSearchView,
)

urlpatterns = [
    # Penalty CRUD operations
    path("list/", PenaltyListView.as_view(), name="penalty-list"),
    path("create/", PenaltyCreateView.as_view(), name="penalty-create"),
    path("<uuid:id>/", PenaltyDetailView.as_view(), name="penalty-detail"),
    path("<uuid:id>/update/", PenaltyUpdateView.as_view(), name="penalty-update"),
    path("<uuid:id>/waive/", PenaltyWaiveView.as_view(), name="penalty-waive"),
    path("<uuid:id>/delete/", PenaltyDeleteView.as_view(), name="penalty-delete"),
    # Statistics and settings
    path("stats/", PenaltyStatsView.as_view(), name="penalty-stats"),
    path("settings/", PenaltySettingsView.as_view(), name="penalty-settings"),
    # Tenant search for penalty creation
    path("search-tenants/", TenantSearchView.as_view(), name="tenant-search"),
]
