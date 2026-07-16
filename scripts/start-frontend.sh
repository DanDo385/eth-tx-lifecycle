#!/usr/bin/env bash
# start-frontend.sh — Next.js UI; proxies /api/* to backend from config/ports.json.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=lib/ports.sh
source "$REPO_ROOT/scripts/lib/ports.sh"

ENV_FILE="$REPO_ROOT/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  echo "Loading environment from $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "No .env.local found at repo root; using defaults from config/ports.json."
fi

DESIRED_PORT=${WEB_PORT:-$ETH_TX_FRONTEND_PORT}
# Next rewrites need the backend URL. Do not set GOAPI_ORIGIN to the backend in a
# shared .env.local that the Go process also sources — see README.
export GOAPI_ORIGIN="${GOAPI_ORIGIN:-$ETH_TX_BACKEND_URL}"

if lsof -nP -iTCP:"${DESIRED_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERROR: Port ${DESIRED_PORT} is in use. Free it or set WEB_PORT in .env.local."
  exit 1
fi

echo "Starting Next.js frontend on localhost:${DESIRED_PORT}..."
echo "Proxying /api/* → ${GOAPI_ORIGIN}"
cd "$REPO_ROOT/frontend"
npx next dev -p "${DESIRED_PORT}"
