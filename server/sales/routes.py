from django.urls import path
from . import views
from .assigment.serach_views import (
    ProjectSearchView,
    ProjectStructureView,
    OwnerSearchView,
    PaymentPlanTemplateView,
)
from .assigment.feature_card_view import FeatureCardView
from .assigment.dashboard_view import DashboardView
from .assigment.table_data_view import OwnerPropertyTableView
from .assigment.installments_table_view import InstallmentsTableView
from .assigment.assign_sales_person_view import AssignSalesPersonView
from .assigment.remove_sales_person_view import RemoveSalesPersonView
from .assigment.property_reservation_view import CreatePropertyReservationView
from .assigment.document_view import DocumentTemplateSearchView
from .assigment.document_list_view import DocumentListView
from .assigment.offer_letter_view import CreateOfferLetterView
from .assigment.offer_letter_search_view import OfferLetterSearchView
from .assigment.contract_view import ContractCreateView
from .reports.views import PropertySalesPerformanceReportView
from .reports.sales_team_performance_views import SalesTeamPerformanceReportView
from .reports.financial_collections_views import FinancialCollectionsReportView
from .reports.outstanding_payments_views import OutstandingPaymentsReportView
from .reports.agent_payouts_views import AgentPayoutsReportView
from .dashboads import views as dashboard_views
from .dashboads import urls as dashboard_urls

# URL patterns for sales module - complete wizard flow
urlpatterns = [
    # Create property sale (handles everything in one API call)
    path(
        "property-sales/create/",
        views.PropertySaleCreateView.as_view(),
        name="create-property-sale",
    ),
    # Search APIs (needed for the wizard)
    path("projects/search/", ProjectSearchView.as_view(), name="search_projects"),
    path(
        "projects/<uuid:pk>/structure/",
        ProjectStructureView.as_view(),
        name="get_project_structure",
    ),
    path("owners/search/", OwnerSearchView.as_view(), name="search_owners"),
    # Payment Plan Templates (for wizard)
    path(
        "templates/payment-plans/",
        PaymentPlanTemplateView.as_view(),
        name="get-payment-plan-templates",
    ),
    # Feature Cards API
    path(
        "dashboard/feature-cards/",
        FeatureCardView.as_view(),
        name="get-feature-cards",
    ),
    # New Dashboard Feature Cards API
    path(
        "dashboard/feature-cards-new/",
        dashboard_views.FeatureCardsView.as_view(),
        name="get-feature-cards-new",
    ),
    # Dashboard API - Complete dashboard data
    path(
        "dashboard/",
        DashboardView.as_view(),
        name="get-dashboard",
    ),
    # Owner Property Table API
    path(
        "dashboard/owner-properties/",
        OwnerPropertyTableView.as_view(),
        name="get-owner-properties",
    ),
    # Installments Table API - Gets installments for a specific sale item (PropertySaleItem)
    path(
        "installments/<uuid:sale_item_id>/",
        InstallmentsTableView.as_view(),
        name="get-sale-item-installments",
    ),
    # Installments Count API - Gets just the count for summary
    path(
        "installments/<uuid:sale_item_id>/count/",
        InstallmentsTableView.as_view(),
        name="get-sale-item-installments-count",
    ),
    # Assign Sales Person API
    path(
        "assign-sales-person/",
        AssignSalesPersonView.as_view(),
        name="assign-sales-person",
    ),
    # Remove Sales Person API
    path(
        "remove-sales-person/",
        RemoveSalesPersonView.as_view(),
        name="remove-sales-person",
    ),
    # Property Reservation API - Create only
    path(
        "property-reservations/",
        CreatePropertyReservationView.as_view(),
        name="create-property-reservation",
    ),
    # Document Template Search API
    path(
        "document-templates/",
        DocumentTemplateSearchView.as_view(),
        name="document-template-search",
    ),
    # Offer Letter API - Create offer letters
    path(
        "offer-letters/create/",
        CreateOfferLetterView.as_view(),
        name="create-offer-letter",
    ),
    # Offer Letter Search API - Search existing offer letters
    path(
        "offer-letters/search/",
        OfferLetterSearchView.as_view(),
        name="search-offer-letters",
    ),
    # Contract API - Create contracts from offer letters
    path(
        "contracts/create/",
        ContractCreateView.as_view(),
        name="create-contract",
    ),
    # Document List API - Get grouped documents by property + owner
    path(
        "documents/list/",
        DocumentListView.as_view(),
        name="document-list",
    ),
    # Reports API - Property Sales Performance
    path(
        "reports/property-sales-performance/",
        PropertySalesPerformanceReportView.as_view(),
        name="property-sales-performance-report",
    ),
    # Reports API - Sales Team Performance
    path(
        "reports/sales-team-performance/",
        SalesTeamPerformanceReportView.as_view(),
        name="sales-team-performance-report",
    ),
    # Reports API - Financial Collections Summary
    path(
        "reports/financial-collections/",
        FinancialCollectionsReportView.as_view(),
        name="financial-collections-report",
    ),
    # Reports API - Outstanding Payments & Follow-ups
    path(
        "reports/outstanding-payments/",
        OutstandingPaymentsReportView.as_view(),
        name="outstanding-payments-report",
    ),
    # Reports API - Agent Payouts Summary
    path(
        "reports/agent-payouts/",
        AgentPayoutsReportView.as_view(),
        name="agent-payouts-report",
    ),
]

# Include dashboards URLs
urlpatterns += dashboard_urls.urlpatterns
