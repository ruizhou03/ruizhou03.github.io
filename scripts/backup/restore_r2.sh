#!/usr/bin/env bash
# Restore missing/changed objects from the private R2 mirror. Dry-run by default.
set -euo pipefail

MODE="${1:---dry-run}"
if [[ "$MODE" != "--dry-run" && "$MODE" != "--apply" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi
required=(R2_ENDPOINT R2_SOURCE_BUCKET R2_BACKUP_BUCKET AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then echo "$name is required" >&2; exit 2; fi
done
if [[ "$R2_SOURCE_BUCKET" == "$R2_BACKUP_BUCKET" ]]; then
  echo "source and backup buckets must differ" >&2
  exit 2
fi
if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI is required" >&2
  exit 2
fi

args=(s3 sync "s3://$R2_BACKUP_BUCKET/r2-mirror/current/" "s3://$R2_SOURCE_BUCKET/"
      --endpoint-url "$R2_ENDPOINT" --only-show-errors)
if [[ "$MODE" == "--dry-run" ]]; then
  args+=(--dryrun)
elif [[ "${CONFIRM_R2_RESTORE:-}" != "RESTORE_R2" ]]; then
  echo "refusing restore; export CONFIRM_R2_RESTORE=RESTORE_R2" >&2
  exit 2
fi
aws "${args[@]}"
