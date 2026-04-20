#!/usr/bin/env bash
# =============================================================================
# tank-perf-tune.sh
# -----------------------------------------------------------------------------
# Aplica ajustes runtime de performance a los pools ZFS del Nodo Alpha.
#
# Fases:
#   1) atime=off + xattr=sa en tank y tank-fast  (zero-downtime, zero-risk)
#   2) Dataset dedicado tank-fast/appdata/ollama con recordsize=1M
#      (requiere ~5 min de downtime de Ollama; mueve ~12 GB)
#   3) [OPT-IN] export + import de tank con -d /dev/disk/by-id
#      (cosmetico, requiere detener todos los containers que escriban
#       en /mnt/data — immich, frigate, HA, media stack)
#
# Referencia: STORAGE_AUDIT_REPORT.md §2.4, §3
#
# Uso:
#   sudo ./scripts/tank-perf-tune.sh          # ejecuta fases 1 y 2
#   sudo ./scripts/tank-perf-tune.sh --all    # + fase 3 (export/import)
#   sudo ./scripts/tank-perf-tune.sh --only 1 # solo fase 1
# =============================================================================

set -euo pipefail

# ---- Constantes -------------------------------------------------------------
readonly OLLAMA_DIR="/mnt/fast/appdata/ollama"
readonly OLLAMA_BACKUP="/mnt/fast/appdata/ollama.bak-$(date +%Y%m%d-%H%M%S)"
readonly OLLAMA_DATASET="tank-fast/appdata/ollama"

# ---- Helpers ----------------------------------------------------------------
log()  { printf '\n\e[1;34m[%s]\e[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
warn() { printf '\n\e[1;33m[WARN]\e[0m %s\n' "$*"; }
die()  { printf '\n\e[1;31m[ABORTAR]\e[0m %s\n' "$*" >&2; exit 1; }
confirm() {
  local prompt="$1"
  read -r -p "$(printf '\n\e[1;35m%s\e[0m ' "$prompt [escribe EXACTAMENTE 'si']: ")" ans
  [ "$ans" = "si" ] || die "cancelado por el operador"
}

[ "$(id -u)" -eq 0 ] || die "debe correrse como root (sudo)"

# ---- Flags ------------------------------------------------------------------
RUN_FASE1=1
RUN_FASE2=1
RUN_FASE3=0
if [ "${1:-}" = "--all" ]; then
  RUN_FASE3=1
elif [ "${1:-}" = "--only" ] && [ -n "${2:-}" ]; then
  RUN_FASE1=0; RUN_FASE2=0; RUN_FASE3=0
  case "$2" in
    1) RUN_FASE1=1 ;;
    2) RUN_FASE2=1 ;;
    3) RUN_FASE3=1 ;;
    *) die "--only acepta 1, 2 o 3" ;;
  esac
fi

# ============================================================================
# FASE 1 — atime=off + xattr=sa (zero-downtime)
# ============================================================================
if [ "$RUN_FASE1" = "1" ]; then
  log "FASE 1/3 — atime=off + xattr=sa en tank y tank-fast"
  log "  Estado actual:"
  zfs get -H -o name,property,value atime,xattr tank tank-fast

  for pool in tank tank-fast; do
    cur_atime=$(zfs get -H -o value atime "$pool")
    cur_xattr=$(zfs get -H -o value xattr "$pool")
    if [ "$cur_atime" != "off" ]; then
      log "  zfs set atime=off $pool   (antes: $cur_atime)"
      zfs set atime=off "$pool"
    else
      log "  $pool ya tiene atime=off"
    fi
    if [ "$cur_xattr" != "sa" ]; then
      log "  zfs set xattr=sa $pool   (antes: $cur_xattr)"
      zfs set xattr=sa "$pool"
    else
      log "  $pool ya tiene xattr=sa"
    fi
  done

  log "  Estado final FASE 1:"
  zfs get -H -o name,property,value atime,xattr tank tank-fast
