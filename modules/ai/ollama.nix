# modules/ai/ollama.nix
# =============================================================================
# OLLAMA — Local LLM inference engine
# Port: 11434
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.ollama;
  aiCfg = config.guatoc.ai;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.ai.ollama = {
    enable = lib.mkEnableOption "Ollama - Motor de inferencia LLM local" // {
      default = false;
    };
  };

  config = lib.mkIf (aiCfg.enable && cfg.enable) {
    systemd.services.podman-ollama = {
      after = [ "zfs.target" "network-online.target" "podman-create-ai-net.service" ];
      requires = [ "zfs.target" "podman-create-ai-net.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/ollama"
        ];
      };
    };

    virtualisation.oci-containers.containers.ollama = {
      image = "ollama/ollama:latest";
      ports = [ "${toString registry.ports.ollama}:${toString registry.ports.ollama}" ];
      volumes = [
        "/mnt/fast/appdata/ollama:/root/.ollama"
      ];
      extraOptions = [
        "--network=ai-net"
        "--name=ollama"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.ollama ];
  };
}
