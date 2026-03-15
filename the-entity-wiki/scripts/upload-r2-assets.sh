#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/upload-r2-assets.sh --bucket <r2-bucket> --public-base-url <url> --source <folder> [--prefix <path>] [--remote <name>]

Options:
  --bucket           R2 bucket name (required)
  --public-base-url  Public asset base URL for display after upload (required)
  --source           Local source folder to upload (required)
  --prefix           Remote prefix inside bucket (default: empty)
  --remote           rclone remote name (default: r2)

Example:
  ./scripts/upload-r2-assets.sh \
    --bucket entity-wiki-assets \
    --public-base-url https://assets.yourdomain.com \
    --source web/dbd_images/perks \
    --prefix perks

Prerequisite:
  Configure an rclone remote for Cloudflare R2, for example named 'r2'.
EOF
}

BUCKET=""
PUBLIC_BASE_URL=""
SOURCE=""
PREFIX=""
REMOTE="r2"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bucket)
      BUCKET="${2:-}"
      shift 2
      ;;
    --public-base-url)
      PUBLIC_BASE_URL="${2:-}"
      shift 2
      ;;
    --source)
      SOURCE="${2:-}"
      shift 2
      ;;
    --prefix)
      PREFIX="${2:-}"
      shift 2
      ;;
    --remote)
      REMOTE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$BUCKET" || -z "$PUBLIC_BASE_URL" || -z "$SOURCE" ]]; then
  echo "Missing required arguments." >&2
  usage
  exit 1
fi

if [[ ! -d "$SOURCE" ]]; then
  echo "Source folder not found: $SOURCE" >&2
  exit 1
fi

DEST="${REMOTE}:${BUCKET}"
if [[ -n "$PREFIX" ]]; then
  DEST="${DEST}/${PREFIX}"
fi

echo "Uploading from: $SOURCE"
echo "Uploading to:   $DEST"

rclone sync "$SOURCE" "$DEST" \
  --progress \
  --transfers 8 \
  --checkers 16 \
  --fast-list

TRIMMED_BASE="${PUBLIC_BASE_URL%/}"
if [[ -n "$PREFIX" ]]; then
  echo "Done. Public URL prefix: ${TRIMMED_BASE}/${PREFIX}/"
else
  echo "Done. Public URL prefix: ${TRIMMED_BASE}/"
fi
