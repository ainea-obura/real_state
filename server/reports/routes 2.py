from django.urls import path
from .views import (
    ServicesReportView,
    PerUnitSummaryReportView,
)

urlpatterns = [
    # Services Report endpoint (handles both services report and service summary report)
    path("services/", ServicesReportView.as_view(), name="services-report"),
    # Per Unit Summary Report endpoint
    path(
        "per-unit-summary/", PerUnitSummaryReportView.as_view(), name="per-unit-summary"
    ),
]
