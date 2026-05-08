# CLOUDFLARE TUNNEL — Local Managed desde queue/047 (PR #67 mergeado).
# El service bind 127.0.0.1:8096 y el ingress hand.guatoc.co → :8096 está
# en hosts/alpha/default.nix `environment.etc."cloudflared/config.yml"`.

{ config, lib, pkgs, ... }:

let
  cfg = config.guatoc.ai.claudeLink;
  # python-multipart es requerido por FastAPI para parsear Form(...) — sin
  # él, el endpoint POST /claude-link/<uuid> crashea al arranque con
  # RuntimeError "Form data requires python-multipart to be installed".
  pythonEnv = pkgs.python3.withPackages (ps: with ps; [
    fastapi
    uvicorn
    pydantic
    python-multipart
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
