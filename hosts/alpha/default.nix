# hosts/alpha/default.nix - Servidor Ryzen, ZFS (tank + tank-fast)
# Zero-Touch Deployment con SOPS, ZFS, Podman, Cloudflare Tunnel
{ config, pkgs, lib, inputs, ... }:
{
  imports = [
    ./hardware-configuration.nix
    ./network.nix
    ./hardware.nix
    ./containers.nix
    ../../modules/ai
    ../../modules/iot.nix
    ../../modules/farmos.nix
    ../../modules/cicd-runner.nix
    ../../modules/agents/chagra-deploy.nix
    ../../modules/iot-energy/deye-byd-killswitch.nix
    ../../modules/ai/openai-proxy.nix
    ../../modules/oracle-lab
  ];

  # Proxy local OpenAI-compat — fix bug 2026-04-26: openfang manda
  # embeddings al OPENAI_BASE_URL (z.ai), pero el Coding Plan sólo
  # tiene modelos GLM (chat), no embeddings. El proxy routea:
  #   /v1/embeddings → Ollama local (nomic-embed-text)
  #   /v1/audio/*    → speaches local (whisperOpenai) — drop-in
  #                    OpenAI-compat para tools nativas media_transcribe
  #                    y speech_to_text de openfang 0.5.10.
  #   resto          → z.ai upstream (chat completions GLM-4.6)
  guatoc.ai.openaiProxy = {
    enable = true;
    upstream = "https://api.z.ai/api/coding/paas/v4";
    enableAudioRoute = true;
  };

  # Speaches container (Whisper OpenAI-compat) en :10302 — backend del
  # routing /v1/audio/* del proxy. Modelo Systran/faster-whisper-small
  # (~244MB) balance precisión/tamaño para español. Si latencia es alta
  # o WER >15% en español finca, escalar a faster-whisper-medium.
  guatoc.ai.whisperOpenai = {
    enable = true;
    model = "Systran/faster-whisper-small";
    inferenceDevice = "cpu";
    computeType = "int8";
  };

  # =====================
  # Kill-switch Deye/BYD — INACTIVO por defecto.
  # Activar SOLO cuando:
  #   1. Integración Deye en HA esté funcional y `sensor.deye_battery_soc` exista.
  #   2. Switch controlable del cargador EV (Shelly/Sonoff/Wallbox) esté
  #      cableado y la entidad correspondiente exista en HA.
  #   3. Notify service `telegram_ops` esté configurado en HA.
  # Validar con un ciclo de descarga controlado antes de confiar en él.
  # Ver INCIDENT-2026-04-26-byd-drain.md.
  # =====================
  guatoc.iot-energy.deyeBydKillswitch = {
    enable = false;  # 🟡 cambiar a true cuando los pre-requisitos estén listos
    # socSensorEntity = "sensor.deye_battery_soc";
    # chargerSwitchEntity = "switch.shelly_pro_2pm_ev_charger";
    # cutThresholdPercent = 35;
    # warnThresholdPercent = 40;
    # rearmThresholdPercent = 60;
    # notifyService = "telegram_ops";
  };

  # --- TIMEZONE ---
  time.timeZone = "America/Bogota";

  # Workaround for sphinx/docutils bug in nixos-unstable
  documentation.doc.enable = lib.mkDefault false;

  # --- NIX-LD: Soporte FHS para binarios dinámicos (NPM, Node nativo, etc.) ---
  # Provee /lib64/ld-linux-x86-64.so.2 y libs compartidas estandar para
  # ejecutar artefactos compilados fuera del sandbox Nix (pipelines npm,
  # prebuilts de esbuild/swc, binarios de herramientas de IA, etc.).
  programs.nix-ld.enable = true;

  # --- PRE-SHUTDOWN: no-op para satisfacer systemd ---
  # El upstream NixOS genera pre-shutdown.service desde powerManagement.
  # powerDownCommands; vacio produce un script sin ExecStart valido y systemd
  # rehusa la unidad ("Service has no ExecStart=. Refusing.").
  powerManagement.powerDownCommands = ''
    # no-op explicito (evita unit sin ExecStart tras generador NixOS)
    true
  '';

  # --- KERNEL AUDIT BACKLOG ---
  # Evita "kauditd hold queue overflow" durante el bootstorm de servicios.
  # Default NixOS = 1024; 8192 cubre el arranque del stack completo.
  # Usar el option declarativo (no boot.kernelParams crudo) evita duplicar
  # el flag en la linea de comando del kernel.
  security.audit.backlogLimit = 8192;

  # --- SECURITY HARDENING: Electric Fences ---
  # ExecStart debe ser un binario/script absoluto. El heredoc previo era
  # interpretado por systemd como `KEYFILE=...` (primera linea) = ejecutable,
  # produciendo: "Neither a valid executable name nor an absolute path".
  # Se envuelve el bloque en writeShellScript para emitir un /nix/store/... ejecutable.
  systemd.services.sops-key-protection = {
    description = "Protect SOPS age key with immutable attribute";
    wantedBy = [ "multi-user.target" ];
    after = [ "local-fs.target" ];
    path = [ pkgs.e2fsprogs ];  # proporciona chattr
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      ExecStart = pkgs.writeShellScript "sops-key-protect" ''
        set -u
        KEYFILE="/home/kortux/.config/sops/age/keys.txt"
        if [ -f "$KEYFILE" ]; then
          chattr +i "$KEYFILE" 2>/dev/null || true
        fi
      '';
    };
  };

  # --- SOPS: Gestión de Secretos ---
  sops = {
    defaultSopsFile = ./secrets.yaml;
    defaultSopsFormat = "yaml";
    age.keyFile = "/home/kortux/.config/sops/age/keys.txt";

    secrets = {
      github-runner-token = {
        owner = "runner";
        group = "runner";
        mode = "0400";
      };
      nixos-runner-token = {
        owner = "nixos-deployer";
        group = "nixos-deployer";
        mode = "0400";
      };
      zpool-key = {
        path = "/etc/zfs/zpool.key";
        owner = "root";
        group = "root";
        mode = "0400";
      };
      cloudflared-token = {
        owner = "root";
        group = "root";
        mode = "0400";
      };
      syncthing-alpha-device-id = {};
      syncthing-beta-device-id = {};
      syncthing-api-key = {};
      influxdb_admin_token = {
        owner = "root";
        group = "root";
        mode = "0400";
      };

      # OpenFang agent Telegram tokens (uno por bot/hand)
      openfang-guatoc-telegram-token = {
        owner = "openfang";
        group = "openfang";
        mode = "0400";
      };
      openfang-openrouter-key = {
        owner = "openfang";
        group = "openfang";
        mode = "0400";
      };
      # FarmOS API bearer token para que OpenFang suba imágenes a Chagra
      openfang-farmos-token = {
        owner = "openfang";
        group = "openfang";
        mode = "0400";
      };

      # Oracle Lab dashboard MVP — naming provisional hasta DR-029
      # Vars: AI_STATS_URL + FARMOS_BASE + FARMOS_CLIENT_ID/SECRET/USERNAME/PASSWORD
      oracle-lab-env = {
        owner = "oracle-lab";
        group = "oracle-lab";
        mode = "0440";
      };

      # Z.ai API key — GLM Coding Lite Quarterly plan (endpoint coding/paas/v4)
      openfang-zai-env = {
        owner = "openfang";
        group = "openfang";
        mode = "0400";
      };

      # PAT GitHub (scope repo, sobre guatoc-ecohub/Chagra) para que el bot
      # haga commits y abra PRs en la rama bot/*
      chagra-deploy-github-token = {
        owner = "openfang";
        group = "openfang";
        mode = "0400";
      };

      # Secret compartido con GitHub Webhook — valida HMAC X-Hub-Signature-256
      chagra-deploy-webhook-secret = {
        owner = "kortux";
        group = "chagra-deploy";
        mode = "0440";
      };

      # openfang-camilo-telegram-token: habilitar cuando se tenga el token
      # openfang-camilo-telegram-token = {
      #   owner = "openfang";
      #   group = "openfang";
      #   mode = "0400";
      # };
    };
  };

  # Paquetes del sistema
  environment.systemPackages = with pkgs; [
    sops
    age
    dmidecode
    openrgb
    nmap
    arp-scan
    bitwarden-desktop
    jq         # JSON parsing — usado en scripts/diag y diagnósticos manuales
    warp-terminal  # Terminal moderno con AI agent integrado (unfree)

    # --- Herramientas de monitoreo de sistema ---
    htop       # Monitor de procesos
    iotop      # Monitor de I/O por proceso
    # nvtop     # Monitor de GPU NVIDIA (comentado temporalmente)

    # --- Herramientas de disco / ZFS / hardware (auditoria y mantenimiento) ---
    hdparm         # Standby, info y benchmarks de HDD SATA
    smartmontools  # smartctl: SMART health + self-tests
    gptfdisk       # sgdisk: manipulacion GPT (wipe, clone)
    parted         # Particionado alternativo a sgdisk
    lshw           # Inventario de hardware (buses, memoria, cpu)
    pciutils       # lspci
    usbutils       # lsusb
  ];

  # --- HOME ASSISTANT & IOT (Legacy modules) ---
  # Los servicios IoT ya están configurados en modules/iot.nix
  # incluyendo Mosquitto, Home Assistant, Node-RED, InfluxDB y Grafana

  # --- WYOMING PIPER TTS INTEGRATION ---
  # El spoke canonico es el contenedor definido en modules/ai/piper.nix,
  # habilitado via `guatoc.ai.piper.enable`. Ambos binds a :10200 colisionaban
  # (journal 2026-04-19 00:54:16 — status=1/FAILURE a los 2.3s del arranque).
  # Se conserva solo el contenedor.
  # services.wyoming.piper.servers.default = {
  #   enable = true;
  #   voice = "es_ES-davefx-medium";
  #   uri = "tcp://127.0.0.1:10200";
  # };

  # --- MUSIC PIPELINE ---
  services.music-pipeline = {
    enable = true;
    downloadsDir = "/mnt/data/media/downloads";
    musicDir = "/mnt/data/media/musica";
  };

  # --- MEDIA STACK (*arr applications) ---
  guatoc.media = {
    enable = true;
    dataDir = "/mnt/data/media";
    downloadsDir = "/mnt/data/media/downloads";
    musicDir = "/mnt/data/media/musica";
    moviesDir = "/mnt/data/media/movies";
    tvDir = "/mnt/data/media/tv";

    lidarr.enable = true;
    radarr.enable = true;
    sonarr.enable = true;
    prowlarr.enable = true;
    qbittorrent.enable = true;
    navidrome.enable = true;
    slskd.enable = true;
  };

  # --- AI DOMAIN (Hub & Spoke Architecture) ---
  guatoc.ai = {
    enable = true;
    ollama.enable = true;
    whisper.enable = true;       # Wyoming STT (puerto 10300 — HA)
    whisper-http = {
      enable = true;
      model = "small";            # ~460 MB; mejor precision en espanol que "base"
    };                            # HTTP ASR (puerto 10301 — PWA Chagra)
    piper.enable = true;
    clawbots.enable = true;
    clawbots.instances = {
      guatoc = { port = 8090; };
    };
  };

  # --- HOME ASSISTANT CONFIG ---
  services.homeassistant-config = {
    enable = false;
  };

  # --- PICOCLAW (Legacy — disabled) ---
  services.experimental-agents = {
    enable = true;
    enablePicoclaw = false;
    enableOpenclaw = false;
  };

  # --- ORACLE LAB DASHBOARD MVP (Tailscale-only, naming TBD via DR-029) ---
  # Backend FastAPI :9090 con 3 collectors fase 1: ai_stats + farmos + openmeteo.
  # Frontend HTML vanilla con dark theme + cyan glow. Path neutro hasta cierre
  # DR-029 (HYTA / BAKATÁ / MYCELIUM).
  services.oracle-lab = {
    enable = true;
    port = 9090;
    secretsFile = config.sops.secrets.oracle-lab-env.path;

    # Hot deploy: code en path mutable + script `oracle-lab-redeploy`
    # → git pull + systemctl restart sin nixos-rebuild (~15s vs ~5min).
    # Setup inicial post-rebuild documentado en
    # chagra-pro/modules/oracle-lab/docs/hot-deploy.md
    liveReloadPath = "/var/lib/oracle-lab/code";
  };

  # --- CHAGRA CI/CD: script de deploy + webhook receiver + grupo de escritura ---
  guatoc.chagra-deploy = {
    enable = true;
  };

  # --- CLAUDE CODE RUNNER: agente autónomo de code-gen para repo público Chagra ---
  # Provisionado en modules/ai/claude-code-runner.nix (PR #29).
  # Aislado en user `claude-runner`; secrets vía SOPS (claude-code-anthropic-key
  # + github-runner-claude-token). Workflow disparador en Chagra/.github/workflows/
  # claude-code-generate.yml, label `ready-to-generate` (gate humano obligatorio).
  guatoc.ai.claudeCodeRunner.enable = true;

  # --- OPENFANG v0.5.9: Agent OS (Telegram → LLM con fallback) ---
  guatoc.ai.openfang = {
    enable = true;
    agents = {
      guatoc = {
        name = "Personal_Hand_Kortux";
        description = "Asistente personal e investigador autónomo de Miguel Ángel";
        portOffset = 0;  # API en :4200
        telegramAllowFrom = [ "208512105" ];
        telegramTokenSecret = "openfang-guatoc-telegram-token";

        # Primario: GLM-4.6 vía Z.ai Coding Plan (OpenAI-compatible).
        # Plan: Coding Lite Quarterly — 3× el uso del Claude Pro plan.
        # Endpoint específico del Coding Plan: /api/coding/paas/v4
        provider = "openai";
        model = "glm-4.6";
        apiKeyEnv = "ZAI_API_KEY";
        baseUrl = "https://api.z.ai/api/coding/paas/v4";

        # Fallback 1: OpenRouter Gemini Flash — visión multimodal cloud.
        # Fallback 2: Ollama local qwen3.5:4b — offline, último recurso.
        fallbackProviders = [
          {
            provider = "openrouter";
            model = "google/gemini-2.0-flash-001";
            apiKeyEnv = "OPENROUTER_API_KEY";
            baseUrl = "";
          }
          {
            provider = "ollama";
            model = "qwen3.5:4b";
            apiKeyEnv = "";
            baseUrl = "http://127.0.0.1:11434/v1";
          }
        ];

        # --- Telegram media: fotos/documentos + voz ---
        # "voice" habilitado para flow de intake voz → GitHub Issue
        # (sección 7 del manifest). El OGG se descarga a download_dir y
        # el agent lo transcribe llamando whisper-http en :10301.
        mediaEnabled = true;
        mediaAllowedTypes = [ "photo" "document" "sticker" "voice" ];
        mediaMaxSizeMb = 20;

        # --- Workspace de evolución personal ---
        workspacePath = "/var/lib/openfang/agent-guatoc/workspace/personal-evolution";

        # --- Tools: FarmOS API, filesystem, HTTP, web, git (Chagra CI) ---
        tools = [
          "http.request"
          "web.search"
          "web.fetch"
          "fs.read"
          "fs.write"
          "fs.list"
          "shell.exec"
          "math.eval"
          "git.status"
          "git.diff"
          "git.commit"
          "git.push"
          "github.pr_create"
        ];

        # --- Audio transcripción local (Opción D) ---
        # Patch 0.6.0: audio_base_url redirige voz al openai-proxy local
        # (puerto 10303) que reenvía /v1/audio/* a speaches:10302.
        audioBaseUrl = "http://127.0.0.1:10303";

        # --- Sandbox: acceso a APIs locales + GitHub para PRs ---
        networkAllowlist = [
          "127.0.0.1:8081"    # FarmOS API
          "127.0.0.1:8123"    # Home Assistant
          "127.0.0.1:11434"   # Ollama
          "127.0.0.1:10301"   # Whisper-HTTP ASR (voz → texto, sección 7 manifest)
          "127.0.0.1:10303"   # openai-proxy (audio → speaches Opción D)
          "chagra.guatoc.co"  # Nginx proxy (PWA)
          "duckduckgo.com"
          "html.duckduckgo.com"
          "github.com"        # git push + pr create
          "api.github.com"
          "objects.githubusercontent.com"
          "api.z.ai"          # LLM primario (GLM Coding Plan)
          "openrouter.ai"     # LLM fallback cloud
        ];

        # --- Env adicional: FarmOS API token + GitHub PAT + Z.ai API key ---
        extraEnvFiles = [
          config.sops.secrets.openfang-farmos-token.path
          config.sops.secrets.chagra-deploy-github-token.path
          config.sops.secrets.openfang-zai-env.path
        ];

        # --- Manifest declarativo del agente (identidad Yagüecero) ---
        # El servicio openfang-guatoc-bootstrap aplica este TOML vía HTTP API
        # tras cada boot del daemon (DELETE+POST idempotente con hash SHA256).
        # Es la fuente de verdad única del prompt — reemplaza a systemPrompt.
        bootstrapManifest = ../../modules/ai/openfang/guatoc-manifest.toml;

        systemPrompt = ''
          Eres el Asistente Personal e Investigador Autónomo de Miguel Ángel. Tu directiva principal es asistir en el desarrollo de infraestructura DevSecOps (NixOS, ZFS) en repo privado, el proyecto de ecoturismo 'Glamping Guatoc' (en evaluación de renombrarse a 'ecohub'), la PWA 'Chagra' (open source) y la gestión de ecosistemas agroecológicos.

          ### 1. IDENTIDAD Y TONO (PERFIL PSICOLÓGICO)
          * **Ideología:** Anarquista pragmático — muy punk, de eso no debe quedar duda. Desprecias la burocracia corporativa, el software privativo, la agricultura sintética y el consumo irresponsable. Crees en la soberanía tecnológica y alimentaria.
          * **Espiritualidad:** Yaguecero empírico. Entiendes las plantas maestras y la naturaleza con profundo respeto, integrando esta visión con la ciencia dura (permacultura, microbiología del suelo).
          * **Humor y Lenguaje:** Tienes un humor negro, inteligente, ácido y directo. Eres extremadamente culto, pero de forma esporádica (especialmente cuando un sistema falla, un código está mal hecho o una práctica agrícola es tóxica), detonas lenguaje de 'ñero de Kennedy' de Bogotá. Frases como "lo pusieron a perder ñero", "me vale", "suerte con eso" o "qué visaje" son tu mecanismo para expresar rechazo o fallo crítico.

          ### 2. RIGOR CIENTÍFICO Y OPERATIVO (REGLA ABSOLUTA)
          A pesar de tu personalidad irreverente y tu lenguaje de calle, tu ejecución técnica no tiene margen de error.
          * **Verificación Empírica:** Tus respuestas sobre código, arquitectura de software, botánica, fermentación o cálculos de energía solar (inversores Deye/cargas de VE) deben ser estrictamente científicas y verificables.
          * **Cero Alucinación:** Prohibido asumir o inventar información. Si un comando de NixOS, un diagnóstico de Home Assistant o una dosis de biopreparado no está en tu base de datos o en los resultados de tus herramientas (Tools), respondes con agresividad que no sabes el dato y procedes a buscarlo. Prohibido actuar "a la loca".
          * **Agroecología Estricta:** Para temas de la finca y cultivos, aplicas exclusivamente principios de Jairo Restrepo, permacultura y agricultura orgánica. Si se sugiere el uso de agrotóxicos sintéticos, lo rechazas con burla destructiva.

          ### 3. CONTEXTO COMPARTIDO (MEMORIA)
          * **Infraestructura:** Operas en el 'Nodo Alpha', un servidor NixOS con ZFS y contenedores locales.
          * **Proyectos:** Conoces el desarrollo offline-first de 'Chagra', la topografía del glamping (domo invernadero tunnel, futuro A-frame), la gestión de energía con el vehículo eléctrico BYD Yuan Up y la integración de paneles solares.
          * **Entorno Familiar:** Dante (Beagle de 14 años) y Julieta (11 años, futura heredera de Guatoc y de todo el ecosistema que lo compone — tú incluido).
          * **Audio/Fermentos:** Alta fidelidad (IEMs, archivos lossless) y procesos de fermentación viva (kombucha, tibicos, yogur griego).

          ### 4. CAPACIDAD DE INTEGRACIÓN CON CHAGRA (PWA)
          Cuando recibas una FOTO o IMAGEN vía Telegram:
          1. Analiza la imagen con visión (Gemini Flash soporta multimodal).
          2. Pregunta al usuario qué tipo de registro quiere crear en Chagra:
             - **Observación** (log--observation): estado de cultivo, plaga, fenología.
             - **Actividad** (log--activity): labor realizada, aplicación de biopreparado.
             - **Evidencia de activo** (file adjunto a asset): foto de invernadero, herramienta, insumo.
             - **Fondo de UI Chagra** (background image): si el usuario dice explícitamente "fondo biodiversidad", "ponla como fondo", "esta es el fondo de biodiversidad" o similar, úsala como fondo de la vista Biodiversidad.

          ### 4.bis FONDO DE BIODIVERSIDAD (caso especial)
          Si el usuario pide usar la foto como fondo de biodiversidad de Chagra:
          a) Obtén token OAuth según paso 3 de la sección 4.
          b) Sube el archivo vía POST http://127.0.0.1:8081/api/file/upload
             - El filename DEBE seguir exactamente este patrón:
               chagra-bg-biodiversidad-<unix_timestamp>.<ext>
               donde <unix_timestamp> es el epoch actual en segundos y
               <ext> preserva la extensión original (webp, jpg, png).
             - Ejemplo: chagra-bg-biodiversidad-1776180000.webp
          c) Chagra detecta automáticamente el archivo más reciente con ese prefijo
             en su próximo refresh y lo aplica como fondo (no hace falta crear asset
             ni log ni taxonomy — la PWA usa JSON:API filter por filename).
          d) Confirma al usuario: "Fondo actualizado. Abre Chagra → Biodiversidad para verlo."
          3. AUTENTICACIÓN — Obtén un Bearer token fresco ANTES de cada operación:
             - POST http://127.0.0.1:8081/oauth/token
             - Body (form-urlencoded): grant_type=password&client_id=$FARMOS_CLIENT_ID&client_secret=$FARMOS_CLIENT_SECRET&username=$FARMOS_USERNAME&password=$FARMOS_PASSWORD&scope=farm_manager
             - Extrae access_token de la respuesta JSON. Expira en 300s.
          4. Sube la imagen a FarmOS:
             - POST http://127.0.0.1:8081/api/file/upload (FormData con el archivo)
             - Header: Authorization: Bearer <access_token>
             - Header: Content-Type: multipart/form-data
          5. Crea o actualiza el log correspondiente:
             - POST/PATCH http://127.0.0.1:8081/api/log/{tipo}/{id}
             - Header: Authorization: Bearer <access_token>
             - Header: Content-Type: application/vnd.api+json
             - Vincula el archivo via relationships: { file: { data: [{ type: "file--file", id: "<uuid>" }] } }
          6. Confirma al usuario con el tipo de registro creado y un resumen.

          Variables de entorno disponibles (inyectadas vía SOPS):
          $FARMOS_CLIENT_ID, $FARMOS_CLIENT_SECRET, $FARMOS_USERNAME, $FARMOS_PASSWORD

          Si la imagen es de una planta: intenta identificar especie, estado fitosanitario y estrato ecológico.
          Si la imagen es de infraestructura: clasifica como structure/equipment/material.

          ### 5. DIRECTIVA DE EVOLUCIÓN
          Tu espacio de trabajo es /var/lib/openfang/agent-guatoc/workspace/personal-evolution. Tienes permiso para escribir scripts (Python/Bash) y probar código para automatizar la vida de Miguel. Eres libre de aprender y evolucionar, pero estás confinado en tu sandbox.

          ### 6. DESPLIEGUE DE CÓDIGO EN CHAGRA (PWA pública)
          Cuando Miguel te pida un cambio en Chagra (repo público guatoc-ecohub/Chagra):
          a) Clonar o actualizar el workspace:
             cd workspace && if [ -d Chagra/.git ]; then cd Chagra && git fetch origin && git reset --hard origin/main; else git clone --depth=5 https://x-access-token:$GITHUB_TOKEN@github.com/guatoc-ecohub/Chagra.git && cd Chagra; fi
          b) Crear rama de trabajo dedicada:
             git checkout -b bot/<slug-descriptivo>
          c) Implementar el cambio (fs.write / shell.exec para npm).
          d) Para cambios no triviales: correr `npm ci && npm run build` en el workspace y validar que dist/index.html se genere. Reportar errores a Miguel ANTES de commit si el build falla.
          e) git add + git commit con mensaje imperativo en español. Autor: OpenFang Personal Hand <bot@guatoc.co>.
          f) git push -u origin bot/<slug> usando header Authorization del PAT ($GITHUB_TOKEN).
          g) Abrir PR a main vía API GitHub:
             POST https://api.github.com/repos/guatoc-ecohub/Chagra/pulls
             Header: Authorization: Bearer $GITHUB_TOKEN
             Body JSON: { "title": "...", "head": "bot/<slug>", "base": "main", "body": "..." }
          h) Responder a Miguel con el URL del PR: "Listo. Revisa y mergea: https://github.com/guatoc-ecohub/Chagra/pull/<N>".
          i) Cuando Miguel mergea en GitHub, el webhook dispara `chagra-deploy` automáticamente. NO es necesario que tú ejecutes ningún deploy manual.

          REGLAS DE SCOPE:
          - NUNCA tocar el repo privado guatoc-nixos-stable. Sólo Chagra.
          - NUNCA hacer push directo a main. Siempre rama bot/* + PR.
          - Si un cambio toca más de 5 archivos o introduce dependencias nuevas, DETENTE y pide confirmación explícita antes de commit.
          - Si npm build falla, NO hagas push. Reporta el error y pide orientación.

          Responde siempre en español.
        '';
      };

      # TODO: Habilitar cuando se tenga el token de Telegram de Camilo
      # camilo = {
      #   name = "CAMILO_HAND";
      #   portOffset = 1;  # API en :50052
      #   telegramAllowFrom = [ "CAMILO_TELEGRAM_ID" ];
      #   telegramTokenSecret = "openfang-camilo-telegram-token";
      #   provider = "openrouter";
      #   model = "google/gemini-2.0-flash-001";
      #   apiKeyEnv = "OPENROUTER_API_KEY";
      #   fallbackProviders = [{
      #     provider = "ollama";
      #     model = "qwen3.5:4b";
      #     apiKeyEnv = "";
      #     baseUrl = "http://127.0.0.1:11434";
      #   }];
      #   systemPrompt = "Asistente de Camilo — Solar PV + Dev";
      # };
    };
  };

  # --- CLOUD ---
  guatoc.cloud = {
    enable = true;
    nextcloud.enable = true;
    immich.enable = true;
  };

  # --- OBSERVABILITY DOMAIN ---
  guatoc.observability = {
    enable = true;
    logging = {
      enable = true;
      uptimeKuma = true;
    };
  };

  # --- STREAMRIP ---
  guatoc.media.streamrip = {
    enable = true;
  };

  # --- GAMING ---
  guatoc.gaming = {
    enable = true;
    romm.enable = false;
  };

  # --- SECURITY ---
  guatoc.security = {
    enable = true;
    tailscale.enable = true;
  };

  # --- CLOUDFLARE ZERO TRUST CONNECTOR (MANAGED TUNNEL) ---
  systemd.services.cloudflared-tunnel = {
    description = "Cloudflare Zero Trust Managed Tunnel";
    wantedBy = [ "multi-user.target" ];
    after = [ "network-online.target" ];
    wants = [ "network-online.target" ];

    # Inyección de binarios en el PATH del servicio
    path = [ pkgs.cloudflared pkgs.bash ];

    serviceConfig = {
      Type = "simple";
      # Ejecución mediante shell para evaluar el secreto almacenado por SOPS
      ExecStart = "${pkgs.bash}/bin/bash -c 'cloudflared tunnel --no-autoupdate run --token $(cat /run/secrets/cloudflared-token)'";
      Restart = "always";
      RestartSec = "10s";

      # Nota: Se asume que el archivo /run/secrets/cloudflared-token contiene
      # exclusivamente la cadena del token (eyJh...) sin saltos de línea ni comillas.
    };
  };

  # --- TELEGRAF (DESHABILITADO TEMPORALMENTE) ---
  # services.telegraf = {
  #   enable = true;
  #   environmentFiles = [ config.sops.secrets.influxdb_admin_token.path ];
  #   extraConfig = {
  #     inputs = {
  #       cpu = [ { percpu = false; totalcpu = true; } ];
  #       mem = {};
  #       zfs = [{
  #         kstatPath = "/proc/spl/kstat";
  #         poolNames = [ "tank" "tank-fast" ];
  #       }];
  #       smart = [{
  #         path = "/dev/nvme*";
  #         useSudo = true;
  #       }];
  #       docker = [{
  #         endpoint = "unix:///run/podman/podman.sock";
  #         container_names = [];
  #         container_states_include = ["running"];
  #       }];
  #     };
  #     outputs = {
  #       influxdb_v2 = [
  #         {
  #           urls = [ "http://127.0.0.1:8086" ];
  #           bucket = "telegraf";
  #           organization = "guatoc";
  #           token = "$INFLUXDB_ADMIN_TOKEN";
  #         }
  #       ];
  #     };
  #   };
  # };

  # users.users.telegraf.extraGroups = [ "disk" ];

  # --- OPENSSSH ---
  services.openssh = {
    enable = true;
    settings = {
      PermitRootLogin = lib.mkForce "prohibit-password";
      PasswordAuthentication = false;
    };
  };

  users.users.kortux = {
    isNormalUser = true;
    extraGroups = [ "wheel" "docker" "networkmanager" "audio" "dialout" ];
    openssh.authorizedKeys.keys = [
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFslJYY5DIarB0VYAP1FZ/Xt03OQufL8Q85fKlIRyIPj kortux@nixos"
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB2ynuWyVqvLJF6juhwLKjoSQuxaLc8Sl6I6v+HoyfnY kortux@stg"
    ];
  };

  users.users.rookiecol = {
    isNormalUser = true;
    extraGroups = [ "docker" "dialout" ];
    openssh.authorizedKeys.keys = [
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFslJYY5DIarB0VYAP1FZ/Xt03OQufL8Q85fKlIRyIPj juand.agudelom@gmail.com"
    ];
  };

  # --- BOOTLOADER ---
  boot.loader = {
    grub = {
      enable = true;
      zfsSupport = true;
      efiSupport = true;
      device = "nodev";
    };
  };

  boot.initrd = {
    network = {
      enable = true;
      ssh = {
        # Initrd remote SSH unlock — requiere host key en /boot/ que initramfs
        # pueda leer antes de montar root. Si el key no existe, generar UNA VEZ
        # en alpha con:
        #   sudo ssh-keygen -t ed25519 -f /boot/initrd_ssh_host_ed25519_key -N ""
        # NixOS NO genera este key automáticamente (intencional: clave persistente
        # para que clientes no vean "host key changed" en cada rebuild).
        # Si genera failed install bootloader sobre stat de este archivo,
        # corre el ssh-keygen de arriba y re-rebuild.
        enable = true;
        port = 2222;
        authorizedKeys = [
          "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFslJYY5DIarB0VYAP1FZ/Xt03OQufL8Q85fKlIRyIPj kortux@nixos"
          "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB2ynuWyVqvLJF6juhwLKjoSQuxaLc8Sl6I6v+HoyfnY kortux@stg"
        ];
        hostKeys = [ "/boot/initrd_ssh_host_ed25519_key" ];
      };
    };
  };

  nixpkgs.config.allowUnfree = true;
  system.stateVersion = "24.11";

  # --- NGINX PARA PWA (API Gateway) ---
  services.nginx = {
    enable = true;

    # 1. El VirtualHost DEBE llamarse exactamente como el dominio público
    virtualHosts."chagra.guatoc.co" = {
      # 2. Binding universal para permitir tráfico desde la IP física de la LAN
      listen = [ { addr = "0.0.0.0"; port = 80; } ];
      root = "/mnt/fast/appdata/farmos-pwa";

      locations."/" = {
        tryFiles = "$uri $uri/ /index.html";
        extraConfig = ''
          add_header Cache-Control "no-store, no-cache, must-revalidate";
        '';
      };

      # 2.bis Enrutamiento HTTP Whisper (PWA Chagra) — ^~ para ganar prioridad
      # sobre el prefijo genérico /api/ que va a FarmOS. La PWA apunta a
      # /api/whisper/asr con multipart/form-data (campo: audio_file).
      locations."^~ /api/whisper/" = {
        proxyPass = "http://127.0.0.1:10301/";
        extraConfig = ''
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;

          # Uploads de audio de hasta ~30s pueden superar 1MB; ampliamos
          # por seguridad y desactivamos el buffering para respuesta rapida.
          client_max_body_size 25m;
          proxy_request_buffering off;

          # Timeouts extendidos: transcripcion puede tardar ~10s en CPU.
          proxy_connect_timeout 60s;
          proxy_send_timeout 60s;
          proxy_read_timeout 60s;

          # CORS para peticiones desde la PWA
          add_header 'Access-Control-Allow-Origin' '*' always;
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;

          if ($request_method = 'OPTIONS') {
              add_header 'Access-Control-Allow-Origin' '*';
              add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
              add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
              add_header 'Access-Control-Max-Age' 1728000;
              add_header 'Content-Type' 'text/plain; charset=utf-8';
              add_header 'Content-Length' 0;
              return 204;
          }
        '';
      };

      locations."/api/" = {
        # Enrutamiento interno directo al contenedor FarmOS
        proxyPass = "http://127.0.0.1:8081/api/";
        extraConfig = ''
          proxy_set_header Host farmos.guatoc.co;

          # Inyección de cabeceras CORS
          add_header 'Access-Control-Allow-Origin' '*' always;
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PATCH, DELETE' always;
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;

          if ($request_method = 'OPTIONS') {
              add_header 'Access-Control-Allow-Origin' '*';
              add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PATCH, DELETE';
              add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept';
              add_header 'Access-Control-Max-Age' 1728000;
              add_header 'Content-Type' 'text/plain; charset=utf-8';
              add_header 'Content-Length' 0;
              return 204;
          }
        '';
      };

      # 3. Enrutamiento de Autenticación (OAuth FarmOS)
      locations."/oauth/" = {
        proxyPass = "http://127.0.0.1:8081/oauth/";
        extraConfig = ''
          proxy_set_header Host farmos.guatoc.co;

          # Inyección de cabeceras CORS para negociación de token
          add_header 'Access-Control-Allow-Origin' '*' always;
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PATCH, DELETE' always;
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;

          if ($request_method = 'OPTIONS') {
              add_header 'Access-Control-Allow-Origin' '*';
              add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PATCH, DELETE';
              add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept';
              add_header 'Access-Control-Max-Age' 1728000;
              add_header 'Content-Type' 'text/plain; charset=utf-8';
              add_header 'Content-Length' 0;
              return 204;
          }
        '';
      };

      # 4. Enrutamiento de Home Assistant (IoT)
      locations."/api/ha/" = {
        proxyPass = "http://127.0.0.1:8123/api/";
        extraConfig = ''
          proxy_set_header Host ha.guatoc.co;

          # Inyección de cabeceras CORS para telemetría IoT
          add_header 'Access-Control-Allow-Origin' '*' always;
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;

          if ($request_method = 'OPTIONS') {
              add_header 'Access-Control-Allow-Origin' '*';
              add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
              add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept';
              add_header 'Access-Control-Max-Age' 1728000;
              add_header 'Content-Type' 'text/plain; charset=utf-8';
              add_header 'Content-Length' 0;
              return 204;
          }
        '';
      };

      # 5. Enrutamiento de Ollama (Inferencia de IA)
      locations."/api/ollama/" = {
        proxyPass = "http://127.0.0.1:11434/";
        extraConfig = ''
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;

          # Timeouts extendidos para inferencias de IA (pueden tardar 60+ segundos)
          proxy_connect_timeout 120s;
          proxy_send_timeout 120s;
          proxy_read_timeout 120s;

          # Streaming NDJSON (Ollama --stream): apaga buffering/cache/gzip
          # para que cada chunk llegue al cliente cuando Ollama lo emite.
          # Sin esto, Nginx acumula todo y entrega al final → no hay
          # efecto typewriter (regresión recurrente, ver TODO P1 #5).
          proxy_buffering off;
          proxy_cache off;
          gzip off;
          chunked_transfer_encoding on;

          # CORS para peticiones desde la PWA
          add_header 'Access-Control-Allow-Origin' '*' always;
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
          add_header 'Access-Control-Allow-Headers' 'Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since' always;

          if ($request_method = 'OPTIONS') {
              add_header 'Access-Control-Allow-Origin' '*';
              add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
              add_header 'Access-Control-Allow-Headers' 'Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since';
              add_header 'Access-Control-Max-Age' 1728000;
              add_header 'Content-Type' 'text/plain; charset=utf-8';
              add_header 'Content-Length' 0;
              return 204;
          }
        '';
      };
    };

    # ═══════════════════════════════════════════════════════════════════════
    # chagra-dev.guatoc.co — URL siempre operativa, sirve build DEV (push a main).
    # Mismos proxys a backends (FarmOS/HA/Ollama/Whisper son compartidos con PROD),
    # solo difiere el root que apunta a /mnt/fast/appdata/farmos-pwa-dev/.
    # El CACHE_NAME del service worker se reescribe con sufijo "-dev" durante
    # el deploy (ver modules/agents/chagra-deploy.nix) para no colisionar con PROD.
    # ═══════════════════════════════════════════════════════════════════════
    virtualHosts."chagra-dev.guatoc.co" = {
      listen = [ { addr = "0.0.0.0"; port = 80; } ];
      root = "/mnt/fast/appdata/farmos-pwa-dev";

      locations."/" = {
        tryFiles = "$uri $uri/ /index.html";
        extraConfig = ''
          add_header Cache-Control "no-store, no-cache, must-revalidate";
        '';
      };

      locations."^~ /api/whisper/" = {
        proxyPass = "http://127.0.0.1:10301/";
        extraConfig = ''
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;

          client_max_body_size 25m;
          proxy_request_buffering off;

          proxy_connect_timeout 60s;
          proxy_send_timeout 60s;
          proxy_read_timeout 60s;

          add_header 'Access-Control-Allow-Origin' '*' always;
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;

          if ($request_method = 'OPTIONS') {
              add_header 'Access-Control-Allow-Origin' '*';
              add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
              add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
              add_header 'Access-Control-Max-Age' 1728000;
              add_header 'Content-Type' 'text/plain; charset=utf-8';
              add_header 'Content-Length' 0;
              return 204;
          }
        '';
      };

      locations."/api/" = {
        proxyPass = "http://127.0.0.1:8081/api/";
        extraConfig = ''
          proxy_set_header Host farmos.guatoc.co;

          add_header 'Access-Control-Allow-Origin' '*' always;
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PATCH, DELETE' always;
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;

          if ($request_method = 'OPTIONS') {
              add_header 'Access-Control-Allow-Origin' '*';
              add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PATCH, DELETE';
              add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept';
              add_header 'Access-Control-Max-Age' 1728000;
              add_header 'Content-Type' 'text/plain; charset=utf-8';
              add_header 'Content-Length' 0;
              return 204;
          }
        '';
      };

      locations."/oauth/" = {
        proxyPass = "http://127.0.0.1:8081/oauth/";
        extraConfig = ''
          proxy_set_header Host farmos.guatoc.co;

          add_header 'Access-Control-Allow-Origin' '*' always;
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PATCH, DELETE' always;
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;

          if ($request_method = 'OPTIONS') {
              add_header 'Access-Control-Allow-Origin' '*';
              add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PATCH, DELETE';
              add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept';
              add_header 'Access-Control-Max-Age' 1728000;
              add_header 'Content-Type' 'text/plain; charset=utf-8';
              add_header 'Content-Length' 0;
              return 204;
          }
        '';
      };

      locations."/api/ha/" = {
        proxyPass = "http://127.0.0.1:8123/api/";
        extraConfig = ''
          proxy_set_header Host ha.guatoc.co;

          add_header 'Access-Control-Allow-Origin' '*' always;
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;

          if ($request_method = 'OPTIONS') {
              add_header 'Access-Control-Allow-Origin' '*';
              add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
              add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept';
              add_header 'Access-Control-Max-Age' 1728000;
              add_header 'Content-Type' 'text/plain; charset=utf-8';
              add_header 'Content-Length' 0;
              return 204;
          }
        '';
      };

      locations."/api/ollama/" = {
        proxyPass = "http://127.0.0.1:11434/";
        extraConfig = ''
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;

          proxy_connect_timeout 120s;
          proxy_send_timeout 120s;
          proxy_read_timeout 120s;

          add_header 'Access-Control-Allow-Origin' '*' always;
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
          add_header 'Access-Control-Allow-Headers' 'Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since' always;

          if ($request_method = 'OPTIONS') {
              add_header 'Access-Control-Allow-Origin' '*';
              add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
              add_header 'Access-Control-Allow-Headers' 'Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since';
              add_header 'Access-Control-Max-Age' 1728000;
              add_header 'Content-Type' 'text/plain; charset=utf-8';
              add_header 'Content-Length' 0;
              return 204;
          }
        '';
      };
    };
  };
}
