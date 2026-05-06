# modules/cloud/immich.nix
# =============================================================================
# IMMICH — Photos & Videos backup + sharing público para parceros
# Puertos: 2283 (server), 3003 (machine learning)
# Dominio público: lasfotos.guatoc.co (Cloudflare Tunnel → Nginx → Immich)
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.cloud.immich;
  cloudCfg = config.guatoc.cloud;
  registry = import ../../lib/registry.nix { inherit lib; };

  # Passwords via SOPS — si no existen, fallback a defaults (solo primer boot)
  pgPasswordFile = config.sops.secrets."immich-postgres-password".path or null;
in
{
  options.guatoc.cloud.immich = {
    enable = lib.mkEnableOption "Immich - Backup de fotos y videos" // {
      default = false;
    };

    domain = lib.mkOption {
      type = lib.types.str;
      default = "lasfotos.guatoc.co";
      description = "Dominio público para acceso vía Cloudflare Tunnel.";
    };

    enablePublicSharing = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = ''
        Habilitar acceso público con invitación. Inmutable para Immich:
        se setea al iniciar el container y no se puede cambiar después
        sin borrar la DB. Por defecto true para parceros.
      '';
    };
  };

  config = lib.mkIf (cloudCfg.enable && cfg.enable) {
    # ─────────────────────────────────────────────
    # SOPS secrets para Immich
    # ─────────────────────────────────────────────
    sops.secrets = {
      "immich-postgres-password" = {
        owner = "root";
        group = "root";
        mode = "0400";
      };
    };

    # ─────────────────────────────────────────────
    # Immich PostgreSQL
    # ─────────────────────────────────────────────
    systemd.services.podman-immich-postgres = {
      after = [ "zfs.target" "network-online.target" "create-container-networks.service" ];
      requires = [ "zfs.target" "create-container-networks.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/apps" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/apps/immich-db"
        ];
      };
    };

    virtualisation.oci-containers.containers.immich-postgres = {
      image = "docker.io/tensorchord/pgvecto-rs:pg14-v0.2.0";
      volumes = [
        "/mnt/fast/apps/immich-db:/var/lib/postgresql/data"
        # Bind mount el secret SOPS-decrypted del host al path que usa
        # POSTGRES_PASSWORD_FILE. Sin esto, el container no ve los
        # secrets del host y postgres falla con "No such file or directory".
        "/run/secrets/immich-postgres-password:/run/secrets/immich-postgres-password:ro"
      ];
      environment = {
        POSTGRES_PASSWORD_FILE = "/run/secrets/immich-postgres-password";
        POSTGRES_USER = "immich";
        POSTGRES_DB = "immich";
      };
      extraOptions = [ "--network=web-network" "--name=immich-postgres" ];
    };

    # ─────────────────────────────────────────────
    # Immich Redis
    # ─────────────────────────────────────────────
    virtualisation.oci-containers.containers.immich-redis = {
      image = "docker.io/library/redis:7-alpine";
      extraOptions = [ "--network=web-network" "--name=immich-redis" ];
    };

    # ─────────────────────────────────────────────
    # Immich Server
    # ─────────────────────────────────────────────
    systemd.services.podman-immich-server = {
      after = [ "zfs.target" "network-online.target" "podman-immich-postgres.service" "create-container-networks.service" ];
      requires = [ "zfs.target" "podman-immich-postgres.service" "create-container-networks.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/data" ];
      };
    };

    virtualisation.oci-containers.containers.immich-server = {
      image = "ghcr.io/immich-app/immich-server:release";
      ports = [ "127.0.0.1:${toString registry.ports.immich}:3001" ];
      volumes = [
        "/mnt/data/immich:/usr/src/app/upload"
        "/run/secrets/immich-postgres-password:/run/secrets/immich-postgres-password:ro"
      ];
      environment = {
        DB_HOSTNAME = "immich-postgres";
        DB_USERNAME = "immich";
        DB_PASSWORD_FILE = "/run/secrets/immich-postgres-password";
        DB_DATABASE_NAME = "immich";
        REDIS_HOSTNAME = "immich-redis";
        IMMICH_IGNORE_MOUNT_CHECK_ERRORS = "true";
        # Acceso público con invitación — inmutable tras primer boot
        IMMICH_PUBLIC_SHARE = if cfg.enablePublicSharing then "true" else "false";
        EXTERNAL_URL = "https://${cfg.domain}";
      };
      dependsOn = [ "immich-postgres" "immich-redis" ];
      extraOptions = [
        "--network=web-network"
        "--name=immich-server"
      ];
    };

    # ─────────────────────────────────────────────
    # Immich Machine Learning
    # ─────────────────────────────────────────────
    virtualisation.oci-containers.containers.immich-ml = {
      image = "ghcr.io/immich-app/immich-machine-learning:release";
      ports = [ "127.0.0.1:${toString registry.ports.immichML}:3003" ];
      volumes = [
        "/run/secrets/immich-postgres-password:/run/secrets/immich-postgres-password:ro"
      ];
      environment = {
        DB_HOSTNAME = "immich-postgres";
        DB_USERNAME = "immich";
        DB_PASSWORD_FILE = "/run/secrets/immich-postgres-password";
        DB_DATABASE_NAME = "immich";
        REDIS_HOSTNAME = "immich-redis";
      };
      dependsOn = [ "immich-postgres" "immich-redis" ];
      extraOptions = [
        "--network=web-network"
        "--name=immich-ml"
      ];
    };

    # ─────────────────────────────────────────────
    # Nginx reverse proxy → Cloudflare Tunnel
    # Solo localhost (no firewall abierto directo)
    # ─────────────────────────────────────────────
    services.nginx.virtualHosts.${cfg.domain} = {
      listen = [ { addr = "127.0.0.1"; port = 80; } ];
      serverName = cfg.domain;

      locations."/" = {
        proxyPass = "http://127.0.0.1:${toString registry.ports.immich}";
        extraConfig = ''
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";

          # Immich uploads pueden ser grandes (fotos + videos)
          client_max_body_size 500m;
          proxy_request_buffering off;

          # Timeouts extendidos para uploads de video
          proxy_connect_timeout 120s;
          proxy_send_timeout 120s;
          proxy_read_timeout 120s;

          # Server-Sent Events (Immich realtime updates)
          proxy_buffering off;
          proxy_cache off;
          gzip off;
          chunked_transfer_encoding on;
        '';
      };
    };

    # Firewall: ya no abrimos puertos directos, todo pasa por Nginx + Cloudflare
  };
}
