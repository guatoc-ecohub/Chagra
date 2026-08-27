#!/usr/bin/env bash
#
# trazar-lamina.sh <lamina.png> <out.svg>
# ─────────────────────────────────────────────────────────────────────────────
# LA RECETA de auto-trazado de compais (clavada 2026-08-22, recuperada
# 2026-08-25, silueta pasada a potrace 2026-08-25 — ver GOTCHA abajo).
# Convierte una lámina PNG (fondo transparente) en un SVG vectorizado FIEL
# con CONTORNO FINO, listo para `generar-calco.mjs`.
#
# EL FIX DEL CONTORNO GRUESO (la razón de existir de este script):
#   Los píxeles semi-transparentes del BORDE de la lámina (el antialias donde
#   la tinta se encuentra con el fondo transparente) NO se trazan bien: vtracer
#   los ve como tinta oscura aislada y dibuja un contorno GORDO (+15-21%).
#   Solución: APLANAR el alfa sobre el color PAPEL ANTES de trazar → el borde
#   antialias se funde a papel (no a negro), y vtracer traza una línea fina
#   donde de verdad hay tinta. El papel que sobra fuera de la figura se recorta
#   con el clipPath vectorial del canal alfa.
#
# GOTCHA silueta (zarigüeya, 2026-08-25): la silueta se trazaba con
# `vtracer --colormode bw` (un solo path). Con pelaje simple (jaguar-natural.
# png) sale bien. Con pelaje DENSO y muy puntiagudo (láminas Gemini "-limpia"
# de zarigüeya: cientos de púas que se autointersectan) ese único path sale
# con geometría inconsistente: ni fill-rule nonzero NI evenodd lo reproducen
# bien (visto en zariguya-parada/-escucha-oreja/-muerta-limpia: el clip
# resultante borraba medio cuerpo o dejaba un bloque de papel sin recortar).
# FIX: la silueta se traza con `potrace` (bitmap→vector especializado, probado
# en producción desde 2001) en vez de vtracer bw. potrace SIEMPRE emite
# contornos con el anidamiento hueco/sólido correcto bajo la regla nonzero
# por defecto (sin ambigüedad de fill-rule) y reproduce el área real del alfa
# casi exacto (jaguar: 132051px trazados vs 132186px reales, -0.1%; con
# vtracer bw daba 110705px, -16%). potrace exige bitmap (PBM), de ahí el paso
# extra `magick mask.png mask.pbm`. Su SVG envuelve el `d` en un
# `<g transform="translate(0,H) scale(0.1,-0.1)">` (convención potrace:
# coordenadas en décimas de píxel, Y invertida) — el transform se preserva
# tal cual sobre el <path> final, no se re-deriva.
#
# PIPELINE:
#   1. magick: aplanar RGBA sobre PAPEL (#eee8d7 por defecto) → opaco.
#   2. vtracer color: stacked spline --color_precision 8 --filter_speckle 2
#      --gradient_step 8 (la receta del jaguar/guacamaya, contorno ±2%).
#   3. potrace sobre el canal alfa (mask.pbm) → clipPath de silueta.
#   4. Ensamblar <defs><clipPath id="a">…</defs> + <g clip-path="url(#a)">paths.
#
# El SVG queda en el ESPACIO ABSOLUTO NATIVO de la lámina (WxH) — NUNCA a 2×
# (el hack 2×+scale(0.5) rompe el calce de los clip-regiones: bug de la
# zarigüeya v-fix2). Después: `npx svgo --multipass -p 2 out.svg -o out.min.svg`
# y `node <slug>Trazado/generar-calco.mjs out.min.svg`.
#
# PARÁMETROS (env): PAPER (color de aplanado, def #eee8d7), VTRACER/POTRACE
# (rutas a los binarios; si no, se descubren por PATH o en el nix store).
#
# ─────────────────────────────────────────────────────────────────────────────
# VERIFICACIÓN (jaguar, 2026-08-25) — recuperación de la receta perdida +
# cambio de silueta a potrace, regresión contra el jaguar aprobado:
#   Corriendo esta receta sobre `public/compai/laminas/jaguar-natural.png`
#   (705×394) reproduce la FIRMA documentada del calco del jaguar aprobado:
#     · 6094 paths de color (docstring de jaguarTrazado/generar-calco.mjs: 6102)
#     · silueta (potrace) = 132051 px vs el canal alfa real 132186 px → -0.1%
#       (vtracer bw daba 133203px/+0.8% pero con fill-rule ambiguo; potrace es
#       más preciso Y sin la ambigüedad — ver GOTCHA arriba)
#     · cabeza, cuerpo, rosetas, cola y CONTORNO FINO: fieles a la lámina.
#
#   ⚠️ CAVEAT ABIERTO (thin-feature wash): a estos parámetros (cp8/gs8), las
#   PATAS del jaguar —finas y de bajo contraste contra su entorno— se funden
#   con la capa de fondo dominante del clustering stacked: con aplanado salen
#   color PAPEL, sin aplanado se pierden contra el fondo. La silueta SÍ las
#   contiene (el clip es correcto), pero el color trazado ahí queda lavado.
#   Verificá SIEMPRE por regiones (patas/dedos) por lámina; si se lavan, subí
#   el contraste local antes de aplanar o bajá --gradient_step/--color_precision.
set -euo pipefail

