# modules/agriculture/farmos.nix
# =============================================================================
# FARMOS — Gestión agrícola
# Puerto: 8081
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.agriculture.farmos;
  agrCfg = config.guatoc.agriculture;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.agriculture.farmos = {
    enable = lib.mkEnableOption "FarmOS - Gestión agrícola" // {
      default = false;
    };
  };

  config = lib.mkIf (agrCfg.enable && cfg.enable) {
    systemd.services.podman-farmos = {
      after = [ "zfs.target" "network-online.target" "podman-postgres-farm.service" ];
      requires = [ "zfs.target" "podman-postgres-farm.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/farmos"
          "${pkgs.coreutils}/bin/chown -R 33:33 /mnt/fast/appdata/farmos"
        ];
      };
    };

    virtualisation.oci-containers.containers.farmos = {
      image = "farmos/farmos:3.x";
      ports = [ "${toString registry.ports.farmos}:80" ];
      volumes = [
        "/mnt/fast/appdata/farmos:/opt/drupal/web/sites"
      ];
      environment = {
        TZ = config.time.timeZone;
        # PostgreSQL external database connection
        DRUPAL_DB_DRIVER = "pgsql";
        DRUPAL_DB_HOST = "postgres-farm";
        DRUPAL_DB_PORT = "5432";
        DRUPAL_DB_NAME = "farmos";
        DRUPAL_DB_USER = "farmos";
        DRUPAL_DB_PASSWORD = "changeme";  # TODO: migrate to sops-nix
      };
      extraOptions = [
        "--network=iot-net"
        "--name=farmos"
        "--hostname=farmos"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.farmos ];
  };
}
