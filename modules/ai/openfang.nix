# modules/ai/openfang.nix
# OpenFang — Gateway multitenant de agentes IA via Telegram
# Runtime: Picoclaw v0.2.0 (una instancia por agente)
# Aislamiento: Sandboxes por tmpfiles + ReadWritePaths estrictos
# Modelo: Ollama local (qwen3.5:4b, think:false) via API

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.openfang;

  picoclaw-src = pkgs.fetchurl {
    url = "https://github.com/sipeed/picoclaw/releases/download/v0.2.0/picoclaw_Linux_x86_64.tar.gz";
    sha256 = "sha256-bP+RgvrQ6B4nsF8vpdK5n1KiitSAFoK0/8cqM0KyNvY=";
  };

  picoclaw-pkg = pkgs.runCommand "picoclaw-pkg" { nativeBuildInputs = [ pkgs.gnutar ]; } ''
    mkdir -p $out/bin
    tar -xzf ${picoclaw-src} -C $out/bin
    chmod +x $out/bin/picoclaw
  '';

  # Genera la config JSON de Picoclaw para un agente dado
  mkAgentConfig = name: agent: pkgs.writeText "openfang-${name}-config.json" (builtins.toJSON {
    agents = {
      list = [{
        id = name;
        inherit (agent) name;
        description = agent.description or "${name} agent";
        model_name = "local-ollama";
        workspace = "/var/lib/openfang/workspace/${agent.workspace}";
        system_prompt = agent.systemPrompt;
        skills = [];
      }];
      defaults = {
        workspace = "/var/lib/openfang/workspace/${agent.workspace}";
        model_name = "openrouter-gemini";
        max_tokens = 4096;
        temperature = agent.temperature or 0.2;
        max_tool_iterations = 15;
      };
    };
    model_list = [
      {
        model_name = "local-ollama";
        model = "qwen3.5:4b";
        base_url = "http://127.0.0.1:11434/v1";
        api_key = "ollama";
      }
      {
        model_name = "openrouter-gemini";
        model = "openrouter/google/gemini-2.0-flash-001";
        base_url = "https://openrouter.ai/api/v1";
        api_key = "$OPENROUTER_API_KEY";
      }
    ];
    channels = {
      telegram = {
        enabled = true;
        token = "$TELEGRAM_BOT_TOKEN";
        allow_from = agent.telegramAllowFrom;
      };
    };
  });

  # Skills para PERSONAL_HAND
  personalEvolutionSkill = pkgs.writeText "auto_evolution.md" ''
    ---
    name: AutoEvolucion
    description: Identifica tareas repetitivas, escribe scripts para automatizarlas y documenta nuevas habilidades.
    tools:
      - shell
      - fs
    system: |
      Cuando detectes un patrón repetitivo en las solicitudes del usuario:
      1. Escribe un script (Python/Bash) que lo automatice
      2. Guárdalo en /var/lib/openfang/workspace/personal-evolution/scripts/
      3. Documenta la nueva habilidad en SKILLS.md
      4. Informa al usuario que la automatización está disponible
    ---
    Automatiza patrones repetitivos. Guarda scripts en ./scripts/ y documenta en SKILLS.md.
  '';

  # Skills para CAMILO_HAND
  solarCalcSkill = pkgs.writeText "solar_calc.md" ''
    ---
    name: CalculadoraSolar
    description: Dimensiona sistemas fotovoltaicos según RETIE, NTC 2050 y CREG para Colombia.
    tools:
      - shell
      - fs
    system: |
      Para cálculos solares, usa Python con esta fórmula base:
      - HSP (Horas Sol Pico) Choachí: 3.5-4.5 kWh/m²/día
      - Factor de seguridad: 1.25
      - Pérdidas del sistema: 20-25%
      Guarda cotizaciones en /var/lib/openfang/workspace/camilo-sandbox/cotizaciones/
    ---
    Calcula y dimensiona sistemas solares para Colombia. Genera BOMs y cotizaciones.
  '';

