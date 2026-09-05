#!/usr/bin/env bash
# init.sh - Sensor computacional de Chagra (sustrato A del reviewer-gate).
# (Resolución de rebase 2026-09-04: absorbe el bootstrap npm de dev — deps
#  primero, sensor después. Nada del sensor ni del bootstrap se perdió.)
#
# Verificacion ejecutable y determinista del AREA TOCADA por una tarea. El
# reviewer-gate.sh lo corre ANTES de gastar un juez inferencial: si esto sale
# rojo, el trabajo no esta listo, punto (no hace falta juez para eso).
#
# El repo es grande y su baseline ya trae deuda roja (types + algunos tests).
# Por eso los gates DUROS se acotan al area tocada y NO corren la suite entera
# ni `eslint .` completo: correr todo mediria la deuda ajena, no el cambio.
#
# Gates DUROS (bloquean):
#   1. eslint --max-warnings=0 sobre los .js/.jsx/.mjs tocados. Excluye .ts:
#      el repo no trae parser TS en eslint.config.js (los .ts los cubre el gate
#      tsc opcional). Misma regla que el hook pre-commit de lefthook; no duplica
#      el hook, comparte el criterio.
#   2. vitest de los tests DIRECTOS de los archivos tocados. A proposito NO usa
#      `vitest --changed`: ese cierre TRANSITIVO de importadores arrastra casi
#      toda la suite (para un util muy importado) y con ella la deuda roja.
#      "Directo" = test cuyo basename coincide con el del archivo tocado y que
#      la config de vitest INCLUYE (src, tests/unit, tests/integration, eval,
#      scripts/__tests__, bench/__tests__, catalog/__tests__; .spec.* de
#      Playwright van a otro runner y no entran).
#
# Gates opcionales por env (no bloquean salvo RUN_TSC=strict):
#   RUN_TSC=strict|advisory   tsc --noEmit -p jsconfig.json (el baseline ya
#                             arrastra errores preexistentes; advisory informa)
#   RUN_BUILD=1               npm run build (lento, opt-in)
#
# Env:
#   INIT_BASE_REF   base del diff (default origin/dev; si no existe, HEAD)
#   SKIP_ESLINT=1   salta gate 1
#   SKIP_VITEST=1   salta gate 2
#   NODE_OPTIONS    se le suma --max-old-space-size=4096 si no viene seteado
#
# Exit: 0 = area tocada verde; 1 = algun gate DURO fallo.
# Si eslint/vitest no estan instalados responde NO SABE (exit 1): un sensor que
# no puede medir no dice "todo bien", dice que no pudo medir.

set -uo pipefail

cd "$(dirname "$0")" || { echo "init.sh: no pude entrar al repo" >&2; exit 1; }

ok()   { printf '  [OK]   %s\n' "$1"; }
warn() { printf '  [WARN] %s\n' "$1"; }
fail() { printf '  [FAIL] %s\n' "$1"; }
info() { printf '  [..]   %s\n' "$1"; }

EXIT_CODE=0

BASE_REF="${INIT_BASE_REF:-origin/dev}"
if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null 2>&1; then
  warn "la base '$BASE_REF' no existe; uso HEAD como base (solo working tree)"
  BASE_REF=HEAD
fi

echo "== init.sh  repo=$(basename "$(pwd)")  base=$BASE_REF =="

# ---- Bootstrap del entorno (absorbido del init.sh de dev, 2026-09-04):
#      sin node_modules el sensor solo podría responder NO SABE; se instalan
#      las deps primero para que SÍ pueda medir. Sin `set -e`, un npm install
#      roto no corta acá: el chequeo de bins de abajo responde NO SABE
#      (exit 1), que es el mismo veredicto honesto. ----
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "[init.sh] → npm install"
  npm install 2>&1 | tail -3
else
  echo "[init.sh] ✓ node_modules ya existe"
fi

# ---- bins: repo-local primero (worktree sin npm ci responde NO SABE) ----
ESLINT=""
VITEST=""
[ -x ./node_modules/.bin/eslint ] && ESLINT=./node_modules/.bin/eslint
[ -z "$ESLINT" ] && command -v eslint >/dev/null 2>&1 && ESLINT=eslint
[ -x ./node_modules/.bin/vitest ] && VITEST=./node_modules/.bin/vitest
[ -z "$VITEST" ] && command -v vitest >/dev/null 2>&1 && VITEST=vitest
if [ -z "$ESLINT" ] || [ -z "$VITEST" ]; then
  fail "no encuentro eslint/vitest. Falta 'npm ci' en este worktree. NO SABE: sin bins no puedo medir."
  exit 1
