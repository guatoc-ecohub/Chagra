# modules/media/radarr.nix
# =============================================================================
# RADARR — Gestión de biblioteca de películas
# Puerto: 7878 (del registry)
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.media.radarr;
  mediaCfg = config.guatoc.media;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.media.radarr = {
    enable = lib.mkEnableOption "Radarr - Gestión de biblioteca de películas" // {
      default = false;
    };
  };

  config = lib.mkIf (mediaCfg.enable && cfg.enable) {
    # Dependencias ZFS para asegurar que los datasets estén montados
    systemd.services.podman-radarr = {
      after = [ "zfs.target" "network-online.target" "podman-create-media-net.service" ];
      requires = [ "zfs.target" "podman-create-media-net.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" mediaCfg.moviesDir mediaCfg.downloadsDir "/mnt/data/media" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/radarr"
          "${pkgs.coreutils}/bin/install -d -m 2775 ${mediaCfg.moviesDir}"
          "${pkgs.coreutils}/bin/install -d -m 2775 ${mediaCfg.downloadsDir}"
          "${pkgs.coreutils}/bin/chown -R ${toString registry.uids.media}:${toString registry.gids.media} /mnt/fast/appdata/radarr"
        ];
      };
    };

    # Contenedor OCI - VOLUMEN UNIFICADO /data para compatibilidad con *arr apps
    virtualisation.oci-containers.containers.radarr = {
      # Pinned 2026-04-20 (era :latest).
      image = "lscr.io/linuxserver/radarr@sha256:ca43905eaf2dd11425efdcfe184892e43806b1ae0a830440c825cecbc2629cfb";
      ports = [ "${toString registry.ports.radarr}:${toString registry.ports.radarr}" ];
      volumes = [
        "/mnt/fast/appdata/radarr:/config"
        "/mnt/data/media:/data"  # Unificado: /data/movies, /data/downloads
      ];
      environment = {
        PUID = toString registry.uids.media;
        PGID = toString registry.gids.media;
        TZ = config.time.timeZone;
      };
      extraOptions = [
        "--network=media-net"
        "--name=radarr"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.radarr ];
  };
}
