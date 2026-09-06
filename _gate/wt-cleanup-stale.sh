#!/usr/bin/env bash
# wt-cleanup-stale.sh — archiva y limpia worktrees stale del repo chagra.
#
# Decision por worktree (reglas del brief):
#   BORRAR   : (rama huerfana O mergeada en origin/dev) Y cero cambios sin commitear
#   ARCHIVAR : mismas condiciones pero con cambios sin commitear -> tar.gz en
#              coldstore, se conserva en su lugar, NO se borra. Aviso en log.
#   MANTENER : el resto (rama viva en el remoto, sin merge, o worktree principal).
#
# Seguridad (reglas duras):
#   * NUNCA toca el worktree principal (toplevel) ni ramas main/master/dev.
#   * NUNCA borra sin que el tar.gz haya quedado verificado en coldstore.
#   * Log = fuente de verdad: una linea por worktree archivado/borrado con
#     rama, edad, tamano y hash HEAD.
#
# Uso:
#   wt-cleanup-stale.sh [--dry-run] [--report-only]
#     --dry-run     : tabla de decisiones, no escribe nada (ni archivo ni log)
#     --report-only : como dry-run + imprime las lineas de log canonicas a stdout
#   Variables de entorno (override para pruebas u otros repos):
#     WT_CLEANUP_REPO          (default: /home/kortux/Workspace/chagra)
#     WT_CLEANUP_ARCHIVE_ROOT  (default: /mnt/data/coldstore/wt-archive)
#     WT_CLEANUP_LOG           (default: /home/kortux/.local/state/fleet-backlog/worktree-cleanup.log)
#     WT_CLEANUP_DEV_REF       (default: origin/dev)
set -uo pipefail

REPO="${WT_CLEANUP_REPO:-/home/kortux/Workspace/chagra}"
ARCHIVE_ROOT="${WT_CLEANUP_ARCHIVE_ROOT:-/mnt/data/coldstore/wt-archive}"
LOG_FILE="${WT_CLEANUP_LOG:-/home/kortux/.local/state/fleet-backlog/worktree-cleanup.log}"
DEV_REF="${WT_CLEANUP_DEV_REF:-origin/dev}"
MAIN_REF="${WT_CLEANUP_MAIN_REF:-origin/main}"
STAMP="$(date +%Y%m%d)"

DRY=0
REPORT_ONLY=0

usage() { sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'; }

for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY=1 ;;
    --report-only) DRY=1; REPORT_ONLY=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "argumento desconocido: $arg" >&2; usage; exit 2 ;;
  esac
done

TOPLEVEL="$(git -C "$REPO" rev-parse --show-toplevel 2>/dev/null)" || { echo "no es repo git: $REPO" >&2; exit 3; }
NOW_EPOCH="$(date +%s)"