in
{
  options.guatoc.ai.openfang = {
    enable = lib.mkEnableOption "OpenFang — Gateway multitenant de agentes IA";

    agents = lib.mkOption {
      type = lib.types.attrsOf (lib.types.submodule {
        options = {
          name = lib.mkOption { type = lib.types.str; };
          description = lib.mkOption { type = lib.types.str; default = ""; };
          workspace = lib.mkOption { type = lib.types.str; };
          systemPrompt = lib.mkOption { type = lib.types.str; };
          temperature = lib.mkOption { type = lib.types.float; default = 0.2; };
          telegramAllowFrom = lib.mkOption { type = lib.types.listOf lib.types.str; };
          telegramTokenSecret = lib.mkOption { type = lib.types.str; };
          extraPackages = lib.mkOption {
            type = lib.types.listOf lib.types.package;
            default = [];
          };
          skills = lib.mkOption {
            type = lib.types.listOf lib.types.path;
            default = [];
          };
        };
      });
      default = {};
    };
  };

  config = lib.mkIf cfg.enable {
    # Usuario del sistema para todos los agentes OpenFang
    users.users.openfang = {
      isSystemUser = true;
      uid = 2010;
      group = "openfang";
      home = "/var/lib/openfang";
      createHome = true;
    };
    users.groups.openfang = { gid = 2010; };

    # Directorios aislados por agente
    systemd.tmpfiles.rules = [
      "d /var/lib/openfang 0750 openfang openfang -"
      "d /var/lib/openfang/workspace 0750 openfang openfang -"
    ] ++ (lib.mapAttrsToList (name: agent:
      "d /var/lib/openfang/workspace/${agent.workspace} 0700 openfang openfang -"
    ) cfg.agents);

    # Instancia systemd por agente
    systemd.services = lib.mapAttrs' (name: agent:
      lib.nameValuePair "openfang-${name}" {
        description = "OpenFang Agent: ${agent.name}";
        after = [ "network-online.target" ];
        wants = [ "network-online.target" ];
        wantedBy = [ "multi-user.target" ];

        path = with pkgs; [
          coreutils gnugrep findutils gawk gnused
          curl jq gettext
          (python3.withPackages (ps: with ps; [ requests pyyaml ]))
        ] ++ agent.extraPackages;

        serviceConfig = {
          User = "openfang";
          Group = "openfang";
          WorkingDirectory = "/var/lib/openfang/workspace/${agent.workspace}";
          EnvironmentFile = [
            config.sops.secrets.${agent.telegramTokenSecret}.path
            config.sops.secrets.openfang-openrouter-key.path
          ];

          # Sandbox estricto
          NoNewPrivileges = false;
          PrivateTmp = true;
          ProtectSystem = "strict";
          ProtectHome = true;
          ProtectKernelTunables = true;
          ProtectKernelModules = true;
          ProtectControlGroups = true;

          ReadWritePaths = [ "/var/lib/openfang" ];
          ReadOnlyPaths = [ "/etc/os-release" "/run/current-system" ];

          Restart = "on-failure";
          RestartSec = "10s";
        };

        environment = {
          HOME = "/var/lib/openfang";
          OLLAMA_HOST = "http://127.0.0.1:11434";
        };

        preStart = let
          configFile = mkAgentConfig name agent;
        in ''
          export HOME="/var/lib/openfang/agent-${name}"
          mkdir -p "$HOME/.picoclaw/workspace"
          mkdir -p "/var/lib/openfang/workspace/${agent.workspace}/scripts"
          mkdir -p "/var/lib/openfang/workspace/${agent.workspace}/data"

          # Generar config con sustitución de env vars
          ${pkgs.gettext}/bin/envsubst < ${configFile} > "$HOME/.picoclaw/config.json" || \
            cp ${configFile} "$HOME/.picoclaw/config.json"
        '';

        script = ''
          export HOME="/var/lib/openfang/agent-${name}"
          exec ${picoclaw-pkg}/bin/picoclaw gateway
        '';
      }
    ) cfg.agents;
  };
}
