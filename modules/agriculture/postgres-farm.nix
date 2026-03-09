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
      image = "postgres:15-alpine";
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
