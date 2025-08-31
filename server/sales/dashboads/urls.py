from django.urls import path
from . import views

app_name = "sales_dashboards"

urlpatterns = [
    path("feature-cards/", views.FeatureCardsView.as_view(), name="feature_cards"),
    path("availability/", views.AvailabilityView.as_view(), name="availability"),
]
