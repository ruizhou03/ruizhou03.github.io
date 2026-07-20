#!/usr/bin/env bash
# Inspect or restore a decrypted Waline pg_dump custom archive.
set -euo pipefail

MODE="${1:-}"
DUMP_FILE="${2:-}"

if [[ "$MODE" != "--list" && "$MODE" != "--apply" ]] || [[ -z "$DUMP_FILE" ]]; then
  echo "usage: $0 --list|--apply /absolute/path/to/waline.dump" >&2
  exit 2
fi
if [[ ! -f "$DUMP_FILE" ]]; then
  echo "dump not found: $DUMP_FILE" >&2
  exit 2
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required (the script uses the official postgres:17 image)" >&2
  exit 2
fi

DUMP_DIR="$(cd "$(dirname "$DUMP_FILE")" && pwd)"
DUMP_NAME="$(basename "$DUMP_FILE")"

if [[ "$MODE" == "--list" ]]; then
  docker run --rm -v "$DUMP_DIR:/backup:ro" postgres:17 \
    pg_restore --list "/backup/$DUMP_NAME"
  exit 0
fi

required=(POSTGRES_HOST POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DATABASE)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then echo "$name is required" >&2; exit 2; fi
done
if [[ "${CONFIRM_POSTGRES_RESTORE:-}" != "RESTORE_WALINE" ]]; then
  echo "refusing destructive restore; export CONFIRM_POSTGRES_RESTORE=RESTORE_WALINE" >&2
  exit 2
fi

export PGPASSWORD="$POSTGRES_PASSWORD"
export PGSSLMODE="${POSTGRES_SSLMODE:-require}"
docker run --rm \
  -e PGPASSWORD \
  -e PGSSLMODE \
  -v "$DUMP_DIR:/backup:ro" \
  postgres:17 \
  pg_restore --clean --if-exists --no-owner --no-acl \
    --host "$POSTGRES_HOST" --port "${POSTGRES_PORT:-5432}" \
    --username "$POSTGRES_USER" --dbname "$POSTGRES_DATABASE" \
    "/backup/$DUMP_NAME"
