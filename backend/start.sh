#!/usr/bin/env bash
# exit on error
set -o errexit

# Start keep-alive pinger in the background
python keep_alive.py &

gunicorn billing_system.wsgi:application
