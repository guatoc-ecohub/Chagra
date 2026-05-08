# modules/scripts/stack-update.nix
# =============================================================================
# Stack update mensual — declarativo via systemd user timer.
# Reemplaza la opción manual `crontab` (que NixOS NO incluye por default).
#
# Activación:
#   guatoc.scripts.stackUpdate.enable = true;
#
# Ejecuta `update-cli-stack.sh` (script empaquetado vía writeShellApplication
# desde el repo, idempotente, sobrevive reinstall) el día 1 de cada mes a las
# 04:00 user-local. Si el host estaba apagado, `Persistent=true` lo dispara
# en el próximo arranque/login.
#
# Cobertura: claude (npm-global), cursor-agent (curl ~/.local/bin), uv
# (self-update). NO toca opencode (NixOS sw → bump via flake.lock + Renovate).
#
# Notas:
# - User systemd unit. Requiere que el usuario esté logueado al momento del
#   trigger (si no, ejecuta tras next login). Para correr sin login, agregar
#   `users.users.<user>.linger = true` o equivalente — no necesario para stg
#   (workstation con sesión activa típica).
# - Si la máquina no es de uso continuo y el timer falla por mes consecutivo,
#   considerar enable linger via systemd.tmpfiles.
# =============================================================================

{ config, lib, pkgs, ... }:

let
  cfg = config.guatoc.scripts.stackUpdate;

  stackUpdateScript = pkgs.writeShellApplication {
    name = "update-cli-stack";
    runtimeInputs = with pkgs; [
      bash
      coreutils
      curl
      findutils
      gnused
      gnugrep
      python3
      # nodejs sólo si está en el sistema; el script asume `npm` en PATH del user
    ];
    text = builtins.readFile ./update-cli-stack.sh;
  };
in
{
  options.guatoc.scripts.stackUpdate = {
    enable = lib.mkEnableOption "Stack update mensual via systemd user timer";

    onCalendar = lib.mkOption {
      type = lib.types.str;
      default = "*-*-01 04:00:00";
      description = ''
        OnCalendar systemd para el timer. Default: día 1 de cada mes 04:00
        local. Formato systemd.time(7).
      '';
      example = "weekly";
    };

    randomizedDelaySec = lib.mkOption {
      type = lib.types.str;
      default = "30m";
      description = ''
        Jitter para que no todos los hosts del stack peguen al mismo tiempo
        a npm registry / cursor / etc.
      '';
    };
  };

  config = lib.mkIf cfg.enable {
    # User systemd service: ejecutable resuelto a /nix/store
    systemd.user.services.stack-update = {
      description = "Update CLI agent stack (claude-code, cursor-agent, uv)";
      # NO wantedBy multi-user.target — lo activa solo el timer
      serviceConfig = {
        Type = "oneshot";
        ExecStart = "${stackUpdateScript}/bin/update-cli-stack";
        # Permitir output en logs user
        StandardOutput = "journal";
        StandardError = "journal";
        # Network requerido para npm/curl
        AmbientCapabilities = "";
      };
    };

    # User systemd timer
    systemd.user.timers.stack-update = {
      description = "Monthly CLI stack update timer";
      wantedBy = [ "timers.target" ];
      timerConfig = {
        OnCalendar = cfg.onCalendar;
        Persistent = true;  # ejecuta tras boot si se perdió el slot
        RandomizedDelaySec = cfg.randomizedDelaySec;
        Unit = "stack-update.service";
      };
    };

    # Hint operacional — el script en el store es read-only, los logs van a
    # journalctl --user -u stack-update.service. Para inspección ad-hoc:
    #   journalctl --user -u stack-update.service -n 50 --no-pager
    # Para ejecución manual:
    #   systemctl --user start stack-update.service
    # Para ver próximos disparos:
    #   systemctl --user list-timers stack-update.timer
  };
}
