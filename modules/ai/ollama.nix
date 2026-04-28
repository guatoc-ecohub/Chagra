# modules/ai/ollama.nix
# =============================================================================
# OLLAMA — Local LLM inference engine (native NixOS service, NO podman)
# Port: 11434
#
# Migración 2026-04-28 desde container podman → service NixOS nativo.
# Razones:
#   - Ryzen 4600G CPU-only inference: podman cgroups + namespace agregan
#     overhead de context-switch (~5-10% throughput menos en benchmarks
#     comparables Llama.cpp + ollama).
#   - Cold-start del container añade ~1-2s sobre el del binario nativo.
#   - `journalctl -u ollama` directo en lugar de `podman logs ollama`,
#     mejor integración con systemd para alertas/healthchecks.
#   - NixOS provee `services.ollama` declarativo de primera clase (incluyendo
#     `loadModels` para provisionamiento idempotente).
#
# Datos preservados: `/mnt/fast/appdata/ollama/models/*` queda intacto. El
# tmpfiles rule chowna a `ollama:ollama` la primera vez (los modelos seguían
# siendo del root del container — owner 0:0).
#
# Consumidores (todos usan 127.0.0.1:11434, NO la red ai-net):
#   - openfang-guatoc (chat fallback + embeddings)
#   - openai-proxy `/v1/embeddings` route
#   - clawbots Open-WebUI (`OLLAMA_API_BASE_URL`)
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.ollama;
  aiCfg = config.guatoc.ai;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.ai.ollama = {
    enable = lib.mkEnableOption "Ollama - Motor de inferencia LLM local (nativo)" // {
      default = false;
    };
  };

  config = lib.mkIf (aiCfg.enable && cfg.enable) {
    # NixOS 26.05 `services.ollama` usa DynamicUser=true por defecto — no
    # crea un user estático en /etc/passwd. Eso rompe nuestro caso porque:
    #   1. `chown ollama:ollama` desde sudo falla con "invalid user".
    #   2. El UID alocado es transient → cambia entre reboots → archivos
    #      en disco quedan con uid huérfano tras restart.
    #   3. Hereencia desde container podman (root:root) en /mnt/fast/appdata/ollama
    #      queda inaccesible para el user dynamic.
    # Solución: forzar user estático "ollama" que vive en /etc/passwd, y
    # hacer chown idempotente en ExecStartPre (post-mount ZFS, garantizado
    # por RequiresMountsFor).
    users.users.ollama = {
      isSystemUser = true;
      group = "ollama";
      description = "Ollama service user (static, NOT DynamicUser)";
      home = "/mnt/fast/appdata/ollama";
    };
    users.groups.ollama = {};

    systemd.services.ollama.serviceConfig = {
      DynamicUser = lib.mkForce false;
      User = lib.mkForce "ollama";
      Group = lib.mkForce "ollama";
      RequiresMountsFor = [ "/mnt/fast/appdata" ];
      # `+` prefix → corre como root (necesario para chown del dir heredado
      # de root:root del container previo). Idempotente: tras el primer run
      # ya está bien, los siguientes son no-op.
      # NO usar systemd.tmpfiles.rules: tmpfiles-setup.service corre ANTES
      # del mount de ZFS /mnt/fast (verificado alpha 2026-04-28: chown se
      # aplica al dir vacío en rootfs, luego ZFS monta encima ocultándolo,
      # y el dir real queda con ownership original).
      ExecStartPre = [
        "+${pkgs.coreutils}/bin/install -d -m 0750 -o ollama -g ollama /mnt/fast/appdata/ollama"
        "+${pkgs.coreutils}/bin/chown -R ollama:ollama /mnt/fast/appdata/ollama"
      ];
    };

    services.ollama = {
      enable = true;

      # Bind a todas las interfaces para que clawbots, openfang, openai-proxy
      # alcancen via 127.0.0.1 desde el host. NO se expone al LAN: el firewall
      # solo permite el puerto desde loopback.
      host = "0.0.0.0";
      port = registry.ports.ollama;

      # Datos en ZFS tank-fast (preserva los modelos del container previo).
      home = "/mnt/fast/appdata/ollama";
      models = "/mnt/fast/appdata/ollama/models";

      # Inference CPU-only en Ryzen 4600G (Vega iGPU sin ROCm production support).
      # NixOS 26.05 deprecó `acceleration = false` — ahora se elige el package.
      # Si en el futuro se añade GPU discreta NVIDIA cambiar a `pkgs.ollama-cuda`,
      # o `pkgs.ollama-rocm` si el iGPU Vega habilita ROCm de manera estable.
      package = pkgs.ollama-cpu;

      # Modelos provisionados declarativamente — pull idempotente al activar.
      # gemma3:4b — visión multimodal (foto plantas vía Telegram).
      # qwen3.5:4b — chat/tool-use fallback de OpenFang cuando z.ai no responde.
      # nomic-embed-text — embeddings para memoria semántica de OpenFang.
      loadModels = [
        "gemma3:4b"
        "qwen3.5:4b"
        "nomic-embed-text"
      ];

      # Performance tuning para CPU AVX2 (sin AVX-512).
      environmentVariables = {
        # Optimiza attention con menos reads del KV-cache. ~5-15% tok/s más
        # en benchmarks upstream sobre CPU AVX2.
        OLLAMA_FLASH_ATTENTION = "true";

        # Cuantiza KV-cache f16 → int8. Reduce ~50% RAM del cache → contextos
        # ~2x más largos con el mismo footprint. <0.5% perplexity delta.
        # Requiere FLASH_ATTENTION=true.
        OLLAMA_KV_CACHE_TYPE = "q8_0";

        # CORS — clientes browser legítimos (Chagra PWA + WebUI Clawbots).
        OLLAMA_ORIGINS = "https://chagra.guatoc.co,http://chagra.guatoc.co,http://192.168.1.100,http://localhost";
      };
    };

    # Firewall: puerto abierto al loopback (clientes en 127.0.0.1) — los
    # consumidores LAN llegan via Cloudflare Tunnel + Nginx, NO directo.
    networking.firewall.allowedTCPPorts = [ registry.ports.ollama ];
  };
}
