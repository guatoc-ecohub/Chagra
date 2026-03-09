# modules/observability/default.nix
# =============================================================================
# OBSERVABILITY DOMAIN — Time-series data & monitoring
# Includes: InfluxDB, Grafana, Telegraf
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.observability;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  imports = [
    ./influxdb.nix
    ./grafana.nix
  ];

  # ============================================
  # OPTIONS: Feature toggles for the domain
  # ============================================
  options.guatoc.observability = {
    enable = lib.mkEnableOption "Observability - Time series & monitoring" // {
      default = false;
    };
    
    # Submodules handle their own enable options
  };

  # ============================================
  # CONFIG: Apply when observability.enable = true
  # ============================================
  config = lib.mkIf cfg.enable {
    # Note: Telegraf se configura directamente en hosts/alpha/default.nix
    # Note: User/group creation and directories are handled by the legacy modules

    # --- SANOID: ZFS Snapshots ---
    services.sanoid = {
      enable = true;
      settings = {
        # Policy for data datasets
        "tank-fast/appdata" = {
          hour = "24";
          day = "7";
          month = "3";
          yearly = "0";
          recursive = true;
        };
        "tank/media" = {
          hour = "24";
          day = "7";
          month = "3";
          yearly = "0";
          recursive = true;
        };
        "tank" = {
          # Root dataset - less frequent
          day = "7";
          month = "3";
          yearly = "1";
          recursive = false;
        };
      };
    };
  };
}
