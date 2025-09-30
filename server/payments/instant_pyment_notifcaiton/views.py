from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers

from payments.models import InstantPaymentNotification


class InstantPaymentNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstantPaymentNotification
        fields = "__all__"


class InstantPaymentNotificationView(APIView):
    permission_classes = [AllowAny]

    def get_queryset(self):
        return InstantPaymentNotification.objects.all()

    def get(self, request):
        """Handle instant payment notifications from SasaPay"""
        queryset = self.get_queryset()

        # Get search query parameter
        search_query = request.query_params.get("search_query", "").strip()

        if search_query:
            # Filter by phone number or full name
            filtered_queryset = queryset.filter(
                Q(msisdn__icontains=search_query) | Q(full_name__icontains=search_query)
            )

            # If no results found with search, return latest transactions
            if not filtered_queryset.exists():
                queryset = queryset.order_by("-trans_time")[
                    :50
                ]  # Latest 50 transactions
            else:
                queryset = filtered_queryset
        else:
            # If no search query, return latest transactions
            queryset = queryset.order_by("-trans_time")[:50]  # Latest 50 transactions

        # Serialize the queryset using the serializer
        serializer = InstantPaymentNotificationSerializer(queryset, many=True)

        return Response(status=status.HTTP_200_OK, data=serializer.data)

    def post(self, request):
        """Handle instant payment notifications from SasaPay"""
        data = request.data

        # update the table with the data
        InstantPaymentNotification.objects.create(
            merchant_code=data["MerchantCode"],
            business_short_code=data["BusinessShortCode"],
            invoice_number=data["InvoiceNumber"],
            payment_method=data["PaymentMethod"],
            trans_id=data["TransID"],
            third_party_trans_id=data["ThirdPartyTransID"],
            full_name=data["FullName"],
            first_name=data["FirstName"],
            middle_name=data["MiddleName"],
            last_name=data["LastName"],
            transaction_type=data["TransactionType"],
            msisdn=data["MSISDN"],
            org_account_balance=data["OrgAccountBalance"],
            trans_amount=data["TransAmount"],
            trans_time=data["TransTime"],
            bill_ref_number=data["BillRefNumber"],
            is_verified=False,
        )
        return Response(status=status.HTTP_200_OK)
