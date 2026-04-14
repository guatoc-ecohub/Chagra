# modules/agents/chagra-deploy.nix
#
# Infraestructura de despliegue continuo para la PWA Chagra:
#
#   1. Grupo POSIX `chagra-deploy` compartido por humanos y bots que pueden
#      escribir en el webroot (/mnt/fast/appdata/farmos-pwa/).
#   2. Script `chagra-deploy` en el PATH global del sistema que hace
#      git pull + npm ci + npm run build en un clone de trabajo bajo
#      /var/lib/chagra-deploy/repo, y luego un swap atómico (rsync + mv)
#      al webroot de producción. Usa flock para evitar deploys simultáneos.
#   3. Servicio systemd `chagra-webhook` — receptor HTTP mínimo en Python
#      (stdlib, sin dependencias) escuchando en 127.0.0.1:9000. Valida
#      la firma HMAC `X-Hub-Signature-256` contra el secret SOPS
#      `chagra-deploy-webhook-secret` y ejecuta `chagra-deploy` cuando
#      recibe un pull_request.merged sobre rama main.
#
# Cloudflare Tunnel expone el puerto 9000 como deploy-chagra.guatoc.co
# (config remota en dashboard, no en Nix).

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.chagra-deploy;

  # Clone de trabajo del repo público. Queda bajo /var/lib para que
  # cualquier miembro del grupo chagra-deploy pueda operarlo.
  repoDir = "/var/lib/chagra-deploy/repo";
  webroot = "/mnt/fast/appdata/farmos-pwa";
  stateDir = "/var/lib/chagra-deploy";
  lockFile = "${stateDir}/deploy.lock";
  logFile  = "${stateDir}/deploy.log";
  # Template .env persistente que se copia al repo antes de cada build.
  # El build de Vite inlinea VITE_* al bundle, por eso el .env es crítico.
  envTemplate = "${stateDir}/.env.chagra";

  # Script principal de despliegue. Idempotente y atómico.
  chagra-deploy = pkgs.writeShellApplication {
    name = "chagra-deploy";
    runtimeInputs = with pkgs; [ git nodejs_20 rsync coreutils util-linux gnutar findutils ];
    text = ''
      set -euo pipefail
      export HOME="${stateDir}"
      export NPM_CONFIG_CACHE="${stateDir}/.npm"
      mkdir -p "$NPM_CONFIG_CACHE"

      log() { printf '[%s] %s\n' "$(date -Iseconds)" "$*" | tee -a "${logFile}"; }

      exec 9>"${lockFile}"
      if ! flock -n 9; then
        log "deploy already running — abort"
        exit 42
      fi

      log "=== chagra-deploy start ==="

      if [[ ! -d "${repoDir}/.git" ]]; then
        log "initial clone of Chagra repo"
        git clone --depth=20 https://github.com/guatoc-ecohub/Chagra.git "${repoDir}"
      fi

      cd "${repoDir}"
      log "git fetch + reset to origin/main"
      git fetch --prune origin main
      git reset --hard origin/main
      git clean -fdx -e node_modules -e .env

      # Inyectar .env desde el template persistente. Si no existe, el build
      # continúa (Vite hará fallback) pero Chagra fallará auth en runtime.
      if [[ -f "${envTemplate}" ]]; then
        log "cp .env template → repo/.env"
        install -m 0640 "${envTemplate}" "${repoDir}/.env"
      else
        log "WARNING: ${envTemplate} no existe — build sin VITE_FARMOS_CLIENT_ID"
      fi

      log "npm ci --no-audit --no-fund"
      npm ci --no-audit --no-fund --no-progress

      log "npm run build"
      npm run build

      [[ -f dist/index.html ]] || { log "build produced no dist/index.html — abort"; exit 2; }

      log "rsync dist/ → ${webroot}/"
      rsync -a --delete dist/ "${webroot}/"

      log "=== chagra-deploy done ==="
    '';
  };

  # Webhook receiver: script Python auto-contenido. Valida HMAC y lanza
  # chagra-deploy. Sin dependencias externas.
  webhookScript = pkgs.writeTextFile {
    name = "chagra-webhook.py";
    text = ''
      #!/usr/bin/env python3
      """Receptor mínimo de webhooks de GitHub para Chagra.

      Valida X-Hub-Signature-256, aprueba sólo pull_request merged sobre
      rama main (y push directo sobre main), y lanza chagra-deploy en
      background. No devuelve la salida completa del build al webhook —
      GitHub vería timeout. Responde 202 Accepted y deja los logs en
      ${logFile}.
      """
      import hashlib
      import hmac
      import json
      import os
      import subprocess
      import sys
      from http.server import BaseHTTPRequestHandler, HTTPServer

      SECRET = os.environ.get("WEBHOOK_SECRET", "").encode()
      DEPLOY_BIN = os.environ.get("DEPLOY_BIN", "/run/current-system/sw/bin/chagra-deploy")
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

              should_deploy = False
              reason = ""

              if event == "pull_request":
                  pr = payload.get("pull_request", {}) or {}
                  action = payload.get("action")
                  merged = pr.get("merged", False)
                  base_ref = (pr.get("base") or {}).get("ref", "")
                  if action == "closed" and merged and base_ref == "main":
                      should_deploy = True
                      reason = f"PR #{pr.get('number')} merged to main"
              elif event == "push":
                  ref = payload.get("ref", "")
                  if ref == "refs/heads/main":
                      should_deploy = True
                      reason = f"push to main ({payload.get('after', '?')[:7]})"

              if not should_deploy:
                  return self._reply(200, f"ignored event={event}")

              # Dispara el deploy en background.
              subprocess.Popen(
                  [DEPLOY_BIN],
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
    enable = lib.mkEnableOption "Chagra CI/CD: group, deploy script, webhook receiver";

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

    # kortux y openfang siempre, más los que se agreguen por opción.
    users.users.kortux.extraGroups  = [ "chagra-deploy" ];
    users.users.openfang.extraGroups = [ "chagra-deploy" ];

    # Exponer el script en /run/current-system/sw/bin
    environment.systemPackages = [ chagra-deploy webhookScript pkgs.git pkgs.nodejs_20 ];

    # Preparar directorios de estado con ownership al grupo
    systemd.tmpfiles.rules = [
      "d ${stateDir}      2775 kortux chagra-deploy -"
      "d ${stateDir}/.npm 2775 kortux chagra-deploy -"
      "f ${logFile}       0664 kortux chagra-deploy -"
      # El webroot ya existe; sólo aseguramos setgid y permisos.
      "Z ${webroot}       02775 kortux chagra-deploy -"
    ];

    systemd.services.chagra-webhook = {
      description = "Chagra CI/CD — GitHub webhook receiver";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];

      path = [ chagra-deploy pkgs.git pkgs.nodejs_20 ];

      serviceConfig = {
        User = "kortux";
        Group = "chagra-deploy";
        ExecStart = "${pkgs.python3}/bin/python3 ${webhookScript}/bin/chagra-webhook";
        EnvironmentFile = config.sops.secrets.${cfg.webhookSecretName}.path;
        Restart = "on-failure";
        RestartSec = "10s";

        # Hardening razonable; necesita escribir en stateDir y webroot.
        PrivateTmp = true;
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;
        NoNewPrivileges = true;
      };

      environment = {
        DEPLOY_BIN = "${chagra-deploy}/bin/chagra-deploy";
        LISTEN_HOST = "127.0.0.1";
        LISTEN_PORT = "9000";
      };
    };
  };
}
