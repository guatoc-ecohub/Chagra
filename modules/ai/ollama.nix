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
      # Pin por digest — inmutable. Antes "ollama/ollama:latest" causaba drift
      # silencioso en cada pull (ver incidente 2026-04-19 sobre new-engine bug).
      # Para bumpear: `sudo podman pull ollama/ollama:<nuevo-tag>` en staging,
      # verificar, luego reemplazar el digest aqui.
      image = "docker.io/ollama/ollama@sha256:0ff452f6a4c3c5bb4ab063a1db190b261d5834741a519189ed5301d50e4434d1";
      ports = [ "${toString registry.ports.ollama}:${toString registry.ports.ollama}" ];
      volumes = [
        "/mnt/fast/appdata/ollama:/root/.ollama"
      ];
      environment = {
        OLLAMA_HOST = "0.0.0.0:11434";
        OLLAMA_ORIGINS = "https://chagra.guatoc.co,http://chagra.guatoc.co,http://192.168.1.100,http://localhost";
      };
      extraOptions = [
        "--network=ai-net"
        "--name=ollama"
      ];
    };

    # Provisionamiento declarativo de modelos: pull post-arranque (idempotente)
    systemd.services.ollama-model-pull = {
      description = "Pull Ollama models declared for Guatoc";
      after = [ "podman-ollama.service" ];
      requires = [ "podman-ollama.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
      script = ''
        # Espera a que el daemon de Ollama esté disponible
        for i in $(seq 1 30); do
          if ${pkgs.curl}/bin/curl -sf http://127.0.0.1:11434/api/tags >/dev/null; then
            break
          fi
          sleep 2
        done
        # Pull idempotente: Ollama detecta si el modelo ya existe.
        # gemma3:4b — visión multimodal (reemplaza paligemma que crashea el runner)
        # qwen3.5:4b — chat/tool-use para OpenFang fallback
        # nomic-embed-text — embeddings para memoria semantica de OpenFang
        ${pkgs.podman}/bin/podman exec ollama ollama pull gemma3:4b || true
        ${pkgs.podman}/bin/podman exec ollama ollama pull qwen3.5:4b || true
        ${pkgs.podman}/bin/podman exec ollama ollama pull nomic-embed-text || true
      '';
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.ollama ];
  };
}