IN="${1:?uso: trazar-lamina.sh <lamina.png> <out.svg>}"
OUT="${2:?uso: trazar-lamina.sh <lamina.png> <out.svg>}"
PAPER="${PAPER:-#eee8d7}"

# ── descubrir vtracer / potrace ─────────────────────────────────────────────
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

POTRACE="${POTRACE:-}"
if [ -z "$POTRACE" ]; then
  if command -v potrace >/dev/null 2>&1; then
    POTRACE="$(command -v potrace)"
  else
    POTRACE="$(ls /nix/store/*-potrace-*/bin/potrace 2>/dev/null | head -1 || true)"
  fi
fi
if [ -z "$POTRACE" ] || [ ! -x "$POTRACE" ]; then
  echo "trazar-lamina.sh: no encontré 'potrace'. Instalalo (nix: 'nix-shell -p potrace') o exportá POTRACE=/ruta/al/binario." >&2
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

# 3. clipPath vectorial del canal alfa (silueta) vía potrace — ver GOTCHA arriba
"$MAGICK" "$IN" -alpha extract -threshold 50% -negate "$TMP/mask.png"
"$MAGICK" "$TMP/mask.png" "$TMP/mask.pbm"
"$POTRACE" --svg -t 2 --output "$TMP/silh.svg" "$TMP/mask.pbm"
# extracción multi-línea (potrace envuelve el `d` a varias líneas; grep -o de
# una sola línea lo trunca — perl -0777 slurpa el archivo entero).
SILH_D="$(perl -0777 -ne 'print $1 if /<path\s+d="([^"]*)"/s' "$TMP/silh.svg")"
SILH_TR="$(perl -0777 -ne 'print $1 if /<g\s+transform="([^"]*)"/s' "$TMP/silh.svg")"
if [ -z "$SILH_D" ]; then
  echo "trazar-lamina.sh: no pude extraer la silueta del canal alfa (¿la lámina no tiene transparencia?)." >&2
  exit 1
fi

# 4. cuerpo = paths del trazado de color (sin header/svg), envueltos en el clip
grep -oE '<path[^>]*/>' "$TMP/color.svg" > "$TMP/body.frag"

{
  printf '<svg xmlns="http://www.w3.org/2000/svg" width="%s" height="%s" viewBox="0 0 %s %s">' "$W" "$H" "$W" "$H"
  printf '<defs><clipPath id="a" clipPathUnits="userSpaceOnUse"><path transform="%s" d="%s"/></clipPath></defs>' "$SILH_TR" "$SILH_D"
  printf '<g clip-path="url(#a)">'
  cat "$TMP/body.frag"
  printf '</g></svg>'
} > "$OUT"

NPATHS="$(wc -l < "$TMP/body.frag" | tr -d ' ')"
echo "trazar-lamina.sh: $IN (${W}x${H}) → $OUT — ${NPATHS} paths de color + silueta potrace (papel ${PAPER})."
