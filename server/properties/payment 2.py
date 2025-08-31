from datetime import datetime

from django.db.models import Q, Sum
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from payments.models import Expense, Invoice
from properties.models import LocationNode, ProjectDetail
from utils.format import format_money_with_currency

from .serializers.payment import PaymentReportSerializer


@extend_schema(
    tags=["Payments"],
    description="Project payment report: stats, recent invoices, recent expenses. Supports ?from=YYYY-MM-DD&to=YYYY-MM-DD.",
)
class ProjectPaymentReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        from_str = request.query_params.get("from")
        to_str = request.query_params.get("to")
        from_date = datetime.strptime(from_str, "%Y-%m-%d").date() if from_str else None
        to_date = datetime.strptime(to_str, "%Y-%m-%d").date() if to_str else None

        print(project_id)

        # Get the project detail and then the location node
        try:
            project_detail = ProjectDetail.objects.get(id=project_id)
            project_node = project_detail.node
            descendant_nodes = project_node.get_descendants(include_self=True)
            descendant_node_ids = list(descendant_nodes.values_list("id", flat=True))
        except ProjectDetail.DoesNotExist:
            return Response({"error": "Project not found"}, status=400)

        # Filter invoices and expenses for all project descendants
        invoice_filter = Q(property__id__in=descendant_node_ids)
        expense_filter = Q(location_node__id__in=descendant_node_ids)
        if from_date:
            invoice_filter &= Q(issue_date__gte=from_date)
            expense_filter &= Q(invoice_date__gte=from_date)
        if to_date:
            invoice_filter &= Q(issue_date__lte=to_date)
            expense_filter &= Q(invoice_date__lte=to_date)

        invoices = Invoice.objects.filter(
            invoice_filter, status__in=["PAID", "PARTIAL"]
        ).order_by("-issue_date")
        expenses = Expense.objects.filter(expense_filter).order_by("-invoice_date")

        # Stats
        total_income = invoices.aggregate(total=Sum("total_amount"))["total"] or 0
        total_expenses = expenses.aggregate(total=Sum("total_amount"))["total"] or 0
        net_balance = total_income - total_expenses

        stats = {
            "totalIncome": format_money_with_currency(total_income),
            "totalExpenses": format_money_with_currency(total_expenses),
            "netBalance": format_money_with_currency(net_balance),
        }

        # Recent Invoices (limit 10)
        recent_invoices = invoices[:10]

        # Recent Expenses (limit 10)
        recent_expenses = expenses[:10]

        data = {
            "stats": stats,
            "recentInvoices": recent_invoices,
            "recentExpenses": recent_expenses,
        }
        serializer = PaymentReportSerializer(data)
        return Response(serializer.data)
