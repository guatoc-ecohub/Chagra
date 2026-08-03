#!/usr/bin/env bash
# bench-3-modelos-noche.sh — LA PRUEBA QUE FALTABA (2026-07-15)
#
# Pregunta que responde: ¿nuestro fine-tune sirve o estorba CUANDO EL GROUNDING ESTÁ PUESTO?
#
# Contexto: el 2026-07-15 se descubrió que hay DOS benches con veredictos opuestos.
#   - gpu-queue/eval_completo.py -> manda el prompt CRUDO a ollama, sin guardas ni RAG.
#     Mide el modelo desnudo. Ahí qwen3.5:9b "gana" (global 71.0).
#   - scripts/bench-contaminacion.mjs (ESTE) -> llama al sidecar REAL (guardas + pgvector).
#     Mide el PRODUCTO. Ahí qwen3.5:9b es el PEOR (20% contaminación).
#
# Nuestro GGUF (qwen3.5:9b + corpus de 3380 pares) NUNCA se pasó por el bench real.
# No está probado que no sirva: está SIN PROBAR. Esto lo resuelve.
#
# Lección de queue/088 que este script respeta: con N=25 la varianza es ±13pp y el
# número NO discrimina (el "granite4.1 gana con 4%" era ruido; con N=69 dio EMPATE).
# Por eso: N completo + 3 corridas por modelo + promedio. Sin eso no se decide nada.
#
# Uso:  bash scripts/diag/bench-3-modelos-noche.sh [runs]      (default 3)
# Corre EN alpha: el sidecar es localhost-only y el juez claude-code vive ahí.

set -uo pipefail

REPO=/home/kortux/Workspace/chagra
OUT=/home/kortux/bench-noche-2026-07-15
RUNS="${1:-3}"

# granite3.3 = control (incumbente, 12.9% con N=69 el 07-10 -> valida que el harness funciona)
# qwen3.5:9b = la base de nuestro fine-tune (20% = el peor de los 4 medidos)
# qwen35-dpo-alpha = NUESTRO fine-tune de hoy. La incógnita.
MODELOS=("granite3.3:8b" "qwen3.5:9b" "qwen35-dpo-alpha:latest")

mkdir -p "$OUT"
cd "$REPO" || exit 1

echo "=== bench de contaminación (el REAL, con guardas) — $(date -Is) ==="
echo "    modelos: ${MODELOS[*]}"
echo "    corridas por modelo: $RUNS   (N completo, sin --limit)"
echo "    salida: $OUT"
echo

# preflight: sin estos tres, el número que salga es basura
if ! curl -sf -m 5 http://localhost:7880/healthz >/dev/null 2>&1; then
  echo "ABORTA: el sidecar (:7880) no responde. Sin guardas esto mediría el modelo desnudo,"
  echo "        que es EXACTAMENTE el error que este bench existe para no repetir."
  exit 1
fi
if ! curl -sf -m 5 http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "ABORTA: ollama (:11434) no responde. Levantalo: sudo systemctl start ollama"
  exit 1
fi
echo "preflight OK: sidecar arriba + ollama arriba"

# OJO: el healthz del sidecar NO verifica ollama (falso verde detectado 2026-07-15).
# Por eso se chequean los dos por separado arriba.

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
import json,sys
d=json.load(open('$f'))
print('  ', '$(basename "$f")', '->', json.dumps({k:v for k,v in d.items() if 'contamin' in k.lower() or 'global' in k.lower() or 'model' in k.lower()})[:150])
" 2>/dev/null
done
echo
echo "LECTURA HONESTA: si las 3 corridas del MISMO modelo difieren >10pp, el número no"
echo "discrimina y NO se decide nada con él. Promediar y reportar la dispersión."
