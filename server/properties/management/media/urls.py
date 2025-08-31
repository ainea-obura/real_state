from django.urls import path
from .views import ProjectSearchView, MediaUploadView, MediaListView, MediaDeleteView

urlpatterns = [
    path("search-projects/", ProjectSearchView.as_view(), name="search-projects"),
    path("upload/", MediaUploadView.as_view(), name="media-upload"),
    path("", MediaListView.as_view(), name="media-list"),
    path("<uuid:id>/delete/", MediaDeleteView.as_view(), name="media-delete"),
]
