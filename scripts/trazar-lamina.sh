#!/usr/bin/env bash
# trazar-lamina.sh — traza una lámina PNG a SVG calidad-lámina (receta nailed 2026-08-22)
#
# USO: trazar-lamina.sh <lamina.png> <out.svg>
#
# LA RECETA (por qué funciona — no tocar sin re-medir):
#   1. APLANAR sobre color papel ANTES de trazar. Este es EL fix del contorno
#      gordo: los píxeles semi-transparentes del borde (y los bigotes/pelos que
#      salen de la silueta) se trazaban como tinta NEGRA gorda. Aplanados sobre
#      papel, la fracción oscura del trazado queda clavada a la de la lámina
#      (medido: oso .336→.343, jaguar .195→.194, zarigüeya .187→.193) y los
#      blancos (V del oso, bigotes del jaguar) SOBREVIVEN nítidos.
#   2. Trazar STACKED (no cutout: cutout posteriza el grabado del jaguar) con
#      spline, color_precision 8, filter_speckle 2, gradient_step 8 — speckle
#      bajo + gradiente fino conservan marcas blancas chicas y detalle.
#   3. Recuperar la TRANSPARENCIA con un clipPath VECTORIAL trazado del canal
#      alfa (vtracer bw), con clip-rule evenodd (bolsillos entre patas/bastón/
#      rulo de cola quedan transparentes). NO se borran paths por color: en
#      stacked hay capas base gigantes debajo del fondo y los bolsillos
#      cuantizan a cremas distintas — borrar por color deja bloques o destapa
#      capas oscuras (probado y descartado).
#
# Overrides por entorno:
#   FONDO=#efe9d8         color papel del aplanado (halo de borde ≈ papel)
#   VT_ARGS="..."         args de vtracer para la pasada de color
#   UMBRAL_ALFA=45%       umbral del canal alfa para la silueta del clip
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "uso: $(basename "$0") <lamina.png> <out.svg>" >&2
  exit 2
fi
IN="$1"; OUT="$2"
FONDO="${FONDO:-#efe9d8}"
UMBRAL_ALFA="${UMBRAL_ALFA:-45%}"
VT_ARGS="${VT_ARGS:---mode spline --color_precision 8 --filter_speckle 2 --gradient_step 8}"

VTRACER=(nix run nixpkgs#vtracer --)
command -v vtracer >/dev/null 2>&1 && VTRACER=(vtracer)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

TIENE_ALFA="$(magick identify -format '%A' "$IN")"

if [ "$TIENE_ALFA" = "True" ] || [ "$TIENE_ALFA" = "Blend" ]; then
  # 1. aplanar sobre papel (el fix del contorno gordo y de los blancos)
  magick "$IN" -background "$FONDO" -flatten "$TMP/plano.png"
  # 3a. silueta del alfa para el clip (negro = figura)
  magick "$IN" -alpha extract -threshold "$UMBRAL_ALFA" -negate "$TMP/mask.png"
  "${VTRACER[@]}" --input "$TMP/mask.png" --output "$TMP/mask.svg" \
    --colormode bw --mode spline --filter_speckle 4 >/dev/null
else
  cp "$IN" "$TMP/plano.png"
fi

# 2. la pasada de color, stacked
# shellcheck disable=SC2086
"${VTRACER[@]}" --input "$TMP/plano.png" --output "$TMP/color.svg" $VT_ARGS >/dev/null

# 3b. envolver en el clipPath vectorial (evenodd) si hay alfa, y agregar
#     viewBox (vtracer no lo emite y sin él el SVG no escala en el rig)
MASK_SVG=""
[ -f "$TMP/mask.svg" ] && MASK_SVG="$TMP/mask.svg"
python3 - "$TMP/color.svg" "$OUT" "$MASK_SVG" <<'PYEOF'
import re, sys
color = open(sys.argv[1]).read()
m = re.search(r'(<svg[^>]*>)(.*)(</svg>)', color, re.S)
cab, cuerpo, cierre = m.groups()
wh = re.search(r'width="(\d+)" height="(\d+)"', cab)
if wh and 'viewBox' not in cab:
    cab = cab.replace(wh.group(0), f'{wh.group(0)} viewBox="0 0 {wh.group(1)} {wh.group(2)}"')
if len(sys.argv) > 3 and sys.argv[3]:
    mask = open(sys.argv[3]).read()
    paths = re.findall(r'<path d="([^"]+)" fill="#000000" transform="([^"]+)"\s*/>', mask)
    if not paths:
        sys.exit('ERROR: la máscara bw no dio paths — revisar el canal alfa')
    clip_paths = ''.join(
        f'<path d="{d}" transform="{t}" clip-rule="evenodd"/>' for d, t in paths)
    clip = (f'<defs><clipPath id="silueta" clipPathUnits="userSpaceOnUse">'
            f'{clip_paths}</clipPath></defs>')
    cuerpo = clip + '<g clip-path="url(#silueta)">' + cuerpo + '</g>'
open(sys.argv[2], 'w').write(cab + cuerpo + cierre)
PYEOF

echo "OK: $OUT ($(du -h "$OUT" | cut -f1)) — paths: $(grep -c '<path' "$OUT")"
