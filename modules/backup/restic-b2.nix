# modules/backup/restic-b2.nix
# =============================================================================
# BACKUP OFF-HOST — Restic + Backblaze B2 (encrypted, deduplicated, daily)
#
# Capa L2 del backup strategy. L1 son sanoid ZFS snapshots locales (ya
# configurados en modules/observability/sanoid.nix). L2 protege contra fallo
# del nodo entero (disk crash, robo, incendio, ransomware que ataque ZFS).
#
# Restic + B2:
#   - Encriptación cliente con password (AES-256, derivado scrypt).
#   - Deduplicación por chunk → solo bloques cambiados se suben.
#   - Snapshots con tags y retention policy declarativa.
#   - Verify / restore desde stg o cualquier máquina con la password.
#
# Costo estimado: ~$0.50/mes para 5GB de datos rotando (mayoría es
# /mnt/fast/appdata sin Ollama models cache que es derivable).
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.backup.restic-b2;
in
{
  options.guatoc.backup.restic-b2 = {
    enable = lib.mkEnableOption "Restic backup to Backblaze B2 (off-host)" // {
      default = false;
    };

    paths = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [
        "/mnt/fast/appdata/homeassistant"
        "/mnt/fast/appdata/farmos-pwa"
        "/mnt/fast/appdata/farmos-pwa-dev"
        "/var/lib/openfang"
        "/etc/nixos"
      ];
      description = ''
        Paths a respaldar. Default cubre los servicios stateful críticos:
          - homeassistant: .storage con users + entity registry + zigbee
          - farmos-pwa + dev: PWA estática deployada
          - openfang: agentes (.openfang/ + workspaces + manifests aplicados)
          - /etc/nixos: por si hay drift entre disco y repo
        EXCLUIDO intencionalmente:
          - Ollama models cache (regenerable con re-pull)
          - Loki logs (rotables, retention propia en grafana stack)
          - Containers volumes que sean efímeros (qbittorrent state, etc.)
      '';
    };

    excludePatterns = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [
        "*.tmp"
        "*.log"
        "node_modules/"
        ".cache/"
        ".git/objects/pack/*"
      ];
      description = "Patterns excluidos del backup (regex restic).";
    };

    bucket = lib.mkOption {
      type = lib.types.str;
      example = "guatoc-backup-prod";
      description = ''
        Nombre del bucket en Backblaze B2. Crear en
        https://secure.backblaze.com/b2_buckets.htm con:
          - Files: Private
          - Lifecycle: Keep all versions of the file (default)
          - Encryption: B2-managed (default OK; restic ya cifra cliente-side)
      '';
    };

    repositoryPath = lib.mkOption {
      type = lib.types.str;
      default = "alpha-stateful";
      description = "Path dentro del bucket (subdirectorio repository).";
    };

    retention = lib.mkOption {
      type = lib.types.attrs;
      default = {
        keepDaily = 30;
        keepWeekly = 8;
        keepMonthly = 12;
        keepYearly = 3;
      };
      description = "Retention policy (forget --prune con estos flags).";
    };

    onBootSec = lib.mkOption {
      type = lib.types.str;
      default = "30min";
      description = "Cuánto esperar tras boot antes del primer backup.";
    };

    schedule = lib.mkOption {
      type = lib.types.str;
      default = "*-*-* 03:30:00";
      description = ''
        Calendar systemd para el backup recurrente (default 3:30 AM hora local).
        Choachí UTC-5; verificar timezone configurada en hosts/alpha/default.nix.
      '';
    };
  };

  config = lib.mkIf cfg.enable {
    # Restic CLI disponible para restore manual
    environment.systemPackages = [ pkgs.restic ];

    # Sops secrets requeridos: B2 credentials + restic password.
    # Declarar las 2 secrets en hosts/alpha/secrets.yaml + sops.secrets:
    #   restic-b2-env: archivo .env con B2_ACCOUNT_ID y B2_ACCOUNT_KEY
    #   restic-password: password de cifrado del repo (DIFERENTE a B2 creds)
    # Ambas se inyectan vía EnvironmentFile al unit. Sin ellas, el unit
    # falla al arranque sin tocar nada — comportamiento seguro.

    systemd.services.restic-backup = {
      description = "Restic backup to Backblaze B2 (off-host L2)";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];

      path = [ pkgs.restic pkgs.coreutils pkgs.gnutar ];

      serviceConfig = {
        Type = "oneshot";
        User = "root";  # necesita leer paths con perms variados
        # EnvironmentFile carga RESTIC_REPOSITORY + B2_ACCOUNT_ID + B2_ACCOUNT_KEY + RESTIC_PASSWORD
        EnvironmentFile = [
          config.sops.secrets.restic-b2-env.path
          config.sops.secrets.restic-password-env.path
        ];
        # Hardening: backup proceso solo lee + envía, no escribe.
        ProtectSystem = "strict";
        ProtectHome = "read-only";
        PrivateTmp = true;
        NoNewPrivileges = true;
        # Read access a los paths backup
        ReadOnlyPaths = cfg.paths;
        # Write access solo al cache de restic
        ReadWritePaths = [ "/var/cache/restic" ];
      };

      preStart = ''
        # Asegurar cache dir existe
        mkdir -p /var/cache/restic
        chmod 0700 /var/cache/restic
      '';

      script = ''
        set -euo pipefail

        export RESTIC_CACHE_DIR=/var/cache/restic
        export RESTIC_REPOSITORY="b2:${cfg.bucket}:/${cfg.repositoryPath}"

        echo "[restic] === Backup start at $(date -Iseconds) ==="

        # Init repo si no existe (idempotente: falla silently si ya init)
        if ! restic snapshots --no-lock 2>/dev/null | grep -q "ID"; then
          echo "[restic] Repo no inicializado, ejecutando init..."
          restic init || {
            # Si init también falla, repo puede existir pero password diferente
            echo "[restic] WARN: init falló — verificar password contra repo existente"
            exit 1
          }
        fi

        # Backup con tags para audit trail
        restic backup \
          ${lib.concatMapStringsSep " " (p: ''"${p}"'') cfg.paths} \
          ${lib.concatMapStringsSep " " (e: ''--exclude="${e}"'') cfg.excludePatterns} \
          --tag "alpha-daily" \
          --tag "$(date +%Y-%m-%d)" \
          --host "alpha"

        echo "[restic] === Aplicando retention ==="
        restic forget \
          --keep-daily ${toString cfg.retention.keepDaily} \
          --keep-weekly ${toString cfg.retention.keepWeekly} \
          --keep-monthly ${toString cfg.retention.keepMonthly} \
          --keep-yearly ${toString cfg.retention.keepYearly} \
          --prune

        echo "[restic] === Backup done at $(date -Iseconds) ==="
        echo "[restic] === Snapshots actuales ==="
        restic snapshots --compact
      '';
    };

    systemd.timers.restic-backup = {
      description = "Trigger restic backup daily";
      wantedBy = [ "timers.target" ];
      timerConfig = {
        OnBootSec = cfg.onBootSec;
        OnCalendar = cfg.schedule;
        Persistent = true;
        RandomizedDelaySec = "10min";
      };
    };

    # Health check: si han pasado >36h sin backup exitoso, alerta.
    # Por ahora solo log; futuro: integrar con HA notification.
    systemd.services.restic-backup-healthcheck = {
      description = "Verifica que restic-backup haya corrido en últimas 36h";
      after = [ "restic-backup.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "oneshot";
      };
      script = ''
        LAST_RUN=$(systemctl show restic-backup -p ActiveEnterTimestamp --value)
        if [ -z "$LAST_RUN" ] || [ "$LAST_RUN" = "n/a" ]; then
          echo "[health] WARN: restic-backup nunca ha corrido"
          exit 0
        fi
        LAST_TS=$(date -d "$LAST_RUN" +%s 2>/dev/null || echo 0)
        NOW=$(date +%s)
        AGE_HOURS=$(( (NOW - LAST_TS) / 3600 ))
        if [ $AGE_HOURS -gt 36 ]; then
          echo "[health] CRITICAL: último backup hace $AGE_HOURS horas (>36h)"
        else
          echo "[health] OK: último backup hace $AGE_HOURS horas"
        fi
      '';
    };
  };
}
