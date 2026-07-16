#!/usr/bin/env bash
# Start eth-tx-lifecycle Go API on the canonical staging bind (loopback only).
# Pair with Cloudflare Tunnel → https://api-staging-eth-tx.magro.dev
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=lib/ports.sh
source "$REPO_ROOT/scripts/lib/ports.sh"

ENV_FILE="$REPO_ROOT/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# Staging always uses ports.json bind unless GOAPI_ADDR is forced.
export GOAPI_ADDR="${GOAPI_ADDR:-$ETH_TX_BACKEND_BIND}"
# CORS for direct tunnel hits; Vercel same-origin proxy does not need this.
export GOAPI_ORIGIN="${GOAPI_ORIGIN:-$ETH_TX_VERCEL_ORIGIN}"

mkdir -p "$REPO_ROOT/backend/bin"
cd "$REPO_ROOT/backend"
if [[ ! -x "$REPO_ROOT/backend/bin/eth-tx-lifecycle" ]]; then
  echo "Compiling backend..."
  go build -o "$REPO_ROOT/backend/bin/eth-tx-lifecycle" ./cmd/eth-tx-lifecycle
fi

echo "eth-tx-lifecycle backend → http://${GOAPI_ADDR}"
echo "health                   → ${ETH_TX_BACKEND_URL}/api/health"
echo "ready                    → ${ETH_TX_BACKEND_URL}/api/health/ready"
echo "tunnel target            → ${ETH_TX_PUBLIC_API_ORIGIN}  (cloudflared → ${ETH_TX_BACKEND_URL})"
echo

exec env GOAPI_ADDR="$GOAPI_ADDR" GOAPI_ORIGIN="$GOAPI_ORIGIN" \
  "$REPO_ROOT/backend/bin/eth-tx-lifecycle"
