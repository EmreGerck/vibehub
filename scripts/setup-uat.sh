#!/usr/bin/env bash
# =============================================================================
# VibeHub UAT Environment Setup Script
# Run on VPS as root: bash /root/vibehub/scripts/setup-uat.sh
# =============================================================================
set -euo pipefail

DOMAIN="vibehub.com.tr"
UAT_FRONTEND_DOMAIN="uat.${DOMAIN}"
UAT_API_DOMAIN="api-uat.${DOMAIN}"
PROJECT_DIR="/root/vibehub"

echo "=== [1/6] Generating UAT JWT secrets ==="
UAT_ACCESS_SECRET=$(openssl rand -hex 32)
UAT_REFRESH_SECRET=$(openssl rand -hex 32)

# Patch the .env.uat with real secrets
sed -i "s|REPLACE_WITH_RANDOM_UAT_SECRET_32BYTES_2|${UAT_REFRESH_SECRET}|g" "${PROJECT_DIR}/backend/.env.uat"
sed -i "s|REPLACE_WITH_RANDOM_UAT_SECRET_32BYTES|${UAT_ACCESS_SECRET}|g" "${PROJECT_DIR}/backend/.env.uat"
echo "  JWT secrets injected."

echo "=== [2/6] Ensuring production network exists ==="
docker network inspect vibehub_default >/dev/null 2>&1 || \
  docker network create vibehub_default
echo "  Network OK."

echo "=== [3/6] Creating nginx config for UAT subdomains ==="

# --- uat.vibehub.com.tr ---
cat > /etc/nginx/sites-available/${UAT_FRONTEND_DOMAIN} <<'NGINX_FRONTEND'
server {
    listen 80;
    server_name uat.vibehub.com.tr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name uat.vibehub.com.tr;

    # Real IP from Cloudflare
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    real_ip_header CF-Connecting-IP;

    ssl_certificate     /etc/letsencrypt/live/vibehub.com.tr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vibehub.com.tr/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Environment "uat" always;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINX_FRONTEND

# --- api-uat.vibehub.com.tr ---
cat > /etc/nginx/sites-available/${UAT_API_DOMAIN} <<'NGINX_API'
server {
    listen 80;
    server_name api-uat.vibehub.com.tr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api-uat.vibehub.com.tr;

    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    real_ip_header CF-Connecting-IP;

    ssl_certificate     /etc/letsencrypt/live/vibehub.com.tr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vibehub.com.tr/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Environment "uat" always;

    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINX_API

ln -sf /etc/nginx/sites-available/${UAT_FRONTEND_DOMAIN} /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/${UAT_API_DOMAIN} /etc/nginx/sites-enabled/
echo "  nginx configs created."

echo "=== [4/6] Expanding Let's Encrypt cert to cover UAT subdomains ==="
certbot certonly --nginx \
  --non-interactive --agree-tos \
  -d "${DOMAIN}" -d "www.${DOMAIN}" -d "api.${DOMAIN}" -d "db.${DOMAIN}" \
  -d "${UAT_FRONTEND_DOMAIN}" -d "${UAT_API_DOMAIN}" \
  --expand || echo "  WARNING: certbot expand may have warned — check output above."

echo "  Testing nginx config..."
nginx -t && systemctl reload nginx
echo "  nginx reloaded."

echo "=== [5/6] Building and starting UAT containers ==="
cd "${PROJECT_DIR}"
docker compose -f docker-compose.uat.yml build --no-cache
docker compose -f docker-compose.uat.yml up -d

echo "=== [6/6] Seeding UAT GOD_USER ==="
sleep 8  # wait for backend to finish migration
docker exec vibehub_backend_uat \
  sh -c "GOD_USER_EMAIL=uat-admin@vibehub.com.tr GOD_USER_PASSWORD='UAT@VibeHub2025!' node -e \"
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const email = process.env.GOD_USER_EMAIL;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { console.log('GOD_USER already exists'); return; }
  const hash = await bcrypt.hash(process.env.GOD_USER_PASSWORD, 12);
  await prisma.user.create({ data: { email, passwordHash: hash, role: 'GOD_USER', tenantId: null }});
  console.log('GOD_USER seeded: ' + email);
}
main().finally(() => prisma.\$disconnect());
\"" || echo "  Seed will retry on next deploy — continuing."

echo ""
echo "====================================================="
echo "  UAT environment is UP"
echo "====================================================="
echo "  Frontend : https://${UAT_FRONTEND_DOMAIN}"
echo "  API      : https://${UAT_API_DOMAIN}"
echo "  Admin    : https://${UAT_FRONTEND_DOMAIN}/dashboard/admin"
echo "  Login    : uat-admin@vibehub.com.tr / UAT@VibeHub2025!"
echo "====================================================="
echo ""
echo "  IMPORTANT: Add these DNS records in Cloudflare:"
echo "  ${UAT_FRONTEND_DOMAIN}  A  94.154.34.99  (Proxy: ON)"
echo "  ${UAT_API_DOMAIN}       A  94.154.34.99  (Proxy: OFF / DNS only)"
echo "====================================================="
