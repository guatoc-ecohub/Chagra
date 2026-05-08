#!/usr/bin/env bash
# update-cli-stack.sh — actualiza CLIs del stack agentes (mensual)
#
# Cadencia recomendada: cron `0 4 1 * *` (1ro de cada mes 04:00)
# Excluye: Immich (pinning manual + alert RSS aparte)
#
# Cobertura por CLI:
#   - claude (npm-global)        → npm install -g @anthropic-ai/claude-code@latest
#   - opencode (NixOS sw)        → recordatorio: bump via flake update guatoc-nixos
#   - cursor-agent (curl ~/.local/bin) → curl https://cursor.com/install | bash
#   - uv (curl ~/.local/bin)     → uv self update
#
# Logs: ~/.local/state/stack-updates/YYYY-MM-DD.log (retención 90 días)
# Notif: opcional via $HAND_GUATOC_BEARER → POST hand.guatoc.co/notify

set -euo pipefail

DATE=$(date +%Y-%m-%d)
LOG_DIR="$HOME/.local/state/stack-updates"
LOG_FILE="$LOG_DIR/$DATE.log"
mkdir -p "$LOG_DIR"

note() { echo "[$(date '+%H:%M:%S')] $*"; }

run_step() {
  local label="$1"; shift
  note "=== $label ==="
  if "$@"; then
    note "✓ $label OK"
    return 0
  else
    note "✗ $label FAILED (exit $?)"
    return 1
  fi
}

{
  note "Stack update — $DATE · host=$(hostname) user=$USER"

  # 1. Claude Code CLI (npm-global)
  if command -v npm >/dev/null 2>&1; then
    run_step "Claude Code (npm)" npm install -g @anthropic-ai/claude-code@latest || true
  fi

  # 2. cursor-agent (curl installer)
  if [ -f "$HOME/.local/bin/cursor-agent" ]; then
    run_step "cursor-agent (curl)" bash -c 'curl -fsS https://cursor.com/install | bash' || true
  fi

  # 3. uv (curl installer self-update)
  if command -v uv >/dev/null 2>&1; then
    run_step "uv self-update" uv self update || true
  fi

  # 4. opencode (NixOS sw) — NO actualizable acá, requiere bump flake
  if command -v opencode >/dev/null 2>&1; then
    OC_PATH=$(readlink -f "$(command -v opencode)" 2>/dev/null || echo "")
    if echo "$OC_PATH" | grep -q "^/nix/store/"; then
      note "ℹ opencode viene de NixOS sw — bump via Renovate PR sobre"
      note "  guatoc-nixos/flake.lock (auto-PR mensual). Versión actual:"
      note "  $(opencode --version 2>/dev/null | head -1)"
    else
      note "opencode no nix-managed: $(opencode --version 2>/dev/null | head -1)"
    fi
  fi

  # 5. Versiones post-update
  note "--- versiones finales ---"
  command -v claude       >/dev/null 2>&1 && note "claude:        $(claude --version 2>/dev/null | head -1)"
  command -v cursor-agent >/dev/null 2>&1 && note "cursor-agent:  $(cursor-agent --version 2>/dev/null | head -1)"
  command -v opencode     >/dev/null 2>&1 && note "opencode:      $(opencode --version 2>/dev/null | head -1)"
  command -v uv           >/dev/null 2>&1 && note "uv:            $(uv --version 2>/dev/null)"

  note "Stack update done."
} 2>&1 | tee "$LOG_FILE"

# Notificación Telegram via OpenFang (opcional, requiere $HAND_GUATOC_BEARER)
HAND_TOKEN="${HAND_GUATOC_BEARER:-}"
if [ -n "$HAND_TOKEN" ] && command -v curl >/dev/null 2>&1; then
  SUMMARY=$(tail -8 "$LOG_FILE" | sed 's/"/\\"/g' | tr '\n' ' ' | cut -c1-700)
  curl -fsS -X POST "https://hand.guatoc.co/notify" \
    -H "Authorization: Bearer $HAND_TOKEN" \
    -H "Content-Type: application/json" \
    --data-raw "{\"text\":\"📦 Stack update $DATE\n$SUMMARY\"}" \
    >/dev/null 2>&1 || true
fi

# Limpiar logs viejos (>90 días)
find "$LOG_DIR" -name "*.log" -mtime +90 -delete 2>/dev/null || true

exit 0
