from django.urls import path

from ..expense import (
    ExpenseCreateView,
    ExpenseDestroyView,
    ExpenseStatsSummaryView,
    ExpenseTableListView,
    ExpensePayView,
    ExpenseApproveView,
    ExpenseRejectView,
    PendingCommissionsView,
    CreateCommissionExpensesView,
)

urlpatterns = [
    path("", ExpenseTableListView.as_view(), name="expense-list"),
    path("stats", ExpenseStatsSummaryView.as_view(), name="expense-stats"),
    path("create", ExpenseCreateView.as_view(), name="expense-create"),
    path("<uuid:pk>/delete", ExpenseDestroyView.as_view(), name="expense-delete"),
    path("<uuid:pk>/pay", ExpensePayView.as_view(), name="expense-pay"),
    path("<uuid:expense_id>/approve", ExpenseApproveView.as_view(), name="expense-approve"),
    path("<uuid:expense_id>/reject", ExpenseRejectView.as_view(), name="expense-reject"),
    path("commissions/pending", PendingCommissionsView.as_view(), name="pending-commissions"),
    path("commissions/create", CreateCommissionExpensesView.as_view(), name="create-commission-expenses"),
]
