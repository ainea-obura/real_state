from rest_framework.response import Response
from rest_framework.generics import RetrieveAPIView, ListAPIView
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import datetime

from .serializer import (
    ServicesReportResponseSerializer,
    ServiceSummaryReportResponseSerializer,
)
from .utils import (
    calculate_financial_summary,
    get_date_range_from_request,
    get_project_summary_data,
    get_per_unit_summary_data,
    get_services_report_data,
    get_service_summary_report_data,
    parse_date_param,
)


# class FinancialSummaryView(RetrieveAPIView):
#     """
#     DRF Generic View for EnhancedSummaryCards financial summary
#     """
#
#     serializer_class = FinancialSummarySerializer
#
#     def retrieve(self, request, *args, **kwargs):
#         """
#         Get financial summary for the specified date range
#         """
#         try:
#             # Get date range from request
#             date_from, date_to = get_date_range_from_request(request)
#
#             # Calculate financial summary using utils
#             summary_data = calculate_financial_summary(date_from, date_to)
#
#             return Response(
#                 {
#                     "error": False,
#                     "message": "Financial summary fetched successfully",
#                     "data": summary_data,
#                 }
#             )
#
#         except Exception as e:
#             return Response(
#                 {
#                     "error": True,
#                     "message": f"Error fetching financial summary: {str(e)}",
#                     "data": None,
#                 },
#                 status=500,
#             )
#
#
# class ProjectSummaryView(ListAPIView):
#     """
#     DRF Generic View for ProjectSummaryReport component
#     """
#
#     serializer_class = ProjectSummaryResponseSerializer
#
#     def list(self, request, *args, **kwargs):
#         """
#         Get project summary for the specified date range
#         """
#         try:
#             # Get date range from request
#             date_from, date_to = get_date_range_from_request(request)
#
#             # Get project summary data using utils
#             projects_data = get_project_summary_data(date_from, date_to)
#
#             return Response(
#                 {
#                     "error": False,
#                     "message": "Project summary fetched successfully",
#                     "data": {"projects": projects_data},
#                 }
#             )
#
#         except Exception as e:
#             return Response(
#                 {
#                     "error": True,
#                     "message": f"Error fetching project summary: {str(e)}",
#                     "data": None,
#                 },
#                 status=500,
#             )
class PerUnitSummaryReportView(APIView):
    """
    DRF Generic View for PerUnitSummaryReport component
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get per unit summary report for the specified date range
        """
        try:
            # Get date range from request
            date_from_str = request.query_params.get("date_from")
            date_to_str = request.query_params.get("date_to")

            if date_from_str:
                date_from = parse_date_param(date_from_str)
            else:
                date_from = (
                    timezone.now().date().replace(day=1)
                )  # First day of current month

            if date_to_str:
                date_to = parse_date_param(date_to_str)
            else:
                date_to = timezone.now().date()

            # Get per unit summary data using utils
            summary_data = get_per_unit_summary_data(date_from, date_to)

            return Response(
                {
                    "error": False,
                    "message": "Per unit summary report fetched successfully",
                    "data": summary_data,
                }
            )

        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"Error fetching per unit summary report: {str(e)}",
                    "data": None,
                },
                status=500,
            )


class ServicesReportView(APIView):
    """
    DRF Generic View for ServicesReport component and Service Summary Report
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get services report or service summary report based on request parameters
        """
        try:
            # Check if this is a service summary report request
            report_type = request.query_params.get("report_type", "services")

            if report_type == "service_summary":
                return self._get_service_summary_report(request)
            else:
                return self._get_services_report(request)

        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"Error fetching report: {str(e)}",
                    "data": None,
                },
                status=500,
            )

    def _get_service_summary_report(self, request):
        """
        Get service summary report with filtering capabilities
        """
        # Get filter parameters
        project_filter = request.query_params.get("project")
        month_filter = request.query_params.get("month")
        year_filter = request.query_params.get("year")

        # Convert year to integer if provided
        if year_filter:
            try:
                year_filter = int(year_filter)
            except ValueError:
                year_filter = None

        # Get service summary report data
        report_data = get_service_summary_report_data(
            project_filter=project_filter,
            month_filter=month_filter,
            year_filter=year_filter,
        )

        return Response(
            {
                "error": False,
                "message": "Service summary report fetched successfully",
                "data": report_data,
            }
        )

    def _get_services_report(self, request):
        """
        Get original services report for the specified date range
        """
        # Get date range from request
        date_from_str = request.query_params.get("date_from")
        date_to_str = request.query_params.get("date_to")

        if date_from_str:
            date_from = parse_date_param(date_from_str)
        else:
            date_from = (
                timezone.now().date().replace(day=1)
            )  # First day of current month

        if date_to_str:
            date_to = parse_date_param(date_to_str)
        else:
            date_to = timezone.now().date()

        # Get services report data using utils
        report_data = get_services_report_data(date_from, date_to)

        return Response(
            {
                "error": False,
                "message": "Services report fetched successfully",
                "data": report_data,
            }
        )
