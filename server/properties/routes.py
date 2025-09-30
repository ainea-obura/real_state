from django.urls import include, path

from .clients import (
    AgencyCreateView,
    AgencyListView,
    AgencyRetrieveView,
    AgencyUpdateView,
    BulkClientUploadView,
    OwnerCreateView,
    OwnerIncomeDetailView,
    OwnerInvoicesView,
    OwnerListView,
    OwnerPropertiesView,
    OwnerRetrieveView,
    OwnerUpdateView,
    ProjectOwnerAssignView,
    ProjectOwnerSearchView,
    ProjectOwnersReadView,
    PropertyOwnershipDeleteView,
    TenantCreateView,
    TenantDeleteView,
    TenantListView,
    TenantRetrieveView,
    TenantUpdateView,
)
from .projects import (
    ProjectDetailCreateView,
    ProjectDetailDeleteView,
    ProjectDetailListView,
    ProjectDetailRetrieveView,
    ProjectDetailUpdateView,
    ProjectOverviewView,
)
from .structure import (
    ApartmentCheckView,
    ApartmentCreateView,
    ApartmentEditView,
    BasementCreateView,
    BlockCreateView,
    BlockEditView,
    BulkStructureUploadView,
    DeleteLocationTreeView,
    HouseCreateView,
    LocationNodeTreeView,
    NodeDeleteView,
    RoomCreateView,
    RoomEditView,
    VillaEditView,
)
from .tenant import (
    AssignTenantToUnitView,
    PropertyAssignmentDetailView,
    PropertyAssignmentListView,
    PropertyStatsView,
    PropertyTenantDeleteView,
    PropertyTenantDetailView,
    PropertyTenantListAllView,
    PropertyTenantListView,
    PropertyTenantUpdateView,
    TenantDashboardView,
    TenantFinanceSummaryView,
    TenantLeaseStatsView,
    TenantLeaseSummaryView,
    TenantOverviewView,
    TenantProfileView,
    TenantPropertyAssignmentStatsView,
    TenantUserSearchView,
    TenantVerificationStatusUpdateView,
    TenantVerificationView,
    VacateTenantView,
)

