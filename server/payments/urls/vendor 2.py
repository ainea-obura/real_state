from django.urls import path

from payments.vendor import VendorCreateView, VendorListView, VendorStatsSummaryView, VendorUpdateView, VendorDeleteView

urlpatterns = [
    path("", VendorListView.as_view(), name="vendor-list"),
    path("create", VendorCreateView.as_view(), name="vendor-create"),
    path("stats", VendorStatsSummaryView.as_view(), name="vendor-stats"),
    path("<uuid:pk>/update", VendorUpdateView.as_view(), name="vendor-update"),
    path("<uuid:pk>/delete", VendorDeleteView.as_view(), name="vendor-delete"),
]
