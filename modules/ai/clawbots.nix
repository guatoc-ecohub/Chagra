# modules/ai/clawbots.nix
# =============================================================================
# CLAWBOTS — Multi-Tenant AI Agent Spokes (Hub & Spoke Architecture)
# 
# Each tenant gets an isolated container with:
# - Unique volume at /tank-fast/appdata/clawbots/${name}/workspace
# - Environment variables pointing to shared Hub services
# - Dedicated port for WebUI/API access
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.clawbots;
  aiCfg = config.guatoc.ai;
  registry = import ../../lib/registry.nix { inherit lib; };
  
  # Helper to calculate port for each instance
  getPort = name: idx: registry.ports.clawbots.base + idx;
  
  # All clawbot instances as a list for iteration
  clawbotInstances = lib.mapAttrsToList (name: instanceConfig: {
    inherit name;
    config = instanceConfig;
  }) cfg.instances;
in
{
  options.guatoc.ai.clawbots = {
    enable = lib.mkEnableOption "ClawBots - Multi-tenant AI agents" // {
      default = false;
    };
    
    instances = lib.mkOption {
      description = "Attrset of ClawBot instances. Each instance gets isolated volume and port.";
      type = lib.types.attrsOf (lib.types.submodule ({ name, ... }: {
        options = {
          port = lib.mkOption {
            description = "Port for this ClawBot instance";
            type = lib.types.port;
            default = 8090 + lib.concatLists (lib.mapAttrsToList (n: _: 1) cfg.instances);
          };
          model = lib.mkOption {
            description = "Default LLM model to use";
            type = lib.types.str;
            default = "llama3.2";
          };
        };
      }));
      default = {};
      example = lib.literalExpression ''
        {
          andres = { port = 8090; };
          amigo1 = { port = 8091; };
        }
      '';
    };
  };

  config = lib.mkIf (aiCfg.enable && cfg.enable) {
    # Create tmpfiles for all clawbot workspaces
    systemd.tmpfiles.rules = lib.mapAttrsToList (name: _:
      "d /mnt/fast/appdata/clawbots/${name} 0750 root root -"
    ) cfg.instances;
    
    # Generate Podman containers for each instance
    virtualisation.oci-containers.containers = lib.mapAttrs' (name: instanceConfig:
      let
        idx = lib.findIndex (i: i.name == name) clawbotInstances;
        port = if instanceConfig ? port then instanceConfig.port 
               else registry.ports.clawbots.base + idx;
      in
      lib.nameValuePair "clawbot-${name}" {
        # Pinned 2026-04-20 (era :main).
        image = "ghcr.io/open-webui/open-webui@sha256:b80a96e14bb15ea79aec96fbdad4aeab6b3ee7b61520d83b5dbc8c4f47d433a9";
        ports = [
          "${toString port}:8080"
        ];
        volumes = [
          "/mnt/fast/appdata/clawbots/${name}/workspace:/home/webui"
        ];
        environment = {
          # Hub services - shared inference backend
          OLLAMA_API_BASE_URL = "http://127.0.0.1:${toString registry.ports.ollama}";
          WHISPER_API_URL = "http://127.0.0.1:${toString registry.ports.whisper}";
          PIPER_API_URL = "http://127.0.0.1:${toString registry.ports.piper}";
          
          # WebUI configuration
          WEBUI_SECRET_KEY = "changeme-${name}";  # Should use SOPS in production
          DEFAULT_MODEL = instanceConfig.model or "llama3.2";
        };
        extraOptions = [
          "--network=ai-net"
          "--name=clawbot-${name}"
        ];
      }
    ) cfg.instances;
    
    # Firewall: Allow access to clawbot ports from local network
    networking.firewall.allowedTCPPorts = lib.mapAttrsToList (name: instanceConfig:
      let
        idx = lib.findIndex (i: i.name == name) clawbotInstances;
      in
      if instanceConfig ? port then instanceConfig.port 
      else registry.ports.clawbots.base + idx
    ) cfg.instances;
  };
}
