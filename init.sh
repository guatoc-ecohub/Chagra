#!/usr/bin/env bash
# init.sh — Verificacion ejecutable del repo (sustrato A del reviewer-gate).
#
# Lo corre un agente al COMENZAR y ANTES de declarar cualquier trabajo `done`.
# Es el SENSOR COMPUTACIONAL determinista del gate builder!=judge: si sale rojo,
# el trabajo NO esta listo, punto (no hace falta juez inferencial para eso).
#
# Filosofia de scope: este repo es grande. `eslint .` completo tarda >2min y
# `tsc` sobre todo el proyecto sale rojo en el baseline conocido (deuda de tipos
# preexistente en jsconfig checkJs). Por eso los gates DUROS se acotan al AREA
# TOCADA (archivos cambiados vs una base), que es lo que de verdad introduce la
# tarea. Reusa la MISMA regla que lefthook (eslint --max-warnings=0); NO duplica
# el hook de commit, comparte el criterio.
#
# Gates:
#   1. eslint --max-warnings=0 sobre archivos JS/JSX/TS/TSX tocados   [DURO]
#   2. vitest run --changed <base>  (tests relacionados a lo tocado)  [DURO]
#   3. tsc --noEmit  (proyecto)                                       [ADVISORY]
#      -> baseline rojo (~4700 errores preexistentes); informa, NO bloquea.
#         RUN_TSC=strict lo vuelve bloqueante (usar solo si el area quedo limpia).
#   4. vite build                                                     [OPT-IN]
#      -> RUN_BUILD=1 para activarlo (lento; off por defecto).
#
# Env:
#   INIT_BASE_REF   base para el diff (default: origin/dev, fallback HEAD)
#   SKIP_ESLINT=1   salta gate 1
#   SKIP_VITEST=1   salta gate 2
#   RUN_TSC=strict  gate 3 pasa a bloqueante
#   RUN_BUILD=1     activa gate 4
#
# Salida: exit 0 = todo verde (o solo advisory con hallazgos). exit 1 = algo DURO fallo.
set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn() { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
fail() { printf "${RED}[FAIL]${NC}  %s\n" "$1"; }
info() { printf "${BLUE}[..]${NC}    %s\n" "$1"; }

cd "$(dirname "$0")" || { echo "init.sh: no pude cd al repo" >&2; exit 1; }

EXIT_CODE=0
BASE_REF="${INIT_BASE_REF:-origin/dev}"
if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null 2>&1; then
  warn "base '$BASE_REF' no existe; usando HEAD como base (solo working-tree)"
  BASE_REF="HEAD"
fi

# Binarios locales del repo (worktree symlinkeado los comparte)
ESLINT="./node_modules/.bin/eslint"
VITEST="./node_modules/.bin/vitest"
TSC="./node_modules/.bin/tsc"

echo "== init.sh  base=$BASE_REF  repo=$(basename "$(pwd)") =="

# ---- Deteccion de archivos tocados (union: base..HEAD + staged + unstaged) ----
mapfile -t CHANGED < <(
  {
    git diff --name-only --diff-filter=ACMR "$BASE_REF"...HEAD 2>/dev/null
    git diff --name-only --diff-filter=ACMR HEAD 2>/dev/null
    git diff --cached --name-only --diff-filter=ACMR 2>/dev/null
  } | sort -u | grep -E '\.(js|jsx|ts|tsx|mjs|cjs)$' || true
)
# Solo los que existen en disco
LINT_FILES=()
for f in "${CHANGED[@]}"; do [ -n "$f" ] && [ -f "$f" ] && LINT_FILES+=("$f"); done
echo "-- archivos JS/JSX/TS tocados: ${#LINT_FILES[@]}"

# ---- Gate 1: ESLint scoped (DURO) ----
echo ""; echo "-- 1. ESLint --max-warnings=0 (area tocada) --"
if [ "${SKIP_ESLINT:-0}" = "1" ]; then
  warn "ESLint saltado (SKIP_ESLINT=1)"
elif [ "${#LINT_FILES[@]}" -eq 0 ]; then
  ok "sin archivos tocados que lintear"
else
  if "$ESLINT" --max-warnings=0 "${LINT_FILES[@]}"; then
    ok "ESLint limpio en ${#LINT_FILES[@]} archivo(s)"
  else
    fail "ESLint fallo (warnings/errores en area tocada)"
    EXIT_CODE=1
  fi
fi

# ---- Gate 2: Vitest de los tests DIRECTOS del area tocada (DURO) ----
#   OJO (medir-el-medidor 2026-08-23): `vitest --changed` incluye el cierre
#   TRANSITIVO de importadores; para un util muy importado (p.ej. id.js) eso
#   arrastra casi toda la suite, que en el baseline origin/dev ya trae ~11 tests
#   rojos preexistentes -> falso bloqueo. Aca corremos SOLO los tests DIRECTOS de
#   cada archivo tocado (el .test/.spec co-localizado o en __tests__/, o el propio
#   archivo si ya es un test). Rapido, y no re-mide fallas ajenas al cambio.
echo ""; echo "-- 2. Vitest (tests directos del area tocada) --"
if [ "${SKIP_VITEST:-0}" = "1" ]; then
  warn "Vitest saltado (SKIP_VITEST=1)"
else
  declare -A SEEN=()
  TEST_FILES=()
  add_test() { local t="$1"; [ -f "$t" ] && [ -z "${SEEN[$t]:-}" ] && { SEEN[$t]=1; TEST_FILES+=("$t"); }; }
  for f in "${LINT_FILES[@]}"; do
    case "$f" in
      *.test.*|*.spec.*|*/__tests__/*) add_test "$f"; continue ;;
    esac
    d="$(dirname "$f")"; b="$(basename "$f")"; stem="${b%.*}"; ext="${b##*.}"
    for e in "$ext" js jsx ts tsx; do
      add_test "$d/__tests__/$stem.test.$e"
      add_test "$d/__tests__/$stem.spec.$e"
      add_test "$d/$stem.test.$e"
      add_test "$d/$stem.spec.$e"
    done
  done
  if [ "${#TEST_FILES[@]}" -eq 0 ]; then
    warn "sin tests directos para los archivos tocados (eslint + juez inferencial siguen aplicando)"
  else
    echo "   tests directos: ${#TEST_FILES[@]} -> ${TEST_FILES[*]}"
    if "$VITEST" run "${TEST_FILES[@]}" >/tmp/init_vitest.log 2>&1; then
      ok "Vitest verde (tests directos del area tocada)"
      grep -E 'Test Files|Tests ' /tmp/init_vitest.log | tail -3
    else
      fail "Vitest rojo -> ver /tmp/init_vitest.log"
      tail -20 /tmp/init_vitest.log
      EXIT_CODE=1
    fi
  fi
fi

# ---- Gate 3: tsc OFF por defecto (lento ~80s + baseline rojo ~4700 errores) ----
#   RUN_TSC=advisory -> corre e informa, no bloquea.  RUN_TSC=strict -> bloquea.
echo ""; echo "-- 3. tsc --noEmit (OFF salvo RUN_TSC=advisory|strict) --"
if [ -z "${RUN_TSC:-}" ]; then
  info "tsc no ejecutado (RUN_TSC=advisory para informar, =strict para bloquear)"
elif [ ! -f jsconfig.json ]; then
  warn "sin jsconfig.json; tsc saltado"
else
  if "$TSC" --noEmit -p jsconfig.json >/tmp/init_tsc.log 2>&1; then
    ok "tsc limpio"
  else
    N=$(grep -cE 'error TS' /tmp/init_tsc.log 2>/dev/null) || true
    [ -z "$N" ] && N='?'
    if [ "${RUN_TSC:-}" = "strict" ]; then
      fail "tsc con $N errores (RUN_TSC=strict -> bloquea) -> /tmp/init_tsc.log"
      EXIT_CODE=1
    else
      warn "tsc con $N errores (advisory; baseline arrastra deuda de tipos) -> /tmp/init_tsc.log"
    fi
  fi
fi

# ---- Gate 4: build OPT-IN ----
echo ""; echo "-- 4. build (OPT-IN: RUN_BUILD=1) --"
if [ "${RUN_BUILD:-0}" = "1" ]; then
  if npm run build >/tmp/init_build.log 2>&1; then
    ok "vite build verde"
  else
    fail "build rojo -> /tmp/init_build.log"; tail -15 /tmp/init_build.log
    EXIT_CODE=1
  fi
else
  info "build no ejecutado (RUN_BUILD=1 para activarlo)"
fi

# ---- Resumen ----
echo ""; echo "== Resumen =="
if [ "$EXIT_CODE" -eq 0 ]; then
  ok "Gates DUROS verdes. El area tocada pasa la verificacion computacional."
else
  fail "Algun gate DURO fallo. El trabajo NO esta listo."
fi
exit "$EXIT_CODE"
