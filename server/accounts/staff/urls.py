from django.urls import path

from .views import (
    StaffCreateView,
    StaffDeleteView,
    StaffDetailView,
    StaffRestoreView,
    StaffStatsView,
    StaffTableListView,
    StaffUpdateView,
    UserPermissionsView,
)

app_name = "staff"

urlpatterns = [
    path("list", StaffTableListView.as_view(), name="staff-list"),
    path("create", StaffCreateView.as_view(), name="staff-create"),
    path("stats", StaffStatsView.as_view(), name="staff-stats"),
    path("<str:staff_id>", StaffDetailView.as_view(), name="staff-detail"),
    path("<str:staff_id>/update", StaffUpdateView.as_view(), name="staff-update"),
    path("<str:staff_id>/delete", StaffDeleteView.as_view(), name="staff-delete"),
    path("<str:staff_id>/restore", StaffRestoreView.as_view(), name="staff-restore"),
    path("<str:user_id>/permissions", UserPermissionsView.as_view(), name="user-permissions"),
]
