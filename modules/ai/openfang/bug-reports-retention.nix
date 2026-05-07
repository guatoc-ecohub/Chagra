{ config, lib, pkgs, ... }:

let
  cfg = config.guatoc.ai.openfang;
in {
  config = lib.mkIf cfg.enable {
    systemd.services.bug-reports-retention = {
      description = "Archive >90d resolved/wontfix bug reports for OpenFang";
      path = [ pkgs.findutils pkgs.jq pkgs.bash pkgs.coreutils ];
      script = ''
        mkdir -p /var/lib/openfang/bug-reports/.archive
        chmod 700 /var/lib/openfang/bug-reports/.archive
        
        find /var/lib/openfang/bug-reports -maxdepth 1 -name "*.json" -mtime +90 -exec bash -c '
          file="$1"
          # jq can fail if json is invalid, ignore those gracefully
          STATUS=$(jq -r ".status // empty" "$file" 2>/dev/null)
          if [ "$STATUS" = "resolved" ] || [ "$STATUS" = "wontfix" ]; then
            mv "$file" /var/lib/openfang/bug-reports/.archive/
          fi
        ' _ {} \;
      '';
      serviceConfig = {
        Type = "oneshot";
        User = "openfang";
      };
    };

    systemd.timers.bug-reports-retention = {
      description = "Daily timer for OpenFang bug reports retention";
      wantedBy = [ "timers.target" ];
      timerConfig = {
        OnCalendar = "daily";
        Persistent = true;
      };
    };
  };
}
