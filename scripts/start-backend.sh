#!/bin/bash
# start-backend.sh
# Builds and starts the Go backend server that fetches data from Ethereum
# execution layer, beacon chain, and MEV relays.

set -euo pipefail

# Figure out where we are so we can find .env.local and the backend folder
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load config from .env.local if it exists (custom RPC endpoints, relay URLs, etc)
ENV_FILE="$REPO_ROOT/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  echo "Loading environment from $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "No .env.local found at repo root; using defaults."
fi

# Default to port 8080 if not specified in .env.local
ADDR_TO_USE=${GOAPI_ADDR:-:8080}

cd "$REPO_ROOT/backend"

# Build the binary first
echo "Compiling backend..."
go build -o "$REPO_ROOT/.pids/eth-tx-lifecycle-backend" ./cmd/eth-tx-lifecycle
echo "Backend compiled successfully."

# Show which data sources we're using (helpful for debugging)
echo "Using RPC_HTTP_URL=${RPC_HTTP_URL:-(default)}"
echo "Using RELAY_URLS=${RELAY_URLS:-(default)}"
echo "Starting backend server on ${ADDR_TO_USE}..."

# Run the compiled binary
exec env GOAPI_ADDR="$ADDR_TO_USE" "$REPO_ROOT/.pids/eth-tx-lifecycle-backend"
