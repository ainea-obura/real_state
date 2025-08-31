from django.urls import path
from properties.management.service import ServiceCardListView

urlpatterns = [
    path('list/', ServiceCardListView.as_view()),
]