fi

# ============================================================================
# FASE 2 — Dataset dedicado para Ollama con recordsize=1M
# ============================================================================
if [ "$RUN_FASE2" = "1" ]; then
  log "FASE 2/3 — dataset dedicado $OLLAMA_DATASET con recordsize=1M"

  # Si ya existe el dataset con recordsize=1M, saltar silenciosamente
  if zfs list "$OLLAMA_DATASET" >/dev/null 2>&1; then
    cur_rs=$(zfs get -H -o value recordsize "$OLLAMA_DATASET")
    if [ "$cur_rs" = "1M" ]; then
      log "  $OLLAMA_DATASET ya existe con recordsize=1M — saltando."
      RUN_FASE2=0
    else
      warn "$OLLAMA_DATASET existe pero con recordsize=$cur_rs"
      warn "Migracion requiere borrar y recrear. Abortando FASE 2 por seguridad."
      warn "Para recrear: zfs destroy -r $OLLAMA_DATASET y re-ejecutar el script."
      RUN_FASE2=0
    fi
  fi
fi

if [ "$RUN_FASE2" = "1" ]; then
  log "  Pre-flight: verificar que $OLLAMA_DIR existe y tiene contenido"
  [ -d "$OLLAMA_DIR" ] || die "$OLLAMA_DIR no existe"
  du -sh "$OLLAMA_DIR" || true

  log "  Pre-flight: verificar estado del contenedor ollama"
  if systemctl is-active --quiet podman-ollama; then
    log "    podman-ollama.service active — se detendra durante la migracion"
  else
    warn "    podman-ollama.service no esta active (${$(systemctl is-active podman-ollama):-desconocido})"
  fi

  warn "Esta fase detiene Ollama, mueve ~12 GB y recrea el directorio"
  warn "como dataset ZFS con recordsize=1M. Backup temporal en $OLLAMA_BACKUP"
  confirm "¿Ejecutar migracion del dataset de Ollama?"

  log "  Deteniendo podman-ollama.service..."
  systemctl stop podman-ollama.service || true
  # Esperar a que el contenedor libere los handles
  sleep 3

  log "  Renombrando directorio actual a backup: $OLLAMA_BACKUP"
  mv "$OLLAMA_DIR" "$OLLAMA_BACKUP"

  log "  Creando dataset $OLLAMA_DATASET con props optimizadas para LLM"
  zfs create \
    -o recordsize=1M \
    -o atime=off \
    -o xattr=sa \
    -o compression=lz4 \
    -o primarycache=all \
    "$OLLAMA_DATASET"
  # El mountpoint se hereda de tank-fast (mountpoint=/mnt/fast), asi que
  # el dataset aparece en /mnt/fast/appdata/ollama automaticamente.
  # Verificar:
  mountpoint -q "$OLLAMA_DIR" || {
    warn "dataset creado pero no esta montado en $OLLAMA_DIR — montando"
    zfs mount "$OLLAMA_DATASET"
  }

  log "  Copiando contenido desde backup ($OLLAMA_BACKUP) al dataset nuevo"
  # rsync preserva permisos/xattrs/sparse; -a implica -rlptgoD
  # --info=progress2 para visibilidad en ~12 GB
  if command -v rsync >/dev/null 2>&1; then
    rsync -aHAX --info=progress2 "$OLLAMA_BACKUP"/ "$OLLAMA_DIR"/
  else
    # Fallback: cp -a (mas lento pero siempre presente)
    cp -a "$OLLAMA_BACKUP"/. "$OLLAMA_DIR"/
  fi

  log "  Verificando tamanios pre/post"
  size_src=$(du -sb "$OLLAMA_BACKUP" | awk '{print $1}')
  size_dst=$(du -sb "$OLLAMA_DIR"    | awk '{print $1}')
  log "    backup:  $(numfmt --to=iec $size_src) ($size_src bytes)"
  log "    dataset: $(numfmt --to=iec $size_dst) ($size_dst bytes)"
  if [ "$size_src" -ne "$size_dst" ]; then
    warn "tamanios NO coinciden — revisar manualmente antes de borrar el backup"
    warn "el backup queda en $OLLAMA_BACKUP por seguridad"
  else
    log "    tamanios coinciden."
  fi

  log "  Arrancando podman-ollama.service..."
  systemctl start podman-ollama.service

  # Smoke test: el daemon debe responder en :11434 en ~15s
  log "  Smoke test HTTP API (timeout 60s)..."
  for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:11434/api/version >/dev/null 2>&1; then
      log "    OK: Ollama responde."
      break
    fi
    sleep 2
    [ "$i" = "30" ] && warn "timeout esperando a Ollama — revisar manualmente"
  done

  log "  Backup preservado en $OLLAMA_BACKUP"
  log "  Tras validar que Ollama opera correctamente, eliminalo con:"
  log "    sudo rm -rf $OLLAMA_BACKUP"
  log "  Nuevo dataset activo:"
  zfs get -H -o name,property,value recordsize,atime,xattr,compression "$OLLAMA_DATASET"
