# modules/media/prowlarr.nix
# =============================================================================
# PROWLARR — Gestor de indexadores
# Puerto: 9696 (del registry)
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.media.prowlarr;
  mediaCfg = config.guatoc.media;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.media.prowlarr = {
    enable = lib.mkEnableOption "Prowlarr - Gestor de indexadores" // {
      default = false;
    };
  };

  config = lib.mkIf (mediaCfg.enable && cfg.enable) {
    # Dependencias ZFS para asegurar que los datasets estén montados
    systemd.services.podman-prowlarr = {
      after = [ "zfs.target" "network-online.target" "podman-create-media-net.service" ];
      requires = [ "zfs.target" "podman-create-media-net.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/prowlarr"
          "${pkgs.coreutils}/bin/chown -R ${toString registry.uids.media}:${toString registry.gids.media} /mnt/fast/appdata/prowlarr"
        ];
      };
    };

    virtualisation.oci-containers.containers.prowlarr = {
      # Pinned 2026-04-20 (era :latest).
      image = "lscr.io/linuxserver/prowlarr@sha256:a8fe7b9c502f979146b6d0f22438b825c38e068241bb8a708c473062dffdbb03";
      ports = [ "${toString registry.ports.prowlarr}:${toString registry.ports.prowlarr}" ];
      volumes = [
        "/mnt/fast/appdata/prowlarr:/config"
      ];
      environment = {
        PUID = toString registry.uids.media;
        PGID = toString registry.gids.media;
        TZ = config.time.timeZone;
      };
      extraOptions = [
        "--network=media-net"
        "--name=prowlarr"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.prowlarr ];
  };
}
