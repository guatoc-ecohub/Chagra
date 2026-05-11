# modules/ai/default.nix
# =============================================================================
# AI DOMAIN — Local AI Services
# Includes: Ollama, Whisper, Piper
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  imports = [
    ./ollama.nix
    ./whisper.nix
    ./whisper-http.nix
    ./whisper-openai.nix
    ./piper.nix
    ./kokoro-tts.nix
    ./clawbots.nix
    ./openfang.nix
    ./claude-code-runner.nix
    ./litellm-proxy.nix
  ];

  # ============================================
  # OPTIONS: Feature toggles for the domain
  # ============================================
  options.guatoc.ai = {
    enable = lib.mkEnableOption "AI - Local AI services" // {
      default = false;
    };
    
    # Submodules handle their own enable options
    # ollama, whisper, piper defined in their respective files
  };

  # ============================================
  # CONFIG: Apply when ai.enable = true
  # ============================================
  config = lib.mkIf cfg.enable {
    # Note: User/group creation is handled by the legacy modules/ai.nix
    
    # Create Podman network for AI
    systemd.services.podman-create-ai-net = {
      description = "Crear red Podman ai-net";
      wantedBy = [ "multi-user.target" ];
      before = [
        "podman-ollama.service"
        "podman-wyoming-whisper.service"
        "podman-whisper-http.service"
        "podman-wyoming-piper.service"
      ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        ExecStart = "${pkgs.podman}/bin/podman network create --ignore ai-net";
      };
    };
    
    # Create base directories (legacy modules also define these)
    # systemd.tmpfiles.rules is handled by legacy modules/ai.nix
  };
}
