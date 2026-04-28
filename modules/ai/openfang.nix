# modules/ai/openfang.nix
# OpenFang v0.5.9 — Agent OS con Telegram, fallback LLM, sandboxing WASM
# Reemplaza Picoclaw como runtime de agentes autónomos
# Docs: https://www.openfang.sh/docs/configuration

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.openfang;
  registry = import ../../lib/registry.nix { inherit lib; };

  # OpenFang v0.6.0 — build desde fork guatoc-ecohub/openfang.
  # Bump 2026-04-27 desde 0.5.10 con patch crítico:
  #   - feat(media): audio_base_url override para Whisper local OpenAI-compat.
  #     Cierra #1051: las URLs de audio estaban hardcodeadas (api.openai.com /
  #     api.groq.com) e ignoraban OPENAI_BASE_URL. Ahora [media] audio_base_url
  #     en config.toml redirige a speaches local vía openai-proxy sin cambiar
  #     el wire format ni el env var de auth.
  #   Rama: feat/audio-base-url-config — commit e0310d3.
  openfang-pkg = pkgs.rustPlatform.buildRustPackage {
    pname = "openfang";
    version = "0.6.0";

    src = pkgs.fetchFromGitHub {
      owner = "guatoc-ecohub";
      repo = "openfang";
      rev = "e0310d33615f1f45d34478f39824f5303a5c7176";
      hash = "sha256-seSSy7LQIlNKr8ZR9w61G/gOlTeKpkxJrWZkfXionkE=";
    };

    cargoHash = "sha256-SdotDLlmpDpBZCvG9j1mDLLynXxBrEVXpQ6SWWmGsK4=";

    cargoBuildFlags = [ "--package" "openfang-cli" ];
    doCheck = false;

    nativeBuildInputs = [ pkgs.pkg-config ];
    buildInputs = [ pkgs.openssl pkgs.sqlite ];

    OPENSSL_NO_VENDOR = "1";
  };

  # Genera config.toml para un agente
  mkAgentConfig = name: agent: pkgs.writeText "openfang-${name}-config.toml" ''
    # OpenFang config — Agent: ${agent.name}
    home_dir = "/var/lib/openfang/agent-${name}"
    data_dir = "/var/lib/openfang/agent-${name}/data"
    log_level = "info"
    api_listen = "0.0.0.0:${toString (4200 + agent.portOffset)}"
    mode = "stable"
    language = "es"
    usage_footer = "off"

    [default_model]
    provider = "${agent.provider}"
    model = "${agent.model}"
    api_key_env = "${agent.apiKeyEnv}"
    ${lib.optionalString (agent.baseUrl != "") ''base_url = "${agent.baseUrl}"''}

    ${lib.concatMapStringsSep "\n" (fb: ''
    [[fallback_providers]]
    provider = "${fb.provider}"
    model = "${fb.model}"
    api_key_env = "${fb.apiKeyEnv}"
    ${lib.optionalString (fb.baseUrl or "" != "") ''base_url = "${fb.baseUrl}"''}
    '') agent.fallbackProviders}

    [channels.telegram]
    bot_token_env = "TELEGRAM_BOT_TOKEN"
    allowed_users = [${lib.concatMapStringsSep ", " (id: ''"${id}"'') agent.telegramAllowFrom}]
    poll_interval_secs = 2

    [channels.telegram.overrides]
    dm_policy = "allowed_only"
    output_format = "markdown"

    ${lib.optionalString agent.mediaEnabled ''
    [channels.telegram.media]
    enabled = true
    allowed_types = [${lib.concatMapStringsSep ", " (t: ''"${t}"'') agent.mediaAllowedTypes}]
    max_size_mb = ${toString agent.mediaMaxSizeMb}
    download_dir = "/var/lib/openfang/agent-${name}/data/media"
    ''}

    [[users]]
    name = "${name}"
    role = "owner"

    [users.channel_bindings]
    telegram = "${lib.head agent.telegramAllowFrom}"

    # Heartbeat timeout extendido — el default 180s asume agentes activos
    # con tráfico constante. Nuestro `guatoc` es reactivo a Telegram y
    # pasa horas idle. Sin esto, el kernel marca crashed cada ~3 min,
    # auto-recovery en 30s, ciclo infinito (verificado 2026-04-27 logs).
    # 86400s = 24h: máximo 1 ventana de 30s de downtime por día.
    # Comentario del propio openfang-types/config.rs:1187 confirma:
    # "Set higher to prevent idle hands from being marked as crashed."
    [heartbeat]
    default_timeout_secs = 86400

    [memory]
    consolidation_threshold = 5000
    decay_rate = 0.1
    # Embeddings vía driver nativo Ollama de OpenFang 0.5.10.
    # 2026-04-26: investigación del binario + repo upstream confirmó que
    # OpenFang IGNORA OPENAI_BASE_URL para embeddings (sólo lo respeta
    # chat completions). El cliente embedding.rs construye URL desde la
    # constante interna del provider catalog. Para "openai" la constante
    # es https://api.openai.com/v1 hardcoded → 401 con la zai key.
    # Solución: usar provider "ollama" nativo, cuya constante interna
    # apunta a http://localhost:11434/v1. Salta el proxy, sin TLS
    # spoofing, sin overrides /etc/hosts, sin parchar binario.
    # nomic-embed-text:latest ya está en `ollama list`.
    embedding_provider    = "ollama"
    embedding_model       = "nomic-embed-text"
    embedding_api_key_env = "OLLAMA_API_KEY"

    ${lib.optionalString (agent.audioBaseUrl != "") ''
    [media]
    audio_provider = "openai"
    audio_base_url = "${agent.audioBaseUrl}"
    ''}

    ${lib.optionalString (agent.workspacePath != "") ''
    [workspace]
    name = "${name}-workspace"
    path = "${agent.workspacePath}"
    ''}

    ${lib.optionalString (agent.tools != []) ''
    [tools]
    enabled = [${lib.concatMapStringsSep ", " (t: ''"${t}"'') agent.tools}]
    ''}

    ${lib.optionalString (agent.networkAllowlist != []) ''
    [sandbox]
    mode = "strict"
    filesystem_jail = true
    network_allowlist = [${lib.concatMapStringsSep ", " (h: ''"${h}"'') agent.networkAllowlist}]
    ''}

    [prompt]
    system = """
    ${agent.systemPrompt}
    """
  '';

