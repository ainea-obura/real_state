from django.urls import path

from payments.payment import (
    PaymentStatsSummaryView,
    PaymentTableListView,
    RecordPaymentView,
    TransactionsListView,
    UnpaidInvoicesForUserView,
    UpdateBillsFromTransactionView,
)
from payments.transaction_upload import BulkTransactionUploadView

urlpatterns = [
    path(
        "unpaid-invoices",
        UnpaidInvoicesForUserView.as_view(),
        name="unpaid-invoices-for-tenant",
    ),
    path(
        "record-payment",
        RecordPaymentView.as_view(),
        name="record-payment",
    ),
    path(
        "stats",
        PaymentStatsSummaryView.as_view(),
        name="payment-stats",
    ),
    path(
        "table",
        PaymentTableListView.as_view(),
        name="payment-table",
    ),
    path(
        "update-bills",
        UpdateBillsFromTransactionView.as_view(),
        name="update-bills",
    ),
    path(
        "transactions",
        TransactionsListView.as_view(),
        name="transactions-list",
    ),
    path(
        "transactions/bulk-upload",
        BulkTransactionUploadView.as_view(),
        name="bulk-transaction-upload",
    ),
]
