# modules/agents/chagra-deploy.nix
#
# Infraestructura de despliegue continuo para la PWA Chagra, en dos pistas:
#
#   PROD (chagra.guatoc.co)   — rsync a /mnt/fast/appdata/farmos-pwa/
#   DEV  (chagra-dev.guatoc.co) — rsync a /mnt/fast/appdata/farmos-pwa-dev/
#
# Reglas de enrutamiento desde el webhook (GitHub → /webhook o /):
#
#   * release.published                       → chagra-deploy      (PROD)
#   * push refs/heads/main                    → chagra-deploy-dev  (DEV)
#   * pull_request.closed.merged base=main    → chagra-deploy-dev  (DEV, legacy)
#
# El script de deploy esta factorizado via mkDeployScript: ambos comparten
# logica (git fetch + reset + npm ci + npm run build + rsync) y se diferencian
# solo en webroot, state dir y un sed que reescribe CACHE_NAME del service
# worker para que PWA prod y PWA dev no colisionen caches en el navegador.
#
# Cloudflare Tunnel expone el puerto 9000 via deploy-chagra.guatoc.co.
# El routing chagra.guatoc.co / chagra-dev.guatoc.co se resuelve dentro de
# Nginx (ver hosts/alpha/default.nix).

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.chagra-deploy;

  # ---------- PROD ----------
  repoDir   = "/var/lib/chagra-deploy/repo";
  webroot   = "/mnt/fast/appdata/farmos-pwa";
  stateDir  = "/var/lib/chagra-deploy";
  lockFile  = "${stateDir}/deploy.lock";
  logFile   = "${stateDir}/deploy.log";
  envTemplate = "${stateDir}/.env.chagra";

  # ---------- DEV ----------
  repoDirDev    = "/var/lib/chagra-deploy-dev/repo";
  webrootDev    = "/mnt/fast/appdata/farmos-pwa-dev";
  stateDirDev   = "/var/lib/chagra-deploy-dev";
  lockFileDev   = "${stateDirDev}/deploy.lock";
  logFileDev    = "${stateDirDev}/deploy.log";
  # El .env es el mismo archivo persistente (backends FarmOS/HA/Ollama
  # compartidos entre ambientes). DEV hereda el template de PROD.
  envTemplateDev = envTemplate;

  # Factorizador del script de deploy. Parametrizamos todo lo que diferencia
  # a un deploy DEV de uno PROD: ruta webroot, state dir, sufijo para
  # CACHE_NAME del service worker y etiqueta visible en el log.
  mkDeployScript = {
    name,
    label,
    webrootTarget,
    stateDirTarget,
    repoDirTarget,
    lockFileTarget,
    logFileTarget,
    envTemplatePath,
    cacheSuffix,       # "" para prod, "-dev" para dev
  }: pkgs.writeShellApplication {
    inherit name;
    runtimeInputs = with pkgs; [
      git
      nodejs_20
      rsync
      coreutils
      util-linux   # flock
      gnutar
      findutils
      gnused       # para el sed del CACHE_NAME
    ];
    text = ''
      set -euo pipefail
      export HOME="${stateDirTarget}"
      export NPM_CONFIG_CACHE="${stateDirTarget}/.npm"
      mkdir -p "$NPM_CONFIG_CACHE"

      log() { printf '[%s] [${label}] %s\n' "$(date -Iseconds)" "$*" | tee -a "${logFileTarget}"; }

      exec 9>"${lockFileTarget}"
      if ! flock -n 9; then
        log "deploy already running — abort"
        exit 42
      fi

      log "=== ${name} start ==="

      if [[ ! -d "${repoDirTarget}/.git" ]]; then
        log "initial clone of Chagra repo"
        git clone --depth=20 https://github.com/guatoc-ecohub/Chagra.git "${repoDirTarget}"
      fi

      cd "${repoDirTarget}"
      log "git fetch + reset to origin/main"
      git fetch --prune origin main
      git reset --hard origin/main
      git clean -fdx -e node_modules -e .env

      if [[ -f "${envTemplatePath}" ]]; then
        log "cp .env template → repo/.env"
        install -m 0640 "${envTemplatePath}" "${repoDirTarget}/.env"
      else
        log "WARNING: ${envTemplatePath} no existe — build sin VITE_FARMOS_CLIENT_ID"
      fi

      log "npm ci --no-audit --no-fund"
      npm ci --no-audit --no-fund --no-progress

      log "npm run build"
      npm run build

      [[ -f dist/index.html ]] || { log "build produced no dist/index.html — abort"; exit 2; }

      # Reescribe CACHE_NAME en el service worker para aislar caches de PWA
      # entre ambientes. Bloque inyectado por Nix solo cuando cacheSuffix != "",
      # asi PROD no ejecuta sed y evitamos SC2157 (tautologia de shellcheck).
      #   sw.js original:   const CACHE_NAME = 'chagra-vN';
      #   → PROD (no-op):   const CACHE_NAME = 'chagra-vN';
      #   → DEV (patched):  const CACHE_NAME = 'chagra-dev-vN';
      ${lib.optionalString (cacheSuffix != "") ''
        if [[ -f dist/sw.js ]]; then
          log "patch dist/sw.js CACHE_NAME con sufijo '${cacheSuffix}'"
          sed -i "s/\\(CACHE_NAME\\s*=\\s*'\\)chagra-/\\1chagra${cacheSuffix}-/" dist/sw.js
        fi
      ''}

      log "rsync dist/ → ${webrootTarget}/"
      # Flags defensivos para destino multi-owner (kortux:chagra-deploy con
      # setgid 2775). Sin estos, rsync intenta preservar perms/group del
      # source y aborta con exit 23 sobre dirs que no posee. Mismas reglas
      # que .github/workflows/deploy.yml en Chagra (mantener consistente).
      umask 022
      rsync -avzO --no-perms --delete --no-group --chmod=F644 dist/ "${webrootTarget}/"

      log "=== ${name} done ==="
    '';
  };

  chagra-deploy = mkDeployScript {
    name            = "chagra-deploy";
    label           = "prod";
    webrootTarget   = webroot;
    stateDirTarget  = stateDir;
    repoDirTarget   = repoDir;
    lockFileTarget  = lockFile;
    logFileTarget   = logFile;
    envTemplatePath = envTemplate;
    cacheSuffix     = "";
  };

  chagra-deploy-dev = mkDeployScript {
    name            = "chagra-deploy-dev";
    label           = "dev";
    webrootTarget   = webrootDev;
    stateDirTarget  = stateDirDev;
    repoDirTarget   = repoDirDev;
    lockFileTarget  = lockFileDev;
    logFileTarget   = logFileDev;
    envTemplatePath = envTemplateDev;
    cacheSuffix     = "-dev";
  };

  # Webhook receiver con decisor PROD vs DEV.
  webhookScript = pkgs.writeTextFile {
    name = "chagra-webhook.py";
    text = ''
      #!/usr/bin/env python3
      """Receptor de webhooks GitHub para Chagra (dual: PROD + DEV).

      Valida X-Hub-Signature-256 y despacha asi:

          event=release, action=published  →  $DEPLOY_BIN_PROD
          event=push, ref=refs/heads/main  →  $DEPLOY_BIN_DEV
          event=pull_request, closed,
              merged=true, base=main       →  $DEPLOY_BIN_DEV  (legacy, DEV)
          otros                            →  ignorado (200)

      Responde 202 Accepted al disparar el deploy y deja logs en
      chagra-deploy/deploy.log (PROD) o chagra-deploy-dev/deploy.log (DEV).
      """
      import hashlib
      import hmac
      import json
      import os
      import subprocess
      import sys
      from http.server import BaseHTTPRequestHandler, HTTPServer

      SECRET = os.environ.get("WEBHOOK_SECRET", "").encode()
      DEPLOY_BIN_PROD = os.environ.get("DEPLOY_BIN_PROD", "/run/current-system/sw/bin/chagra-deploy")
      DEPLOY_BIN_DEV  = os.environ.get("DEPLOY_BIN_DEV",  "/run/current-system/sw/bin/chagra-deploy-dev")
      LISTEN_HOST = os.environ.get("LISTEN_HOST", "127.0.0.1")
      LISTEN_PORT = int(os.environ.get("LISTEN_PORT", "9000"))

      if not SECRET:
          sys.stderr.write("FATAL: WEBHOOK_SECRET not set\n")
          sys.exit(1)


      def verify(sig_header: str, body: bytes) -> bool:
          if not sig_header or not sig_header.startswith("sha256="):
              return False
          expected = "sha256=" + hmac.new(SECRET, body, hashlib.sha256).hexdigest()
          return hmac.compare_digest(expected, sig_header)


      class Handler(BaseHTTPRequestHandler):
          def log_message(self, fmt, *args):
              sys.stderr.write("[webhook] " + (fmt % args) + "\n")

          def _reply(self, code: int, msg: str):
              body = msg.encode()
              self.send_response(code)
              self.send_header("Content-Type", "text/plain; charset=utf-8")
              self.send_header("Content-Length", str(len(body)))
              self.end_headers()
              self.wfile.write(body)

          def do_POST(self):
              if self.path not in ("/", "/webhook"):
                  return self._reply(404, "not found")

              length = int(self.headers.get("Content-Length", "0"))
              body = self.rfile.read(length) if length else b""
              sig = self.headers.get("X-Hub-Signature-256", "")
              event = self.headers.get("X-GitHub-Event", "")

              if not verify(sig, body):
                  return self._reply(401, "invalid signature")

              if event == "ping":
                  return self._reply(200, "pong")

              try:
                  payload = json.loads(body.decode() or "{}")
              except json.JSONDecodeError:
                  return self._reply(400, "invalid json")

              deploy_bin = None
              reason = ""

              if event == "release":
                  if payload.get("action") == "published":
                      deploy_bin = DEPLOY_BIN_PROD
                      tag = (payload.get("release") or {}).get("tag_name", "?")
                      reason = f"release {tag} published → PROD"
              elif event == "push":
                  if payload.get("ref") == "refs/heads/main":
                      deploy_bin = DEPLOY_BIN_DEV
                      short = payload.get("after", "?")[:7]
                      reason = f"push to main ({short}) → DEV"
              elif event == "pull_request":
                  pr = payload.get("pull_request", {}) or {}
                  action = payload.get("action")
                  merged = pr.get("merged", False)
                  base_ref = (pr.get("base") or {}).get("ref", "")
                  if action == "closed" and merged and base_ref == "main":
                      deploy_bin = DEPLOY_BIN_DEV
                      reason = f"PR #{pr.get('number')} merged to main → DEV"

              if deploy_bin is None:
                  return self._reply(200, f"ignored event={event}")

              subprocess.Popen(
                  [deploy_bin],
                  stdout=subprocess.DEVNULL,
                  stderr=subprocess.DEVNULL,
                  start_new_session=True,
              )
              return self._reply(202, f"accepted: {reason}")

          def do_GET(self):
              if self.path == "/healthz":
                  return self._reply(200, "ok")
              return self._reply(405, "POST only")


      def main():
          server = HTTPServer((LISTEN_HOST, LISTEN_PORT), Handler)
          sys.stderr.write(f"[webhook] listening on {LISTEN_HOST}:{LISTEN_PORT}\n")
          server.serve_forever()


      if __name__ == "__main__":
          main()
    '';
    executable = true;
    destination = "/bin/chagra-webhook";
  };