fi

# ---- deteccion de archivos tocados (committed vs base + staged + unstaged) ----
mapfile -t CHANGED < <({
  git diff --name-only --diff-filter=ACMR "$BASE_REF"...HEAD 2>/dev/null
  git diff --cached --name-only --diff-filter=ACMR 2>/dev/null
  git diff --name-only --diff-filter=ACMR 2>/dev/null
} | sort -u \
  | grep -E '\.(js|jsx|mjs|cjs|ts|tsx)$' \
  | grep -vE '(^|/)(node_modules|dist|dist-prod|build|out|\.worktrees|public/vendor)(/|$)' \
  || true)

LINT_FILES=()
TS_FILES=()
for f in "${CHANGED[@]:-}"; do
  [ -n "$f" ] || continue
  [ -f "$f" ] || continue
  case "$f" in
    *.js|*.jsx|*.mjs|*.cjs) LINT_FILES+=("$f") ;;
    *.ts|*.tsx)             TS_FILES+=("$f") ;;
  esac
done
echo "-- archivos tocados: ${#CHANGED[@]} | eslint: ${#LINT_FILES[@]} | ts (tsc opcional): ${#TS_FILES[@]}"
if [ "${#CHANGED[@]}" -gt 0 ]; then
  printf '%s\n' "${CHANGED[@]}" | head -25 | sed 's/^/     /'
fi

# ================= Gate 1: eslint scoped (DURO) =================
echo ""
echo "== 1. eslint --max-warnings=0 (area tocada) =="
if [ "${SKIP_ESLINT:-0}" = "1" ]; then
  warn "ESLint saltado (SKIP_ESLINT=1)"
elif [ "${#LINT_FILES[@]}" -eq 0 ]; then
  ok "sin archivos js/jsx/mjs tocados que lintear"
