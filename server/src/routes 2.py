from django.contrib import admin
from django.urls import include, path

from payments.payment_call_back import view
from properties import (
    project_service_routes,
    routes as properties_routes,
    service_routes,
)
from payments.instant_pyment_notifcaiton.views import InstantPaymentNotificationView

from company.views import BusinessOnboardingCallBackView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("otp.routes")),
    path("api/v1/", include("accounts.routes")),
    path("api/v1/companies/", include("company.routes")),
    path("api/v1/projects/", include("properties.routes")),
    path("api/v1/services/", include(service_routes)),
    path("api/v1/project-services/", include(project_service_routes)),
    path("api/v1/finance/", include("payments.routes")),
    path("api/v1/penalties/", include("payments.penalties.urls")),
    path("api/v1/reports/", include("reports.routes")),
    path("api/v1/documents/", include("documents.routes")),
    path("api/v1/positions/", include("accounts.position.url")),
    path("api/v1/staff/", include("accounts.staff.urls")),
    path("api/v1/dashboard/", include("dashboard.urls")),
    path("api/v1/sales/", include("sales.routes")),
    path("api/v1/paymentcallback/", view.PaymentCallBackView.as_view()),
    path("api/v1/payoutcallback/", view.PayoutCallBackView.as_view()),
    path("api/v1/expensecallback/", view.ExpenseCallBackView.as_view()),
    path("api/v1/credit-note-callback/", view.CreditNoteCallBackView.as_view()),
    path("api/v1/paybillCallback/", view.PayBillCallBackView.as_view()),
    path(
        "api/v1/instant-payment-notification/", InstantPaymentNotificationView.as_view()
    ),
    path(
        "api/v1/bussinessOnBoardingCallbak/",
        BusinessOnboardingCallBackView.as_view(),
    ),
]

urlpatterns += properties_routes.urlpatterns
