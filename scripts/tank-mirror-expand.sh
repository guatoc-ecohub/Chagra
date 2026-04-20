#!/usr/bin/env bash
# =============================================================================
# tank-mirror-expand.sh
# -----------------------------------------------------------------------------
# Integra el segundo HDD Toshiba 12 TB como espejo del pool `tank`.
#
# Referencia: STORAGE_AUDIT_REPORT.md (raiz del repo).
#
# Identidad verificada de discos al momento de escribir el script:
#   - tank existente (NO TOCAR):  ata-TOSHIBA_MG07ACA12TE_2080A1GWFDUG  (serial GW)
#   - disco nuevo (wipe+attach):  ata-TOSHIBA_MG07ACA12TE_2080A2AHFDUG  (serial AH)
#
# El script pide confirmacion humana antes de:
#   - wipe del disco nuevo
#   - zpool attach (inicia resilver)
#
# Ejecutar como root desde el repo:
#   sudo ./scripts/tank-mirror-expand.sh
# =============================================================================

set -euo pipefail

# ---- Constantes (NO editar salvo que el hardware cambie) --------------------
readonly TANK_DISK="/dev/disk/by-id/ata-TOSHIBA_MG07ACA12TE_2080A1GWFDUG"
readonly NEW_DISK="/dev/disk/by-id/ata-TOSHIBA_MG07ACA12TE_2080A2AHFDUG"
readonly TANK_DISK_PART1="${TANK_DISK}-part1"

