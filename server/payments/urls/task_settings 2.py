from django.urls import path

from payments.task_settings import (
    TaskConfigurationCreateView,
    TaskConfigurationDetailView,
    TaskConfigurationListView,
    TaskConfigurationUpdateView,
    TaskSettingsSummaryView,
    TaskTestView,
)

urlpatterns = [
    # List and create task configurations
    path("list", TaskConfigurationListView.as_view(), name="task-configuration-list"),
    path("create", TaskConfigurationCreateView.as_view(), name="task-configuration-create"),
    
    # Get summary statistics
    path("summary", TaskSettingsSummaryView.as_view(), name="task-settings-summary"),
    
    # Test task execution
    path("test", TaskTestView.as_view(), name="task-test"),
    
    # Individual task configuration operations
    path(
        "<uuid:id>/detail",
        TaskConfigurationDetailView.as_view(),
        name="task-configuration-detail",
    ),
    path(
        "<uuid:id>/update",
        TaskConfigurationUpdateView.as_view(),
        name="task-configuration-update",
    ),
] 