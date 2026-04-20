# modules/agriculture/postgres-farm.nix
# =============================================================================
# POSTGRES-FARM — PostgreSQL para FarmOS
# Puerto: 5432
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.agriculture.postgresFarm;
  agrCfg = config.guatoc.agriculture;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.agriculture.postgresFarm = {
    enable = lib.mkEnableOption "PostgreSQL - Base de datos para FarmOS" // {
      default = false;
    };
  };

  config = lib.mkIf (agrCfg.enable && cfg.enable) {
    systemd.services.podman-postgres-farm = {
      after = [ "zfs.target" "network-online.target" ];
      requires = [ "zfs.target" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/postgres-farm"
          "${pkgs.coreutils}/bin/chown -R 999:999 /mnt/fast/appdata/postgres-farm"
        ];
      };
    };

    virtualisation.oci-containers.containers.postgres-farm = {
      # Pinned 2026-04-20 (era :15-alpine).
      image = "docker.io/library/postgres@sha256:fceb6f86328c36f2438fae3b851b0cc57c4a7e69a58c866d9ce24281f2cf0c9c";
      ports = [ "${toString registry.ports.postgresFarm}:${toString registry.ports.postgresFarm}" ];
      volumes = [ "/mnt/fast/appdata/postgres-farm:/var/lib/postgresql/data" ];
      environment = {
        POSTGRES_DB = "farmos";
        POSTGRES_USER = "farmos";
        POSTGRES_PASSWORD = "changeme";  # TODO: usar sops-nix
      };
      extraOptions = [ "--network=iot-net" "--name=postgres-farm" ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.postgresFarm ];
  };
}
