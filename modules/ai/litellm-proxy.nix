# modules/ai/litellm-proxy.nix
# =============================================================================
# LiteLLM Proxy — backup Anthropic-compatible para Claude Code CLI personal.
#
# Detonante (2026-05-02): Lili field test agotó saldo del plan Pro Claude
# personal del operador. Para no depender de un solo proveedor (Anthropic
# rate-limits + costos), exponemos un proxy local que:
#   - Acepta requests en formato Anthropic API (`/v1/messages`)
#   - Routea primario a z.ai (GLM Coding Plan) — operador ya tiene cuenta
#     activa con saldo, secret SOPS `openfang-zai-env` ya provisionado
#   - Fallback a Ollama local (qwen2.5-coder:7b) si z.ai falla
#
# Uso desde la CLI Claude Code en stg / mac personal:
#   export ANTHROPIC_BASE_URL="http://alpha:4000"
#   export ANTHROPIC_API_KEY="sk-litellm-anything"  # bypass; auth real es ZAI
#   claude  # arranca con backend GLM-4.6, fallback Ollama
#
# Diferencia con `openai-proxy.nix`:
#   - `openai-proxy.nix` es Nginx puro, formato OpenAI-compat únicamente,
#     usado por openfang agent (que habla OpenAI).
#   - Este módulo es LiteLLM (Python proxy) que SÍ traduce Anthropic↔OpenAI
#     formato y soporta routing/fallback declarativo. No reemplaza al
#     openai-proxy: corren en puertos distintos, atienden clientes distintos.
#
# Aislación:
#   - Listen 127.0.0.1 + Tailscale interno (NO LAN, NO Internet).
#   - DynamicUser systemd para reducir blast radius.
#   - Read-only del file system salvo /var/lib/litellm-proxy logs.
#
# Pre-requisitos:
#   1. SOPS secret `openfang-zai-env` (ya existe — formato KEY=VALUE
#      con ZAI_API_KEY=...).
#   2. Ollama corriendo localmente con `qwen2.5-coder:7b` pulled
#      (verificable: `ollama list`).
#   3. `pkgs.python3Packages.litellm` disponible en nixpkgs (testing
#      pendiente — si falla, ver opción overlay en final del archivo).
# =============================================================================

{ config, pkgs, lib, ... }:

let
  registry = import ../../lib/registry.nix { inherit lib; };
  cfg = config.guatoc.ai.litellmProxy;

  # Config YAML para LiteLLM proxy. Usa env vars os.environ/* para evitar
  # filtrar secretos al store Nix (paths /nix/store son world-readable).
  litellmConfig = pkgs.writeText "litellm-config.yaml" ''
    model_list:
      # ─────────────────────────────────────────
      # Primario: z.ai GLM Coding Plan
      # ─────────────────────────────────────────
      - model_name: claude-opus-4-7
        litellm_params:
          model: openai/glm-4.6
          api_base: ${cfg.zaiUpstream}
          api_key: os.environ/ZAI_API_KEY
          timeout: 600

      - model_name: claude-sonnet-4-6
        litellm_params:
          model: openai/glm-4.6
          api_base: ${cfg.zaiUpstream}
          api_key: os.environ/ZAI_API_KEY
          timeout: 600

      - model_name: claude-haiku-4-5
        litellm_params:
          model: openai/glm-4.5-air
          api_base: ${cfg.zaiUpstream}
          api_key: os.environ/ZAI_API_KEY
          timeout: 600

      # ─────────────────────────────────────────
      # Fallback: Ollama local
      # Activado vía router_settings.fallbacks cuando z.ai falla
      # ─────────────────────────────────────────
      - model_name: ollama-fallback
        litellm_params:
          model: ollama/${cfg.ollamaFallbackModel}
          api_base: http://localhost:${toString registry.ports.ollama}
          timeout: 300

    router_settings:
      routing_strategy: simple-shuffle
      # Si z.ai falla (timeout, 5xx, rate-limit), cae a Ollama local.
      # Ollama no tiene la calidad de GLM-4.6 pero garantiza disponibilidad
      # y es offline. Operador ve respuesta degradada en lugar de error.
      fallbacks:
        - claude-opus-4-7: ["ollama-fallback"]
        - claude-sonnet-4-6: ["ollama-fallback"]
        - claude-haiku-4-5: ["ollama-fallback"]
      num_retries: 2
      timeout: 30  # segundos antes de probar fallback

    litellm_settings:
      # Drop params no soportados por backends destino (ej. anthropic-only fields)
      drop_params: true
      set_verbose: false
      # Anthropic adapter expone /anthropic/v1/messages además de OpenAI nativo
      # /v1/chat/completions. Claude Code CLI golpea /anthropic/v1/messages
      # cuando ANTHROPIC_BASE_URL apunta a este proxy.
      callbacks: []
      cache: false  # evita cachear secrets/PII por error

    general_settings:
      # Bypass auth — el proxy NO valida API keys del cliente. Auth real
      # se hace en la conexión upstream con ZAI_API_KEY (env var).
      # Esto está OK porque el proxy escucha SOLO en 127.0.0.1 + Tailscale.
      master_key: os.environ/LITELLM_MASTER_KEY
      database_connection_pool_limit: 10
  '';

