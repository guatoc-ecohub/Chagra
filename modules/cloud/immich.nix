# modules/cloud/immich.nix
# =============================================================================
# IMMICH — Photos & Videos backup
# Puertos: 2283 (server), 3003 (machine learning)
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.cloud.immich;
  cloudCfg = config.guatoc.cloud;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.cloud.immich = {
    enable = lib.mkEnableOption "Immich - Backup de fotos y videos" // {
      default = false;
    };
  };

  config = lib.mkIf (cloudCfg.enable && cfg.enable) {
    # Immich PostgreSQL
    systemd.services.podman-immich-postgres = {
      after = [ "zfs.target" "network-online.target" "create-container-networks.service" ];  # Wait for networks
      requires = [ "zfs.target" "create-container-networks.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/apps" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/apps/immich-db"
        ];
      };
    };

    virtualisation.oci-containers.containers.immich-postgres = {
      # Pinned 2026-04-20 (era :pg14-v0.2.0).
      image = "docker.io/tensorchord/pgvecto-rs@sha256:739cdd626151ff1f796dc95a6591b55a714f341c737e27f045019ceabf8e8c52";
      volumes = [ "/mnt/fast/apps/immich-db:/var/lib/postgresql/data" ];
      environment = {
        POSTGRES_PASSWORD = "immich";
        POSTGRES_USER = "immich";
        POSTGRES_DB = "immich";
      };
      extraOptions = [ "--network=web-network" "--name=immich-postgres" ];
    };

    # Immich Redis
    virtualisation.oci-containers.containers.immich-redis = {
      # Pinned 2026-04-20 (era :6.2-alpine).
      image = "docker.io/library/redis@sha256:46884be93652d02a96a176ccf173d1040bef365c5706aa7b6a1931caec8bfeef";
      extraOptions = [ "--network=web-network" "--name=immich-redis" ];
    };

    # Immich Server
    systemd.services.podman-immich-server = {
      after = [ "zfs.target" "network-online.target" "podman-immich-postgres.service" "create-container-networks.service" ];
      requires = [ "zfs.target" "podman-immich-postgres.service" "create-container-networks.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/data" ];
      };
    };

    virtualisation.oci-containers.containers.immich-server = {
      # Pinned 2026-04-20 (era :release).
      image = "ghcr.io/immich-app/immich-server@sha256:aa163d2e1cc2b16a9515dd1fef901e6f5231befad7024f093d7be1f2da14341a";
      ports = [ "${toString registry.ports.immich}:3001" ];
      volumes = [ "/mnt/data/immich:/usr/src/app/upload" ];
      environment = {
        DB_HOSTNAME = "immich-postgres";
        DB_USERNAME = "immich";
        DB_PASSWORD = "immich";
        DB_DATABASE_NAME = "immich";
        REDIS_HOSTNAME = "immich-redis";
      };
      dependsOn = [ "immich-postgres" "immich-redis" ];
      extraOptions = [
        "--network=web-network"
        "--name=immich-server"
      ];
    };

    # Immich Machine Learning
    virtualisation.oci-containers.containers.immich-ml = {
      # Pinned 2026-04-20 (era :release).
      image = "ghcr.io/immich-app/immich-machine-learning@sha256:b213fa3c82d27a21a299c46ffbb38a091f18384db1ad67d409a3b34fe0fce556";
      ports = [ "${toString registry.ports.immichML}:3003" ];
      environment = {
        DB_HOSTNAME = "immich-postgres";
        DB_USERNAME = "immich";
        DB_PASSWORD = "immich";
        DB_DATABASE_NAME = "immich";
        REDIS_HOSTNAME = "immich-redis";
      };
      dependsOn = [ "immich-postgres" "immich-redis" ];
      extraOptions = [
        "--network=web-network"
        "--name=immich-ml"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.immich registry.ports.immichML ];
  };
}
