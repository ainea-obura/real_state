from django.urls import path
from .views import (
    CreateCompanyView,
    CompanyDetailView,
    CompanyBranchesView,
    GetAllCompaniesView,
    CompanyUpdateView,
    CurrentUserCompanyView,
    GetBusinessOnboardingView,
    submitBusinessDetailsView,
    BusinessOnboardingCallBackView,
)

urlpatterns = [
    path("", GetAllCompaniesView.as_view(), name="company-all"),
    path("create/", CreateCompanyView.as_view(), name="company-create"),
    path("current/", CurrentUserCompanyView.as_view(), name="company-current"),
    path("<uuid:pk>/", CompanyDetailView.as_view(), name="company-detail"),
    path("<uuid:pk>/update/", CompanyUpdateView.as_view(), name="company-update"),
    # Branches
    path("<uuid:pk>/branches/", CompanyBranchesView.as_view(), name="company-branches"),
    path(
        "business-onboarding/",
        submitBusinessDetailsView.as_view(),
        name="submit-business-details",
    ),
    path(
        "business-onboarding/confirm-otp/",
        submitBusinessDetailsView.as_view(),
        {"action": "confirm_otp"},
        name="confirm-business-otp",
    ),
    path(
        "business-onboarding/get/",
        GetBusinessOnboardingView.as_view(),
        name="get-business-details",
    ),
]