# ---- Helpers ----------------------------------------------------------------
log()  { printf '\n\e[1;34m[%s]\e[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
warn() { printf '\n\e[1;33m[WARN]\e[0m %s\n' "$*"; }
die()  { printf '\n\e[1;31m[ABORTAR]\e[0m %s\n' "$*" >&2; exit 1; }

# Wrappers transparentes: si el binario existe en PATH, lo usan; si no,
# invocan `nix shell nixpkgs#<pkg> --command <cmd>` (flakes activados en
# common-security.nix). Evita modificar environment.systemPackages solo
# para esta operacion puntual.
#
# Se usa `type -P <cmd>` (no `command -v`) porque `command -v` tambien
# encuentra funciones shell — y las funciones con el mismo nombre del
# binario romperian la deteccion. `type -P` retorna unicamente el path
# del binario externo en PATH, vacio si no existe.
run_sgdisk() {
  local bin; bin="$(type -P sgdisk || true)"
  if [ -n "$bin" ]; then
    "$bin" "$@"
  else
    nix shell nixpkgs#gptfdisk --command sgdisk "$@"
  fi
}

confirm() {
  local prompt="$1"
  read -r -p "$(printf '\n\e[1;35m%s\e[0m ' "$prompt [escribe EXACTAMENTE 'si']: ")" ans
  [ "$ans" = "si" ] || die "cancelado por el operador"
}

# ---- 0. Prevuelo ------------------------------------------------------------
[ "$(id -u)" -eq 0 ] || die "debe correrse como root (sudo)"

log "Pre-flight: verificar que los symlinks by-id existan y apunten a discos distintos"
[ -e "$TANK_DISK" ] || die "no existe $TANK_DISK"
[ -e "$NEW_DISK" ]  || die "no existe $NEW_DISK"

tank_real=$(readlink -f "$TANK_DISK")
new_real=$(readlink -f "$NEW_DISK")
log "  tank existente → $tank_real"
log "  disco nuevo    → $new_real"
[ "$tank_real" != "$new_real" ] || die "ambos IDs apuntan al mismo dispositivo"

log "Pre-flight: confirmar que el pool tank esta ONLINE"
zpool status tank >/dev/null || die "pool tank no importado"
zpool status tank | grep -qE 'state:\s+ONLINE' || die "pool tank no esta en estado ONLINE"

log "Pre-flight: confirmar que el disco nuevo NO tiene datos ZFS"
if blkid "$NEW_DISK" 2>/dev/null | grep -q zfs_member; then
  die "$NEW_DISK ya contiene un zfs_member — abortando (podria ser el disco equivocado)"
fi
for p in "${NEW_DISK}-part"*; do
  [ -e "$p" ] || continue
  if blkid "$p" 2>/dev/null | grep -q zfs_member; then
    die "$p contiene un zfs_member — abortando"
  fi
done

log "Pre-flight: confirmar que el tank existente SI tiene particion zfs_member"
blkid "$TANK_DISK_PART1" 2>/dev/null | grep -q zfs_member \
  || die "$TANK_DISK_PART1 no tiene FSTYPE=zfs_member — el script asume que la particion 1 del tank actual es ZFS. Aborta y revisa lsblk."

log "Pre-flight: informar estado del pool"
zpool status tank

# ---- Detectar dinamicamente el nombre del vdev existente en el pool --------
# `zpool attach` NO resuelve symlinks — compara strings contra los nombres
# registrados en el pool. Si el pool fue importado por WWN, el path `ata-*`
# (aunque apunte al mismo disco) fallara con "no such device in pool".
# Leemos el primer vdev hoja tal como ZFS lo conoce.
log "Pre-flight: detectar nombre del vdev existente (source del attach)"
TANK_VDEV_SOURCE=$(zpool status tank | awk '
  /^\tNAME/ { in_cfg=1; next }
  in_cfg && $1 == "tank" { next }
  in_cfg && $2 ~ /ONLINE|DEGRADED|FAULTED|OFFLINE|REMOVED|UNAVAIL/ { print $1; exit }
')
[ -n "$TANK_VDEV_SOURCE" ] || die "no se pudo determinar el vdev existente del pool tank"
log "  Vdev source detectado: $TANK_VDEV_SOURCE"

# Sanity check: el vdev detectado debe resolver al mismo dispositivo fisico
# que el ata-ID del disco productivo. Si ZFS conoce el vdev por WWN o por
# /dev/sdX directo, readlink -f lo llevara a /dev/sdbN.
tank_vdev_real=$(readlink -f "/dev/disk/by-id/$TANK_VDEV_SOURCE" 2>/dev/null \
  || readlink -f "$TANK_VDEV_SOURCE" 2>/dev/null || echo "$TANK_VDEV_SOURCE")
tank_ata_real=$(readlink -f "$TANK_DISK_PART1")
if [ "$tank_vdev_real" != "$tank_ata_real" ]; then
  warn "vdev source ($tank_vdev_real) no coincide con ata-ID part1 ($tank_ata_real)"
  warn "continua solo si confirmas manualmente que ambos apuntan al disco tank."
  confirm "¿Los caminos distintos apuntan al mismo disco fisico?"
fi

# ---- 1. Wipe del disco nuevo ------------------------------------------------
# (SMART check omitido: ejecutado manualmente antes — PASSED, test corto
#  completado sin errores, LifeTime 5017 h.)
log "Paso 1/4: wipe completo del disco nuevo ($NEW_DISK)"
log "  Estado actual de particiones en el disco nuevo:"
lsblk "$NEW_DISK"
warn "Esta operacion ELIMINA todo contenido del disco $NEW_DISK (serial AHFDUG)."
warn "NO tocara el disco productivo $TANK_DISK (serial GWFDUG)."
confirm "¿Proceder con wipefs + sgdisk zap sobre el disco nuevo (serial AHFDUG)?"

wipefs -a "$NEW_DISK"
run_sgdisk --zap-all "$NEW_DISK"
log "  Wipe completado. Estado post-wipe:"
lsblk "$NEW_DISK"

# ---- 3. zpool attach → mirror -----------------------------------------------
log "Paso 2/4: attach del disco nuevo al pool tank (inicia resilver)"
log "  Comando a ejecutar:"
log "    zpool attach tank $TANK_VDEV_SOURCE $NEW_DISK"
warn "Tras el attach, el pool tank pasa a mirror-0 y comienza resilver automatico."
warn "El disco productivo queda intacto; revertir es: zpool detach tank $NEW_DISK"
confirm "¿Ejecutar el attach ahora?"

zpool attach tank "$TANK_VDEV_SOURCE" "$NEW_DISK"
log "  Attach aceptado. Estado del pool:"
zpool status tank

# ---- 4. Monitoreo de resilver -----------------------------------------------
log "Paso 3/4: monitoreo del resilver"
log "  El pool tiene pocos datos (~225 MB en immich); resilver deberia durar minutos."
log "  Presiona Ctrl-C para detener el monitoreo (el resilver sigue en background)."
log "  Estado de resilver (refresca cada 10 s):"
while true; do
  if zpool status tank | grep -qE 'resilver in progress|scan:\s+resilvered'; then
    clear
    zpool status tank
    if zpool status tank | grep -qE 'scan:\s+resilvered.*with 0 errors'; then
      log "Resilver COMPLETADO sin errores."
      break
    fi
    sleep 10
  else
    log "Resilver no se detecta en status. Estado actual:"
    zpool status tank
    break
  fi
done

# ---- 5. Validacion final ----------------------------------------------------
log "Paso 4/4: validacion final"
zpool status tank
zpool list -v tank

log "Checklist post-operacion:"
log "  [ ] zpool status tank muestra 'state: ONLINE' y vdev 'mirror-0' con 2 discos"
log "  [ ] ambos discos del mirror muestran 'ONLINE' (no DEGRADED / FAULTED)"
log "  [ ] df -hT | grep /mnt/data — tamaño del pool sigue siendo ~11 TB (mirror, no stripe)"
log "  [ ] iniciar scrub opcional: zpool scrub tank   (puede tardar horas)"
log ""
log "Siguiente paso declarativo (fuera de este script):"
log "  sudo nixos-rebuild switch --flake .#alpha"
log "  # aplica hdparm-spindown actualizado a ambos discos por ID estable"
log ""
log "tank-mirror-expand.sh FINALIZADO."
