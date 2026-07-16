#!/usr/bin/env bash
# start-backend.sh
# Builds and starts the Go backend (canonical port from config/ports.json).

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

# Prefer explicit GOAPI_ADDR, then PORT, then ports.json bind.
if [[ -n "${GOAPI_ADDR:-}" ]]; then
  ADDR_TO_USE="$GOAPI_ADDR"
elif [[ -n "${PORT:-}" ]]; then
  ADDR_TO_USE=":${PORT}"
else
  ADDR_TO_USE="$ETH_TX_BACKEND_BIND"
fi

cd "$REPO_ROOT/backend"

mkdir -p "$REPO_ROOT/backend/bin"
echo "Compiling backend..."
go build -o "$REPO_ROOT/backend/bin/eth-tx-lifecycle" ./cmd/eth-tx-lifecycle
echo "Backend compiled successfully."

echo "Using RPC_HTTP_URL=${RPC_HTTP_URL:-(default)}"
echo "Using RELAY_URLS=${RELAY_URLS:-(default)}"
echo "Starting backend server on ${ADDR_TO_USE}..."
echo "Health: ${ETH_TX_BACKEND_URL}/api/health (when using ports.json bind)"

exec env GOAPI_ADDR="$ADDR_TO_USE" "$REPO_ROOT/backend/bin/eth-tx-lifecycle"
