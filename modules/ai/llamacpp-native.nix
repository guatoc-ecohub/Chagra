# modules/ai/llamacpp-native.nix
# =============================================================================
# LLAMA.CPP NATIVE — High-performance LLM inference engine (Native server)
# Port: 11435 (OpenAI-compatible)
#
# Migración Phase A (2026-05-11): Ollama → llama.cpp nativo.
# Objetivo: Minimizar overhead de Go daemon y habilitar Flash Attention + 
# Quantized KV cache nativo para maximizar throughput en el Ryzen 4600G.
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.llamacpp-native;
  aiCfg = config.guatoc.ai;
  registry = import ../../lib/registry.nix { inherit lib; };
  
  # Model definition
  modelName = "OLMoE-1B-7B-Instruct-SFT-Q4_K_M.gguf";
  modelUrl = "https://huggingface.co/allenai/OLMoE-1B-7B-Instruct-SFT-GGUF/resolve/main/${modelName}";
  modelPath = "/mnt/fast/appdata/llamacpp/models/${modelName}";
in
{
  options.guatoc.ai.llamacpp-native = {
    enable = lib.mkEnableOption "llama.cpp native server" // {
      default = false;
    };
  };

  config = lib.mkIf (aiCfg.enable && cfg.enable) {
    # Static User/Group for persistence
    users.users.llamacpp = {
      isSystemUser = true;
      group = "llamacpp";
      description = "llama.cpp service user";
      home = "/mnt/fast/appdata/llamacpp";
    };
    users.groups.llamacpp = {};

    # Systemd service for llama.cpp server
    systemd.services.llamacpp-server = {
      description = "llama.cpp native server (OpenAI-compatible API)";
      after = [ "network.target" "local-fs.target" ];
      requires = [ "local-fs.target" ];
      wantedBy = [ "multi-user.target" ];

      serviceConfig = {
        User = "llamacpp";
        Group = "llamacpp";
        Restart = "always";
        RestartSec = "5s";
        WorkingDirectory = "/mnt/fast/appdata/llamacpp";
        RequiresMountsFor = [ "/mnt/fast/appdata" ];

        # Resource limits (Budget DR 2026-05-11)
        MemoryMax = "6.8G";
        CPUWeight = 100;

        # Pre-start: ensure directories and model presence
        ExecStartPre = [
          "+${pkgs.coreutils}/bin/install -d -m 0750 -o llamacpp -g llamacpp /mnt/fast/appdata/llamacpp/models"
          (pkgs.writeShellScript "download-olmoe-if-missing" ''
            if [ ! -f "${modelPath}" ]; then
              echo "Model missing. Downloading OLMoE from Hugging Face..."
              ${pkgs.curl}/bin/curl -L "${modelUrl}" -o "${modelPath}.tmp"
              ${pkgs.coreutils}/bin/mv "${modelPath}.tmp" "${modelPath}"
              ${pkgs.coreutils}/bin/chown llamacpp:llamacpp "${modelPath}"
            fi
          '')
        ];

        # Native flags for Phase A optimization
        ExecStart = "${pkgs.llama-cpp}/bin/llama-server \
          --host 0.0.0.0 \
          --port ${toString registry.ports.llamacpp} \
          --model ${modelPath} \
          --flash-attn \
          --ctk q8_0 \
          --ctv q8_0 \
          --n-gpu-layers 0 \
          --threads 6 \
          --parallel 1 \
          --ctx-size 4096";
      };
    };

    # Firewall: allow port 11435 from loopback (+ Tailscale if needed in hosts)
    networking.firewall.allowedTCPPorts = [ registry.ports.llamacpp ];
  };
}
