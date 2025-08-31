from django.urls import path
from . import views

app_name = "rent_rolls"

urlpatterns = [
    # Main rent roll endpoints
    path("", views.rent_roll_list, name="rent_roll_list"),
    path("summary/", views.rent_roll_summary, name="rent_roll_summary"),
    path("<str:unit_id>/", views.rent_roll_unit_detail, name="rent_roll_unit_detail"),
    # Ledger endpoint
    path("<str:unit_id>/ledger/", views.unit_ledger, name="unit_ledger"),
]
