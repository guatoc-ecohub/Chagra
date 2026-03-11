# modules/gaming/romm.nix
# =============================================================================
# ROMM — Retro Game ROM Manager
# Puerto: 8087
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.gaming.romm;
  gamingCfg = config.guatoc.gaming;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.gaming.romm = {
    enable = lib.mkEnableOption "RomM - Retro Game ROM Manager" // {
      default = false;
    };
  };

  config = lib.mkIf (gamingCfg.enable && cfg.enable) {
    systemd.services.podman-romm = {
      after = [ "zfs.target" "network-online.target" ];
      requires = [ "zfs.target" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" "/mnt/data/media" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/romm"
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/data/media/games"
        ];
      };
    };

    virtualisation.oci-containers.containers.romm = {
      image = "romm/romm:latest";
      ports = [ "${toString registry.ports.romm}:8080" ];
      volumes = [
        "/mnt/fast/appdata/romm:/romm/storage/config"
        "/mnt/data/media/games:/romm/storage/roms"
        "/mnt/data/media/games/covers:/romm/storage/covers"
      ];
      environment = {
        TZ = config.time.timeZone;
        ROMM_DB__TYPE = "sqlite";
        # For PostgreSQL, uncomment and configure:
        # ROMM_DB__HOST = "10.88.10.x";
        # ROMM_DB__PORT = "5432";
        # ROMM_DB__NAME = "romm";
        # ROMM_DB__USER = "romm";
        # ROMM_DB__PASS = "changeme";
      };
      extraOptions = [
        "--network=media-net"
        "--name=romm"
        "--restart=unless-stopped"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.romm ];
  };
}
