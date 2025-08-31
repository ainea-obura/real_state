from django.contrib import admin
from .models import (
    PaymentPlanTemplate,
    PropertySale,
    PropertySaleItem,
    PaymentPlan,
    PaymentSchedule,
    SaleCommission,
    SalesPerson,
)


@admin.register(PaymentPlanTemplate)
class PaymentPlanTemplateAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "category",
        "periods",
        "frequency",
        "deposit_percentage",
        "difficulty",
        "is_featured",
        "is_active",
        "sort_order",
    ]
    list_filter = ["category", "frequency", "difficulty", "is_featured", "is_active"]
    search_fields = ["name", "description"]
    ordering = ["sort_order", "category", "name"]
    list_editable = ["is_featured", "is_active", "sort_order"]


@admin.register(PropertySale)
class PropertySaleAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "agent",
        "assigned_sales_person",
        "status",
        "sale_date",
        "created_at",
    ]
    list_filter = ["status", "sale_date", "created_at", "assigned_sales_person"]
    search_fields = [
        "id",
        "agent__first_name",
        "agent__last_name",
        "assigned_sales_person__user__first_name",
        "assigned_sales_person__user__last_name",
    ]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "sale_date"


@admin.register(PropertySaleItem)
class PropertySaleItemAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "sale",
        "property_node",
        "buyer",
        "sale_price",
        "down_payment",
        "ownership_percentage",
        "possession_date",
    ]
    list_filter = ["ownership_percentage", "possession_date", "created_at"]
    search_fields = [
        "sale__id",
        "property_node__name",
        "buyer__first_name",
        "buyer__last_name",
    ]
    readonly_fields = ["created_at", "updated_at", "down_payment_percentage"]
    date_hierarchy = "possession_date"


@admin.register(PaymentPlan)
class PaymentPlanAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "sale_item",
        "payment_type",
        "frequency",
        "installment_count",
        "start_date",
        "end_date",
        "is_custom",
        "template",
    ]
    list_filter = ["payment_type", "frequency", "is_custom"]
    search_fields = [
        "sale_item__id",
        "sale_item__buyer__first_name",
        "sale_item__property_node__name",
    ]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(PaymentSchedule)
class PaymentScheduleAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "payment_plan",
        "owner_name",
        "property_name",
        "payment_number",
        "due_date",
        "amount",
        "status",
        "paid_date",
        "paid_amount",
    ]
    list_filter = ["status", "due_date", "paid_date"]
    search_fields = [
        "payment_plan__id",
        "payment_number",
        "owner_name",
        "property_name",
    ]
    readonly_fields = ["created_at", "updated_at", "owner_name", "property_name"]
    date_hierarchy = "due_date"


@admin.register(SaleCommission)
class SaleCommissionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "sale",
        "agent",
        "commission_amount",
        "commission_type",
        "commission_rate",
        "status",
        "paid_date",
    ]
    list_filter = ["commission_type", "status", "paid_date"]
    search_fields = ["sale__id", "agent__first_name", "agent__last_name"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "paid_date"


@admin.register(SalesPerson)
class SalesPersonAdmin(admin.ModelAdmin):
    list_display = [
        "employee_id",
        "user",
        "total_sales",
        "total_collection_rate",
        "is_active",
        "is_available",
    ]
    list_filter = [
        "is_active",
        "is_available",
    ]
    search_fields = [
        "employee_id",
        "user__first_name",
        "user__last_name",
        "user__email",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
        "total_sales",
        "total_collection_rate",
    ]
    list_editable = ["is_active", "is_available"]
    ordering = ["user__first_name", "user__last_name"]
