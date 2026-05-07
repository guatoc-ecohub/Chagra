# CLOUDFLARE TUNNEL CONFIG
# ========================
# El servicio bind 127.0.0.1:8096 pero el ingress de hand.guatoc.co se
# configura MANUALMENTE en Cloudflare Zero Trust Dashboard porque el
# tunnel actual usa modo Remote Managed (`run --token`).
#
# Para configurar manualmente (operador post-merge):
#   1. Cloudflare Zero Trust → Networks → Tunnels → alpha-guatoc → Edit
#   2. Public Hostname → Add hostname:
#      Subdomain: hand
#      Domain: guatoc.co
#      Service: HTTP://localhost:8096
#   3. Save
#
# Migración futura a Local Managed: ver queue/047 (deuda técnica registrada).

{ config, lib, pkgs, ... }:

let
  cfg = config.guatoc.ai.claudeLink;
  pythonEnv = pkgs.python3.withPackages (ps: with ps; [
    fastapi
    uvicorn
    pydantic
  ]);
in {
  options.guatoc.ai.claudeLink = {
    enable = lib.mkEnableOption "API endpoint Claude Link local";
  };

  config = lib.mkIf cfg.enable {
    systemd.services.claude-link = {
      description = "Claude Link FastAPI endpoints";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];
      serviceConfig = {
        ExecStart = "${pythonEnv}/bin/python ${./claude-link.py}";
        Restart = "always";
        User = "openfang";
        EnvironmentFile = [ config.sops.secrets.cloudflare-tunnel-bearer.path ];
      };
    };
  };
}
