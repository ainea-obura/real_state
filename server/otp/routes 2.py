from django.urls import path
from .views import Verify2Fa, VerifyEmailAddress
from accounts.views import Login, Signup, TokenRefresh, ResendOTP, CheckTokenForMobile

urlpatterns = [
    # Authentication
    path("login/", Login.as_view(), name="login"),
    path("signup/", Signup.as_view(), name="signup"),
    path("refresh/", TokenRefresh.as_view(), name="token_refresh"),
    path(
        "check-token-for-mobile/",
        CheckTokenForMobile.as_view(),
        name="check_token_for_mobile",
    ),
    # Verification
    path("verify-otp/", Verify2Fa.as_view(), name="verify_otp"),
    path("verify-email/", VerifyEmailAddress.as_view(), name="verify_email"),
    path("resend-otp/", ResendOTP.as_view(), name="resend_otp"),
]
