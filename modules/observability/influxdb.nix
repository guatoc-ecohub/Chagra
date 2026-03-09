# modules/observability/influxdb.nix
# =============================================================================
# INFLUXDB — Time-series database
# Port: 8086
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.observability.influxdb;
  obsCfg = config.guatoc.observability;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.observability.influxdb = {
    enable = lib.mkEnableOption "InfluxDB - Base de datos de series temporales" // {
      default = false;
    };
  };

  config = lib.mkIf (obsCfg.enable && cfg.enable) {
    systemd.services.podman-influxdb = {
      after = [ "zfs.target" "network-online.target" "podman-create-iot-net.service" ];
      requires = [ "zfs.target" "podman-create-iot-net.service" ];
      serviceConfig = {
        EnvironmentFile = config.sops.secrets."influxdb_env".path;
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/influxdb/data"
          "${pkgs.coreutils}/bin/chown -R 1000:1000 /mnt/fast/appdata/influxdb"
        ];
      };
    };

    virtualisation.oci-containers.containers.influxdb = {
      image = "influxdb:2.7-alpine";
      ports = [ "${toString registry.ports.influxdb}:${toString registry.ports.influxdb}" ];
      volumes = [
        "/mnt/fast/appdata/influxdb/data:/var/lib/influxdb2"
      ];
      environment = {
        DOCKER_INFLUXDB_INIT_ORG = "guatoc";
        DOCKER_INFLUXDB_INIT_BUCKET = "iot";
      };
      extraOptions = [
        "--network=iot-net"
        "--name=influxdb"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.influxdb ];

    # --- DECLARATIVE INFLUXDB CLEANUP (Safe) ---
    # This replaces any manual rm -rf scripts
    # The R scope ensures files older than 7 days in /var/lib/influxdb2/engine/data are cleaned
    # Using systemd-tmpfiles is safer than rm -rf because if the path doesn't exist, it does nothing
    systemd.tmpfiles.rules = [
      # Clean InfluxDB engine temporary files (older than 7 days)
      "R /mnt/fast/appdata/influxdb/data/engine/data 7d - - -"
      # Clean InfluxDB wal (write-ahead log) files older than 3 days
      "R /mnt/fast/appdata/influxdb/data/wal 3d - - -"
    ];
  };
}
