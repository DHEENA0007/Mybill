import threading

_thread_locals = threading.local()


def get_current_company():
    """Return the company of the current request's user, or None."""
    return getattr(_thread_locals, 'company', None)


def get_current_user():
    """Return the current request's user, or None."""
    return getattr(_thread_locals, 'user', None)


class CompanyMiddleware:
    """
    Stores the current user's company in thread-local storage so that
    model managers / querysets can auto-filter by company.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = None
        _thread_locals.company = None

        if hasattr(request, 'user') and request.user.is_authenticated:
            _thread_locals.user = request.user
            _thread_locals.company = getattr(request.user, 'company', None)

        response = self.get_response(request)

        # Clean up
        _thread_locals.user = None
        _thread_locals.company = None

        return response
