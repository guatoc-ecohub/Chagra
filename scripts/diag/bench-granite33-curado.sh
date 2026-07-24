#!/usr/bin/env bash
# bench-granite33-curado.sh — variante de scripts/diag/bench-3-modelos-noche.sh
# (mismo patrón: N completo, 3 corridas, preflight sidecar+ollama por
# separado) recortada a los DOS modelos que decide el veredicto de HOY:
#
#   granite3.3:8b          = control (incumbente, lo que producción sirve)
#   granite33-curado:latest = nuestro fine-tune (SFT+DPO sobre corpus curado,
#                              497 pares de piso-termico/clima excluidos,
#                              1 par excluido por contaminacion vs bench)
#
# Criterio de exito declarado ANTES de correr (ver prompt de la tarea):
# el fine-tune debe bajar la contaminacion del control en MAS DE 13pp,
# promediado en 3 corridas. Si no, se reporta y se abandona el carril.
#
# JUDGE_MODEL=sonnet (comparable con la corrida del coordinador de esta
# noche — bench-scorer.mjs ya cae a "sonnet" por default, pero lo fijamos
# explicito para que quede documentado en el log).
set -uo pipefail

REPO=/home/kortux/Workspace/chagra
OUT=/home/kortux/bench-granite33-curado-2026-07-15
RUNS="${1:-3}"

MODELOS=("granite3.3:8b" "granite33-curado:latest")

mkdir -p "$OUT"
cd "$REPO" || exit 1

echo "=== bench de contaminacion (REAL, con guardas) — $(date -Is) ==="
echo "    modelos: ${MODELOS[*]}"
echo "    corridas por modelo: $RUNS   (N completo, sin --limit)"
echo "    salida: $OUT"
echo

if ! curl -sf -m 5 http://localhost:7880/healthz >/dev/null 2>&1; then
  echo "ABORTA: el sidecar (:7880) no responde."
  exit 1
fi
if ! curl -sf -m 5 http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "ABORTA: ollama (:11434) no responde. Levantalo: sudo systemctl start ollama"
  exit 1
fi
if ! ollama list 2>/dev/null | grep -q '^granite33-curado:latest'; then
  echo "ABORTA: granite33-curado:latest no está registrado en ollama todavía."
  exit 1
fi
echo "preflight OK: sidecar arriba + ollama arriba + granite33-curado:latest registrado"

export JUDGE_MODEL=sonnet

for m in "${MODELOS[@]}"; do
  slug=$(echo "$m" | tr ':/.' '---')
  for r in $(seq 1 "$RUNS"); do
    log="$OUT/${slug}-run${r}.log"
    echo "--- $m · corrida $r/$RUNS · $(date +%H:%M:%S) -> $log"
    PROD_MODEL="$m" BENCH_OUTPUT_DIR="$OUT/runs" \
      node scripts/bench-contaminacion.mjs > "$log" 2>&1
    rc=$?
    tail -3 "$log" | sed 's/^/      /'
    [ $rc -ne 0 ] && echo "      (rc=$rc — revisar $log)"
  done
done

echo
echo "=== corridas terminadas $(date -Is) — resumen crudo ==="
for f in "$OUT"/runs/*.summary.json; do
  [ -e "$f" ] || continue
  python3 -c "
import json
d=json.load(open('$f'))
print('  ', '$(basename "$f")', '->', json.dumps({k:v for k,v in d.items() if 'contamin' in k.lower() or 'global' in k.lower() or 'model' in k.lower()})[:200])
" 2>/dev/null
done
echo
echo "LECTURA HONESTA: si las 3 corridas del MISMO modelo difieren >10pp, el numero no"
echo "discrimina. Promediar y reportar la dispersion. Criterio: >13pp sobre el control."
