from django.urls import path
from . import views

app_name = "payouts"

urlpatterns = [
    path("", views.PayoutListView.as_view(), name="payout-list"),
    path(
        "<uuid:pk>/",
        views.PayoutStatusUpdateView.as_view(),
        name="payout-status-update",
    ),
]
