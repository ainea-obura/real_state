from django.urls import path

from .clients import (
    OwnerCreateView,
    OwnerListView,
    OwnerRetrieveView,
    OwnerUpdateView,
    TenantCreateView,
    TenantListView,
    TenantRetrieveView,
    TenantUpdateView,
)
from .views import (
    ProjectCreateView,
    ProjectDetailView,
    ProjectListView,
    PropertyCreateView,
    PropertyListView,
)
from .structure import (
    PropertyStructureReadView,
    PropertyStructureCreateView,
    StructureUpdateView,
    StructureDeleteView,
)
from .views_property_tenant import (
    PropertyTenantListView,
    PropertyTenantCreateView,
    PropertyTenantRetrieveView,
    PropertyTenantUpdateView,
    PropertyTenantDeleteView,
    TenantUserSearchView,
)

urlpatterns = [
    # Project routes
    path("projects", ProjectListView.as_view(), name="project-list"),
    path("projects/create", ProjectCreateView.as_view(), name="project-create"),
    path("projects/<uuid:node_id>", ProjectDetailView.as_view(), name="project-detail"),
    # Property routes
    path("create", PropertyCreateView.as_view(), name="property-create"),
    path("properties", PropertyListView.as_view(), name="property-list"),

    # Tenant routes
    path("tenants", TenantListView.as_view(), name="tenant-list"),
    path("tenants/create", TenantCreateView.as_view(), name="tenant-create"),
    path("tenants/<uuid:pk>", TenantRetrieveView.as_view(), name="tenant-detail"),
    path("tenants/<uuid:pk>/update", TenantUpdateView.as_view(), name="tenant-update"),
    path("tenants/search", TenantUserSearchView.as_view(), name="tenant-search"),

    # Owner routes
    path("owners", OwnerListView.as_view(), name="owner-list"),
    path("owners/create", OwnerCreateView.as_view(), name="owner-create"),
    path("owners/<uuid:pk>", OwnerRetrieveView.as_view(), name="owner-detail"),
    path("owners/<uuid:pk>/update", OwnerUpdateView.as_view(), name="owner-update"),
    # Structure Management URLs
    path(
        "<uuid:property_id>/structure",
        PropertyStructureReadView.as_view(),
        name="property-structure-read",
    ),
    path(
        "<uuid:property_id>/structure/create",
        PropertyStructureCreateView.as_view(),
        name="property-structure-create",
    ),
    path(
        "<uuid:property_id>/structure/<uuid:detail_id>/update",
        StructureUpdateView.as_view(),
        name="property-structure-update",
    ),
    path(
        "<uuid:property_id>/structure/<uuid:detail_id>/delete",
        StructureDeleteView.as_view(),
        name="property-structure-delete",
    ),
    # Property Tenant Assignment routes
    path(
        "property-tenant",
        PropertyTenantListView.as_view(),
        name="property-tenant-list",
    ),
    path(
        "property-tenant/create",
        PropertyTenantCreateView.as_view(),
        name="property-tenant-create",
    ),
    path(
        "property-tenant/<uuid:pk>",
        PropertyTenantRetrieveView.as_view(),
        name="property-tenant-detail",
    ),
    path(
        "property-tenant/<uuid:pk>/update",
        PropertyTenantUpdateView.as_view(),
        name="property-tenant-update",
    ),
    path(
        "property-tenant/<uuid:pk>/delete",
        PropertyTenantDeleteView.as_view(),
        name="property-tenant-delete",
    ),
]
