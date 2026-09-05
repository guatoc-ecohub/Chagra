#!/usr/bin/env bash
# guard-deploy-target.sh — guard honesto del target de deploy (card 099).
#
# Antecedente: el guard anterior era `test -d "$(dirname "$TARGET")"` y moría
# con el mensaje "el padre del target no existe". Pero `test -d` devuelve
# falso por DOS causas distintas:
#   (a) el directorio realmente no existe, o
#   (b) el proceso no puede ATRAVESAR la ruta (falta el bit x en algún ancestro).
# Reportar (b) como (a) costó un día entero de deploy rojo en 3d.guatoc.co
# (2026-09-05, card 099): el directorio existía; /home/kortux está en 0700 y
# el runner corre como usuario `runner`, que no lo puede atravesar.
#
# Este script distingue las dos causas caminando el path componente a
# componente desde la raíz. En fallo imprime el diagnóstico y sale 1:
#   CAUSA: NO_EXISTE           → el primer ancestro que de verdad falta
#   CAUSA: NO_PUEDO_ATRAVESAR  → el primer ancestro sin permiso x para este proceso
# y agrega identidad del proceso, ls/getfacl del componente bloqueado y el
# mapa `namei -l` del padre cuando los comandos están disponibles.
#
# Uso: guard-deploy-target.sh <TARGET>
set -u

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "uso: guard-deploy-target.sh <TARGET>" >&2
  exit 2
fi

PARENT="$(dirname -- "$TARGET")"

if [ -d "$PARENT" ]; then
  echo "guard OK: $PARENT existe y es atravesable por $(id -un 2>/dev/null || echo '?')"
  exit 0
fi

# test -d falló. Aquí empieza el diagnóstico honesto: recorrer los
# componentes de PARENT de afuera hacia adentro. Los ancestros visitados
# antes del primero que falla quedan verificados en el mismo bucle, así que
# la primera falla dice con cuál de las dos causas estamos.
remainder="${PARENT#/}"
prefix=""
blocked=""
missing=""
while [ -n "$remainder" ]; do
  comp="${remainder%%/*}"
  if [ "$comp" = "$remainder" ]; then
    remainder=""
  else
    remainder="${remainder#*/}"
  fi
  prefix="$prefix/$comp"
  if [ -e "$prefix" ] || [ -L "$prefix" ]; then
    if [ ! -x "$prefix" ]; then
      blocked="$prefix"
      break
    fi
  else
    missing="$prefix"
    break
  fi
done

echo "El guard del deploy falló para TARGET=$TARGET (padre: $PARENT)"
echo "identidad del proceso: $(id 2>/dev/null || echo 'id no disponible')"
echo ""
if [ -n "$blocked" ]; then
  echo "CAUSA: NO_PUEDO_ATRAVESAR"
  echo "  El padre NO se reporta como inexistente: existe, pero este proceso"
  echo "  no tiene permiso de ejecución (traversal) sobre: $blocked"
  echo "  'test -d' devuelve falso en este caso; el mensaje antiguo"
  echo "  ('el padre del target no existe') mentía con esta misma firma."
  echo ""
  echo "  Evidencia puntual:"
  ls -ld -- "$blocked" 2>/dev/null || true
  if command -v getfacl >/dev/null 2>&1; then
    getfacl -p -- "$blocked" 2>/dev/null || true
  fi
  echo ""
  echo "  Nota (gotcha máscara ACL): un 'setfacl -m u:<usuario>:x' recalcula la"
  echo "  máscara al vuelo, pero un 'chmod' posterior la re-escribe desde los"
  echo "  bits de grupo y puede dejar entradas ACL ineffective (#effective:---)."
  echo "  Después de cualquier chmod sobre la ruta, verificar con getfacl."
else
  echo "CAUSA: NO_EXISTE"
  echo "  Falta de verdad el directorio: $missing"
  echo "  (los ancestros por encima de él existen y son atravesables"
  echo "   por este proceso, así que aquí el mensaje antiguo era correcto)."
fi
if command -v namei >/dev/null 2>&1; then
  echo ""
  echo "  Mapa de traversal de $PARENT (namei -l):"
  namei -l -- "$PARENT" 2>&1 || true
fi
exit 1
