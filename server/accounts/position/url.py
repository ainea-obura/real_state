from django.urls import path

from .views import (
    PositionCreateView,
    PositionDeleteView,
    PositionTableListView,
    PositionUpdateView,
)

urlpatterns = [
    path("list", PositionTableListView.as_view(), name="position-list"),
    path("create", PositionCreateView.as_view(), name="position-create"),
    path(
        "<uuid:pk>/update",
        PositionUpdateView.as_view(),
        name="position-update",
    ),
    path(
        "<uuid:position_id>/delete",
        PositionDeleteView.as_view(),
        name="position-delete",
    ),
]
