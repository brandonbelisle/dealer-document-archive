#!/bin/bash
# generate-cert.sh
# Generates a self-signed SSL certificate for HTTPS.
# Run once: bash generate-cert.sh
# Certificates are saved to backend/ssl/

set -e

SSL_DIR="$(cd "$(dirname "$0")" && pwd)/backend/ssl"
mkdir -p "$SSL_DIR"

# Check if certs already exist
if [ -f "$SSL_DIR/server.key" ] && [ -f "$SSL_DIR/server.crt" ]; then
  echo ""
  echo "  ⚠ Certificates already exist in backend/ssl/"
  read -p "  Overwrite? (y/N): " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "  Cancelled."
    exit 0
  fi
fi

echo ""
echo "  Generating self-signed SSL certificate..."
echo ""

# Get the server's IP for the certificate
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
  SERVER_IP="127.0.0.1"
fi

echo "  Server IP detected: $SERVER_IP"
echo ""

# Generate private key and certificate in one command
# Valid for 365 days, includes the IP as a Subject Alternative Name
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$SSL_DIR/server.key" \
  -out "$SSL_DIR/server.crt" \
  -subj "/C=US/ST=State/L=City/O=DDA/CN=$SERVER_IP" \
  -addext "subjectAltName=IP:$SERVER_IP,IP:127.0.0.1,DNS:localhost" \
  2>/dev/null

# Set permissions
chmod 600 "$SSL_DIR/server.key"
chmod 644 "$SSL_DIR/server.crt"

echo ""
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  ✓ SSL Certificate Generated                        │"
echo "  │                                                     │"
echo "  │  Key:     backend/ssl/server.key                    │"
echo "  │  Cert:    backend/ssl/server.crt                    │"
echo "  │  IP:      $SERVER_IP"
echo "  │  Expires: $(date -d '+365 days' '+%Y-%m-%d' 2>/dev/null || date -v+365d '+%Y-%m-%d' 2>/dev/null || echo '365 days from now')"
echo "  │                                                     │"
echo "  │  Now set in backend/.env:                           │"
echo "  │    SSL_ENABLED=true                                 │"
echo "  │    SSL_KEY=./ssl/server.key                         │"
echo "  │    SSL_CERT=./ssl/server.crt                        │"
echo "  │    PORT=443                                         │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""
echo "  Note: Browsers will show a security warning because"
echo "  the certificate is self-signed. Click 'Advanced' →"
echo "  'Proceed' to continue."
echo ""
