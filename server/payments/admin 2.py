from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Sum, Count

from payments.models import Invoice, InvoiceItem, Penalty, Receipt, Payout, TaskConfiguration


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        "invoice_number",
        "property",
        "issue_date",
        "due_date",
        "total_amount",
        "balance",
        "status",
        "get_tenants_count",
        "get_owners_count",
    ]
    list_filter = ["status", "issue_date", "due_date"]
    search_fields = ["invoice_number", "property__name"]
    readonly_fields = ["invoice_number", "created_at", "updated_at"]
    date_hierarchy = "issue_date"

    def get_tenants_count(self, obj):
        return obj.tenants.count()

    get_tenants_count.short_description = "Tenants"

    def get_owners_count(self, obj):
        return obj.owners.count()

    get_owners_count.short_description = "Owners"


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ["invoice", "type", "name", "price", "service"]
    list_filter = ["type", "service"]
    search_fields = ["name", "invoice__invoice_number"]


@admin.register(Penalty)
class PenaltyAdmin(admin.ModelAdmin):
    list_display = [
        "penalty_number",
        "property_tenant",
        "penalty_type",
        "amount",
        "status",
        "date_applied",
        "due_date",
        "created_by",
    ]
    list_filter = ["penalty_type", "status", "date_applied", "due_date"]
    search_fields = ["penalty_number", "property_tenant__tenant_user__email"]
    readonly_fields = ["penalty_number", "created_at", "updated_at"]
    date_hierarchy = "date_applied"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("property_tenant__tenant_user", "created_by", "waived_by")
        )


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = [
        "receipt_number",
        "invoice",
        "paid_amount",
        "payment_date",
        "balance",
    ]
    list_filter = ["payment_date"]
    search_fields = ["receipt_number", "invoice__invoice_number"]
    readonly_fields = ["receipt_number", "created_at", "updated_at"]
    date_hierarchy = "payment_date"


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = [
        "payout_number",
        "owner_name",
        "payout_date",
        "rent_collected",
        "services_expenses",
        "net_amount",
        "status",
        "properties_count",
        "approved_by_name",
        "currency_symbol",
    ]
    list_filter = ["status", "payout_date", "currency"]
    search_fields = [
        "payout_number",
        "owner__first_name",
        "owner__last_name",
        "owner__email",
    ]
    readonly_fields = [
        "payout_number",
        "created_at",
        "updated_at",
        "calculated_net_amount",
        "is_editable",
    ]
    date_hierarchy = "payout_date"

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("payout_number", "owner", "status", "currency")},
        ),
        (
            "Amounts",
            {
                "fields": (
                    "rent_collected",
                    "services_expenses",
                    "net_amount",
                    "calculated_net_amount",
                )
            },
        ),
        ("Dates", {"fields": ("payout_date",)}),
        ("Properties", {"fields": ("property_node",)}),
        ("Approval", {"fields": ("approved_by",)}),
        ("Notes", {"fields": ("notes",)}),
        (
            "System",
            {
                "fields": ("created_at", "updated_at", "is_editable"),
                "classes": ("collapse",),
            },
        ),
    )

    def owner_name(self, obj):
        return obj.owner.get_full_name() if obj.owner else "-"

    owner_name.short_description = "Owner"
    owner_name.admin_order_field = "owner__first_name"

    def approved_by_name(self, obj):
        return obj.approved_by.get_full_name() if obj.approved_by else "-"

    approved_by_name.short_description = "Approved By"

    def currency_symbol(self, obj):
        return obj.currency.symbol if obj.currency else "-"

    currency_symbol.short_description = "Currency"

    def properties_count(self, obj):
        return obj.property_node.count()

    properties_count.short_description = "Properties"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("owner", "approved_by", "currency")
            .prefetch_related("property_node")
        )

    actions = ["approve_payouts", "cancel_payouts"]

    def approve_payouts(self, request, queryset):
        """Approve selected pending payouts"""
        pending_payouts = queryset.filter(status="pending")
        updated = pending_payouts.update(status="completed", approved_by=request.user)
        self.message_user(request, f"Successfully approved {updated} payout(s).")

    approve_payouts.short_description = "Approve selected payouts"

    def cancel_payouts(self, request, queryset):
        """Cancel selected pending/failed payouts"""
        cancellable_payouts = queryset.filter(status__in=["pending", "failed"])
        updated = cancellable_payouts.update(status="cancelled")
        self.message_user(request, f"Successfully cancelled {updated} payout(s).")

    cancel_payouts.short_description = "Cancel selected payouts"

    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of completed payouts"""
        if obj and obj.status == "completed":
            return False
        return super().has_delete_permission(request, obj)

    def get_readonly_fields(self, request, obj=None):
        """Make net_amount readonly for completed payouts"""
        readonly_fields = list(super().get_readonly_fields(request, obj))
        if obj and obj.status == "completed":
            readonly_fields.append("net_amount")
        return readonly_fields


@admin.register(TaskConfiguration)
class TaskConfigurationAdmin(admin.ModelAdmin):
    list_display = [
        "task_type",
        "enabled",
        "frequency",
        "time",
        "status",
        "last_run",
        "execution_count",
        "error_count",
        "success_rate",
    ]
    list_filter = ["task_type", "enabled", "frequency", "status"]
    search_fields = ["task_type", "notes"]
    readonly_fields = [
        "created_at", "updated_at", "last_run", "last_run_status",
        "execution_count", "error_count", "success_rate"
    ]
    date_hierarchy = "created_at"
    
    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "task_type", "enabled", "status", "frequency", "time",
                    "day_of_week", "day_of_month"
                )
            },
        ),
        (
            "Reminder Settings",
            {
                "fields": ("before_due_days", "after_due_days"),
                "classes": ("collapse",),
            },
        ),
        (
            "Statistics",
            {
                "fields": (
                    "last_run", "last_run_status", "execution_count", 
                    "error_count", "success_rate"
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Notes",
            {"fields": ("notes",)},
        ),
        (
            "System",
            {
                "fields": ("created_by", "updated_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )
    
    def success_rate(self, obj):
        total = obj.execution_count + obj.error_count
        if total == 0:
            return "0%"
        rate = round((obj.execution_count / total) * 100, 1)
        return f"{rate}%"
    
    success_rate.short_description = "Success Rate"
    
    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("created_by", "updated_by")
        )
    
    actions = ["enable_tasks", "disable_tasks", "reset_stats"]
    
    def enable_tasks(self, request, queryset):
        updated = queryset.update(enabled=True, status="active")
        self.message_user(
            request, f"Successfully enabled {updated} task configuration(s)."
        )
    
    enable_tasks.short_description = "Enable selected tasks"
    
    def disable_tasks(self, request, queryset):
        updated = queryset.update(enabled=False, status="inactive")
        self.message_user(
            request, f"Successfully disabled {updated} task configuration(s)."
        )
    
    disable_tasks.short_description = "Disable selected tasks"
    
    def reset_stats(self, request, queryset):
        updated = queryset.update(
            execution_count=0, error_count=0, last_run=None, last_run_status=None
        )
        self.message_user(
            request, f"Successfully reset statistics for {updated} task configuration(s)."
        )
    
    reset_stats.short_description = "Reset execution statistics"
