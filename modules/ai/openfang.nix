# modules/ai/openfang.nix
# OpenFang v0.5.9 — Agent OS con Telegram, fallback LLM, sandboxing WASM
# Reemplaza Picoclaw como runtime de agentes autónomos
# Docs: https://www.openfang.sh/docs/configuration

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.openfang;
  registry = import ../../lib/registry.nix { inherit lib; };

  # OpenFang v0.5.10 — binario Rust estático para Linux x86_64.
  # Bump 2026-04-26 desde 0.5.9 para fixes:
  #   - WebSocket 404 race condition (agent lookup retries 5x) — afecta
  #     "Agent not found" del bridge cache tras bootstrap respawn.
  #   - schedule_* tools/endpoints ahora sí ejecutan (antes escribían a
  #     una shared memory key que ningún executor leía).
  #   - Multimodal user_with_blocks unifica text + image — relevante para
  #     voice/foto pipeline.
  #   - Auth fail-closed por default (loopback sigue zero-config).
  # No subimos a 0.6.0 todavía: cambios mayores (skill templates, command
  # registry, fan-out cron) implican migration que evaluamos por separado.
  openfang-src = pkgs.fetchurl {
    url = "https://github.com/RightNow-AI/openfang/releases/download/v0.5.10/openfang-x86_64-unknown-linux-gnu.tar.gz";
    sha256 = "sha256-2wIYp7wqiUJ6HM9K24c2NESx+gE+rY9O6gKFkNrHNgU=";
  };

  openfang-pkg = pkgs.stdenv.mkDerivation {
    pname = "openfang";
    version = "0.5.10";
    src = openfang-src;
    sourceRoot = ".";
    nativeBuildInputs = [ pkgs.autoPatchelfHook pkgs.gnutar ];
    buildInputs = [ pkgs.stdenv.cc.cc.lib pkgs.openssl ];
    unpackPhase = ''
      mkdir -p src
      tar -xzf $src -C src
    '';
    installPhase = ''
      mkdir -p $out/bin
      cp src/openfang $out/bin/openfang
      chmod +x $out/bin/openfang
    '';
  };

  # Helper: descarga voice OGG de Telegram + transcribe via whisper-http.
  # 2026-04-26: workaround del bug openfang 0.5.10 issue upstream #1122
  # (adapter Telegram NO descarga voice messages a download_dir). El agente
  # invoca este script con un file_id; aquí se hace todo el flujo:
  #   1. getFile via Telegram bot API → resolver file_path
  #   2. download del OGG a /tmp privado del proceso
  #   3. POST multipart al whisper-http en :10301/asr
  #   4. devolver JSON con la transcripción
  # Beneficios vs construir el comando en el LLM:
  #   - Sin escape hell de comillas dentro de tool_call JSON.
  #   - Sin filtrar TELEGRAM_BOT_TOKEN al contexto del modelo.
  #   - Determinístico: si openfang 0.5.11 corrige el adapter, basta
  #     revertir 1 línea del prompt.
  transcribeTelegramVoice = pkgs.writeShellScriptBin "transcribe-telegram-voice" ''
    #!${pkgs.bash}/bin/bash
    set -euo pipefail

    # Uso: transcribe-telegram-voice <input> [language]
    #
    # <input> acepta CUALQUIERA de los 3 formatos que el LLM tenga a la mano:
    #   1. file_id puro de Telegram (ej. "AwACAgIAAxk...")
    #      → resuelve via getFile API + download.
    #   2. file_path de Telegram (ej. "voice/file_36.oga")
    #      → download directo (saltea getFile).
    #   3. URL completa (ej. "https://api.telegram.org/file/bot.../voice/file_36.oga")
    #      → extrae file_path y descarga con TOKEN del env (no del input).
    #      Esto evita que el bot token quede loguead en argv si el LLM copia la URL.
    #
    # Env: TELEGRAM_BOT_TOKEN (requerido)
    # Stdout: JSON respuesta de whisper-http (campo .text trae la transcripción).
    # Exit: 0 OK · 1 input inválido · 2 error Telegram · 3 error whisper.

    INPUT="''${1:-}"
    LANG_PARAM="''${2:-es}"

    if [ -z "$INPUT" ]; then
      echo '{"error":"missing input; uso: transcribe-telegram-voice <file_id|file_path|url> [lang]"}' >&2
      exit 1
    fi

    if [ -z "''${TELEGRAM_BOT_TOKEN:-}" ]; then
      echo '{"error":"TELEGRAM_BOT_TOKEN no está en el environment"}' >&2
      exit 1
    fi

    WHISPER_URL="''${WHISPER_HTTP_URL:-http://127.0.0.1:10301/asr}"

    # Auto-detect tipo de input.
    FILE_PATH=""
    if [[ "$INPUT" == https://api.telegram.org/file/bot* ]]; then
      # URL completa: extraer todo después de "/bot<TOKEN>/".
      # Pattern: https://api.telegram.org/file/bot<TOKEN>/<file_path>
      WITHOUT_PREFIX="''${INPUT#https://api.telegram.org/file/bot}"
      FILE_PATH="''${WITHOUT_PREFIX#*/}"
      if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" = "$WITHOUT_PREFIX" ]; then
        echo '{"error":"URL Telegram malformada — no se pudo extraer file_path"}' >&2
        exit 1
      fi
    elif [[ "$INPUT" == */* ]]; then
      # Contiene slash pero no es URL → es file_path directo.
      FILE_PATH="$INPUT"
    else
      # Sin slash → es file_id raw, resolver via getFile.
      META=$(${pkgs.curl}/bin/curl -fsS --max-time 10 \
        "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getFile?file_id=$INPUT") || {
        echo '{"error":"getFile request failed"}' >&2
        exit 2
      }
      FILE_PATH=$(echo "$META" | ${pkgs.jq}/bin/jq -r '.result.file_path // empty')
      if [ -z "$FILE_PATH" ]; then
        echo "{\"error\":\"getFile no devolvió file_path\",\"telegram_response\":$META}" >&2
        exit 2
      fi
    fi

    # Download usando TOKEN del environment — el TOKEN nunca aparece en argv
    # del shell_exec, queda solo en el process env.
    TMP=$(${pkgs.coreutils}/bin/mktemp --suffix=.oga)
    trap "${pkgs.coreutils}/bin/rm -f '$TMP'" EXIT INT TERM

    ${pkgs.curl}/bin/curl -fsS --max-time 60 -o "$TMP" \
      "https://api.telegram.org/file/bot$TELEGRAM_BOT_TOKEN/$FILE_PATH" || {
      echo '{"error":"download OGG failed"}' >&2
      exit 2
    }

    if [ ! -s "$TMP" ]; then
      echo '{"error":"OGG download produjo archivo vacío"}' >&2
      exit 2
    fi

    # POST multipart a whisper-http
    RESULT=$(${pkgs.curl}/bin/curl -fsS --max-time 120 \
      -X POST \
      -F "audio_file=@$TMP" \
      -F "language=$LANG_PARAM" \
      -F "task=transcribe" \
      -F "output=json" \
      "$WHISPER_URL") || {
      echo '{"error":"whisper-http request failed"}' >&2
      exit 3
    }

    if [ -z "$RESULT" ]; then
      echo '{"error":"whisper-http devolvió respuesta vacía"}' >&2
      exit 3
    fi

    # Devolver JSON tal cual lo dio whisper-http (campo .text es la transcripción).
    echo "$RESULT"
  '';

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
    environment.systemPackages = [ openfang-pkg transcribeTelegramVoice ];

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

          # PATH explícito con el helper transcribe-telegram-voice + utilidades
          # base. El subprocess_sandbox de openfang 0.5.10 hereda el PATH del
          # service systemd; sin este export, /run/current-system/sw/bin queda
          # fuera de PATH y `transcribe-telegram-voice` aparece "no instalado"
          # al shell_exec aunque `which` desde kortux sí lo encuentre.
          # Garantizamos los nix-store paths absolutos para no depender de
          # /run/current-system mutaciones.
          export PATH="${transcribeTelegramVoice}/bin:${pkgs.curl}/bin:${pkgs.jq}/bin:${pkgs.coreutils}/bin:${pkgs.gnugrep}/bin:${pkgs.gnused}/bin:${pkgs.bash}/bin:$PATH"

          exec ${openfang-pkg}/bin/openfang start --config "$HOME/config.toml"
        '';
      }
    ) cfg.agents);
  };
}
