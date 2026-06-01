"""
WSGI config for billing_system project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
import threading
import time
import urllib.request

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "billing_system.settings")

application = get_wsgi_application()

def keep_awake():
    while True:
        try:
            time.sleep(300)  # 5 minutes
            urllib.request.urlopen("https://mybill-u3mf.onrender.com/health/")
        except Exception:
            pass

# Start the background thread
threading.Thread(target=keep_awake, daemon=True).start()
