#!/usr/bin/env bash
# exit on error
set -o errexit

gunicorn billing_system.wsgi:application
