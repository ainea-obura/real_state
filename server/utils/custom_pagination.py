import math
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.exceptions import NotFound


class CustomPageNumberPagination(PageNumberPagination):
    page_size = 10
    page_query_param = "page"
    page_size_query_param = "page_size"
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        """
        Overrides the default pagination to catch out-of-range page requests.
        If the requested page is out-of-range, we default to page 1.
        """
        self.request = request  # store the request for later use
        try:
            return super().paginate_queryset(queryset, request, view)
        except NotFound:
            # If the requested page doesn't exist, default to page 1.
            paginator = self.django_paginator_class(
                queryset, self.get_page_size(request)
            )
            self.page = paginator.page(1)
            return list(self.page)

    def get_paginated_response(self, data):

        return Response(
            {
                "count": self.page.paginator.count,
                "results": data,
            }
        )