fi

# ============================================================================
# FASE 3 — Opt-in: export + import con -d /dev/disk/by-id (cosmetico)
# ============================================================================
if [ "$RUN_FASE3" = "1" ]; then
  log "FASE 3/3 — export + import del pool tank para uniformar nombres de vdev"
  warn "Esta fase detiene TODO servicio que escriba en /mnt/data:"
  warn "  - immich, frigate, HA, mosquitto, z2m, slskd, appdata/frigate/config, backups"
  warn "  - radarr, sonarr, lidarr, prowlarr, qbittorrent (media stack — /mnt/data/media)"
  warn "Los containers podman se reinician tras el import; HA/immich reabrieran sus DBs."
  warn "Si hay escrituras activas (downloads, recordings), espera a una ventana quieta."
  confirm "¿Proceder con export/import del pool tank?"

  log "  Deteniendo containers que usan /mnt/data..."
  declare -a UNITS=(
    podman-immich-server.service
    podman-immich-microservices.service
    podman-immich-machine-learning.service
    podman-frigate.service
    podman-homeassistant.service
    podman-mosquitto.service
    podman-zigbee2mqtt.service
    podman-slskd.service
    podman-radarr.service
    podman-sonarr.service
    podman-lidarr.service
    podman-prowlarr.service
    podman-qbittorrent.service
    podman-navidrome.service
  )
  for u in "${UNITS[@]}"; do
    if systemctl list-unit-files --type=service | grep -qE "^$u"; then
      log "    stop: $u"
      systemctl stop "$u" 2>/dev/null || true
    fi
  done

  log "  Detectando procesos que aun tienen handles en /mnt/data..."
  if command -v lsof >/dev/null 2>&1; then
    lsof +D /mnt/data 2>/dev/null | head -20 || true
  fi
  fuser -vm /mnt/data 2>&1 | head -20 || true

  confirm "¿Todos los handles sobre /mnt/data liberados? (verifica arriba)"

  log "  zpool export tank..."
  zpool export tank

  log "  zpool import -d /dev/disk/by-id tank..."
  zpool import -d /dev/disk/by-id tank

  log "  Estado post-import:"
  zpool status tank

  log "  Reiniciando containers detenidos..."
  for u in "${UNITS[@]}"; do
    if systemctl list-unit-files --type=service | grep -qE "^$u"; then
      log "    start: $u"
      systemctl start "$u" 2>/dev/null || warn "fallo al iniciar $u"
    fi
  done
fi

log "tank-perf-tune.sh FINALIZADO"
log ""
log "Siguiente paso declarativo:"
log "  sudo nixos-rebuild switch --flake .#alpha"
log "  # aplica OLLAMA_FLASH_ATTENTION=true + OLLAMA_KV_CACHE_TYPE=q8_0"
