from rest_framework.pagination import PageNumberPagination

class CustomPageNumberPagination(PageNumberPagination):
    page_size_query_param = 'page_size'
    max_page_size = 10000

    def get_page_size(self, request):
        # Support 'limit' as an alias for 'page_size' (used by some frontend queries)
        if 'limit' in request.query_params:
            try:
                return min(int(request.query_params['limit']), self.max_page_size)
            except ValueError:
                pass
        return super().get_page_size(request)
