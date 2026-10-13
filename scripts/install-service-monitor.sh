#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="com.fgstudio.service-monitor"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs"
USER_DOMAIN="gui/$(id -u)"
DOCKER_BIN="$(command -v docker || true)"
ENV_FILE="$PROJECT_ROOT/.env.docker"
# Never replace a loaded production job through the installer.
# 安装器不通过替换流程中断已加载的生产任务。
if launchctl print "$USER_DOMAIN/$LABEL" >/dev/null 2>&1; then
  printf '%s is already loaded; leaving it running without changing its plist.\n' "$LABEL"
  exit 0
fi
if ! DISABLED_SERVICES="$(launchctl print-disabled "$USER_DOMAIN" 2>&1)"; then
  printf 'Cannot read disabled state for %s; refusing installation: %s\n' "$LABEL" "$DISABLED_SERVICES" >&2
  exit 1
fi
if printf '%s\n' "$DISABLED_SERVICES" | awk -v label="$LABEL" '$1 == "\"" label "\"" && $2 == "=>" && $3 == "disabled" { found = 1 } END { exit !found }'; then
  printf '%s is explicitly disabled; refusing to enable or install it.\n' "$LABEL" >&2
  exit 1
fi

[[ -x "$DOCKER_BIN" ]] || { printf 'Docker CLI was not found.\n' >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { printf 'Missing environment file: %s\n' "$ENV_FILE" >&2; exit 1; }

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"
TEMP_PLIST="$(mktemp "${TMPDIR:-/tmp}/fg-studio-service-monitor.XXXXXX")"
cleanup() {
  rm -f "$TEMP_PLIST"
}
trap cleanup EXIT

cat > "$TEMP_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PROJECT_ROOT/scripts/service-monitor.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$(dirname "$DOCKER_BIN"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>30</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/fg-studio-service-monitor.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/fg-studio-service-monitor.error.log</string>
</dict>
</plist>
PLIST

plutil -lint "$TEMP_PLIST" >/dev/null
install -m 600 "$TEMP_PLIST" "$PLIST_PATH"
launchctl bootstrap "$USER_DOMAIN" "$PLIST_PATH"

printf 'Service monitor installed: %s\n' "$PLIST_PATH"
