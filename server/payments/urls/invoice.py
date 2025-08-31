from django.urls import path

from payments.invoice import (
    InvoiceCancelView,
    InvoiceCreateView,
    InvoiceDeleteView,
    InvoiceDetailView,
    InvoiceDownloadPDFView,
    InvoiceSendView,
    InvoiceStatsSummaryView,
    InvoiceTableListView,
    InvoiceUpdateView,
    OwnerInvoicesView,
    OwnerNodeItemDetailsView,
    RecipientUserListView,
    TenantInvoicesView,
    TenantUnitItemDetailsView,
)
from payments.payment import CreateCreditNoteView

urlpatterns = [
    path("search", RecipientUserListView.as_view(), name="recipient-user-list"),
    path(
        "tenant-unit-items",
        TenantUnitItemDetailsView.as_view(),
        name="tenant-unit-item-details",
    ),
    path(
        "owner-node-items",
        OwnerNodeItemDetailsView.as_view(),
        name="owner-node-item-details",
    ),
    path("create-invoice", InvoiceCreateView.as_view(), name="invoice-create"),
    path("stats-summary", InvoiceStatsSummaryView.as_view(), name="invoice-stats"),
    path("list", InvoiceTableListView.as_view(), name="invoice-table"),
    path("tenant-invoices", TenantInvoicesView.as_view(), name="tenant-invoices"),
    path("owner-invoices", OwnerInvoicesView.as_view(), name="owner-invoices"),
    path(
        "<uuid:invoice_id>/detail",
        InvoiceDetailView.as_view(),
        name="invoice-detail",
    ),
    path(
        "<uuid:invoice_id>/download-pdf",
        InvoiceDownloadPDFView.as_view(),
        name="invoice-download-pdf",
    ),
    path(
        "<uuid:invoice_id>/update",
        InvoiceUpdateView.as_view(),
        name="invoice-update",
    ),
    path(
        "<uuid:invoice_id>/delete",
        InvoiceDeleteView.as_view(),
        name="invoice-delete",
    ),
    path(
        "<uuid:invoice_id>/cancel",
        InvoiceCancelView.as_view(),
        name="invoice-cancel",
    ),
    path(
        "<uuid:invoice_id>/send",
        InvoiceSendView.as_view(),
        name="invoice-send",
    ),
    path(
        "create-credit-note",
        CreateCreditNoteView.as_view(),
        name="create-credit-note",
    ),
]
