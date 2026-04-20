# modules/media/lidarr.nix
# =============================================================================
# LIDARR — Gestión de biblioteca musical
# Puerto: 8686 (del registry)
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.media.lidarr;
  mediaCfg = config.guatoc.media;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.media.lidarr = {
    enable = lib.mkEnableOption "Lidarr - Gestión de biblioteca musical" // {
      default = false;
    };
  };

  config = lib.mkIf (mediaCfg.enable && cfg.enable) {
    # Preparar directorios con dependencias ZFS
    systemd.services.podman-lidarr = {
      after = [ "zfs.target" "network-online.target" "podman-create-media-net.service" ];
      requires = [ "zfs.target" "podman-create-media-net.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" mediaCfg.musicDir mediaCfg.downloadsDir "/mnt/data/media" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/lidarr"
          "${pkgs.coreutils}/bin/install -d -m 2775 ${mediaCfg.musicDir}"
          "${pkgs.coreutils}/bin/install -d -m 2775 ${mediaCfg.downloadsDir}"
          "${pkgs.coreutils}/bin/chown -R ${toString registry.uids.media}:${toString registry.gids.media} /mnt/fast/appdata/lidarr"
        ];
      };
    };

    # Contenedor OCI - VOLUMEN UNIFICADO /data para compatibilidad con *arr apps
    virtualisation.oci-containers.containers.lidarr = {
      # Pinned 2026-04-20 (era :latest).
      image = "lscr.io/linuxserver/lidarr@sha256:58f149df604246d7039a4c8b99ab1fefd1c4ae625048c76f3b956f2e0fb9774b";
      ports = [ "${toString registry.ports.lidarr}:${toString registry.ports.lidarr}" ];
      volumes = [
        "/mnt/fast/appdata/lidarr:/config"
        "/mnt/data/media:/data"  # Unificado: /data/music, /data/downloads
      ];
      environment = {
        PUID = toString registry.uids.media;
        PGID = toString registry.gids.media;
        TZ = config.time.timeZone;
      };
      extraOptions = [
        "--network=media-net"
        "--name=lidarr"
      ];
    };

    # Firewall
    networking.firewall.allowedTCPPorts = [ registry.ports.lidarr ];
  };
}
