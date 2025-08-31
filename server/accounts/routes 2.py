from django.urls import include, path

from accounts.views import (
    AccountCreateView,
    AccountDeleteView,
    AccountListView,
    AccountRetrieveView,
    AccountUpdateView,
    CheckTokenForMobile,
    CityList,
    CountryList,
    GetAccountTypes,
    Login,
    PasswordResetOTP,
    ResendOTP,
    ResetPasswordAfterOTP,
    Signup,
    TokenRefresh,
    VerifyPasswordResetOTP,
)

from .change_password import views

urlpatterns = [
    # Authentication
    path("login", Login.as_view(), name="login"),
    path("signup", Signup.as_view(), name="signup"),
    path("token/refresh", TokenRefresh.as_view(), name="token-refresh"),
    path("resend-otp", ResendOTP.as_view(), name="resend-otp"),
    path("password-reset-otp", PasswordResetOTP.as_view(), name="password-reset-otp"),
    path(
        "verify-password-reset-otp",
        VerifyPasswordResetOTP.as_view(),
        name="verify-password-reset-otp",
    ),
    path(
        "reset-password-after-otp",
        ResetPasswordAfterOTP.as_view(),
        name="reset-password-after-otp",
    ),
    path("change-password", views.ChangePasswordView.as_view(), name="change-password"),
    path("account-types", GetAccountTypes.as_view(), name="account-types"),
    path("check-token", CheckTokenForMobile.as_view(), name="check-token"),
    # Geo
    path("geo/countries", CountryList.as_view(), name="countries"),
    path("geo/cities", CityList.as_view(), name="cities"),
    # Account Management
    path("accounts", AccountListView.as_view(), name="account-list"),
    path("accounts/create", AccountCreateView.as_view(), name="account-create"),
    path("accounts/<uuid:pk>", AccountRetrieveView.as_view(), name="account-retrieve"),
    path(
        "accounts/<uuid:pk>/update", AccountUpdateView.as_view(), name="account-update"
    ),
    path(
        "accounts/<uuid:pk>/delete", AccountDeleteView.as_view(), name="account-delete"
    ),
    # Roles management
    path("roles/", include("accounts.roles.urls")),
]
