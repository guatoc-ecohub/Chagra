{ config, pkgs, lib, ... }:

let
  cfg = config.services.oracle-lab;

  pythonEnv = pkgs.python3.withPackages (ps: with ps; [
    fastapi
    uvicorn
    httpx
    pydantic
    websockets
  ]);

  backendDir = ./backend;
in {
  options.services.oracle-lab = {
    enable = lib.mkEnableOption "Oracle Guatoc dashboard MVP (provisional naming, DR-029 pending)";

    port = lib.mkOption {
      type = lib.types.port;
      default = 9090;
      description = "TCP port — bind a 0.0.0.0 confiando en Tailscale ACL.";
    };

    bindAddress = lib.mkOption {
      type = lib.types.str;
      default = "0.0.0.0";
    };

    dataDir = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/oracle-lab";
    };

    secretsFile = lib.mkOption {
      type = lib.types.path;
      example = "/run/secrets/oracle-lab-env";
      description = ''
        EnvironmentFile con tokens. SOPS-decrypted. Vars opcionales (cada
        collector se reporta como no_data si la suya no está):

          # ai_stats (deshabilitado por default — gate ENABLE_AI_STATS_COLLECTOR=1)
          AI_STATS_URL=http://localhost:9292/api/snapshot

          # farmos (OAuth2 password grant)
          FARMOS_BASE=http://localhost:8081
          FARMOS_CLIENT_ID=openfang
          FARMOS_CLIENT_SECRET=...
          FARMOS_USERNAME=admin
          FARMOS_PASSWORD=...

          # home_assistant (sensores IoT)
          HA_BASE_URL=http://localhost:8123
          HA_LONG_LIVED_TOKEN=...

          # ollama (modelos locales)
          OLLAMA_HOST=http://localhost:11434

          # whisper / speaches
          SPEACHES_HOST=http://localhost:10302

          # cloudflared (metrics endpoint)
          CLOUDFLARED_METRICS=http://localhost:2000/metrics

          # git_activity
          ORACLE_REPOS_BASE=/home/kortux/Workspace
          ORACLE_REPOS=Chagra,chagra-pro,Chagra-strategy,guatoc-nixos
          GITHUB_OWNER=guatoc-ecohub
          GITHUB_PAT=...   # opcional, mejora rate limit
      '';
    };
  };

  config = lib.mkIf cfg.enable {
    users.users.oracle-lab = {
      isSystemUser = true;
      group = "oracle-lab";
      home = cfg.dataDir;
      createHome = false;
    };
    users.groups.oracle-lab = {};

    systemd.tmpfiles.rules = [
      "d ${cfg.dataDir} 0750 oracle-lab oracle-lab -"
    ];

    systemd.services.oracle-lab = {
      description = "Oracle Guatoc dashboard MVP (Tailscale-only)";
      wantedBy = [ "multi-user.target" ];
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];

      environment = {
        ORACLE_DATA_DIR = cfg.dataDir;
        PYTHONUNBUFFERED = "1";
      };

      serviceConfig = {
        Type = "simple";
        User = "oracle-lab";
        Group = "oracle-lab";
        EnvironmentFile = cfg.secretsFile;
        ExecStart = "${pythonEnv}/bin/python3 -m uvicorn server:app --host ${cfg.bindAddress} --port ${toString cfg.port}";
        WorkingDirectory = "${backendDir}";
        Restart = "on-failure";
        RestartSec = "10s";

        # Hardening
        NoNewPrivileges = true;
        PrivateTmp = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        ReadWritePaths = [ cfg.dataDir ];
        RestrictAddressFamilies = [ "AF_INET" "AF_INET6" "AF_UNIX" ];
        SystemCallFilter = [ "@system-service" ];
        CapabilityBoundingSet = [];
        AmbientCapabilities = [];
      };
    };

    # Firewall NO abre el puerto — Tailscale ACL gestiona acceso.
  };
}
