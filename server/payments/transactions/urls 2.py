from django.urls import path
from .views import TransactionsAggregateView

urlpatterns = [
    path("", TransactionsAggregateView.as_view(), name="transactions-aggregate"),
]