in
{
  options.guatoc.ai.openfang = {
    enable = lib.mkEnableOption "OpenFang — Agent OS multitenant";

    agents = lib.mkOption {
      type = lib.types.attrsOf (lib.types.submodule {
        options = {
          name = lib.mkOption { type = lib.types.str; };
          description = lib.mkOption { type = lib.types.str; default = ""; };
          provider = lib.mkOption { type = lib.types.str; default = "openrouter"; };
          model = lib.mkOption { type = lib.types.str; default = "google/gemini-2.0-flash-001"; };
          apiKeyEnv = lib.mkOption { type = lib.types.str; default = "OPENROUTER_API_KEY"; };
          baseUrl = lib.mkOption { type = lib.types.str; default = ""; };
          portOffset = lib.mkOption { type = lib.types.int; default = 0; };
          telegramAllowFrom = lib.mkOption { type = lib.types.listOf lib.types.str; };
          telegramTokenSecret = lib.mkOption { type = lib.types.str; };
          openrouterKeySecret = lib.mkOption { type = lib.types.str; default = "openfang-openrouter-key"; };
          fallbackProviders = lib.mkOption {
            type = lib.types.listOf lib.types.attrs;
            default = [];
          };
          systemPrompt = lib.mkOption { type = lib.types.str; };
          tools = lib.mkOption {
            type = lib.types.listOf lib.types.str;
            default = [];
            description = "Lista de tools habilitados (ej. http.request, fs.read)";
          };
          workspacePath = lib.mkOption {
            type = lib.types.str;
            default = "";
            description = "Ruta del workspace del agente";
          };
          networkAllowlist = lib.mkOption {
            type = lib.types.listOf lib.types.str;
            default = [];
            description = "Hosts permitidos en el sandbox de red";
          };
          mediaEnabled = lib.mkOption {
            type = lib.types.bool;
            default = false;
            description = "Habilitar recepción de media en Telegram";
          };
          mediaAllowedTypes = lib.mkOption {
            type = lib.types.listOf lib.types.str;
            default = [ "photo" "document" "sticker" ];
            description = ''
              Tipos de media de Telegram que el agent acepta. Lista válida del
              channel Telegram de OpenFang v0.5.9: photo, document, sticker,
              voice, audio, video, video_note. Default: photo + document +
              sticker (multimodal visión clásica). Para flujos de voz agregar
              "voice".
            '';
            example = [ "photo" "document" "sticker" "voice" ];
          };
          mediaMaxSizeMb = lib.mkOption {
            type = lib.types.int;
            default = 10;
          };
          audioBaseUrl = lib.mkOption {
            type = lib.types.str;
            default = "";
            description = ''
              Override base URL para transcripción de audio (OpenAI-compat).
              Cuando está definido, OpenFang envía el audio a
              <audioBaseUrl>/v1/audio/transcriptions en lugar de las URLs
              hardcodeadas de openai.com / groq.com.
              Ejemplo: "http://127.0.0.1:10303" (openai-proxy local → speaches).
              Requiere OpenFang >= 0.6.0 (patch feat/audio-base-url-config).
            '';
          };
          extraEnvFiles = lib.mkOption {
            type = lib.types.listOf lib.types.str;
            default = [];
          };
          bootstrapManifest = lib.mkOption {
            type = lib.types.nullOr lib.types.path;
            default = null;
            description = ''
              Ruta a un manifest TOML que define el agente (name, description,
              module, profile, [model] con system_prompt). Si está definido, un
              servicio systemd dedicado (openfang-<name>-bootstrap) se encarga
              de crear/reemplazar el agente vía la HTTP API local tras cada
              boot del daemon. Idempotente: no actúa si el hash SHA256 del
              manifest coincide con el último aplicado.

              Nota: OpenFang persiste agentes en SQLite y el [prompt] system
              del config.toml del kernel es ignorado para agentes spawneados
              desde manifest — esta ruta es la única forma declarativa.
            '';
          };
        };
      });
      default = {};
    };
  };

  config = lib.mkIf cfg.enable {
    environment.systemPackages = [ openfang-pkg ];

    users.users.openfang = {
      isSystemUser = true;
      uid = 2010;
      group = "openfang";
      home = "/var/lib/openfang";
      createHome = true;
    };
    users.groups.openfang = { gid = 2010; };

    # Solo crear el directorio raíz via tmpfiles — subdirectorios
    # los crea el preStart como usuario openfang (evita mismatch de ownership)
    systemd.tmpfiles.rules = [
      "d /var/lib/openfang 0750 openfang openfang -"
    ];

    # Servicios bootstrap: un systemd unit por agente con bootstrapManifest
    # definido. Corre después del daemon, espera que la API responda, y si el
    # hash del manifest cambió (o el agente no existe) hace DELETE+POST contra
    # /api/agents para aplicar el manifest. Idempotente vía state file.
    systemd.services = (lib.mapAttrs' (name: agent:
      lib.nameValuePair "openfang-${name}-bootstrap" (lib.mkIf (agent.bootstrapManifest != null) {
        description = "Bootstrap OpenFang agent manifest: ${name}";
        after = [ "openfang-${name}.service" ];
        requires = [ "openfang-${name}.service" ];
        wantedBy = [ "multi-user.target" ];

        path = [ pkgs.curl pkgs.jq pkgs.coreutils ];

        serviceConfig = {
          Type = "oneshot";
          RemainAfterExit = true;
          User = "openfang";
          Group = "openfang";
          StateDirectory = "openfang/agent-${name}";
          StateDirectoryMode = "0700";
        };

        script = let
          apiPort = toString (4200 + agent.portOffset);
          manifestPath = agent.bootstrapManifest;
        in ''
          set -euo pipefail

          API="http://127.0.0.1:${apiPort}"
          AGENT_NAME="${name}"
          MANIFEST="${manifestPath}"
          STATE_FILE="/var/lib/openfang/agent-${name}/.bootstrap-hash"

          echo "Bootstrap: esperando API del daemon en $API..."
          for i in $(seq 1 60); do
            if curl -sSf "$API/api/agents" >/dev/null 2>&1; then
              echo "Bootstrap: API disponible tras $i intentos"
              break
            fi
            sleep 1
            if [ "$i" = "60" ]; then
              echo "Bootstrap: API no respondió en 60s, abortando" >&2
              exit 1
            fi
          done

          desired_hash=$(sha256sum "$MANIFEST" | cut -d' ' -f1)
          current_hash=""
          [ -f "$STATE_FILE" ] && current_hash=$(cat "$STATE_FILE" || true)

          if [ "$desired_hash" = "$current_hash" ]; then
            echo "Bootstrap: manifest sin cambios (hash=$desired_hash), skip"
            exit 0
          fi

          echo "Bootstrap: aplicando manifest nuevo (hash=$desired_hash)"

          # Buscar agente existente por name (hay <= 1 porque name es único)
          existing_id=$(curl -sSf "$API/api/agents" \
            | jq -r --arg n "$AGENT_NAME" '.[] | select(.name == $n) | .id' \
            | head -1)

          if [ -n "$existing_id" ]; then
            echo "Bootstrap: DELETE agente existente $existing_id"
            curl -sSf -X DELETE "$API/api/agents/$existing_id" >/dev/null
          fi

          payload=$(jq -Rs '{manifest_toml: .}' < "$MANIFEST")
          response=$(curl -sSf -X POST "$API/api/agents" \
            -H "Content-Type: application/json" \
            -d "$payload")
          new_id=$(echo "$response" | jq -r '.agent_id')
          echo "Bootstrap: agente $AGENT_NAME creado con id=$new_id"

          echo "$desired_hash" > "$STATE_FILE"
        '';
      })
    ) cfg.agents) // (lib.mapAttrs' (name: agent:
      lib.nameValuePair "openfang-${name}" {
        description = "OpenFang Agent: ${agent.name}";
        after = [ "network-online.target" ];
        wants = [ "network-online.target" ];
        wantedBy = [ "multi-user.target" ];

        serviceConfig = {
          User = "openfang";
          Group = "openfang";
          StateDirectory = "openfang/agent-${name}";
          StateDirectoryMode = "0700";
          WorkingDirectory = "/var/lib/openfang/agent-${name}";
          EnvironmentFile = [
            config.sops.secrets.${agent.telegramTokenSecret}.path
            config.sops.secrets.${agent.openrouterKeySecret}.path
          ] ++ agent.extraEnvFiles;

          ProtectHome = true;
          PrivateTmp = true;
          ProtectKernelTunables = true;
          ProtectKernelModules = true;
          ProtectControlGroups = true;

          Restart = "on-failure";
          RestartSec = "10s";
        };

        environment = {
          HOME = "/var/lib/openfang/agent-${name}";
          OPENFANG_HOME = "/var/lib/openfang/agent-${name}";
        };

        preStart = let
          configFile = mkAgentConfig name agent;
        in ''
          # Copiar config al StateDirectory (propiedad de openfang)
          cp -f ${configFile} /var/lib/openfang/agent-${name}/config.toml
        '';

        script = ''
          export HOME="/var/lib/openfang/agent-${name}"
          export OPENFANG_HOME="$HOME"
          export OPENFANG_CONFIG="/var/lib/openfang/agent-${name}/config.toml"

          # Crear .openfang y subdirectorios como usuario openfang
          mkdir -p "$HOME/.openfang" "$HOME/data" "$HOME/data/media" "$HOME/workspace"

          # Copiar config donde OpenFang la busca
          cp -f "$HOME/config.toml" "$HOME/.openfang/config.toml"

          # Alias para el driver "openai" de OpenFang cuando el backend real es
          # Z.ai (GLM Coding Plan). El driver lee OPENAI_API_KEY/OPENAI_BASE_URL
          # hardcoded; el api_key_env del manifest per-agent se ignora.
          #
          # 2026-04-26: el OPENAI_BASE_URL se redirige al proxy local
          # (modules/ai/openai-proxy.nix). El proxy decide por path:
          #   /v1/embeddings → Ollama local (nomic-embed-text)
          #   /v1/audio/*    → speaches local (cuando habilitado)
          #   resto          → z.ai upstream
          # Esto fixa el bug donde embeddings iba a z.ai con modelo no soportado
          # (Coding Plan sólo expone GLM chat models — verificado via /v1/models).
          if [ -n "''${ZAI_API_KEY:-}" ]; then
            export OPENAI_API_KEY="$ZAI_API_KEY"
            export OPENAI_BASE_URL="http://127.0.0.1:${toString registry.ports.openaiProxy}/v1"
          fi

          # OLLAMA_API_KEY requerido por la lectura std::env::var del kernel
          # (embedding_api_key_env="OLLAMA_API_KEY" en config.toml). Ollama
          # NO valida el valor; cualquier string no-vacío sirve. Si no
          # existe la var, openfang aborta el setup del embedding driver.
          export OLLAMA_API_KEY="ollama-local-no-auth"

          exec ${openfang-pkg}/bin/openfang start --config "$HOME/config.toml"
        '';
      }
    ) cfg.agents);
  };
}
