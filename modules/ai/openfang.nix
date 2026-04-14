# modules/ai/openfang.nix
# OpenFang v0.5.9 — Agent OS con Telegram, fallback LLM, sandboxing WASM
# Reemplaza Picoclaw como runtime de agentes autónomos
# Docs: https://www.openfang.sh/docs/configuration

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.openfang;

  # OpenFang v0.5.9 — binario Rust estático para Linux x86_64
  openfang-src = pkgs.fetchurl {
    url = "https://github.com/RightNow-AI/openfang/releases/download/v0.5.9/openfang-x86_64-unknown-linux-gnu.tar.gz";
    sha256 = "sha256-ZDaGfTb3o9opWpitRTew0wbNwrusALxB+gK8wtqQZxI=";
  };

  openfang-pkg = pkgs.stdenv.mkDerivation {
    pname = "openfang";
    version = "0.5.9";
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

    [[users]]
    name = "${name}"
    role = "owner"

    [users.channel_bindings]
    telegram = "${lib.head agent.telegramAllowFrom}"

    [memory]
    consolidation_threshold = 5000
    decay_rate = 0.1
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
          extraEnvFiles = lib.mkOption {
            type = lib.types.listOf lib.types.str;
            default = [];
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

    systemd.services = lib.mapAttrs' (name: agent:
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

          # Crear .openfang si OpenFang lo necesita (como usuario openfang)
          mkdir -p "$HOME/.openfang" "$HOME/data"

          # Copiar config donde OpenFang la busca
          cp -f "$HOME/config.toml" "$HOME/.openfang/config.toml"

          exec ${openfang-pkg}/bin/openfang agent
        '';
      }
    ) cfg.agents;
  };
}
