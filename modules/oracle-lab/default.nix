{ config, pkgs, lib, ... }:

let
  cfg = config.services.oracle-lab;

  basePythonPkgs = ps: with ps; [
    fastapi
    uvicorn
    httpx
    pydantic
    websockets
    matplotlib  # fase 3 — render PNG server-side
    ephem       # fase 9 — eventos astronómicos especiales (lunar.py)
  ];

  pythonEnv = pkgs.python3.withPackages (ps:
    (basePythonPkgs ps) ++ lib.optional cfg.enableHotReload ps.watchfiles
  );

  # backendDir: si liveReloadPath está set, el WorkingDirectory apunta a un
  # path mutable persistente (permite git pull + restart sin nixos-rebuild).
  # Si está null, usa el path inmutable nix store (estable, requiere rebuild).
  backendDir =
    if cfg.liveReloadPath != null
    then "${cfg.liveReloadPath}/backend"
    else "${./backend}";

  uvicornArgs = lib.concatStringsSep " " (
    [ "server:app"
      "--host" cfg.bindAddress
      "--port" (toString cfg.port)
    ]
    ++ lib.optional cfg.enableHotReload "--reload"
    ++ lib.optionals cfg.enableHotReload [ "--reload-dir" backendDir ]
  );

  # Script de promote — toma archivos de /tmp/oracle-static-update y
  # /tmp/openmeteo-update.py (rsync'eados desde stg) y los promueve al live
  # path. Pensado para deploys autónomos desde Claude Code stg sin
  # depender de auth GitHub (chagra-pro es privado).
  promoteScript = pkgs.writeShellApplication {
    name = "oracle-lab-promote";
    runtimeInputs = [ pkgs.rsync pkgs.systemd pkgs.coreutils pkgs.curl ];
    text = ''
      set -euo pipefail

      LIVE_PATH="${if cfg.liveReloadPath != null then cfg.liveReloadPath else "/var/lib/oracle-lab/code"}"
      STATIC_SRC="/tmp/oracle-static-update"
      BACKEND_SRC="/tmp/oracle-backend-update"
      COLLECTOR_SRC="/tmp/openmeteo-update.py"

      if [ -d "$STATIC_SRC" ]; then
        echo "→ promote static (R3F build) → $LIVE_PATH/backend/static/"
        rsync -a --delete "$STATIC_SRC/" "$LIVE_PATH/backend/static/"
      fi

      if [ -d "$BACKEND_SRC" ]; then
        echo "→ promote backend completo → $LIVE_PATH/backend/"
        rsync -a --delete --exclude '__pycache__' --exclude 'static' \
          "$BACKEND_SRC/" "$LIVE_PATH/backend/"
      fi

      if [ -f "$COLLECTOR_SRC" ]; then
        echo "→ promote collector openmeteo.py"
        cp "$COLLECTOR_SRC" "$LIVE_PATH/backend/collectors/openmeteo.py"
      fi

      chown -R oracle-lab:oracle-lab "$LIVE_PATH/backend"
      systemctl restart oracle-lab

      sleep 2
      if curl -fsS http://localhost:9090/api/oracle/snapshot >/dev/null 2>&1; then
        echo "✓ oracle-lab promoted + healthy"
      else
        echo "✗ unhealthy post-restart, check journalctl -u oracle-lab" >&2
        exit 2
      fi
    '';
  };

  # Script de redeploy — git pull + systemctl restart
  redeployScript = pkgs.writeShellApplication {
    name = "oracle-lab-redeploy";
    runtimeInputs = [ pkgs.git pkgs.systemd pkgs.coreutils ];
    text = ''
      set -euo pipefail

      LIVE_PATH="${if cfg.liveReloadPath != null then cfg.liveReloadPath else ""}"
      if [ -z "$LIVE_PATH" ]; then
        echo "✗ services.oracle-lab.liveReloadPath no está configurado." >&2
        echo "  Para usar redeploy, configurá en alpha config:" >&2
        echo "    services.oracle-lab.liveReloadPath = \"/var/lib/oracle-lab/code\";" >&2
        echo "  Y clonar chagra-pro ahí inicialmente." >&2
        exit 1
      fi

      if [ ! -d "$LIVE_PATH/.git" ]; then
        echo "✗ $LIVE_PATH no es un git repo. Inicializar primero:" >&2
        echo "  sudo -u oracle-lab git clone --depth 1 https://github.com/guatoc-ecohub/chagra-pro.git /tmp/_clone" >&2
        echo "  sudo cp -r /tmp/_clone/. \"$LIVE_PATH/\"" >&2
        echo "  sudo chown -R oracle-lab:oracle-lab \"$LIVE_PATH\"" >&2
        exit 1
      fi

      echo "→ git pull en $LIVE_PATH"
      cd "$LIVE_PATH"
      sudo -u oracle-lab git pull --ff-only

      echo "→ systemctl restart oracle-lab"
      systemctl restart oracle-lab

      sleep 1
      echo "→ status:"
      systemctl status oracle-lab --no-pager -n 5
    '';
  };
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

    liveReloadPath = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      example = "/var/lib/oracle-lab/code";
      description = ''
        Si se setea, el systemd service usa este path mutable como
        WorkingDirectory en lugar del store inmutable. Permite hacer
        `git pull + systemctl restart oracle-lab` sin nixos-rebuild.

        Setup inicial (una sola vez después de habilitar):
          sudo mkdir -p /var/lib/oracle-lab/code
          sudo chown oracle-lab:oracle-lab /var/lib/oracle-lab/code
          sudo -u oracle-lab git clone https://github.com/guatoc-ecohub/chagra-pro.git \
            /tmp/_oracle-clone
          sudo cp -r /tmp/_oracle-clone/modules/oracle-lab/* /var/lib/oracle-lab/code/
          sudo chown -R oracle-lab:oracle-lab /var/lib/oracle-lab/code

        Después: usar `oracle-lab-redeploy` para git pull + restart sin
        rebuild.

        TRADEOFF: si el código que hagas pull rompe, el service falla.
        Recovery via `git checkout HEAD~1 + oracle-lab-redeploy`.

        Para producción crítica, dejar null (path inmutable nix store).
      '';
    };

    enableHotReload = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = ''
        Si true, agrega --reload + watchfiles a uvicorn. El service
        se reinicia auto cuando cambian los .py en backendDir.

        Solo útil con liveReloadPath != null. Para dev intensivo.
        En prod estable, dejar false (mejor performance).
      '';
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

          # cloudflared (metrics endpoint — requiere cloudflared.metrics activado)
          CLOUDFLARED_METRICS=http://localhost:2000/metrics

          # git_activity (default ORACLE_REPOS_BASE=/var/lib/oracle-lab/repos)
          ORACLE_REPOS=Chagra,chagra-pro,Chagra-strategy,guatoc-nixos
          GITHUB_OWNER=guatoc-ecohub
          GITHUB_PAT=...   # opcional, fallback a API si local no accesible
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
    ] ++ lib.optionals (cfg.liveReloadPath != null) [
      "d ${cfg.liveReloadPath} 0755 oracle-lab oracle-lab -"
      "d ${cfg.liveReloadPath}/backend 0755 oracle-lab oracle-lab -"
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

        # Bootstrap automático: si el live path está vacío (primer boot
        # post-rebuild con liveReloadPath habilitado), copia los archivos
        # del nix store inmutable al path mutable. Después el user puede
        # hacer git pull desde ahí sin perder este snapshot inicial.
        # Idempotente — si ya hay archivos, NO sobrescribe.
        ExecStartPre = lib.optional (cfg.liveReloadPath != null) (
          pkgs.writeShellScript "oracle-lab-bootstrap" ''
            set -eu
            LIVE="${cfg.liveReloadPath}/backend"
            STORE="${./backend}"
            if [ ! -f "$LIVE/server.py" ]; then
              echo "[oracle-lab] live path vacío — bootstrap desde nix store"
              cp -r "$STORE/." "$LIVE/"
              chmod -R u+rw "$LIVE"
              echo "[oracle-lab] bootstrap completado: $(ls -1 "$LIVE" | wc -l) archivos"
            fi
          ''
        );

        ExecStart = "${pythonEnv}/bin/python3 -m uvicorn ${uvicornArgs}";
        WorkingDirectory = backendDir;
        Restart = "on-failure";
        RestartSec = "10s";

        # Hardening
        NoNewPrivileges = true;
        PrivateTmp = true;
        # Si liveReloadPath está set, ProtectSystem debe ser menos estricto
        # para permitir lectura del path mutable
        ProtectSystem = if cfg.liveReloadPath != null then "full" else "strict";
        ProtectHome = true;
        ReadWritePaths = [ cfg.dataDir ] ++ lib.optional (cfg.liveReloadPath != null) cfg.liveReloadPath;
        RestrictAddressFamilies = [ "AF_INET" "AF_INET6" "AF_UNIX" ];
        SystemCallFilter = [ "@system-service" ];
        CapabilityBoundingSet = [];
        AmbientCapabilities = [];
      };
    };

    # Scripts en /run/current-system/sw/bin:
    #   - oracle-lab-redeploy (git pull + restart)
    #   - oracle-lab-promote  (rsync /tmp/ → live + restart, autónomo desde stg)
    environment.systemPackages = lib.optionals (cfg.liveReloadPath != null) [
      redeployScript
      promoteScript
    ];

    # Sudoers NOPASSWD: permite a kortux ejecutar deploys sin password —
    # crítico para que Claude Code stg pueda promover cambios autónomamente
    # vía rsync a /tmp/oracle-static-update + sudo oracle-lab-promote.
    security.sudo.extraRules = lib.optional (cfg.liveReloadPath != null) {
      users = [ "kortux" ];
      commands = [
        {
          command = "${redeployScript}/bin/oracle-lab-redeploy";
          options = [ "NOPASSWD" ];
        }
        {
          command = "${promoteScript}/bin/oracle-lab-promote";
          options = [ "NOPASSWD" ];
        }
        {
          command = "${pkgs.systemd}/bin/systemctl restart oracle-lab";
          options = [ "NOPASSWD" ];
        }
      ];
    };

    # Firewall NO abre el puerto — Tailscale ACL gestiona acceso.
  };
}
