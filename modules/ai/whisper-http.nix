# modules/ai/whisper-http.nix
# =============================================================================
# WHISPER HTTP ASR — Speech-to-Text sobre HTTP (multipart/form-data)
# Image: onerahmet/openai-whisper-asr-webservice
# Port:  10301 (host) -> 9000 (container)
#
# Propósito: servir transcripción ASR a la PWA Chagra sobre HTTP con
# endpoint /asr. El servicio Wyoming Whisper (puerto 10300) se mantiene
# dedicado a Home Assistant (protocolo binario Wyoming, incompatible con
# clientes HTTP). SRP: una instancia por contrato de protocolo.
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.whisper-http;
  aiCfg = config.guatoc.ai;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.ai.whisper-http = {
    enable = lib.mkEnableOption "Whisper HTTP ASR (openai-whisper-asr-webservice)" // {
      default = false;
    };

    model = lib.mkOption {
      type = lib.types.str;
      default = "base";
      description = "Whisper model: tiny, base, small, medium, large.";
    };

    engine = lib.mkOption {
      type = lib.types.enum [ "openai_whisper" "faster_whisper" ];
      default = "openai_whisper";
      description = "Backend engine. faster_whisper es ~4x mas rapido en CPU.";
    };
  };

  config = lib.mkIf (aiCfg.enable && cfg.enable) {
    systemd.services.podman-whisper-http = {
      after = [ "zfs.target" "network-online.target" "podman-create-ai-net.service" ];
      requires = [ "zfs.target" "podman-create-ai-net.service" ];
      # RequiresMountsFor pertenece a [Unit], no a [Service]. Usar unitConfig.
      unitConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
      };
      serviceConfig = {
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/whisper-http"
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/whisper-http/whisper"
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/whisper-http/huggingface"
        ];
      };
    };

    virtualisation.oci-containers.containers.whisper-http = {
      image = "onerahmet/openai-whisper-asr-webservice:latest";
      # 10301 (host) -> 9000 (container default de la imagen)
      ports = [ "${toString registry.ports.whisperHttp}:9000" ];
      volumes = [
        # Cache de modelos OpenAI Whisper (.pt files)
        "/mnt/fast/appdata/whisper-http/whisper:/root/.cache/whisper"
        # Cache de modelos Faster-Whisper (HuggingFace hub)
        "/mnt/fast/appdata/whisper-http/huggingface:/root/.cache/huggingface"
      ];
      environment = {
        ASR_MODEL = cfg.model;
        ASR_ENGINE = cfg.engine;
      };
      extraOptions = [
        "--network=ai-net"
        "--name=whisper-http"
      ];
    };
  };
}
