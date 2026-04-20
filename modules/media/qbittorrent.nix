# modules/media/qbittorrent.nix
# =============================================================================
# QBITTORRENT — Cliente BitTorrent
# Puerto: 8083 (del registry)
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.media.qbittorrent;
  mediaCfg = config.guatoc.media;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.media.qbittorrent = {
    enable = lib.mkEnableOption "qBittorrent - Cliente BitTorrent" // {
      default = false;
    };
  };

  config = lib.mkIf (mediaCfg.enable && cfg.enable) {
    # Límites de recursos para qBittorrent (evita saturación de red)
    # Dependencias ZFS para asegurar que los datasets estén montados
    systemd.services.podman-qbittorrent = {
      after = [ "zfs.target" "network-online.target" "podman-create-media-net.service" ];
      requires = [ "zfs.target" "podman-create-media-net.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" mediaCfg.downloadsDir "/mnt/data/media" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/qbittorrent"
          "${pkgs.coreutils}/bin/install -d -m 2775 ${mediaCfg.downloadsDir}"
          "${pkgs.coreutils}/bin/chown -R ${toString registry.uids.media}:${toString registry.gids.media} /mnt/fast/appdata/qbittorrent"
        ];
        # Límites de recursos
        MemoryMax = "2G";
        CPUQuota = "200%";
      };
    };

    # Contenedor OCI - VOLUMEN UNIFICADO /data para compatibilidad con *arr apps
    virtualisation.oci-containers.containers.qbittorrent = {
      # Pinned 2026-04-20 (era :latest).
      image = "lscr.io/linuxserver/qbittorrent@sha256:6a7ffbfff04dd109bff37c474bfee00aa08dea5edb78c670439be3ed242b70fa";
      ports = [
        "${toString registry.ports.qbittorrent}:${toString registry.ports.qbittorrent}"
        "6881:6881"      # Puerto BitTorrent TCP
        "6881:6881/udp"  # Puerto BitTorrent UDP
      ];
      volumes = [
        "/mnt/fast/appdata/qbittorrent:/config"
        "/mnt/data/media:/data"  # Unificado: /data/downloads, /data/music
      ];
      environment = {
        PUID = toString registry.uids.media;
        PGID = toString registry.gids.media;
        TZ = config.time.timeZone;
        WEBUI_PORT = toString registry.ports.qbittorrent;
      };
      extraOptions = [
        "--network=media-net"
        "--name=qbittorrent"
      ];
    };

    networking.firewall = {
      allowedTCPPorts = [ 
        registry.ports.qbittorrent  # Web UI
        6881                         # BitTorrent TCP
      ];
      allowedUDPPorts = [ 
        6881  # BitTorrent UDP
      ];
    };
  };
}
