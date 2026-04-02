# modules/agents/picoclaw.nix
# =============================================================================
# PICOCLAW — Telegram AI Agent
# Port: 18790
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.agents.picoclaw;
  agentsCfg = config.guatoc.agents;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.agents.picoclaw = {
    enable = lib.mkEnableOption "Picoclaw - Agente IA de Telegram" // {
      default = false;
    };
  };

  config = lib.mkIf (agentsCfg.enable && cfg.enable) {
    systemd.services.podman-picoclaw = {
      after = [ "zfs.target" "network-online.target" ];
      requires = [ "zfs.target" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
      };
    };

    virtualisation.oci-containers.containers.picoclaw = {
      image = "ghcr.io/sipeed/picoclaw:latest";
      ports = [ "${toString registry.ports.picoclaw}:${toString registry.ports.picoclaw}" ];
      environment = {
        PICOCLAW_TELEGRAM_API_ID = config.sops.secrets.picoclaw_telegram_api_id.path;
        PICOCLAW_TELEGRAM_API_HASH = config.sops.secrets.picoclaw_telegram_api_hash.path;
        PICOCLAW_TELEGRAM_BOT_TOKEN = config.sops.secrets.picoclaw_telegram_bot_token.path;
      };
      extraOptions = [
        "--network=host"
        "--name=picoclaw"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.picoclaw ];
  };
}
