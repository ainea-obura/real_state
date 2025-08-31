from django.urls import path

from .views import InstantPaymentNotificationView

urlpatterns = [
    path(
        "instant-payment-notification/",
        InstantPaymentNotificationView.as_view(),
        name="instant-payment-notification",
    ),
]