in {
  options.guatoc.ai.litellmProxy = {
    enable = lib.mkEnableOption "LiteLLM proxy local — backup Anthropic-compat para Claude Code CLI";

    listenAddr = lib.mkOption {
      type = lib.types.str;
      default = "127.0.0.1";
      description = ''
        Dirección de escucha. Por defecto solo localhost. Cambiar a Tailscale
        IP si necesitas usarlo desde stg vía VPN. NUNCA exponer al LAN.
      '';
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 4000;
      description = ''
        Puerto LiteLLM. 4000 es default upstream; cambiar solo si colisiona.
        Registry: añadir como `litellmProxy = 4000;` en lib/registry.nix.
      '';
    };

    zaiUpstream = lib.mkOption {
      type = lib.types.str;
      default = "https://api.z.ai/api/coding/paas/v4";
      description = ''
        URL z.ai Coding Plan v4 (GLM-4.6 + GLM-4.5-air). Cambia a
        `https://api.z.ai/api/paas/v4` si pasas a plan API estándar (sin
        Coding tier limits).
      '';
    };

    zaiSecretFile = lib.mkOption {
      type = lib.types.str;
      default = "/run/secrets/litellm-zai-env";
      description = ''
        SOPS-managed file con ZAI_API_KEY. Formato:
          ZAI_API_KEY=eyJhbGc...
        Secret independiente de `openfang-zai-env` (mismo VALOR, distinto
        path/owner). Se duplica en SOPS para evitar conflictos de permisos
        entre módulos. Operador puede pegar el mismo valor en ambos.
      '';
    };

    masterKeyFile = lib.mkOption {
      type = lib.types.str;
      default = "/run/secrets/litellm-master-key";
      description = ''
        SOPS-managed file con LITELLM_MASTER_KEY (proxy admin auth).
        Generar con: `openssl rand -hex 32` y agregar a secrets.yaml como:
          litellm-master-key: |
            LITELLM_MASTER_KEY=<hex_de_64_chars>
        Aunque el proxy escucha solo en localhost, master_key habilita
        admin endpoints (/health/, /spend/) y previene unauthenticated
        manipulación si alguien tunneliza Tailscale.
      '';
    };

    ollamaFallbackModel = lib.mkOption {
      type = lib.types.str;
      default = "qwen2.5-coder:7b";
      description = ''
        Modelo Ollama usado como último fallback cuando z.ai falla.
        qwen2.5-coder:7b ya está pulled (verificable en oracle-lab snapshot).
        Si querés mejor calidad fallback, considerar deepseek-coder-v2:16b
        (8GB de descarga adicional).
      '';
    };

    logsDir = lib.mkOption {
      type = lib.types.str;
      default = "/var/lib/litellm-proxy";
      description = "Directorio donde el proxy escribe logs y cache opcional.";
    };
  };

  config = lib.mkIf cfg.enable {
    # ─────────────────────────────────────────────
    # Tmpfiles + state dir
    # ─────────────────────────────────────────────
    systemd.tmpfiles.rules = [
      "d ${cfg.logsDir} 0750 litellm-proxy litellm-proxy -"
    ];

    users.users.litellm-proxy = {
      isSystemUser = true;
      group = "litellm-proxy";
      description = "LiteLLM proxy service — Claude Code backup backend router";
      home = cfg.logsDir;
    };
    users.groups.litellm-proxy = {};

    # ─────────────────────────────────────────────
    # SOPS secrets independientes — no compartimos con otros módulos para
    # evitar conflictos de owner/group. Operador pega el mismo VALOR
    # ZAI_API_KEY que está en `openfang-zai-env` (single z.ai account).
    # ─────────────────────────────────────────────
    sops.secrets = {
      "litellm-zai-env" = {
        owner = "litellm-proxy";
        group = "litellm-proxy";
        mode = "0400";
      };
      "litellm-master-key" = {
        owner = "litellm-proxy";
        group = "litellm-proxy";
        mode = "0400";
      };
    };

    # ─────────────────────────────────────────────
    # Service systemd
    # ─────────────────────────────────────────────
    systemd.services.litellm-proxy = {
      description = "LiteLLM proxy — Claude Code backup (z.ai primary, Ollama fallback)";
      wantedBy = [ "multi-user.target" ];
      after = [ "network-online.target" "ollama.service" ];
      wants = [ "network-online.target" ];

      environment = {
        # PYTHONUNBUFFERED para que journalctl muestre logs en tiempo real
        PYTHONUNBUFFERED = "1";
      };

      serviceConfig = {
        Type = "simple";
        User = "litellm-proxy";
        Group = "litellm-proxy";
        WorkingDirectory = cfg.logsDir;

        # Carga ZAI_API_KEY desde SOPS (formato KEY=VALUE)
        EnvironmentFile = [
          cfg.zaiSecretFile
          cfg.masterKeyFile
        ];

        # 2026-05-04: agregamos `backoff` + `aiohttp` + extras del proxy.
        # ps.litellm en nixpkgs no propaga las deps del extra [proxy] —
        # el ExecStart fallaba con `ImportError: No module named 'backoff'`
        # en proxy_server.py:155. Lista derivada de
        # pyproject.toml > [tool.poetry.extras.proxy] de litellm upstream.
        ExecStart = ''
          ${pkgs.python3.withPackages (ps: with ps; [
            litellm
            backoff
            aiohttp
            uvicorn
            fastapi
            pyyaml
            python-multipart
            cryptography
            pyjwt
          ])}/bin/litellm \
            --config ${litellmConfig} \
            --host ${cfg.listenAddr} \
            --port ${toString cfg.port} \
            --num_workers 1
        '';

        Restart = "on-failure";
        RestartSec = 10;

        # Hardening
        NoNewPrivileges = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        PrivateTmp = true;
        PrivateDevices = true;
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;
        RestrictAddressFamilies = [ "AF_INET" "AF_INET6" "AF_UNIX" ];
        ReadWritePaths = [ cfg.logsDir ];
      };
    };

    # ─────────────────────────────────────────────
    # Firewall — expone solo loopback + Tailscale
    # ─────────────────────────────────────────────
    networking.firewall.interfaces."lo".allowedTCPPorts = [ cfg.port ];
    networking.firewall.interfaces."tailscale0".allowedTCPPorts =
      lib.mkIf (cfg.listenAddr != "127.0.0.1") [ cfg.port ];

    # ─────────────────────────────────────────────
    # Asserts defensivos
    # ─────────────────────────────────────────────
    assertions = [
      {
        assertion = cfg.zaiUpstream != "";
        message = "guatoc.ai.litellmProxy.zaiUpstream no puede ser vacío.";
      }
      {
        assertion = cfg.port != registry.ports.ollama;
        message = ''
          guatoc.ai.litellmProxy.port colisiona con Ollama (${toString registry.ports.ollama}).
          Cambiar litellmProxy.port a 4000 (default) o ajustar registry.
        '';
      }
    ];

    # ─────────────────────────────────────────────
    # Documentación operador
    # ─────────────────────────────────────────────
    # Para usar Claude Code CLI con este proxy desde stg:
    #
    #   export ANTHROPIC_BASE_URL="http://alpha.tailnet:4000"  # via Tailscale
    #   export ANTHROPIC_API_KEY="sk-bypass-anything"          # ignorado por proxy
    #   claude  # CLI hace requests a /anthropic/v1/messages → proxy → z.ai/Ollama
    #
    # Verificar status:
    #   curl http://alpha.tailnet:4000/health
    #   curl http://alpha.tailnet:4000/v1/models -H "Authorization: Bearer $LITELLM_MASTER_KEY"
    #
    # Ver logs:
    #   ssh alpha 'journalctl -u litellm-proxy -f'
  };
}

# =============================================================================
# OVERLAY FALLBACK (si pkgs.python3Packages.litellm NO existe en tu nixpkgs)
# =============================================================================
# Añadir al flake.nix overlays:
#
#   overlays = [
#     (final: prev: {
#       python3Packages = prev.python3Packages.override (old: {
#         overrides = pyfinal: pyprev: {
#           litellm = pyprev.buildPythonPackage rec {
#             pname = "litellm";
#             version = "1.50.0";  # actualizar al release reciente
#             src = pyprev.fetchPypi {
#               inherit pname version;
#               sha256 = "sha256-PLACEHOLDER";  # actualizar primer build
#             };
#             propagatedBuildInputs = with pyprev; [
#               openai pydantic httpx fastapi uvicorn pyyaml jinja2
#               click rich tiktoken aiohttp
#             ];
#             doCheck = false;  # tests requieren API keys reales
#           };
#         };
#       });
#     })
#   ];
# =============================================================================
