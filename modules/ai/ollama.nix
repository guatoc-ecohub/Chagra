{ config, lib, pkgs, ... }:

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
    services.ollama = {
      enable = true;
      host = "0.0.0.0";
      environmentVariables = {
        OLLAMA_ORIGINS = "https://farmos.guatoc.co,http://192.168.1.100:8081,http://localhost:8081";
      };
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.ollama ];
  };
}
