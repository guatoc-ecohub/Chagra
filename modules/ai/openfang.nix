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

  # Helper: descarga voice OGG de Telegram + transcribe via speaches OpenAI-compat.
  #
  # Por qué existe (post-mortem 2026-04-28):
  #   El bump 0.6.0 + audio_base_url (PR #23) sólo redirige el endpoint de
  #   transcripción al openai-proxy local; pero openfang 0.6.0 todavía no
  #   descarga voice OGGs de Telegram a download_dir (issue upstream #1122).
  #   Cuando el agente invoca `media_transcribe(file_id)` el binario falla
  #   silenciosamente porque no encuentra el archivo en disco. Sin
  #   instrucciones explícitas, el LLM cae a `shell_exec("curl ...")` con
  #   el bot token plano en argv — incidente de seguridad confirmado en
  #   logs alpha 2026-04-28 (token quedó en journalctl: rotación pendiente).
  #
  # Diseño:
  #   - Bot token leído de TELEGRAM_BOT_TOKEN env (NUNCA argv).
  #   - getFile + download Telegram + POST multipart a speaches via openai-proxy.
  #   - Tres formatos de input: file_id puro, file_path Telegram, URL completa.
  #   - Stdout JSON OpenAI-compat: {"text": "<transcripción>"} → bot extrae .text.
  transcribeTelegramVoice = pkgs.writeShellScriptBin "transcribe-telegram-voice" ''
    #!${pkgs.bash}/bin/bash
    set -euo pipefail

    INPUT="''${1:-}"
    LANG_PARAM="''${2:-es}"

    if [ -z "$INPUT" ]; then
      echo '{"error":"missing input; uso: transcribe-telegram-voice <file_id|file_path|url> [lang]"}' >&2
      exit 1
    fi

    # OpenFang subprocess_sandbox hace env_clear() y solo re-añade SAFE_ENV_VARS
    # (verificado en crates/openfang-runtime/src/subprocess_sandbox.rs:41).
    # TELEGRAM_BOT_TOKEN nunca llega al helper aunque openfang lo tenga.
    # Fallback: leer del SOPS secret file directamente. El helper corre como
    # subprocess del service openfang-guatoc (user `openfang`), y el secret
    # está montado con owner openfang:openfang mode 0400 → accesible.
    # Formato del file: KEY=VALUE (EnvironmentFile-compatible de systemd).
    if [ -z "''${TELEGRAM_BOT_TOKEN:-}" ]; then
      SECRET_FILE="''${TELEGRAM_BOT_TOKEN_FILE:-/run/secrets/openfang-guatoc-telegram-token}"
      if [ -r "$SECRET_FILE" ]; then
        # awk evita source/eval injection; toma sólo la línea TELEGRAM_BOT_TOKEN=
        TELEGRAM_BOT_TOKEN=$(${pkgs.gawk}/bin/awk -F= '/^TELEGRAM_BOT_TOKEN=/{sub(/^TELEGRAM_BOT_TOKEN=/,""); print; exit}' "$SECRET_FILE")
      fi
    fi

    if [ -z "''${TELEGRAM_BOT_TOKEN:-}" ]; then
      echo '{"error":"TELEGRAM_BOT_TOKEN no disponible (env vacío + secret file no legible o sin la clave)"}' >&2
      exit 1
    fi

    # Default: openai-proxy local en :10303 que routea /v1/audio/* → speaches:10302
    # con modelo Systran/faster-whisper-small (validado end-to-end 2026-04-28).
    WHISPER_URL="''${WHISPER_HTTP_URL:-http://127.0.0.1:10303/v1/audio/transcriptions}"
    WHISPER_MODEL="''${WHISPER_MODEL:-Systran/faster-whisper-small}"

    # Auto-detect tipo de input.
    FILE_PATH=""
    if [[ "$INPUT" == https://api.telegram.org/file/bot* ]]; then
      WITHOUT_PREFIX="''${INPUT#https://api.telegram.org/file/bot}"
      FILE_PATH="''${WITHOUT_PREFIX#*/}"
      if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" = "$WITHOUT_PREFIX" ]; then
        echo '{"error":"URL Telegram malformada — no se pudo extraer file_path"}' >&2
        exit 1
      fi
    elif [[ "$INPUT" == */* ]]; then
      FILE_PATH="$INPUT"
    else
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

    # Download — token desde env, nunca en argv.
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

    # POST OpenAI-compat a speaches via openai-proxy.
    RESULT=$(${pkgs.curl}/bin/curl -fsS --max-time 120 \
      -X POST \
      -F "file=@$TMP" \
      -F "model=$WHISPER_MODEL" \
      -F "language=$LANG_PARAM" \
      -F "response_format=json" \
      "$WHISPER_URL") || {
      echo '{"error":"speaches request failed"}' >&2
      exit 3
    }

    if [ -z "$RESULT" ]; then
      echo '{"error":"speaches devolvió respuesta vacía"}' >&2
      exit 3
    fi

    # JSON OpenAI-compat: {"text": "..."}
    echo "$RESULT"
  '';

  # Helper: aplica una label a un PR de Chagra desde shell_exec.
  #
  # Por qué existe:
  #   El bot guatoc, tras crear un Issue con label `claude-code-request`
  #   (sec 7 manifest), debe poder aplicar la label `ready-to-generate`
  #   al draft PR que el workflow bootstrap crea automáticamente.
  #   Sin esto, el operador tiene que ir manualmente al PR y aplicar
  #   la label — interrumpe el flujo voice-first.
  #
  # Diseño paralelo a transcribeTelegramVoice:
  #   - Token de chagra-deploy-github-token leído del SOPS file
  #     (NO env, porque subprocess_sandbox hace env_clear()).
  #   - Polling con timeout: el bootstrap workflow tarda 20-60s en
  #     crear el PR. Polling cada 5s hasta 90s antes de abortar.
  #   - Stdout JSON: {pr_number, html_url, status} para que el LLM
  #     pueda extraer datos sin parsear texto libre.
  applyPRLabel = pkgs.writeShellScriptBin "apply-pr-label" ''
    #!${pkgs.bash}/bin/bash
    set -euo pipefail

    ISSUE_NUM="''${1:-}"
    LABEL="''${2:-ready-to-generate}"
    REPO="''${3:-guatoc-ecohub/Chagra}"

    if [ -z "$ISSUE_NUM" ]; then
      echo '{"error":"missing issue number; uso: apply-pr-label <issue_num> [label] [repo]"}' >&2
      exit 1
    fi

    # Leer token desde SOPS file (subprocess_sandbox strip env vars).
    TOKEN_FILE="''${GITHUB_TOKEN_FILE:-/run/secrets/chagra-deploy-github-token}"
    if [ -z "''${GITHUB_TOKEN:-}" ] && [ -r "$TOKEN_FILE" ]; then
      GITHUB_TOKEN=$(${pkgs.gawk}/bin/awk -F= '/^(CHAGRA_DEPLOY_GITHUB_TOKEN|GITHUB_TOKEN)=/{sub(/^[^=]+=/,""); print; exit}' "$TOKEN_FILE")
    fi
    if [ -z "''${GITHUB_TOKEN:-}" ]; then
      echo '{"error":"GITHUB_TOKEN no disponible (env vacío + secret file no legible)"}' >&2
      exit 1
    fi

    BRANCH="feat/issue-$ISSUE_NUM-"
    API="https://api.github.com/repos/$REPO"

    # Polling: el bootstrap workflow tarda 20-60s en crear el PR.
    # Buscar un PR cuya rama empiece con feat/issue-N-* (head=...).
    PR_NUM=""
    for attempt in $(seq 1 18); do
      RESPONSE=$(${pkgs.curl}/bin/curl -fsS \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        "$API/pulls?state=open&per_page=50" 2>/dev/null) || true

      PR_NUM=$(echo "$RESPONSE" | ${pkgs.jq}/bin/jq -r --arg br "$BRANCH" \
        '[.[] | select(.head.ref | startswith($br))][0].number // empty')

      if [ -n "$PR_NUM" ] && [ "$PR_NUM" != "null" ]; then
        break
      fi
      sleep 5
    done

    if [ -z "$PR_NUM" ] || [ "$PR_NUM" = "null" ]; then
      echo "{\"error\":\"PR para issue #$ISSUE_NUM no apareció en 90s; el bootstrap workflow puede haber fallado\"}" >&2
      exit 2
    fi

    # Aplicar label.
    LABEL_RESULT=$(${pkgs.curl}/bin/curl -fsS \
      -X POST \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      "$API/issues/$PR_NUM/labels" \
      -d "{\"labels\":[\"$LABEL\"]}") || {
      echo "{\"error\":\"falló POST de label\",\"pr_number\":$PR_NUM}" >&2
      exit 3
    }

    HTML_URL=$(echo "$RESPONSE" | ${pkgs.jq}/bin/jq -r --arg br "$BRANCH" \
      '[.[] | select(.head.ref | startswith($br))][0].html_url // empty')

    echo "{\"pr_number\":$PR_NUM,\"html_url\":\"$HTML_URL\",\"label\":\"$LABEL\",\"status\":\"applied\"}"
  '';

  voiceNluExtract = pkgs.writeShellScriptBin "voice-nlu-extract" ''
    #!${pkgs.bash}/bin/bash
    set -euo pipefail

    TRANSCRIPT="''${1:-}"
    if [ -z "$TRANSCRIPT" ]; then
      echo '{"error":"missing transcript; uso: voice-nlu-extract <transcript>"}' >&2
      exit 1
    fi

    # Invoca el módulo Python con el transcript como input
    ${pkgs.python3}/bin/python3 -c "
import sys, json
sys.path.insert(0, '${./scripts}')
from voice_nlu import extract_voice_nlu
result = extract_voice_nlu(sys.argv[1])
print(json.dumps(result, ensure_ascii=False))
" "$TRANSCRIPT"
  '';

  # Helper: crea un Issue en repo Chagra desde shell_exec.
  #
  # Por qué existe:
  #   El bot guatoc, en sec 7 manifest paso 4, debe POST a GitHub Issues
  #   API con label `claude-code-request` que dispara el workflow
  #   bootstrap. ANTES, el manifest describía el POST raw con header
  #   `Authorization: Bearer $GITHUB_TOKEN` — pero el subprocess_sandbox
  #   del bot hace env_clear() antes de invocar shell_exec, por lo que
  #   $GITHUB_TOKEN expandía a string vacío → 401 Bad credentials
  #   (incidente field test 2026-05-09).
  #
  # Diseño paralelo a applyPRLabel:
  #   - Token de chagra-deploy-github-token leído del SOPS file con
  #     awk strip de prefijo (acepta GITHUB_TOKEN= o raw — backwards-compat).
  #   - Stdout JSON: {issue_number, html_url, status} para que el LLM
  #     pueda extraer datos sin parsear texto libre.
  #   - Si label no especificada, default claude-code-request (obligatoria
  #     para disparar el workflow bootstrap).
  createChagraIssue = pkgs.writeShellScriptBin "create-chagra-issue" ''
    #!${pkgs.bash}/bin/bash
    set -euo pipefail

    TITLE="''${1:-}"
    BODY="''${2:-}"
    LABEL="''${3:-claude-code-request}"
    REPO="''${4:-guatoc-ecohub/Chagra}"

    if [ -z "$TITLE" ] || [ -z "$BODY" ]; then
      echo '{"error":"missing args; uso: create-chagra-issue <title> <body> [label] [repo]"}' >&2
      exit 1
    fi

    # Leer token desde SOPS file (subprocess_sandbox strip env vars).
    TOKEN_FILE="''${GITHUB_TOKEN_FILE:-/run/secrets/chagra-deploy-github-token}"
    if [ -z "''${GITHUB_TOKEN:-}" ] && [ -r "$TOKEN_FILE" ]; then
      GITHUB_TOKEN=$(${pkgs.gawk}/bin/awk -F= '/^(CHAGRA_DEPLOY_GITHUB_TOKEN|GITHUB_TOKEN)=/{sub(/^[^=]+=/,""); print; exit}' "$TOKEN_FILE")
    fi
    if [ -z "''${GITHUB_TOKEN:-}" ]; then
      echo '{"error":"GITHUB_TOKEN no disponible (env vacío + secret file no legible)"}' >&2
      exit 1
    fi

    API="https://api.github.com/repos/$REPO/issues"

    # Construir payload JSON con jq para escapar correctamente title/body.
    PAYLOAD=$(${pkgs.jq}/bin/jq -n \
      --arg title "$TITLE" \
      --arg body "$BODY" \
      --arg label "$LABEL" \
      '{title: $title, body: $body, labels: [$label]}')

    # POST a GitHub Issues API.
    RESPONSE=$(${pkgs.curl}/bin/curl -fsS \
      -X POST \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      -H "Content-Type: application/json" \
      "$API" \
      -d "$PAYLOAD") || {
      echo "{\"error\":\"falló POST de issue (verifica token + permisos issues:write)\"}" >&2
      exit 2
    }

    ISSUE_NUM=$(echo "$RESPONSE" | ${pkgs.jq}/bin/jq -r '.number // empty')
    HTML_URL=$(echo "$RESPONSE" | ${pkgs.jq}/bin/jq -r '.html_url // empty')

    if [ -z "$ISSUE_NUM" ] || [ "$ISSUE_NUM" = "null" ]; then
      echo "{\"error\":\"respuesta GitHub sin issue number\",\"response\":$(echo "$RESPONSE" | ${pkgs.jq}/bin/jq -c .)}" >&2
      exit 3
    fi

    echo "{\"issue_number\":$ISSUE_NUM,\"html_url\":\"$HTML_URL\",\"label\":\"$LABEL\",\"status\":\"created\"}"
  '';

  # apply-file-change: edición segura de archivos evitando sed + pipes.
  # Uso: apply-file-change <file> <oldString> <newString>
  # Substitución literal Python (no regex). oldString debe ser único en el archivo.
  applyFileChange = pkgs.writeShellScriptBin "apply-file-change" ''
    #!${pkgs.bash}/bin/bash
    set -euo pipefail
    FILE="''${1:-}"; OLD="''${2:-}"; NEW="''${3:-}"
    if [ -z "$FILE" ] || [ -z "$OLD" ] || [ -z "$NEW" ]; then
      echo '{"error":"usage: apply-file-change <file> <oldString> <newString>"}' >&2; exit 1; fi
    if [ ! -f "$FILE" ]; then echo "{\"error\":\"file not found: $FILE\"}" >&2; exit 1; fi
    python3 -c "
import sys
f = open('$FILE','r'); c = f.read(); f.close()
count = c.count('$OLD')
if count == 0: print(f'\"error\":\"OLD string not found\"}', file=sys.stderr); sys.exit(1)
if count > 1: print(f'\"error\":\"OLD string ambiguous ({count} matches)\"\}', file=sys.stderr); sys.exit(2)
f = open('$FILE','w'); f.write(c.replace('$OLD','$NEW',1)); f.close()
print(f'\"status\":\"changed\",\"file\":\"$FILE\"}')
    "
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
          chagraWorkspacePath = lib.mkOption {
            type = lib.types.str;
            default = "/var/lib/openfang/agent-guatoc/workspaces/guatoc/chagra-workspace";
            description = "Workspace writable para cambios de código en Chagra (sección 6 del manifest)";
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
    environment.systemPackages = [ openfang-pkg transcribeTelegramVoice applyPRLabel voiceNluExtract createChagraIssue ];

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
          # base. El subprocess_sandbox de openfang hereda PATH del service
          # systemd; sin este export, /run/current-system/sw/bin queda fuera y
          # `transcribe-telegram-voice` aparece "no instalado" desde shell_exec.
          # Incidente 2026-04-28: sin esto el LLM cae a curl directo con
          # bot token plano en argv → leak en journalctl.
          export PATH="${transcribeTelegramVoice}/bin:${applyPRLabel}/bin:${voiceNluExtract}/bin:${createChagraIssue}/bin:${applyFileChange}/bin:${pkgs.curl}/bin:${pkgs.jq}/bin:${pkgs.coreutils}/bin:${pkgs.gnugrep}/bin:${pkgs.gnused}/bin:${pkgs.git}/bin:${pkgs.nodejs_20}/bin:${pkgs.bash}/bin:$PATH"

          git config --global user.name "OpenFang Personal Hand"
          git config --global user.email "bot@guatoc.co"

          exec ${openfang-pkg}/bin/openfang start --config "$HOME/config.toml"
        '';
      }
    ) cfg.agents);
  };
}
