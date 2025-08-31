from django.urls import path
from .views import (
    DashboardStatsView,
    FinanceSummaryView,
    RecentTransactionsView,
    QuickActionsView,
    AlertsView,
)

app_name = "dashboard"

urlpatterns = [
    path("stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("finance-summary/", FinanceSummaryView.as_view(), name="finance-summary"),
    path(
        "recent-transactions/",
        RecentTransactionsView.as_view(),
        name="recent-transactions",
    ),
    path("quick-actions/", QuickActionsView.as_view(), name="quick-actions"),
    path("alerts/", AlertsView.as_view(), name="alerts"),
]
