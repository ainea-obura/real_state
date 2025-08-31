from django.urls import path

from .views import TenantAgreementListView, TenantAgreementStatusUpdateView, TenantAgreementSignView

urlpatterns = [
    path("", TenantAgreementListView.as_view(), name="tenant-agreement-list"),
    path(
        "<uuid:pk>/",
        TenantAgreementStatusUpdateView.as_view(),
        name="tenant-agreement-update",
    ),
    path("sign/", TenantAgreementSignView.as_view(), name="tenant-agreement-sign"),
]