urlpatterns = [
    path("verification/", include("properties.urls.verification")),
    path("rent/", include("properties.urls.rent")),
    path("services/", include("properties.urls.service")),
    path("basement/", include("properties.urls.basement")),
    path("maintenance/", include("properties.urls.maintenance")),
    path("payments/", include("properties.urls.payment")),
    # ========================================
    # PROJECT ROUTES
    # ========================================
    path("", ProjectDetailListView.as_view(), name="project-list"),
    path("create", ProjectDetailCreateView.as_view(), name="project-create"),
    path("<uuid:pk>", ProjectDetailRetrieveView.as_view(), name="project-detail"),
    path("<uuid:pk>/update", ProjectDetailUpdateView.as_view(), name="project-update"),
    path("<uuid:pk>/delete", ProjectDetailDeleteView.as_view(), name="project-delete"),
    path("<uuid:pk>/overview", ProjectOverviewView.as_view(), name="project-overview"),
    # Project-specific owners
    path(
        "tenants/verify/status",
        TenantVerificationStatusUpdateView.as_view(),
        name="tenant-verification-status",
    ),
    path(
        "tenants/<uuid:tenant_id>/dashboard",
        TenantDashboardView.as_view(),
        name="tenant-dashboard",
    ),
    path(
        "tenants/<uuid:tenant_id>/overview",
        TenantOverviewView.as_view(),
        name="tenant-overview",
    ),
    path(
        "tenants/search",
        TenantUserSearchView.as_view(),
        name="tenant-search",
    ),
    path(
        "tenants/<uuid:tenant_id>/profile",
        TenantProfileView.as_view(),
        name="tenant-profile",
    ),
    path(
        "tenants/<uuid:tenant_id>/leases",
        TenantLeaseSummaryView.as_view(),
        name="tenant-lease-summary",
    ),
    path(
        "tenants/<uuid:tenant_id>/lease-stats",
        TenantLeaseStatsView.as_view(),
        name="tenant-lease-stats",
    ),
    path(
        "tenants/<uuid:tenant_id>/finance-summary",
        TenantFinanceSummaryView.as_view(),
        name="tenant-finance-summary",
    ),
    # PropertyTenant routes
    path(
        "apartment-tenants",
        PropertyTenantListView.as_view(),
        name="apartment-tenant-list",
    ),
    path(
        "<uuid:project_id>/assign-tenant",
        AssignTenantToUnitView.as_view(),
        name="assign-tenant",
    ),
    path(
        "apartment-tenants/all",
        PropertyTenantListAllView.as_view(),
        name="apartment-tenant-list-all",
    ),
    path(
        "apartment-tenants/<uuid:assignment_id>/vacate",
        VacateTenantView.as_view(),
        name="apartment-tenant-vacate",
    ),
    path(
        "apartment-tenants/<uuid:assignment_id>/update",
        PropertyTenantUpdateView.as_view(),
        name="apartment-tenant-update",
    ),
    path(
        "apartment-tenants/<uuid:assignment_id>/delete",
        PropertyTenantDeleteView.as_view(),
        name="apartment-tenant-delete",
    ),
    path(
        "apartment-tenants/<uuid:assignment_id>",
        PropertyTenantDetailView.as_view(),
        name="apartment-tenant-detail",
    ),
    path(
        "property-stats",
        PropertyStatsView.as_view(),
        name="property-stats",
    ),
    # Owner routes
    path("owners", OwnerListView.as_view(), name="owner-list"),
    path("owners/create", OwnerCreateView.as_view(), name="owner-create"),
    path("owners/<uuid:pk>", OwnerRetrieveView.as_view(), name="owner-detail"),
    path("owners/<uuid:pk>/update", OwnerUpdateView.as_view(), name="owner-update"),
    path(
        "owners/<uuid:pk>/properties",
        OwnerPropertiesView.as_view(),
        name="owner-properties",
    ),

    path(
        "owners/<uuid:pk>/income-detail",
        OwnerIncomeDetailView.as_view(),
        name="owner-income-detail",
    ),
    # Project owner routes
    path(
        "<uuid:project_detail_id>/owners",
        ProjectOwnersReadView.as_view(),
        name="project-owners-read",
    ),
    path(
        "<uuid:project_detail_id>/owners/assign",
        ProjectOwnerAssignView.as_view(),
        name="project-owner-assign",
    ),
    path(
        "owners/search/<str:search>",
        ProjectOwnerSearchView.as_view(),
        name="project-owner-search",
    ),
    path(
        "<uuid:project_detail_id>/owners/<uuid:node_id>/delete",
        PropertyOwnershipDeleteView.as_view(),
        name="property-ownership-delete",
    ),
    #    Structure routes
    path(
        "<uuid:pk>/structure/blocks/create",
        BlockCreateView.as_view(),
        name="block-create",
    ),
    path(
        "<uuid:pk>/structure/tree",
        LocationNodeTreeView.as_view(),
        name="location-node-tree",
    ),
    path(
        "<uuid:pk>/structure/tree/delete",
        DeleteLocationTreeView.as_view(),
        name="delete-location-node-tree",
    ),
    path(
        "<uuid:pk>/structure/node/delete",
        NodeDeleteView.as_view(),
        name="node-delete",
    ),
    path(
        "<uuid:pk>/structure/basements/create",
        BasementCreateView.as_view(),
        name="basement-create",
    ),
    # Block management
    path(
        "<uuid:pk>/structure/blocks/create",
        BlockCreateView.as_view(),
        name="block-create",
    ),
    path(
        "<uuid:pk>/structure/blocks/<uuid:block_id>/edit",
        BlockEditView.as_view(),
        name="block-edit",
    ),
    # Villa/House management
    path(
        "<uuid:pk>/structure/villas/create",
        HouseCreateView.as_view(),
        name="villa-create",
    ),
    path(
        "<uuid:pk>/structure/houses/<uuid:villa_id>/edit",
        VillaEditView.as_view(),
        name="house-edit",
    ),
    # Apartment/Unit management
    path(
        "<uuid:pk>/structure/apartment/create",
        ApartmentCreateView.as_view(),
        name="apartment-create",
    ),
    path(
        "<uuid:pk>/structure/apartment/<uuid:apartment_id>/edit",
        ApartmentEditView.as_view(),
        name="apartment-edit",
    ),
    # Room management
    path(
        "<uuid:pk>/structure/rooms/create",
        RoomCreateView.as_view(),
        name="room-create",
    ),
    path(
        "<uuid:pk>/structure/rooms/<uuid:room_id>/edit",
        RoomEditView.as_view(),
        name="room-edit",
    ),
    # Bulk structure upload
    path(
        "<uuid:pk>/structure/bulk-upload",
        BulkStructureUploadView.as_view(),
        name="bulk-structure-upload",
    ),
    # Apartment check
    # Apartment check
    path(
        "apartments/check",
        ApartmentCheckView.as_view(),
        name="apartment-check",
    ),
    # ========================================
    # OWNER ROUTES
    # ========================================
    path("owners", OwnerListView.as_view(), name="owner-list"),
    path("owners/create", OwnerCreateView.as_view(), name="owner-create"),
    path("owners/<uuid:pk>", OwnerRetrieveView.as_view(), name="owner-detail"),
    path("owners/<uuid:pk>/update", OwnerUpdateView.as_view(), name="owner-update"),
    path(
        "owners/<uuid:pk>/properties",
        OwnerPropertiesView.as_view(),
        name="owner-properties",
    ),
    path(
        "owners/<uuid:pk>/income-detail",
        OwnerIncomeDetailView.as_view(),
        name="owner-income-detail",
    ),
    path(
        "owners/<uuid:pk>/invoices",
        OwnerInvoicesView.as_view(),
        name="owner-invoices",
    ),
    
    
    # ========================================
    # TENANT ROUTES
    # ========================================
    path("tenants", TenantListView.as_view(), name="tenant-list"),
    path("tenants/create", TenantCreateView.as_view(), name="tenant-create"),
    path("tenants/<uuid:pk>", TenantRetrieveView.as_view(), name="tenant-detail"),
    path("tenants/<uuid:pk>/update", TenantUpdateView.as_view(), name="tenant-update"),
    path("tenants/<uuid:pk>/delete", TenantDeleteView.as_view(), name="tenant-delete"),
    
    # ========================================
    # BULK CLIENT UPLOAD ROUTES
    # ========================================
    path("clients/bulk-upload", BulkClientUploadView.as_view(), name="bulk-client-upload"),
    # Tenant verification
    path("tenants/verify", TenantVerificationView.as_view(), name="tenant-verify"),
    path(
        "tenants/verify/status",
        TenantVerificationStatusUpdateView.as_view(),
        name="tenant-verification-status",
    ),
    # Tenant-specific views
    path(
        "tenants/<uuid:tenant_id>/dashboard",
        TenantDashboardView.as_view(),
        name="tenant-dashboard",
    ),
    path(
        "tenants/<uuid:tenant_id>/overview",
        TenantOverviewView.as_view(),
        name="tenant-overview",
    ),
    # PropertyAssignment routes
    path(
        "property-assignments",
        PropertyAssignmentListView.as_view(),
        name="property-assignment-list",
    ),
    path(
        "property-assignments/<uuid:assignment_id>",
        PropertyAssignmentDetailView.as_view(),
        name="property-assignment-detail",
    ),
    path(
        "property-assignments/tenant/stats",
        TenantPropertyAssignmentStatsView.as_view(),
        name="property-assignment-stats-tenant",
    ),
    # Agency routes
    path("agencies", AgencyListView.as_view(), name="agency-list"),
    path("agencies/create", AgencyCreateView.as_view(), name="agency-create"),
    path("agencies/<uuid:pk>", AgencyRetrieveView.as_view(), name="agency-detail"),
    path("agencies/<uuid:pk>/update", AgencyUpdateView.as_view(), name="agency-update"),
    # ========================================
    # MEDIA ROUTES
    # ========================================
    path("media/", include("properties.management.media.urls")),
]

