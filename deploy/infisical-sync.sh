#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# shellcheck source=/dev/null
source ./infisical.conf

export INFISICAL_API_URL="${INFISICAL_HOST:-https://app.infisical.com/api}"

TOKEN="$(infisical login \
  --method=universal-auth \
  --client-id="$INFISICAL_CLIENT_ID" \
  --client-secret="$INFISICAL_CLIENT_SECRET" \
  --silent --plain)"

TMP="$(mktemp "$DIR/.env.XXXXXX")"
trap 'rm -f "$TMP"' EXIT

{
  cat deploy.env
  echo
  INFISICAL_TOKEN="$TOKEN" infisical export \
    --projectId="$INFISICAL_PROJECT_ID" \
    --env="$INFISICAL_ENV" \
    --path=/ \
    --format=dotenv
} > "$TMP"
chmod 600 "$TMP"

if [ -f .env ] && cmp -s "$TMP" .env; then
  exit 0
fi

mv "$TMP" .env
trap - EXIT
echo "$(date -Is) env changed, rolling containers"
docker compose up -d --remove-orphans
