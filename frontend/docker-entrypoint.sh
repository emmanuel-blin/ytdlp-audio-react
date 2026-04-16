#!/bin/sh
set -e

HTPASSWD_FILE="/etc/nginx/.htpasswd"

if [ -n "$AUTH_USER" ] && [ -n "$AUTH_PASS" ]; then
    # Generate .htpasswd from env vars
    htpasswd -cb "$HTPASSWD_FILE" "$AUTH_USER" "$AUTH_PASS"
    echo "Basic auth enabled for user: $AUTH_USER"

    # Enable auth_basic in nginx config
    sed -i 's|# auth_basic "|auth_basic "|' /etc/nginx/conf.d/default.conf
else
    # No credentials — create empty file and skip auth
    : > "$HTPASSWD_FILE"
    echo "No AUTH_USER/AUTH_PASS set — running without authentication"
fi

exec "$@"
