#!/usr/bin/env bash
# juez-gemini.sh <img> "<pregunta>" [modelo] — mismo payload que ~/.local/bin/gemini-vision.sh
# pero con -m 240 (la API tardó >60 s esta noche) y salida cruda del .text.
set -uo pipefail
IMG="$1"; PROMPT="$2"; MODEL="${3:-gemini-2.5-flash}"
set -a; source "$HOME/.config/chagra-dr-keys.env" 2>/dev/null; set +a
TMP=$(mktemp); trap 'rm -f "$TMP" "$TMP.b64"' EXIT
base64 -w0 "$IMG" | tr -d '\n' > "$TMP.b64"
jq -n --arg t "$PROMPT" --rawfile d "$TMP.b64" '{contents:[{parts:[{text:$t},{inline_data:{mime_type:"image/png",data:$d}}]}]}' > "$TMP"
R="$(curl -sS -m240 "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=$GEMINI_API_KEY" -H 'Content-Type: application/json' -d @"$TMP")" || { echo "GEMINI-ERROR TRANSPORT"; exit 70; }
T="$(echo "$R" | jq -r '.candidates[0].content.parts[]?.text // empty' 2>/dev/null)"
[ -n "$T" ] && echo "$T" || { echo "GEMINI-ERROR: $(echo "$R" | jq -c '.error // .' | head -c 300)"; exit 71; }
