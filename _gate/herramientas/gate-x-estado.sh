#!/usr/bin/env bash
set -u

salida=$(xset q 2>/dev/null || true)
if [[ "$salida" != *"Monitor is"* ]]; then
  echo "NO PUDE CONSULTAR"
  exit 2
fi
if [[ "$salida" == *"Monitor is Off"* ]]; then
  echo "DORMIDA"
  exit 1
fi
echo "VIVO"
