#!/usr/bin/env bash
set -euo pipefail

# Receta Jaguar exacta: alfa sobre papel, vtracer color stacked/spline y
# potrace para el clip de silueta. El SVG conserva el espacio nativo de la
# lámina, así los componentes solo animan la piel generada.
IN="${1:?uso: trazar-lamina.sh <lamina.png> <out.svg>}"
OUT="${2:?uso: trazar-lamina.sh <lamina.png> <out.svg>}"
PAPER="${PAPER:-#eee8d7}"

VTRACER="${VTRACER:-}"
if [ -z "$VTRACER" ] && command -v vtracer >/dev/null 2>&1; then VTRACER="$(command -v vtracer)"; fi
if [ -z "$VTRACER" ]; then VTRACER="$(ls /nix/store/*-vtracer-*/bin/vtracer 2>/dev/null | head -1 || true)"; fi
[ -x "$VTRACER" ] || { echo "trazar-lamina.sh: no encontré vtracer" >&2; exit 1; }

POTRACE="${POTRACE:-}"
if [ -z "$POTRACE" ] && command -v potrace >/dev/null 2>&1; then POTRACE="$(command -v potrace)"; fi
if [ -z "$POTRACE" ]; then POTRACE="$(ls /nix/store/*-potrace-*/bin/potrace 2>/dev/null | head -1 || true)"; fi
[ -x "$POTRACE" ] || { echo "trazar-lamina.sh: no encontré potrace" >&2; exit 1; }

MAGICK="${MAGICK:-}"
if [ -z "$MAGICK" ] && command -v magick >/dev/null 2>&1; then MAGICK="$(command -v magick)"; fi
if [ -z "$MAGICK" ] && command -v convert >/dev/null 2>&1; then MAGICK="$(command -v convert)"; fi
[ -x "$MAGICK" ] || { echo "trazar-lamina.sh: no encontré ImageMagick" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
W="$($MAGICK "$IN" -format "%w" info:)"
H="$($MAGICK "$IN" -format "%h" info:)"

# 1. Aplanar el alfa sobre papel para conservar el contorno fino.
$MAGICK "$IN" -background "$PAPER" -alpha remove -alpha off "$TMP/flat.png"

# 2. Trazado de color, parámetros clavados de Jaguar.
"$VTRACER" --input "$TMP/flat.png" --output "$TMP/color.svg" \
  --mode spline --hierarchical stacked \
  --color_precision 8 --filter_speckle 2 --gradient_step 8 --path_precision 2 >/dev/null

# 3. Silueta vectorial desde el canal alfa, sin inventar geometría.
$MAGICK "$IN" -alpha extract -threshold 50% -negate "$TMP/mask.png"
$MAGICK "$TMP/mask.png" "$TMP/mask.pbm"
"$POTRACE" --svg -t 2 --output "$TMP/silh.svg" "$TMP/mask.pbm"
SILH_D="$(perl -0777 -ne 'print $1 if /<path\s+d="([^"]*)"/s' "$TMP/silh.svg")"
SILH_TR="$(perl -0777 -ne 'print $1 if /<g\s+transform="([^"]*)"/s' "$TMP/silh.svg")"
[ -n "$SILH_D" ] || { echo "trazar-lamina.sh: no pude extraer la silueta" >&2; exit 1; }

# 4. Ensamblar SVG nativo: clip alfa + paths de color de vtracer.
grep -oE '<path[^>]*/>' "$TMP/color.svg" > "$TMP/body.frag"
{
  printf '<svg xmlns="http://www.w3.org/2000/svg" width="%s" height="%s" viewBox="0 0 %s %s">' "$W" "$H" "$W" "$H"
  printf '<defs><clipPath id="a" clipPathUnits="userSpaceOnUse"><path transform="%s" d="%s"/></clipPath></defs>' "$SILH_TR" "$SILH_D"
  printf '<g clip-path="url(#a)">'
  cat "$TMP/body.frag"
  printf '</g></svg>'
} > "$OUT"

echo "trazar-lamina.sh: $IN (${W}x${H}) → $OUT — $(wc -l < "$TMP/body.frag" | tr -d ' ') paths + clip potrace"
