#!/usr/bin/env bash
# con-x.sh — corre un comando con la sesión X viva (misma detección que ~/.local/bin/shot3d).
# Uso: con-x.sh node captura.mjs ...
set -euo pipefail
if [ -z "${XAUTHORITY:-}" ] || [ ! -r "${XAUTHORITY:-/nonexistent}" ]; then
  for _p in $(pgrep -f plasmashell 2>/dev/null || true) $(pgrep -f kwin_x11 2>/dev/null || true); do
    _env=$(sudo -n tr '\0' '\n' < "/proc/$_p/environ" 2>/dev/null || tr '\0' '\n' < "/proc/$_p/environ" 2>/dev/null || true)
    _xa=$(printf '%s\n' "$_env" | sed -n 's/^XAUTHORITY=//p' | head -1)
    [ -n "$_xa" ] && [ -r "$_xa" ] || continue
    _dp=$(printf '%s\n' "$_env" | sed -n 's/^DISPLAY=//p' | head -1)
    export XAUTHORITY="$_xa"
    [ -n "$_dp" ] && [ -z "${DISPLAY:-}" ] && export DISPLAY="$_dp"
    echo "[con-x] DISPLAY=${DISPLAY:-?} XAUTHORITY=$XAUTHORITY (pid $_p)" >&2
    break
  done
fi
[ -n "${XAUTHORITY:-}" ] && [ -r "$XAUTHORITY" ] || { echo "[con-x] sin sesión X legible" >&2; exit 3; }
export DISPLAY="${DISPLAY:-:0}"
xset dpms force on 2>/dev/null || true
exec "$@"
