from django.shortcuts import render
from rest_framework import generics
from rest_framework.response import Response
from .models import ContractTemplate, TemplateVariable
from .serialzier import ContractTemplateSerializer, ContractTemplateCreateSerializer
from utils.custom_pagination import CustomPageNumberPagination
from rest_framework.views import APIView
from .serialzier import DocumentVariableSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
import re

# Create your views here.


def extract_used_variables(template_content):
    variable_names = set(re.findall(r"{{(.*?)}}", template_content))
    variables = TemplateVariable.objects.filter(variable_name__in=variable_names)
    return {
        var.variable_name: {
            "variable_name": var.variable_name,
            "display_name": var.display_name,
            "category": var.category,
            "data_type": var.data_type,
            "is_required": var.is_required,
            "description": var.description,
        }
        for var in variables
    }


class ContractTemplateListView(generics.ListAPIView):
    queryset = ContractTemplate.objects.all()
    serializer_class = ContractTemplateSerializer
    pagination_class = CustomPageNumberPagination

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response(
            {
                "error": False,
                "message": "Templates fetched successfully",
                "data": {
                    "count": response.data.get("count", 0),
                    "results": response.data.get("results", []),
                },
            }
        )


class ContractTemplateDetailView(generics.RetrieveAPIView):
    queryset = ContractTemplate.objects.all()
    serializer_class = ContractTemplateSerializer


class ContractTemplateCreateView(generics.CreateAPIView):
    queryset = ContractTemplate.objects.all()
    serializer_class = ContractTemplateCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        instance = serializer.instance
        # Now instance is guaranteed to be the created object
        data = ContractTemplateSerializer(instance).data
        used_vars = extract_used_variables(instance.template_content)
        data["available_variables"] = used_vars
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                "error": False,
                "message": "Template created successfully",
                "data": data,
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )


class DocumentVariableListView(APIView):
    def get(self, request):
        # Get document type filter from query params
        document_type = request.query_params.get("document_type", None)

        # Base queryset - only active variables
        variables = TemplateVariable.objects.filter(is_active=True)

        # Apply filtering based on document type
        if document_type == "offer":
            # Filter for offer letter variables
            variables = variables.filter(is_for_offer=True)
        elif document_type == "sale":
            # Filter for sales agreement variables
            variables = variables.filter(is_for_sale=True)
        # For 'rent' or no filter: show default variables (neither offer nor sale)
        # This is handled by the base queryset

        serializer = DocumentVariableSerializer(variables, many=True)
        return Response(
            {
                "error": False,
                "message": "Variables fetched successfully",
                "data": {
                    "count": variables.count(),
                    "results": serializer.data,
                },
            }
        )


class ContractTemplateDeleteView(generics.DestroyAPIView):
    queryset = ContractTemplate.objects.all()
    serializer_class = ContractTemplateSerializer
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        response = super().delete(request, *args, **kwargs)
        return Response(
            {
                "error": False,
                "message": "Template deleted successfully",
                "data": None,
            },
            status=status.HTTP_200_OK,
        )