else
  # Anti-OOM (2026-08-23: eslint aborto por heap en un diff grande): heap
  # ampliado + lint por lotes para no cargar el diff entero en un solo proceso.
  export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=4096"
  ESLINT_FAIL=0
  LOG="$(mktemp /tmp/init-eslint.XXXXXX.log)"
  BATCH=60
  for ((i = 0; i < ${#LINT_FILES[@]}; i += BATCH)); do
    chunk=("${LINT_FILES[@]:i:BATCH}")
    if ! "$ESLINT" --max-warnings=0 --no-warn-ignored "${chunk[@]}" >"$LOG" 2>&1; then
      fail "eslint fallo en el lote ${i}..$((i + ${#chunk[@]})) (${#chunk[@]} archivos)"
      sed 's/^/     /' "$LOG" | tail -50
      ESLINT_FAIL=1
    fi
  done
  rm -f "$LOG"
  if [ "$ESLINT_FAIL" -eq 1 ]; then
    EXIT_CODE=1
  else
    ok "ESLint limpio en ${#LINT_FILES[@]} archivo(s) tocado(s)"
  fi
fi

# ================= Gate 2: vitest de tests directos (DURO) =================
echo ""
echo "== 2. vitest (tests directos del area tocada) =="
if [ "${SKIP_VITEST:-0}" = "1" ]; then
  warn "Vitest saltado (SKIP_VITEST=1)"
elif [ "${#CHANGED[@]}" -eq 0 ]; then
  warn "sin archivos tocados; vitest no corre"
else
  # Mismo criterio de inclusion que vitest.config.js (include). No entran
  # .spec.* : en este repo son Playwright E2E (otro runner).
  include_test() {
    local p="$1"
    case "$(basename "$p")" in
      *.test.js) ;;
      *.test.jsx) ;;
      *.test.mjs) ;;
      *) return 1 ;;
    esac
    case "$p" in
      src/*) return 0 ;;
      tests/unit/*|tests/integration/*) return 0 ;;
      eval/*) return 0 ;;
      scripts/__tests__/*|bench/__tests__/*|catalog/__tests__/*) return 0 ;;
    esac
    return 1
  }

  declare -A TEST_INDEX=()
  while IFS= read -r t; do
    include_test "$t" || continue
    b="$(basename "$t")"
    key="${b%.test.*}"
    if [ "$key" = "$b" ]; then key="${b%.spec.*}"; fi
    [ "$key" = "$b" ] && continue
    TEST_INDEX["$key"]="${TEST_INDEX["$key"]:+${TEST_INDEX["$key"]}$'\n'}$t"
  done < <(git ls-files '*.test.js' '*.test.jsx' '*.test.mjs' '*.spec.js' '*.spec.jsx' '*.spec.mjs' 2>/dev/null)

  declare -A SEEN=()
  TEST_FILES=()
  for f in "${CHANGED[@]:-}"; do
    [ -f "$f" ] || continue
    case "$f" in
      *.js|*.jsx|*.mjs|*.ts|*.tsx) ;;
      *) continue ;;
    esac
    b="$(basename "$f")"
    key="${b%.test.*}"
    if [ "$key" = "$b" ]; then key="${b%.spec.*}"; fi
    if [ "$key" = "$b" ]; then key="${b%.*}"; fi
    while IFS= read -r t; do
      [ -z "$t" ] && continue
      if [ -z "${SEEN[$t]:-}" ]; then SEEN[$t]=1; TEST_FILES+=("$t"); fi
    done <<< "${TEST_INDEX["$key"]:-}"
  done

  if [ "${#TEST_FILES[@]}" -eq 0 ]; then
    warn "sin tests directos para los archivos tocados (siguen aplicando eslint + el juez)"
  else
    echo "   tests directos (${#TEST_FILES[@]}):"
    printf '     %s\n' "${TEST_FILES[@]}"
    LOG="$(mktemp /tmp/init-vitest.XXXXXX.log)"
    if "$VITEST" run "${TEST_FILES[@]}" >"$LOG" 2>&1; then
      ok "vitest verde (tests directos del area tocada)"
      grep -E 'Test Files|Tests ' "$LOG" | tail -3 | sed 's/^/     /'
    else
      fail "vitest rojo -> $LOG"
      sed 's/^/     /' "$LOG" | tail -60
      EXIT_CODE=1
    fi
    rm -f "$LOG"
  fi
fi

# ================= Gate 3: tsc opcional =================
echo ""
if [ -n "${RUN_TSC:-}" ]; then
  echo "== 3. tsc --noEmit (RUN_TSC=${RUN_TSC}) =="
  if [ ! -f jsconfig.json ]; then
    warn "sin jsconfig.json; tsc saltado"
  else
    TSC=""
    [ -x ./node_modules/.bin/tsc ] && TSC=./node_modules/.bin/tsc
    [ -z "$TSC" ] && command -v tsc >/dev/null 2>&1 && TSC=tsc
    if [ -z "$TSC" ]; then
      fail "tsc no instalado. RUN_TSC pedido pero no puedo medir (NO SABE)."
      EXIT_CODE=1
    else
      LOG="$(mktemp /tmp/init-tsc.XXXXXX.log)"
      if "$TSC" --noEmit -p jsconfig.json >"$LOG" 2>&1; then
        ok "tsc limpio"
      else
        N="$(grep -cE 'error TS' "$LOG" 2>/dev/null || true)"
        [ -z "$N" ] && N="?"
        if [ "$RUN_TSC" = "strict" ]; then
          fail "tsc con $N errores (strict bloquea) -> $LOG"
          sed 's/^/     /' "$LOG" | tail -30
          EXIT_CODE=1
        else
          warn "tsc con $N errores (advisory; el baseline arrastra deuda) -> $LOG"
        fi
      fi
      rm -f "$LOG"
    fi
  fi
else
  info "tsc no ejecutado (RUN_TSC=advisory para informar, =strict para bloquear)"
fi

# ================= Gate 4: build opcional =================
echo ""
if [ "${RUN_BUILD:-0}" = "1" ]; then
  echo "== 4. build (RUN_BUILD=1) =="
  LOG="$(mktemp /tmp/init-build.XXXXXX.log)"
  if npm run build >"$LOG" 2>&1; then
    ok "vite build verde"
  else
    fail "build rojo -> $LOG"
    sed 's/^/     /' "$LOG" | tail -20
    EXIT_CODE=1
  fi
  rm -f "$LOG"
else
  info "build no ejecutado (RUN_BUILD=1 para activarlo)"
fi

# ================= Resumen =================
echo ""
echo "== resumen =="
if [ "$EXIT_CODE" -eq 0 ]; then
  ok "gates DUROS verdes: el area tocada pasa la verificacion computacional"
else
  fail "algun gate DURO fallo: el trabajo NO esta listo"
fi
exit "$EXIT_CODE"
