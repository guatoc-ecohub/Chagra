# modules/media/slskd.nix
# =============================================================================
# SLSKD — Cliente P2P Soulseek
# Puertos: 5030 (WebUI), 5031 (P2P TCP/UDP)
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.media.slskd;
  mediaCfg = config.guatoc.media;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.media.slskd = {
    enable = lib.mkEnableOption "slskd - Cliente P2P de música Soulseek" // {
      default = false;
    };
  };

  config = lib.mkIf (mediaCfg.enable && cfg.enable) {
    # Dependencias ZFS para asegurar que los datasets estén montados
    systemd.services.podman-slskd = {
      after = [ "zfs.target" "network-online.target" "podman-create-media-net.service" ];
      requires = [ "zfs.target" "podman-create-media-net.service" ];
      serviceConfig = {
        EnvironmentFile = config.sops.secrets."slskd_env".path;
        RequiresMountsFor = [ "/mnt/fast/appdata" "/mnt/data/media" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/slskd"
          "${pkgs.coreutils}/bin/install -d -m 2775 /mnt/data/media/downloads/slskd"
          "${pkgs.coreutils}/bin/chown -R ${toString registry.uids.media}:${toString registry.gids.media} /mnt/fast/appdata/slskd"
        ];
      };
    };

    # Contenedor OCI - VOLUMEN UNIFICADO /data para compatibilidad
    virtualisation.oci-containers.containers.slskd = {
      # Pinned 2026-04-20 (era :latest).
      image = "docker.io/slskd/slskd@sha256:17ef977563be206f3b5932080b1e23883b2cb39dc9010640f6f39b4eaec887e3";
      ports = [
        "${toString registry.ports.slskd}:${toString registry.ports.slskd}"  # WebUI
        "${toString registry.ports.slskdP2P}:${toString registry.ports.slskdP2P}"  # P2P
      ];
      volumes = [
        "/mnt/fast/appdata/slskd:/app"      # DB + config en SSD
        "/mnt/data/media:/data"              # Volumen unificado HDD
      ];
      environment = {
        PUID = toString registry.uids.media;
        PGID = toString registry.gids.media;
        TZ = config.time.timeZone;
        SLSKD_REMOTE_CONFIGURATION = "true";
        SLSKD_DOWNLOADS_DIR = "/data/downloads/slskd";
        SLSKD_INCOMPLETE_DIR = "/data/downloads/slskd/.incomplete";
      };
      extraOptions = [
        "--network=media-net"
        "--name=slskd"
      ];
    };

    # Firewall - puertos para acceso LAN
    networking.firewall = {
      allowedTCPPorts = [ registry.ports.slskd registry.ports.slskdP2P ];
      allowedUDPPorts = [ registry.ports.slskdP2P ];
    };
  };
}
