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
      after = [ "zfs.target" "network-online.target" ];
      requires = [ "zfs.target" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/apps" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/apps/immich-db"
        ];
      };
    };

    virtualisation.oci-containers.containers.immich-postgres = {
      image = "tensorchord/pgvecto-rs:pg14-v0.2.0";
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
      image = "redis:6.2-alpine";
      extraOptions = [ "--network=web-network" "--name=immich-redis" ];
    };

    # Immich Server
    systemd.services.podman-immich-server = {
      after = [ "zfs.target" "network-online.target" "podman-immich-postgres.service" ];
      requires = [ "zfs.target" "podman-immich-postgres.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/data" ];
      };
    };

    virtualisation.oci-containers.containers.immich-server = {
      image = "ghcr.io/immich-app/immich-server:release";
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
      image = "ghcr.io/immich-app/immich-machine-learning:release";
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
