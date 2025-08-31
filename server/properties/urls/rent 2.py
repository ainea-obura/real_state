from django.urls import path

from properties.management.rent import RentListView

urlpatterns = [
    path("list", RentListView.as_view(), name="rent-list"),
]
