from django.urls import path
from properties.verification import (
    UserVerificationListView,
    UserVerificationUploadView,
    UserVerificationStatusUpdateView,
)

urlpatterns = [
    path("list", UserVerificationListView.as_view(), name="user-verification-list"),
    path(
        "upload", UserVerificationUploadView.as_view(), name="user-verification-upload"
    ),
    path(
        "status",
        UserVerificationStatusUpdateView.as_view(),
        name="user-verification-status",
    ),
]
