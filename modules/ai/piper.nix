# modules/ai/piper.nix
# =============================================================================
# WYOMING PIPER — Text-to-Speech
# Port: 10200
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.piper;
  aiCfg = config.guatoc.ai;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.ai.piper = {
    enable = lib.mkEnableOption "Wyoming Piper - Text-to-Speech" // {
      default = false;
    };
    
    voice = lib.mkOption {
      type = lib.types.str;
      default = "en_US-lessac-medium";
      description = "Piper voice to use";
    };
  };

  config = lib.mkIf (aiCfg.enable && cfg.enable) {
    systemd.services.podman-wyoming-piper = {
      after = [ "zfs.target" "network-online.target" "podman-create-ai-net.service" ];
      requires = [ "zfs.target" "podman-create-ai-net.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/wyoming-piper"
        ];
      };
    };

    virtualisation.oci-containers.containers.wyoming-piper = {
      # Pinned 2026-04-20 (era :latest).
      image = "docker.io/rhasspy/wyoming-piper@sha256:c874e4a04657ae3381332ee5d0c8c70a310dae6722892840f530ac0890b44eb3";
      ports = [ "${toString registry.ports.piper}:${toString registry.ports.piper}" ];
      volumes = [
        "/mnt/fast/appdata/wyoming-piper:/data"
      ];
      cmd = [
        "--voice" cfg.voice
        "--data-dir" "/data"
        "--uri" "tcp://0.0.0.0:${toString registry.ports.piper}"
        "--download-dir" "/data/voices"
      ];
      extraOptions = [
        "--network=ai-net"
        "--name=wyoming-piper"
      ];
    };
  };
}
