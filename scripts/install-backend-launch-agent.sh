#!/usr/bin/env bash
# Install a launchd agent that keeps the staging backend alive (RunAtLoad + KeepAlive).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=lib/ports.sh
source "$REPO_ROOT/scripts/lib/ports.sh"

LABEL="com.danmagro.eth-tx-lifecycle.backend"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="$HOME/Library/Logs/eth-tx-lifecycle"
WRAPPER="$REPO_ROOT/scripts/start-staging-backend.sh"
BIN="$REPO_ROOT/backend/bin/eth-tx-lifecycle"

mkdir -p "$LOG_DIR" "$HOME/Library/LaunchAgents" "$REPO_ROOT/backend/bin"

echo "Building backend binary..."
(
  cd "$REPO_ROOT/backend"
  go build -o "$BIN" ./cmd/eth-tx-lifecycle
)

chmod +x "$WRAPPER"

# Unload existing agent if present
if launchctl print "gui/$(id -u)/${LABEL}" >/dev/null 2>&1; then
  launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
fi

cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${WRAPPER}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${REPO_ROOT}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/backend.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/backend.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>GOAPI_ADDR</key>
    <string>${ETH_TX_BACKEND_BIND}</string>
    <key>GOAPI_ORIGIN</key>
    <string>${ETH_TX_VERCEL_ORIGIN}</string>
  </dict>
</dict>
</plist>
EOF

launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed and started ${LABEL}"
echo "  bind:   ${ETH_TX_BACKEND_BIND}"
echo "  health: ${ETH_TX_BACKEND_URL}/api/health/ready"
echo "  logs:   ${LOG_DIR}/"
echo "  plist:  ${PLIST}"
echo
echo "Verify: curl -s ${ETH_TX_BACKEND_URL}/api/health/ready && echo"
echo "Public: curl -s ${ETH_TX_PUBLIC_API_ORIGIN}/api/health/ready && echo"
