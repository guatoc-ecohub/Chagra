# modules/ai/whisper-openai.nix
# =============================================================================
# WHISPER OpenAI-compat — Speaches container (drop-in para tools nativas
# media_transcribe/speech_to_text de openfang).
#
# Por qué este módulo existe (post-mortem 2026-04-26):
#   openfang 0.5.10 hardcodea audio providers a groq/openai/parakeet-mlx
#   con URLs literales en media_understanding.rs:118-128. NO acepta URL
#   libre, NO lee provider_urls. Cuando OPENAI_API_KEY es la zai key
#   (chat completions), las tools nativas de audio fallan 401 contra
#   api.openai.com.
#
#   Speaches expone /v1/audio/transcriptions OpenAI-compat exacto. Combinado
#   con el openai-proxy local (modules/ai/openai-proxy.nix) que routea
#   /v1/audio/* → speaches, las tools nativas funcionan sin tocar el
#   binario openfang ni el manifest del agente.
#
# Image: ghcr.io/speaches-ai/speaches:latest-cpu
# Port:  10302 (host) -> 8000 (container)
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.whisperOpenai;
  aiCfg = config.guatoc.ai;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.ai.whisperOpenai = {
    enable = lib.mkEnableOption "Whisper OpenAI-compat (speaches container)" // {
      default = false;
    };

    model = lib.mkOption {
      type = lib.types.str;
      default = "Systran/faster-whisper-small";
      example = "Systran/faster-whisper-medium";
      description = ''
        Modelo Faster-Whisper. Recomendaciones:
          - Systran/faster-whisper-tiny    (~39MB, rápido, mediocre español)
          - Systran/faster-whisper-base    (~140MB, balance)
          - Systran/faster-whisper-small   (~244MB, balance recomendado)
          - Systran/faster-whisper-medium  (~764MB, mejor español)
          - Systran/faster-whisper-large-v3 (~1.5GB, mejor calidad, requiere GPU para latencia razonable)
      '';
    };

    inferenceDevice = lib.mkOption {
      type = lib.types.enum [ "cpu" "cuda" "auto" ];
      default = "cpu";
      description = "Backend de inferencia. CPU funciona pero `medium`+ requiere GPU para latencia razonable.";
    };

    computeType = lib.mkOption {
      type = lib.types.str;
      default = "int8";
      description = "Cuantización (int8 para CPU, float16/bfloat16 para GPU).";
    };

    vadEnabled = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Habilitar Silero VAD para cortar silencio (mejora latencia ~50%).";
    };
  };

  config = lib.mkIf (aiCfg.enable && cfg.enable) {
    systemd.services.podman-whisper-openai = {
      after = [ "zfs.target" "network-online.target" "podman-create-ai-net.service" ];
      requires = [ "zfs.target" "podman-create-ai-net.service" ];
      unitConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
      };
      serviceConfig = {
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/whisper-openai"
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/whisper-openai/cache"
          # HF_HUB requiere subdir `hub/` dentro del cache mount; sin él,
          # speaches lanza huggingface_hub.errors.CacheNotFound al primer
          # POST /v1/audio/transcriptions (verificado 2026-04-27 logs alpha).
          # Ownership 1000:1000 = usuario `ubuntu` dentro del container speaches.
          "${pkgs.coreutils}/bin/install -d -m 0755 -o 1000 -g 1000 /mnt/fast/appdata/whisper-openai/cache/hub"
          "${pkgs.coreutils}/bin/chown -R 1000:1000 /mnt/fast/appdata/whisper-openai/cache"
        ];
      };
    };

    virtualisation.oci-containers.containers.whisper-openai = {
      # TODO: pinear SHA tras primer pull exitoso.
      # Build de la imagen: speaches-ai/speaches release reciente cpu variant.
      image = "ghcr.io/speaches-ai/speaches:latest-cpu";
      ports = [ "${toString registry.ports.whisperOpenai}:8000" ];
      volumes = [
        "/mnt/fast/appdata/whisper-openai/cache:/home/ubuntu/.cache/huggingface"
      ];
      environment = {
        WHISPER__MODEL = cfg.model;
        WHISPER__INFERENCE_DEVICE = cfg.inferenceDevice;
        WHISPER__COMPUTE_TYPE = cfg.computeType;
        WHISPER__VAD_PARAMETERS__USE_VAD = if cfg.vadEnabled then "true" else "false";
        UVICORN_HOST = "0.0.0.0";
        UVICORN_PORT = "8000";
      };
      extraOptions = [
        "--network=ai-net"
        "--name=whisper-openai"
      ];
    };
  };
}
