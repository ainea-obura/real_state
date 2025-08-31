from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Avg
from django.utils import timezone

from sales.models import SaleCommission
from payments.models import Expense
from .agent_payouts_serializers import (
    AgentPayoutsReportSerializer,
    AgentPayoutsQuerySerializer,
)


class AgentPayoutsReportView(ListAPIView):
    serializer_class = AgentPayoutsReportSerializer
    query_serializer = AgentPayoutsQuerySerializer

    def get_queryset(self):
        return SaleCommission.objects.all()

    def list(self, request, *args, **kwargs):
        try:
            query_serializer = self.query_serializer(data=request.query_params)
            query_serializer.is_valid(raise_exception=True)

            from_date = query_serializer.validated_data.get("from_date")
            to_date = query_serializer.validated_data.get("to_date")
            project_id = query_serializer.validated_data.get("project_id")

            if not from_date or not to_date:
                today = timezone.now().date()
                from_date = today.replace(day=1)
                to_date = today

            # Base queryset for commissions
            queryset = SaleCommission.objects.filter(
                created_at__date__range=[from_date, to_date]
            ).exclude(status="cancelled")

            if project_id:
                # Filter by project if specified (simplified for now)
                queryset = queryset.filter(
                    sale__sale_items__property_node_id=project_id
                )

            if not queryset.exists():
                empty_response = {
                    "success": True,
                    "message": "No agent payout data found for the specified criteria",
                    "data": {
                        "kpis": {
                            "accruedUnpaid": 0.0,
                            "approvedReady": 0.0,
                            "paidPeriod": 0.0,
                            "avgCommissionRate": 0.0,
                        },
                        "agentPayouts": [],
                    },
                }
                return Response(empty_response, status=status.HTTP_200_OK)

            # Get agent payouts data
            agent_payouts_data = self._get_agent_payouts_data(queryset)

            # Calculate KPIs
            kpis = self._calculate_kpis(queryset)

            response_data = {
                "success": True,
                "message": "Agent Payouts Summary report generated successfully",
                "data": {
                    "kpis": kpis,
                    "agentPayouts": agent_payouts_data,
                },
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error in AgentPayoutsReportView: {str(e)}")
            return Response(
                {
                    "success": False,
                    "message": f"Error generating report: {str(e)}",
                    "data": {},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _get_agent_payouts_data(self, queryset):
        """Get agent payouts data for the table"""
        agent_payouts = []

        # Group by agent and property
        agent_property_groups = queryset.values(
            "agent", "sale__sale_items__property_node"
        ).distinct()

        for group in agent_property_groups:
            agent_id = group["agent"]
            property_node_id = group["sale__sale_items__property_node"]

            if not agent_id or not property_node_id:
                continue

            # Get commissions for this agent-property combination
            agent_commissions = queryset.filter(
                agent_id=agent_id, sale__sale_items__property_node_id=property_node_id
            )

            # Calculate pending and paid amounts from commissions
            pending_commissions = float(
                agent_commissions.filter(status__in=["pending", "approved"]).aggregate(
                    total=Sum("commission_amount")
                )["total"]
                or 0
            )

            paid_commissions = float(
                agent_commissions.filter(status="paid").aggregate(
                    total=Sum("paid_amount")
                )["total"]
                or 0
            )

            # Get expenses billed to this agent for this property
            agent_expenses = Expense.objects.filter(
                agent=agent_id,
                location_node=property_node_id,
                status__in=["pending", "approved", "paid"],
            )

            # Calculate expenses
            pending_expenses = float(
                agent_expenses.filter(status__in=["pending", "approved"]).aggregate(
                    total=Sum("total_amount")
                )["total"]
                or 0
            )

            paid_expenses = float(
                agent_expenses.filter(status="paid").aggregate(
                    total=Sum("paid_amount")
                )["total"]
                or 0
            )

            # Net amounts (commissions - expenses)
            pending = pending_commissions - paid_expenses
            paid = paid_commissions - paid_expenses
            total_expenses = pending_expenses + paid_expenses

            # Get latest paid date
            latest_paid = (
                agent_commissions.filter(status="paid", paid_date__isnull=False)
                .order_by("-paid_date")
                .first()
            )

            paid_date = latest_paid.paid_date if latest_paid else None

            # Get property information
            property_node = (
                agent_commissions.first()
                .sale.sale_items.filter(property_node_id=property_node_id)
                .first()
                .property_node
            )

            # Simple property info (no parent traversal)
            project_name = property_node.name
            property_info = property_node.name

            # Get agent object for serialization
            agent_obj = agent_commissions.first().agent

            agent_payouts.append(
                {
                    "id": f"{agent_id}_{property_node_id}",
                    "agent": {
                        "name": agent_obj.get_full_name(),
                        "phone": agent_obj.phone,
                        "email": agent_obj.email,
                    },
                    "projectName": project_name,
                    "propertyInfo": property_info,
                    "pending": pending,
                    "paid": paid,
                    "paidDate": paid_date,
                    "expenses": total_expenses,
                    "netPending": pending,
                    "netPaid": paid,
                }
            )

        return agent_payouts

    def _calculate_kpis(self, queryset):
        """Calculate KPIs for the report"""
        # Get all unique agents and properties from commissions
        agent_property_groups = queryset.values(
            "agent", "sale__sale_items__property_node"
        ).distinct()

        total_accrued = 0
        total_approved = 0
        total_paid = 0
        total_expenses = 0

        for group in agent_property_groups:
            agent_id = group["agent"]
            property_node_id = group["sale__sale_items__property_node"]

            if not agent_id or not property_node_id:
                continue

            # Commissions for this agent-property combination
            agent_commissions = queryset.filter(
                agent_id=agent_id, sale__sale_items__property_node_id=property_node_id
            )

            # Commission amounts
            accrued_commissions = float(
                agent_commissions.filter(status__in=["pending", "approved"]).aggregate(
                    total=Sum("commission_amount")
                )["total"]
                or 0
            )

            approved_commissions = float(
                agent_commissions.filter(status="approved").aggregate(
                    total=Sum("commission_amount")
                )["total"]
                or 0
            )

            paid_commissions = float(
                agent_commissions.filter(status="paid").aggregate(
                    total=Sum("paid_amount")
                )["total"]
                or 0
            )

            # Expenses for this agent-property combination
            agent_expenses = Expense.objects.filter(
                agent=agent_id,
                location_node=property_node_id,
                status__in=["pending", "approved", "paid"],
            )

            paid_expenses = float(
                agent_expenses.filter(status="paid").aggregate(
                    total=Sum("paid_amount")
                )["total"]
                or 0
            )

            # Net amounts (commissions - expenses)
            total_accrued += accrued_commissions - paid_expenses
            total_approved += approved_commissions - paid_expenses
            total_paid += paid_commissions - paid_expenses
            total_expenses += paid_expenses

        # Average commission rate
        avg_commission_rate = float(
            queryset.aggregate(avg_rate=Avg("commission_rate"))["avg_rate"] or 0
        )

        return {
            "accruedUnpaid": round(max(0, total_accrued), 2),
            "approvedReady": round(max(0, total_approved), 2),
            "paidPeriod": round(max(0, total_paid), 2),
            "avgCommissionRate": round(avg_commission_rate, 2),
        }
