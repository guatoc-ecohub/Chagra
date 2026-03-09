# modules/automation/default.nix
# =============================================================================
# AUTOMATION DOMAIN — Node-RED visual flow automation
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.automation;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  imports = [
    ./nodered.nix
  ];

  # ============================================
  # OPTIONS: Feature toggles for the domain
  # ============================================
  options.guatoc.automation = {
    enable = lib.mkEnableOption "Automation - Visual flow automation" // {
      default = false;
    };
    
    # Submodules handle their own enable options
  };

  # ============================================
  # CONFIG: Apply when automation.enable = true
  # ============================================
  config = lib.mkIf cfg.enable {
    # Note: User/group creation and directories are handled by the legacy modules
  };
}
