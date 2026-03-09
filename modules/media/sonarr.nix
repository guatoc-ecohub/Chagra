# modules/media/sonarr.nix
# =============================================================================
# SONARR — Gestión de biblioteca de series
# Puerto: 8989 (del registry)
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.media.sonarr;
  mediaCfg = config.guatoc.media;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.media.sonarr = {
    enable = lib.mkEnableOption "Sonarr - Gestión de biblioteca de series" // {
      default = false;
    };
  };

  config = lib.mkIf (mediaCfg.enable && cfg.enable) {
    # Dependencias ZFS para asegurar que los datasets estén montados
    systemd.services.podman-sonarr = {
      after = [ "zfs.target" "network-online.target" "podman-create-media-net.service" ];
      requires = [ "zfs.target" "podman-create-media-net.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" mediaCfg.tvDir mediaCfg.downloadsDir "/mnt/data/media" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/sonarr"
          "${pkgs.coreutils}/bin/install -d -m 2775 ${mediaCfg.tvDir}"
          "${pkgs.coreutils}/bin/install -d -m 2775 ${mediaCfg.downloadsDir}"
          "${pkgs.coreutils}/bin/chown -R ${toString registry.uids.media}:${toString registry.gids.media} /mnt/fast/appdata/sonarr"
        ];
      };
    };

    # Contenedor OCI - VOLUMEN UNIFICADO /data para compatibilidad con *arr apps
    virtualisation.oci-containers.containers.sonarr = {
      image = "lscr.io/linuxserver/sonarr:latest";
      ports = [ "${toString registry.ports.sonarr}:${toString registry.ports.sonarr}" ];
      volumes = [
        "/mnt/fast/appdata/sonarr:/config"
        "/mnt/data/media:/data"  # Unificado: /data/tv, /data/downloads
      ];
      environment = {
        PUID = toString registry.uids.media;
        PGID = toString registry.gids.media;
        TZ = config.time.timeZone;
      };
      extraOptions = [
        "--network=media-net"
        "--name=sonarr"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.sonarr ];
  };
}
