#!/usr/bin/env bash
# modules/ai/scripts/test_kokoro.sh
# Test inline de síntesis Kokoro-82M ONNX TTS
# Sintetiza texto de prueba en voz ef_dora, mide RTF, output a /tmp/test_kokoro.opus
set -euo pipefail

HOST="${KOKORO_HOST:-127.0.0.1}"
PORT="${KOKORO_PORT:-8088}"
VOICE="${KOKORO_VOICE:-ef_dora}"
FORMAT="${KOKORO_FORMAT:-opus}"
OUTPUT="${KOKORO_OUTPUT:-/tmp/test_kokoro.opus}"

TEXT="Registro de siembra completado para tomate cama tres"

echo "=== Kokoro TTS Test ==="
echo "Host: $HOST:$PORT"
echo "Voice: $VOICE"
echo "Format: $FORMAT"
echo "Text: $TEXT"
echo ""

START=$(date +%s.%N)

RESPONSE=$(curl -sS \
  -X POST "http://$HOST:$PORT/tts" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$TEXT\",\"voice\":\"$VOICE\",\"format\":\"$FORMAT\"}" \
  -w "\n%{http_code}" \
  --output "$OUTPUT" \
  2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
END=$(date +%s.%N)

echo "HTTP status: $HTTP_CODE"
echo "Output file: $OUTPUT"
echo "File size: $(wc -c < "$OUTPUT") bytes"

if [ "$FORMAT" = "wav" ]; then
  DURATION=$(soxi -D "$OUTPUT" 2>/dev/null || echo "unknown")
elif [ "$FORMAT" = "opus" ] || [ "$FORMAT" = "mp3" ]; then
  DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT" 2>/dev/null || echo "unknown")
fi

echo "Audio duration: ${DURATION}s"

RTF=$(echo "$DURATION $START $END" | awk '{print $1 / ($3 - $2)}')
echo "RTF: $RTF"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "RESULT: SUCCESS"
  echo "RTF measured: $RTF (target <0.5)"
  if [ "$DURATION" != "unknown" ]; then
    echo "Audio length: ${DURATION}s"
  fi
  echo "Output: $OUTPUT"
  exit 0
else
  echo "RESULT: FAILED (HTTP $HTTP_CODE)"
  cat "$OUTPUT"
  exit 1
fi