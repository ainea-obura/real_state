from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from documents.models import TenantAgreement

from .serilizer import TenantAgreementSerializer


class TenantAgreementListView(generics.ListAPIView):
    serializer_class = TenantAgreementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = self.request.query_params.get("user_id")
        qs = TenantAgreement.objects.all()
        if user_id:
            qs = qs.filter(tenant_name_id=user_id)
        return qs.order_by("-created_at")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "error": False,
                "message": "Tenant documents fetched successfully",
                "data": {
                    "count": queryset.count(),
                    "results": serializer.data,
                },
            },
            status=status.HTTP_200_OK,
        )

class TenantAgreementStatusUpdateView(generics.UpdateAPIView):
    serializer_class = TenantAgreementSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = TenantAgreement.objects.all()
    http_method_names = ["patch"]

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        status_value = request.data.get("status")
        allowed = [choice[0] for choice in TenantAgreement.STATUS_CHOICES]
        if status_value not in allowed:
            return Response(
                {
                    "error": True,
                    "message": "Invalid status",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.status = status_value
        instance.save()
        return Response(
            {
                "error": False,
                "message": "Status updated successfully",
                "data": self.get_serializer(instance).data,
            },
            status=status.HTTP_200_OK,
        )


class TenantAgreementSignView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        agreement_id = request.data.get("agreement_id")
        signed_file = request.FILES.get("signed_file")
        
        if not agreement_id or not signed_file:
            return Response(
                {
                    "error": True,
                    "message": "Agreement ID and signed file are required",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            agreement = TenantAgreement.objects.get(id=agreement_id)
            
            # Save the signed file
            file_path = default_storage.save(
                f"tenant_agreements/signed/{agreement_id}_{signed_file.name}",
                ContentFile(signed_file.read())
            )
            
            # Update the agreement with the signed file and change status to signed
            agreement.document_file = file_path
            agreement.status = "signed"
            agreement.save()
            
            return Response(
                {
                    "error": False,
                    "message": "Document signed successfully",
                    "data": TenantAgreementSerializer(agreement).data,
                },
                status=status.HTTP_200_OK,
            )
            
        except TenantAgreement.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Agreement not found",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"Error signing document: {str(e)}",
                    "data": None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