in
{
  options.guatoc.chagra-deploy = {
    enable = lib.mkEnableOption "Chagra CI/CD: group, deploy scripts (prod+dev), webhook receiver";

    extraGroupMembers = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [];
      description = "Usuarios adicionales a incluir en el grupo chagra-deploy";
    };

    webhookSecretName = lib.mkOption {
      type = lib.types.str;
      default = "chagra-deploy-webhook-secret";
      description = "Nombre del secret SOPS con WEBHOOK_SECRET=<valor>";
    };
  };

  config = lib.mkIf cfg.enable {
    users.groups.chagra-deploy = {};

    users.users.kortux.extraGroups  = [ "chagra-deploy" ];
    users.users.openfang.extraGroups = [ "chagra-deploy" ];

    environment.systemPackages = [
      chagra-deploy
      chagra-deploy-dev
      webhookScript
      pkgs.git
      pkgs.nodejs_20
    ];

    systemd.tmpfiles.rules = [
      # PROD
      "d ${stateDir}      2775 kortux chagra-deploy -"
      "d ${stateDir}/.npm 2775 kortux chagra-deploy -"
      "f ${logFile}       0664 kortux chagra-deploy -"
      "Z ${webroot}       02775 kortux chagra-deploy -"
      # DEV
      "d ${stateDirDev}      2775 kortux chagra-deploy -"
      "d ${stateDirDev}/.npm 2775 kortux chagra-deploy -"
      "f ${logFileDev}       0664 kortux chagra-deploy -"
      "d ${webrootDev}       02775 kortux chagra-deploy -"
    ];

    systemd.services.chagra-webhook = {
      description = "Chagra CI/CD — GitHub webhook receiver (PROD + DEV router)";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];

      path = [ chagra-deploy chagra-deploy-dev pkgs.git pkgs.nodejs_20 ];

      serviceConfig = {
        User = "kortux";
        Group = "chagra-deploy";
        ExecStart = "${pkgs.python3}/bin/python3 ${webhookScript}/bin/chagra-webhook";
        EnvironmentFile = config.sops.secrets.${cfg.webhookSecretName}.path;
        Restart = "on-failure";
        RestartSec = "10s";

        PrivateTmp = true;
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;
        NoNewPrivileges = true;
      };

      environment = {
        DEPLOY_BIN_PROD = "${chagra-deploy}/bin/chagra-deploy";
        DEPLOY_BIN_DEV  = "${chagra-deploy-dev}/bin/chagra-deploy-dev";
        LISTEN_HOST = "127.0.0.1";
        LISTEN_PORT = "9000";
      };
    };
  };
}
