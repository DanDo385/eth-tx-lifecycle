# shellcheck shell=bash
# Source from other scripts:  source "$REPO_ROOT/scripts/lib/ports.sh"
# Exports canonical ports from config/ports.json (override with env if already set).

_ports_json="${REPO_ROOT:?REPO_ROOT must be set}/config/ports.json"

if [[ ! -f "$_ports_json" ]]; then
  echo "ERROR: missing $_ports_json" >&2
  return 1 2>/dev/null || exit 1
fi

_ports_eval="$(
  python3 - "$_ports_json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
b, f, s = p["backend"], p["frontend"], p.get("staging") or {}
print(f'export ETH_TX_BACKEND_HOST={b["host"]!r}')
print(f'export ETH_TX_BACKEND_PORT={b["port"]}')
print(f'export ETH_TX_BACKEND_URL={b["url"]!r}')
print(f'export ETH_TX_BACKEND_BIND={b["bind"]!r}')
print(f'export ETH_TX_FRONTEND_HOST={f["host"]!r}')
print(f'export ETH_TX_FRONTEND_PORT={f["port"]}')
print(f'export ETH_TX_FRONTEND_URL={f["url"]!r}')
print(f'export ETH_TX_PUBLIC_API_ORIGIN={s.get("publicApiOrigin", "")!r}')
print(f'export ETH_TX_VERCEL_ORIGIN={s.get("vercelOrigin", "")!r}')
PY
)"
eval "$_ports_eval"
unset _ports_json _ports_eval
