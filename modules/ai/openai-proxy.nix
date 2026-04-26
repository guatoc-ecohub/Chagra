# modules/ai/openai-proxy.nix
# =============================================================================
# Proxy local OpenAI-compat: routea por path al backend correcto.
#
#   /v1/embeddings  → Ollama local (nomic-embed-text)
#   /v1/audio/*     → speaches (whisperOpenai), si está habilitado; si no, 503
#   resto (/v1/chat/completions, /v1/models, ...) → z.ai upstream
#
# Detonante (2026-04-26): openfang 0.5.10 no soporta embedding_base_url
# separado en [memory]. Cuando se setea OPENAI_API_KEY=$ZAI_API_KEY +
# OPENAI_BASE_URL=z.ai, los embeddings VAN igual al z.ai endpoint, pero
# el plan Coding sólo expone modelos GLM (chat); cero embeddings →
# error 400 "Unknown Model" o 401 según el modelo solicitado. Esto deja
# al agente sin memoria semántica, crashea el loop cada ~3 min.
#
# Solución: cliente openfang ve un único OPENAI_BASE_URL=
# http://127.0.0.1:10303/v1. El proxy decide a quién hablar según path.
# Z.ai sigue recibiendo el chat completions; embeddings y audio quedan
# locales — coherente con local-first + Ley 1581 + Circular 003 SIC.
#
# IMPORTANTE — pre-requisito de cliente:
#   El config.toml del agente openfang debe declarar
#     [memory]
#     embedding_provider     = "openai"
#     embedding_model        = "nomic-embed-text"
#     embedding_api_key_env  = "OPENAI_API_KEY"
#   El proxy ignora el header Authorization en /v1/embeddings (Ollama no
#   requiere auth). El "OPENAI_API_KEY" del cliente puede ser cualquier
#   string no vacía; en la práctica reusamos el ZAI_API_KEY.
# =============================================================================

{ config, pkgs, lib, ... }:

let
  registry = import ../../lib/registry.nix { inherit lib; };
  cfg = config.guatoc.ai.openaiProxy;
in
{
  options.guatoc.ai.openaiProxy = {
    enable = lib.mkEnableOption "Proxy local OpenAI-compat (path-routing a Ollama / speaches / z.ai)";

    upstream = lib.mkOption {
      type = lib.types.str;
      default = "https://api.z.ai/api/coding/paas/v4";
      example = "https://api.openai.com/v1";
      description = "URL upstream para todo lo que NO es /v1/embeddings ni /v1/audio. Por defecto z.ai Coding Plan v4.";
    };

    ollamaPort = lib.mkOption {
      type = lib.types.port;
      default = registry.ports.ollama;
      description = "Puerto local de Ollama OpenAI-compat (/v1/embeddings).";
    };

    speachesPort = lib.mkOption {
      type = lib.types.port;
      default = registry.ports.whisperOpenai;
      description = "Puerto local de speaches (whisper OpenAI-compat) para /v1/audio/*. Sólo se usa si speaches está enabled.";
    };

    enableAudioRoute = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = ''
        Si true, /v1/audio/* enruta a speaches en speachesPort (asume el
        servicio guatoc.ai.whisperOpenai está enabled).
        Si false, /v1/audio/* devuelve 503 — útil mientras la pieza
        speaches no está desplegada (desbloquea embeddings sin esperar
        a que se complete la Opción D voz).
      '';
    };

    listenAddr = lib.mkOption {
      type = lib.types.str;
      default = "127.0.0.1";
      description = "Dirección de escucha. Quédate en localhost; el proxy NO debe ser accesible vía LAN.";
    };
  };

  config = lib.mkIf cfg.enable {
    services.nginx.enable = lib.mkDefault true;

    services.nginx.virtualHosts."openai-proxy-local" = {
      listen = [
        { addr = cfg.listenAddr; port = registry.ports.openaiProxy; ssl = false; }
      ];
      # No serverName explícito; aplica por listen 127.0.0.1:10303.
      extraConfig = ''
        # Proxy buffers ajustados — los embeddings + chat completions de
        # openfang generan respuestas largas con SSE/streaming.
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_http_version 1.1;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        client_max_body_size 32M;

        # Por defecto, NO añadir CORS — el cliente es openfang local en
        # alpha, no un browser. Si en el futuro un browser PWA llama
        # directo, agregar Access-Control-* aquí.
      '';

      locations = {
        # ---- /v1/embeddings → Ollama local ----
        "= /v1/embeddings" = {
          proxyPass = "http://127.0.0.1:${toString cfg.ollamaPort}/v1/embeddings";
          extraConfig = ''
            # Ollama no requiere auth. Limpiamos el Authorization para
            # evitar filtrar la ZAI_API_KEY a Ollama (que la loguea).
            proxy_set_header Authorization "";
            proxy_set_header Host 127.0.0.1:${toString cfg.ollamaPort};
            proxy_set_header X-Forwarded-Proto $scheme;
          '';
        };

        # ---- /v1/audio/* (transcripciones y traducciones) ----
      } // (if cfg.enableAudioRoute then {
        "~ ^/v1/audio/" = {
          proxyPass = "http://127.0.0.1:${toString cfg.speachesPort}";
          extraConfig = ''
            proxy_set_header Authorization $http_authorization;
            proxy_set_header Host 127.0.0.1:${toString cfg.speachesPort};
            client_max_body_size 25M;
          '';
        };
      } else {
        "~ ^/v1/audio/" = {
          extraConfig = ''
            return 503 '{"error":{"code":"audio_route_disabled","message":"openai-proxy-local: /v1/audio routing is disabled. Enable guatoc.ai.openaiProxy.enableAudioRoute and deploy speaches (whisperOpenai)."}}';
            add_header Content-Type application/json always;
          '';
        };
      }) // {
        # ---- Resto → z.ai upstream ----
        "/" = {
          proxyPass = cfg.upstream;
          extraConfig = ''
            # SNI explícito porque proxy_pass apunta a https.
            proxy_ssl_server_name on;
            proxy_set_header Host api.z.ai;
            proxy_set_header Authorization $http_authorization;
            # Permitir SSE / streaming de chat completions.
            proxy_buffering off;
          '';
        };
      };
    };

    # Asegurar que el firewall permita Ollama desde host (loopback ya
    # implícito); abrir nada al LAN.
    networking.firewall.allowedTCPPorts = lib.mkIf false [
      # NO abrir 10303 al LAN. Sólo loopback. Esta línea es placeholder.
    ];

    # Asserts defensivos.
    assertions = [
      {
        assertion = cfg.upstream != "";
        message = "guatoc.ai.openaiProxy.upstream no puede ser vacío.";
      }
      {
        assertion = !cfg.enableAudioRoute || cfg.speachesPort != cfg.ollamaPort;
        message = ''
          enableAudioRoute=true exige speachesPort != ollamaPort. Actualmente:
          speachesPort=${toString cfg.speachesPort}, ollamaPort=${toString cfg.ollamaPort}.
        '';
      }
    ];
  };
}
