from django.urls import path

from payments.currency import (
    CurrencyCreateView,
    CurrencyDeleteView,
    CurrencyDropdownView,
    CurrencyListView,
    CurrencyRetrieveView,
    CurrencySetDefaultView,
    CurrencyStatsSummaryView,
    CurrencyUpdateView,
)

urlpatterns = [
    path("", CurrencyListView.as_view(), name="currency-list"),
    path("create", CurrencyCreateView.as_view(), name="currency-create"),
    path("<uuid:pk>", CurrencyRetrieveView.as_view(), name="currency-retrieve"),
    path("<uuid:pk>/update", CurrencyUpdateView.as_view(), name="currency-update"),
    path("<uuid:pk>/delete", CurrencyDeleteView.as_view(), name="currency-delete"),
    path("dropdown", CurrencyDropdownView.as_view(), name="currency-dropdown"),
    path("stats", CurrencyStatsSummaryView.as_view(), name="currency-stats"),
    path("<uuid:pk>/set-default", CurrencySetDefaultView.as_view(), name="currency-set-default"),
]