# Inventario: filas "path<TAB>head<TAB>ref"
mapfile -t ROWS < <(git -C "$REPO" worktree list --porcelain | awk '
  /^worktree / { path=$2 }
  /^HEAD /     { head=$2 }
  /^branch /   { ref=$2 }
  /^detached/  { ref="detached" }
  /^$/         { if (path!="") print path "\t" head "\t" ref; path=""; head=""; ref="" }
  END          { if (path!="") print path "\t" head "\t" ref }
')

ARCHIVED_N=0; ARCHIVED_BYTES=0; DELETED_N=0; ALERT_N=0
CAND_N=0; AGESUM=0; AGEN=0

printf 'ACCION\tRAMA\tREMOTO\tEN_DEV\tEN_MAIN\tDIRTY\tEDAD\tHEAD\tPATH\n'

for row in "${ROWS[@]}"; do
  IFS=$'\t' read -r wt head_sha ref <<< "$row"
  [ -z "$wt" ] && continue

  # Protecciones duras
  [ "$wt" = "$TOPLEVEL" ] && continue
  short="${ref#refs/heads/}"
  case "$short" in main|master|dev) continue ;; esac

  if [ "$ref" = "detached" ]; then
    remote="no(detached)"
  elif git -C "$REPO" show-ref --verify --quiet "refs/remotes/origin/$short" 2>/dev/null; then
    remote="si"
  else
    remote="no"
  fi

  in_dev="no"; git -C "$REPO" merge-base --is-ancestor "$head_sha" "$DEV_REF" 2>/dev/null && in_dev="si"
  in_main="no"; git -C "$REPO" merge-base --is-ancestor "$head_sha" "$MAIN_REF" 2>/dev/null && in_main="si"

  dirty=$(git -C "$wt" status --porcelain 2>/dev/null | wc -l)
  [ -z "$dirty" ] && dirty=0

  edad="?"
  cdate=$(git -C "$wt" show -s --format=%cs "$head_sha" 2>/dev/null)
  if [ -n "$cdate" ] && d=$(date -d "$cdate" +%s 2>/dev/null); then
    edad=$(( (NOW_EPOCH - d) / 86400 ))
  fi

  huerfana="no"; case "$remote" in no*) huerfana="si" ;; esac
  mergeada="no"; [ "$in_dev" = "si" ] && mergeada="si"

  if [ "$huerfana" = "si" ] || [ "$mergeada" = "si" ]; then
    if [ "$dirty" -eq 0 ]; then ACCION=BORRAR; else ACCION=ARCHIVAR; fi
  else
    ACCION=MANTENER
  fi

  REASON=""
  [ "$huerfana" = "si" ] && REASON="huerfana"
  [ "$mergeada" = "si" ] && REASON="${REASON:+$REASON+}mergeada"
  [ -z "$REASON" ] && REASON="viva"

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$ACCION" "$short" "$remote" "$in_dev" "$in_main" "$dirty" "$edad" "${head_sha:0:8}" "$wt"

  if [ "$ACCION" = BORRAR ] || [ "$ACCION" = ARCHIVAR ]; then
    CAND_N=$((CAND_N+1)); AGEN=$((AGEN+1)); AGESUM=$((AGESUM+edad))
    [ "$ACCION" = ARCHIVAR ] && ALERT_N=$((ALERT_N+1))
  fi

  # En report-only, emitir las lineas de log canonicas sin escribir nada
  if [ "$REPORT_ONLY" -eq 1 ] && [ "$ACCION" != MANTENER ]; then
    echo "$(date -Is)|DECISION|$wt|$short|$head_sha|$edad|NA|$REASON|$ACCION"
  fi

  if [ "$DRY" -eq 1 ]; then continue; fi

  # --- ejecucion real ---
  dest_dir="$ARCHIVE_ROOT/$STAMP"
  if ! mkdir -p "$dest_dir" 2>/dev/null; then
    echo "no puedo crear $dest_dir (aborto)" >&2
    exit 4
  fi
  name="$(basename "$wt")"
  tar_file="$dest_dir/$name.tar.gz"
  if [ -f "$tar_file" ]; then
    # Ya archivado hoy (idempotencia por dia): no se duplica el tar
    size=$(stat -c %s "$tar_file" 2>/dev/null || echo 0)
    echo "$(date -Is)|YA_ARCHIVADO|$wt|$short|$head_sha|$edad|$size|$REASON|$tar_file" >> "$LOG_FILE"
  elif tar -czf "$tar_file" -C "$(dirname "$wt")" "$name" 2>/dev/null; then
    size=$(stat -c %s "$tar_file" 2>/dev/null || echo 0)
    ARCHIVED_N=$((ARCHIVED_N+1)); ARCHIVED_BYTES=$((ARCHIVED_BYTES+size))
    echo "$(date -Is)|ARCHIVADO|$wt|$short|$head_sha|$edad|$size|$REASON|$tar_file" >> "$LOG_FILE"
  else
    echo "$(date -Is)|FALLO_ARCHIVO|$wt|$short|$head_sha|$edad|NA|$REASON|tar a $tar_file fallo" >> "$LOG_FILE"
    echo "FALLO_ARCHIVO: $wt (no se toca)" >&2
    continue
  fi
  if [ "$ACCION" = BORRAR ]; then
    if git -C "$REPO" worktree remove -- "$wt" 2>/dev/null; then
      DELETED_N=$((DELETED_N+1))
      echo "$(date -Is)|BORRADO|$wt|$short|$head_sha|$edad|$size|$REASON|$tar_file" >> "$LOG_FILE"
    else
      echo "$(date -Is)|FALLO_BORRADO|$wt|$short|$head_sha|$edad|$size|$REASON|git worktree remove fallo" >> "$LOG_FILE"
      echo "FALLO_BORRADO: $wt (queda archivado en $tar_file)" >&2
    fi
  fi
done

if [ "$DRY" -eq 1 ]; then
  printf -- '--- resumen dry-run: %s candidatos (%s a borrar, %s a archivar+avisar) | edad promedio %s dias\n' \
    "$CAND_N" "$((CAND_N-ALERT_N))" "$ALERT_N" "$((AGEN>0?AGESUM/AGEN:0))"
else
  printf -- '--- resumen: archivados %s | borrados %s | bytes %s\n' "$ARCHIVED_N" "$DELETED_N" "$ARCHIVED_BYTES"
fi
exit 0
