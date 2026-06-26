#!/bin/sh

echo "--- STARTING GLOSS TIENDA INFRASTRUCTURE ---"

# 1. Start Cloudflare Tunnel Receiver in the background
if [ -n "$CF_CLIENT_ID" ] && [ -n "$CF_CLIENT_SECRET" ]; then
    echo "Configuring Cloudflare Tunnel Bridge for ERP..."
    
    # Iniciamos el tunel TCP de Cloudflare asociando db.syscom.click a localhost:1433
    cloudflared access tcp --hostname db.syscom.click --listener 0.0.0.0:1433 --service-token-id "$CF_CLIENT_ID" --service-token-secret "$CF_CLIENT_SECRET" > /app/tunnel.log 2>&1 &
    
    echo "Cloudflare Tunnel established."
    sleep 2
else
    echo "WARNING: CF_CLIENT_ID or CF_CLIENT_SECRET not set. Proceeding without Cloudflare Tunnel."
fi

# 2. Start Next.js Application
echo "Starting Tienda Gloss Application..."
npm start
