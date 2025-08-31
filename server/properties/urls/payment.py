from django.urls import path

from properties.payment import ProjectPaymentReportView

urlpatterns = [
    path(
        "<uuid:project_id>/payment-report",
        ProjectPaymentReportView.as_view(),
        name="project-payment-report",
    )
]
