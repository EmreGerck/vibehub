#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# backup-db.sh — Daily PostgreSQL backup → Cloudflare R2 (or S3-compatible)
#
# Usage:
#   ./scripts/backup-db.sh           # manual run
#   Cron: 0 2 * * * /path/to/scripts/backup-db.sh >> /var/log/vibehub-backup.log 2>&1
#
# Required env vars (export or put in /etc/environment on the VPS):
#   DATABASE_URL        — Postgres connection string
#   R2_BUCKET           — e.g. "vibehub-backups"
#   R2_ENDPOINT         — e.g. "https://<account>.r2.cloudflarestorage.com"
#   R2_ACCESS_KEY_ID    — R2 / S3 access key
#   R2_SECRET_ACCESS_KEY
#   BACKUP_RETENTION_DAYS — how many days to keep (default: 30)
#   ALERT_EMAIL         — where to send failure alerts (optional)
#
# Dependencies: pg_dump, aws CLI (pip install awscli or apt install awscli),
#               gzip, openssl
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load .env if present (VPS direct run)
if [[ -f "$PROJECT_ROOT/backend/.env" ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$PROJECT_ROOT/backend/.env" | xargs)
fi

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
R2_BUCKET="${R2_BUCKET:?R2_BUCKET is required}"
R2_ENDPOINT="${R2_ENDPOINT:?R2_ENDPOINT is required}"
R2_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
R2_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

# ── Helpers ───────────────────────────────────────────────────────────────────
log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }
fail() { log "ERROR: $*"; send_alert "$*"; exit 1; }

send_alert() {
  if [[ -n "$ALERT_EMAIL" ]] && command -v mail &>/dev/null; then
    echo "VibeHub DB backup FAILED at $(date): $1" | \
      mail -s "🚨 VibeHub DB Backup Failure" "$ALERT_EMAIL"
  fi
}

# ── Preflight checks ──────────────────────────────────────────────────────────
command -v pg_dump &>/dev/null || fail "pg_dump not found. Install postgresql-client."
command -v aws    &>/dev/null || fail "aws CLI not found. Run: pip install awscli"
command -v gzip   &>/dev/null || fail "gzip not found."

# ── Dump ─────────────────────────────────────────────────────────────────────
TIMESTAMP="$(date -u '+%Y%m%d_%H%M%S')"
FILENAME="vibehub_${TIMESTAMP}.sql.gz"
TMPFILE="/tmp/${FILENAME}"

log "Starting pg_dump → $TMPFILE"
pg_dump "$DATABASE_URL" \
  --format=plain \
  --no-password \
  --no-owner \
  --no-acl \
  | gzip -9 > "$TMPFILE" \
  || fail "pg_dump failed"

FILESIZE="$(du -sh "$TMPFILE" | cut -f1)"
log "Dump complete — size: $FILESIZE"

# ── Upload to R2 / S3 ─────────────────────────────────────────────────────────
S3_KEY="backups/${FILENAME}"
log "Uploading to s3://${R2_BUCKET}/${S3_KEY} via ${R2_ENDPOINT}"

AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
aws s3 cp "$TMPFILE" "s3://${R2_BUCKET}/${S3_KEY}" \
  --endpoint-url "$R2_ENDPOINT" \
  --storage-class STANDARD \
  || fail "S3 upload failed"

log "Upload successful"

# ── Cleanup local temp file ───────────────────────────────────────────────────
rm -f "$TMPFILE"
log "Local temp file removed"

# ── Prune old backups (older than RETENTION_DAYS) ────────────────────────────
CUTOFF_DATE="$(date -u -d "${RETENTION_DAYS} days ago" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null \
  || date -u -v "-${RETENTION_DAYS}d" '+%Y-%m-%dT%H:%M:%SZ')"

log "Pruning backups older than ${RETENTION_DAYS} days (before ${CUTOFF_DATE})"

AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
aws s3api list-objects-v2 \
  --bucket "$R2_BUCKET" \
  --prefix "backups/" \
  --endpoint-url "$R2_ENDPOINT" \
  --query "Contents[?LastModified<='${CUTOFF_DATE}'].Key" \
  --output text 2>/dev/null \
| tr '\t' '\n' \
| while read -r key; do
    [[ -z "$key" ]] && continue
    log "Deleting old backup: $key"
    AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
    aws s3 rm "s3://${R2_BUCKET}/${key}" \
      --endpoint-url "$R2_ENDPOINT" 2>/dev/null || true
  done

log "Backup job completed successfully ✓"
log "  File    : ${FILENAME}"
log "  Size    : ${FILESIZE}"
log "  Stored  : s3://${R2_BUCKET}/${S3_KEY}"
log "  Retained: ${RETENTION_DAYS} days"
