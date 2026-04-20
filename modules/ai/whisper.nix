# modules/ai/whisper.nix
# =============================================================================
# WYOMING WHISPER — Speech-to-Text
# Port: 10300
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.whisper;
  aiCfg = config.guatoc.ai;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.ai.whisper = {
    enable = lib.mkEnableOption "Wyoming Whisper - Speech-to-Text" // {
      default = false;
    };
    
    model = lib.mkOption {
      type = lib.types.str;
      default = "base";
      description = "Whisper model: tiny, base, small, medium, large";
    };
  };

  config = lib.mkIf (aiCfg.enable && cfg.enable) {
    systemd.services.podman-wyoming-whisper = {
      after = [ "zfs.target" "network-online.target" "podman-create-ai-net.service" ];
      requires = [ "zfs.target" "podman-create-ai-net.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/wyoming-whisper"
        ];
      };
    };

    virtualisation.oci-containers.containers.wyoming-whisper = {
      # Pinned 2026-04-20 (era :latest).
      image = "docker.io/rhasspy/wyoming-whisper@sha256:9501d2659eee83b6eead98d53842193e5fed011eda6c5b1c3ad36f3146b28fed";
      ports = [ "${toString registry.ports.whisper}:${toString registry.ports.whisper}" ];
      volumes = [
        "/mnt/fast/appdata/wyoming-whisper:/data"
      ];
      environment = {
        WHISPER_MODEL = cfg.model;
      };
      extraOptions = [
        "--network=ai-net"
        "--name=wyoming-whisper"
      ];
    };
  };
}
