from django.urls import path

from properties.basement import AssignSlotToUnitsView, SlotAssignmentListView, DeleteSlotAssignmentView, DeleteAllUnitAssignmentsView, AssignSlotsToUnitView

urlpatterns = [
    path(
        "assign-slot-to-units",
        AssignSlotToUnitsView.as_view(),
        name="assign-slot-to-units",
    ),
    path(
        "list-slot-assignments",
        SlotAssignmentListView.as_view(),
        name="list-slot-assignments",
    ),
    path(
        "delete-slot-assignment",
        DeleteSlotAssignmentView.as_view(),
        name="delete-slot-assignment",
    ),
    path(
        "delete-all-unit-assignments",
        DeleteAllUnitAssignmentsView.as_view(),
        name="delete-all-unit-assignments",
    ),
]

urlpatterns += [
    path(
        "assign-slots-to-unit",
        AssignSlotsToUnitView.as_view(),
        name="assign-slots-to-unit",
    ),
]
