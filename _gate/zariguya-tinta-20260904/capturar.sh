#!/usr/bin/env bash
# capturar.sh <etiqueta> [puerto] — todas las vistas del arnés a PNG, mismo encuadre.
set -uo pipefail
ET="${1:?etiqueta}"; PORT="${2:-5178}"
DIR="$(cd "$(dirname "$0")" && pwd)"
BASE="http://127.0.0.1:$PORT/tests/visual/zariguya-tinta-harness.html"
for v in idle card camina habla husmea muerta crias verlupa cute escucha-02; do
  size=600,600; [ "$v" = card ] && size=80,80
  SHOT_OUT="$DIR/$ET-$v.png" SHOT_SIZE=$size SHOT_WAIT=5000 microapp-shot "$BASE?vista=$v" >/dev/null 2>&1 \
    && echo "ok $ET-$v $(magick identify -format '%wx%h' "$DIR/$ET-$v.png")" || echo "FALLO $ET-$v"
done
SHOT_OUT="$DIR/$ET-idle-noche.png" SHOT_SIZE=600,600 SHOT_WAIT=5000 microapp-shot "$BASE?vista=idle&fondo=noche" >/dev/null 2>&1 && echo "ok $ET-idle-noche"
# tarjeta 64 px ampliada SIN interpolar (x10)
magick "$DIR/$ET-card.png" -crop 64x64+8+8 +repage -filter point -resize 1000% "$DIR/$ET-card-x10.png" && echo "ok $ET-card-x10"
