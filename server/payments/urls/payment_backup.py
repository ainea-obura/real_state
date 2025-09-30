from django.urls import path

from payments.payment import (
    PaymentStatsSummaryView,
    PaymentTableListView,
    RecordPaymentView,
    UnpaidInvoicesForUserView,
)

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
    )
]
