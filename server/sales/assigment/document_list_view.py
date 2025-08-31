from rest_framework import generics
from rest_framework.response import Response
from django.db.models import Q, OuterRef, Subquery
from django.db.models.functions import JSONObject

from ..models import AssignedDocument
from .document_list_serializer import DocumentGroupSerializer
from utils.custom_pagination import CustomPageNumberPagination


class DocumentListView(generics.ListAPIView):
    """
    List view for sales documents grouped by property + owner.
    Each row represents a property-owner combination with their
    latest offer letter and contract.
    """

    serializer_class = DocumentGroupSerializer
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        """
        Get documents grouped by property + owner combination.
        Returns queryset with JSON meta for latest docs and status annotations.
        """
        base_queryset = AssignedDocument.objects.values(
            "property_node_id", "buyer_id"
        ).distinct()

        # Latest offer letter subquery (full meta)
        offer_letter_meta_sq = (
            AssignedDocument.objects.filter(
                property_node_id=OuterRef("property_node_id"),
                buyer_id=OuterRef("buyer_id"),
                document_type="offer_letter",
            )
            .order_by("-created_at")
            .annotate(
                json_data=JSONObject(
                    id="id",
                    document_title="document_title",
                    document_link="document_link",
                    due_date="due_date",
                    status="status",
                    created_at="created_at",
                    updated_at="updated_at",
                )
            )
            .values("json_data")[:1]
        )

        # Latest contract subquery (full meta)
        contract_meta_sq = (
            AssignedDocument.objects.filter(
                property_node_id=OuterRef("property_node_id"),
                buyer_id=OuterRef("buyer_id"),
                document_type="sales_agreement",
            )
            .order_by("-created_at")
            .annotate(
                json_data=JSONObject(
                    id="id",
                    document_title="document_title",
                    document_link="document_link",
                    status="status",
                    created_at="created_at",
                    updated_at="updated_at",
                )
            )
            .values("json_data")[:1]
        )

        # Status-only subqueries for filtering
        latest_offer_status = (
            AssignedDocument.objects.filter(
                property_node_id=OuterRef("property_node_id"),
                buyer_id=OuterRef("buyer_id"),
                document_type="offer_letter",
            )
            .order_by("-created_at")
            .values("status")[:1]
        )

        latest_contract_status = (
            AssignedDocument.objects.filter(
                property_node_id=OuterRef("property_node_id"),
                buyer_id=OuterRef("buyer_id"),
                document_type="sales_agreement",
            )
            .order_by("-created_at")
            .values("status")[:1]
        )

        queryset = base_queryset.annotate(
            offer_letter=Subquery(offer_letter_meta_sq),
            contract=Subquery(contract_meta_sq),
            offer_letter_status=Subquery(latest_offer_status),
            contract_status=Subquery(latest_contract_status),
        )

        return self.apply_filters(queryset)

    def apply_filters(self, queryset):
        """Apply search and filter parameters"""
        search = self.request.query_params.get("search", "")
        if search:
            buyer_ids = (
                AssignedDocument.objects.filter(
                    Q(buyer__first_name__icontains=search)
                    | Q(buyer__last_name__icontains=search)
                    | Q(property_node__name__icontains=search)
                    | Q(property_node__ancestors__name__icontains=search)
                )
                .values_list("buyer_id", flat=True)
                .distinct()
            )

            property_ids = (
                AssignedDocument.objects.filter(
                    Q(property_node__name__icontains=search)
                    | Q(property_node__ancestors__name__icontains=search)
                )
                .values_list("property_node_id", flat=True)
                .distinct()
            )

            queryset = queryset.filter(
                Q(buyer_id__in=buyer_ids) | Q(property_node_id__in=property_ids)
            )

        doc_type = self.request.query_params.get("document_type", "")
        if doc_type:
            if doc_type == "offer_letter":
                queryset = queryset.exclude(offer_letter__isnull=True)
            elif doc_type == "contract":
                queryset = queryset.exclude(contract__isnull=True)

        status_filter = self.request.query_params.get("status", "")
        if status_filter:
            if status_filter == "active":
                queryset = queryset.filter(
                    Q(offer_letter_status="active")
                    | Q(contract_status__in=["draft", "pending"])
                )
            elif status_filter == "signed":
                queryset = queryset.filter(contract_status="signed")
            elif status_filter == "expired":
                queryset = queryset.filter(
                    Q(offer_letter_status="expired") | Q(contract_status="expired")
                )

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Paginated response with outer envelope and data containing
        count and results only (no extra pagination metadata).
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated = self.get_paginated_response(serializer.data)
            return Response(
                {
                    "error": False,
                    "message": "success",
                    "data": paginated.data,
                }
            )

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "error": False,
                "message": "success",
                "data": {"count": len(queryset), "results": serializer.data},
            }
        )
