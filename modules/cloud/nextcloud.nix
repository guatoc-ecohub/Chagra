# modules/cloud/nextcloud.nix
# =============================================================================
# NEXTCLOUD — Cloud personal
# Puerto: 8082
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.cloud.nextcloud;
  cloudCfg = config.guatoc.cloud;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.cloud.nextcloud = {
    enable = lib.mkEnableOption "Nextcloud - Cloud personal" // {
      default = false;
    };
  };

  config = lib.mkIf (cloudCfg.enable && cfg.enable) {
    systemd.services.podman-nextcloud = {
      after = [ "zfs.target" "network-online.target" ];
      requires = [ "zfs.target" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" "/mnt/data/media" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/nextcloud"
        ];
      };
    };

    virtualisation.oci-containers.containers.nextcloud = {
      image = "nextcloud:latest";
      ports = [
        "${toString registry.ports.nextcloud}:8080"
      ];
      volumes = [
        "/mnt/data/media/music:/var/www/html/data:rw"
        "/mnt/fast/appdata/nextcloud:/var/www/html/config:rw"
      ];
      environment = {
        TZ = config.time.timeZone;
      };
      extraOptions = [
        "--network=iot-net"
        "--name=nextcloud"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.nextcloud ];
  };
}
