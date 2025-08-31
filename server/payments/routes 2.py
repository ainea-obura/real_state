from django.urls import include, path

urlpatterns = [
    path("invoices/", include("payments.urls.invoice")),
    path("payments/", include("payments.urls.payment")),
    path("rent-roll/", include("payments.rent-rolls.routes")),
    path("currency/", include("payments.urls.currency")),
    path("payouts/", include("payments.payouts.routes")),
    path("expenses/", include("payments.urls.expense")),
    path("vendors/", include("payments.urls.vendor")),
    path("transactions/", include("payments.transactions.urls")),
    path("instant-payment-notification/", include("payments.instant_pyment_notifcaiton.routes")),
    path("task-settings/", include("payments.urls.task_settings")),
]
