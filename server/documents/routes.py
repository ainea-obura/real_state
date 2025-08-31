from django.urls import include, path

from .views import (
    ContractTemplateCreateView,
    ContractTemplateDeleteView,
    ContractTemplateDetailView,
    ContractTemplateListView,
    DocumentVariableListView,
)

urlpatterns = [
    path(
        "",
        ContractTemplateListView.as_view(),
        name="contracttemplate-list",
    ),
    path(
        "templates/<uuid:pk>/",
        ContractTemplateDetailView.as_view(),
        name="contracttemplate-detail",
    ),
    path(
        "templates/<uuid:pk>/delete/",
        ContractTemplateDeleteView.as_view(),
        name="contracttemplate-delete",
    ),
    path("variables/", DocumentVariableListView.as_view(), name="document-variables"),
    path(
        "create/", ContractTemplateCreateView.as_view(), name="contracttemplate-create"
    ),
    path("tenant-documents/", include("documents.tenant_docs.urls")),
    path("kyc/", include("documents.kyc_documents.urls")),
]
