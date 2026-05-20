#!/usr/bin/env bash
# =============================================================================
# VibeHub UAT Re-deploy Script
# Run on VPS after a git pull: bash /root/vibehub/scripts/deploy-uat.sh
# =============================================================================
set -euo pipefail

PROJECT_DIR="/root/vibehub"
cd "${PROJECT_DIR}"

echo "=== Pulling latest code ==="
git pull origin main   # change to 'staging' if you have a separate UAT branch

echo "=== Rebuilding UAT containers ==="
docker compose -f docker-compose.uat.yml build --no-cache

echo "=== Restarting UAT containers ==="
docker compose -f docker-compose.uat.yml up -d --force-recreate

echo "=== UAT containers status ==="
docker compose -f docker-compose.uat.yml ps

echo ""
echo "  UAT re-deploy complete → https://uat.vibehub.com.tr"
