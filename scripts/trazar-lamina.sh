#!/usr/bin/env bash
#
# trazar-lamina.sh <lamina.png> <out.svg>
# ─────────────────────────────────────────────────────────────────────────────
# LA RECETA de auto-trazado de compais (clavada 2026-08-22, recuperada
# 2026-08-25). Convierte una lámina PNG (fondo transparente) en un SVG
# vectorizado FIEL con CONTORNO FINO, listo para `generar-calco.mjs`.
#
# EL FIX DEL CONTORNO GRUESO (la razón de existir de este script):
#   Los píxeles semi-transparentes del BORDE de la lámina (el antialias donde
#   la tinta se encuentra con el fondo transparente) NO se trazan bien: vtracer
#   los ve como tinta oscura aislada y dibuja un contorno GORDO (+15-21%).
#   Solución: APLANAR el alfa sobre el color PAPEL ANTES de trazar → el borde
#   antialias se funde a papel (no a negro), y vtracer traza una línea fina
#   donde de verdad hay tinta. El papel que sobra fuera de la figura se recorta
#   con el clipPath vectorial del canal alfa (evenodd).
#
# PIPELINE:
#   1. magick: aplanar RGBA sobre PAPEL (#eee8d7 por defecto) → opaco.
#   2. vtracer color: stacked spline --color_precision 8 --filter_speckle 2
#      --gradient_step 8 (la receta del jaguar/guacamaya, contorno ±2%).
#   3. vtracer bw sobre el canal alfa → clipPath de silueta (fill-rule evenodd).
#   4. Ensamblar <defs><clipPath id="a">…</defs> + <g clip-path="url(#a)">paths.
#
# El SVG queda en el ESPACIO ABSOLUTO NATIVO de la lámina (WxH) — NUNCA a 2×
# (el hack 2×+scale(0.5) rompe el calce de los clip-regiones: bug de la
# zarigüeya v-fix2). Después: `npx svgo --multipass -p 2 out.svg -o out.min.svg`
# y `node <slug>Trazado/generar-calco.mjs out.min.svg`.
#
# PARÁMETROS (env): PAPER (color de aplanado, def #eee8d7), VTRACER (ruta al
# binario; si no, se descubre por PATH o en el nix store — en alpha vive en
# /nix/store/*-vtracer-*/bin/vtracer, v0.6.12).
#
# ─────────────────────────────────────────────────────────────────────────────
# VERIFICACIÓN (jaguar, 2026-08-25) — recuperación de la receta perdida:
#   Corriendo esta receta sobre `public/compai/laminas/jaguar-natural.png`
#   (705×394) reproduce la FIRMA documentada del calco del jaguar aprobado:
#     · 6094 paths de color (docstring de jaguarTrazado/generar-calco.mjs: 6102)
#     · 696 KiB tras `svgo --multipass -p 2` (docstring: ~700 KB)
#     · silueta trazada = 133203 px vs el canal alfa real 132186 px → +0.8%
#     · cabeza, cuerpo, rosetas, cola y CONTORNO FINO: fieles a la lámina; el
#       borde es notoriamente más fino que la variante SIN aplanado (que
#       reproduce el bug "+13-21% grueso" del `--filter_speckle 4` sin papel).
#
#   ⚠️ CAVEAT ABIERTO (thin-feature wash): a estos parámetros (cp8/gs8), las
#   PATAS del jaguar —finas y de bajo contraste contra su entorno— se funden
#   con la capa de fondo dominante del clustering stacked: con aplanado salen
#   color PAPEL, sin aplanado se pierden contra el fondo. La silueta SÍ las
#   contiene (el clip es correcto), pero el color trazado ahí queda lavado. El
#   calco del jaguar COMMITEADO no tiene esa merma → su generación real pudo
#   usar params/pasos distintos a los documentados para rasgos finos. Verificá
#   SIEMPRE por regiones (patas/dedos) por lámina; si se lavan, subí el
#   contraste local antes de aplanar o bajá --gradient_step / --color_precision.
set -euo pipefail

IN="${1:?uso: trazar-lamina.sh <lamina.png> <out.svg>}"
OUT="${2:?uso: trazar-lamina.sh <lamina.png> <out.svg>}"
PAPER="${PAPER:-#eee8d7}"

# ── descubrir vtracer ───────────────────────────────────────────────────────
VTRACER="${VTRACER:-}"
if [ -z "$VTRACER" ]; then
  if command -v vtracer >/dev/null 2>&1; then
    VTRACER="$(command -v vtracer)"
  else
    VTRACER="$(ls /nix/store/*-vtracer-*/bin/vtracer 2>/dev/null | head -1 || true)"
  fi
fi
if [ -z "$VTRACER" ] || [ ! -x "$VTRACER" ]; then
  echo "trazar-lamina.sh: no encontré 'vtracer'. Instalalo (nix: 'nix-shell -p vtracer') o exportá VTRACER=/ruta/al/binario." >&2
  exit 1
fi

MAGICK="$(command -v magick || command -v convert)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

W="$("$MAGICK" "$IN" -format "%w" info:)"
H="$("$MAGICK" "$IN" -format "%h" info:)"

# 1. aplanar el alfa sobre PAPEL (borde antialias → papel, no tinta gorda)
"$MAGICK" "$IN" -background "$PAPER" -alpha remove -alpha off "$TMP/flat.png"

# 2. vtracer color — la receta clavada (contorno fino)
"$VTRACER" --input "$TMP/flat.png" --output "$TMP/color.svg" \
  --mode spline --hierarchical stacked \
  --color_precision 8 --filter_speckle 2 --gradient_step 8 --path_precision 2 >/dev/null

# 3. clipPath vectorial del canal alfa (silueta, evenodd)
"$MAGICK" "$IN" -alpha extract -threshold 50% -negate "$TMP/mask.png"
"$VTRACER" --colormode bw --input "$TMP/mask.png" --output "$TMP/silh.svg" \
  --mode spline --filter_speckle 4 --path_precision 2 >/dev/null
SILH_D="$(grep -oE 'd="[^"]*"' "$TMP/silh.svg" | sed -E 's/^d="//; s/"[[:space:]]*$//' | tr '\n' ' ')"
if [ -z "$SILH_D" ]; then
  echo "trazar-lamina.sh: no pude extraer la silueta del canal alfa (¿la lámina no tiene transparencia?)." >&2
  exit 1
fi

# 4. cuerpo = paths del trazado de color (sin header/svg), envueltos en el clip
grep -oE '<path[^>]*/>' "$TMP/color.svg" > "$TMP/body.frag"

{
  printf '<svg xmlns="http://www.w3.org/2000/svg" width="%s" height="%s" viewBox="0 0 %s %s">' "$W" "$H" "$W" "$H"
  printf '<defs><clipPath id="a" clipPathUnits="userSpaceOnUse"><path fill-rule="evenodd" d="%s"/></clipPath></defs>' "$SILH_D"
  printf '<g clip-path="url(#a)">'
  cat "$TMP/body.frag"
  printf '</g></svg>'
} > "$OUT"

NPATHS="$(wc -l < "$TMP/body.frag" | tr -d ' ')"
echo "trazar-lamina.sh: $IN (${W}x${H}) → $OUT — ${NPATHS} paths de color + silueta evenodd (papel ${PAPER})."
