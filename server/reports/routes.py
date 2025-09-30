from django.urls import path
from .views import (
    ServicesReportView,
    PerUnitSummaryReportView,
    ProfitLossReportView,
    CashFlowReportView,
    BalanceSheetReportView,
)

urlpatterns = [
    # Services Report endpoint (handles both services report and service summary report)
    path("services/", ServicesReportView.as_view(), name="services-report"),
    # Per Unit Summary Report endpoint
    path(
        "per-unit-summary/", PerUnitSummaryReportView.as_view(), name="per-unit-summary"
    ),
    # Financial Reports endpoints
    path("profit-loss/", ProfitLossReportView.as_view(), name="profit-loss-report"),
    path("cash-flow/", CashFlowReportView.as_view(), name="cash-flow-report"),
    path("balance-sheet/", BalanceSheetReportView.as_view(), name="balance-sheet-report"),
]
