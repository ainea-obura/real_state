from django.db import models


# Create your models here.
class Projects(models.Model):
    class Meta:
        default_permissions = ()
        permissions = [
            ("view_projects", "View Projects"),
            ("add_projects", "Add Projects"),
            ("edit_projects", "Edit Projects"),
            ("delete_projects", "Delete Projects"),
            ("view_projects_profile", "View Profile"),
            # Overview
            ("view_overview", "View Overview"),
            # Structure
            ("add_structure", "Add Structure"),
            ("edit_structure", "Edit Structure"),
            ("delete_structure", "Can delete structure"),
            ("view_structure", "Can view structure"),
            # Tenants
            ("view_tenants", "View Tenants"),
            ("add_tenants", "Allocate Tenant"),
            ("delete_tenants", "Delete Tenant"),
            # Payments
            ("view_payments", "View Payments"),
            # Owners
            ("view_owners", "View Owners"),
            ("add_owners", "Add Owners"),
            ("edit_owners", "Edit Owners"),
            ("delete_owners", "Delete Owners"),
            # Services
            ("view_services", "View Services"),
            ("add_services", "Add Services"),
            ("edit_services", "Edit Services"),
            ("delete_services", "Delete Services"),
            # Basement
            ("view_basement", "View Basement"),
            ("add_basement", "Add Basement"),
            ("edit_basement", "Edit Basement"),
            ("delete_basement", "Delete Basement"),
            # Maintenance
            ("view_maintenance", "View Maintenance"),
            ("add_maintenance", "Add Maintenance"),
            ("edit_maintenance", "Edit Maintenance"),
            ("delete_maintenance", "Delete Maintenance"),
        ]


class Managements(models.Model):
    class Meta:
        default_permissions = ()
        permissions = [
            ("for_rent", "For Rent"),
            ("for_service", "For Service"),
            ("add_service", "Add Service"),
            ("edit_service", "Edit Service"),
            ("delete_service", "Delete Service"),
            ("view_service", "View Service"),
            ("view_media", "View Media Gallery"),
            ("add_media", "Add Media Gallery"),
            ("edit_media", "Edit Media Gallery"),
            ("delete_media", "Delete Media Gallery"),
            ("view_document", "View Document"),
            ("add_document", "Add Document"),
            ("delete_document", "Delete Document"),
        ]


class Clients(models.Model):
    class Meta:
        default_permissions = ()
        permissions = [
            # Tenants
            ("view_tenant", "View Tenants"),
            ("add_tenant", "Add Tenant"),
            ("edit_tenant", "Edit Tenant"),
            ("view_tenant_overview", "View Overview"),
            ("view_tenant_properties", "View Properties"),
            ("view_tenant_documents", "View Documents"),
            ("edit_tenant_documents", "Edit Documents"),
            ("view_tenant_verification", "View Verification"),
            ("add_tenant_verification", "Add Verification"),
            ("edit_tenant_verification", "Edit Verification"),
            ("view_tenant_accounts", "View Accounts"),
            # Owner
            ("view_owner", "View Owner"),
            ("add_owner", "Add Owner"),
            ("edit_owner", "Edit Owner"),
            ("view_owner_overview", "View Overview"),
            ("view_owner_properties", "View Properties"),
            ("view_owner_invoices", "View Invoices"),
            ("view_owner_income", "View Incomes"),
            ("view_owner_verification", "View Verification"),
            ("add_owner_verification", "Add Verification"),
            ("edit_owner_verification", "Edit Verification"),
            ("view_owner_accounts", "View Accounts"),
            # Agent
            ("view_agents", "View Agents"),
            ("add_agents", "Add Agents"),
            ("edit_agents", "Edit Agents"),
        ]


class Finance(models.Model):
    class Meta:
        default_permissions = ()
        permissions = [
            # Rent Collection
            ("view_rent_collection", "View Rent Collection"),
            ("view_rent_lease", "View Lease"),
            ("set_rent_reminder", "Set Rent Reminder"),
            ("view_rent_ledger", "View Rent Ledger"),
            # Invoices
            ("view_invoices", "View Invoice"),
            ("add_invoices", "Add Invoice"),
            ("edit_invoices", "Edit Invoice"),
            ("delete_invoices", "Delete Invoice"),
            ("cancel_invoices", "Cancel Invoice"),
            ("resend_invoices", "Resend Invoice"),
            ("create_credit_note", "Create Credit Note"),
            # Disbursment
            ("view_disbursment", "View Disbursment"),
            ("add_disbursment", "Add Disbursment"),
            ("approve_disbursment", "Approve Disbursment"),
            # Penalties
            ("view_penalties", "View Penalties"),
            ("add_penalties", "Add Penalties"),
            ("edit_penalties", "Edit Penalties"),
            ("delete_penalties", "Delete Penalties"),
            # Collections
            ("view_collections", "View Collections"),
            ("add_collections", "Add Collections"),
            # expenses
            ("view_expenses", "View Expenses"),
            ("add_expenses", "Add Expenses"),
            ("edit_expenses", "Edit Expenses"),
            ("delete_expenses", "Delete Expenses"),
            ("pay_expenses", "Pay Expenses"),
            ("approve_expenses", "Approve Expenses"),
            # vendor
            ("view_vendors", "View Vendors"),
            ("add_vendors", "Add Vendors"),
            ("edit_vendors", "Edit Vendors"),
            ("delete_vendors", "Delete Vendors"),
            # currency
            ("view_currency", "View Currency"),
            ("add_currency", "Add Currency"),
            ("edit_currency", "Edit Currency"),
            ("delete_currency", "Delete Currency"),
            # transactions
            ("view_transactions", "View Transactions"),
            # reports
            ("view_reports", "View Reports"),
        ]


class Dashboard(models.Model):
    class Meta:
        default_permissions = ()
        permissions = [
            ("view_dashboard", "View Dashboard"),
        ]


class Settings(models.Model):
    class Meta:
        default_permissions = ()
        permissions = [
            ("manage_positions", "Manage Positions"),
            ("create_staff", "Create Staff"),
            ("manage_roles", "Manage Roles"),
        ]
