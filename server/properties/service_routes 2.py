from django.urls import path

from properties.service_view import (
    ServiceCreateView,
    ServiceDestroyView,
    ServiceListView,
    ServiceRetrieveView,
    ServiceUpdateView,
)

urlpatterns = [
    # Service CRUD routes using DRF Generic Views
    path("create/", ServiceCreateView.as_view(), name="create_service"),
    path("", ServiceListView.as_view(), name="list_services"),
    path("<uuid:id>/", ServiceRetrieveView.as_view(), name="get_service"),
    path("<uuid:id>/update/", ServiceUpdateView.as_view(), name="update_service"),
    path("<uuid:id>/delete/", ServiceDestroyView.as_view(), name="delete_service"),
]
