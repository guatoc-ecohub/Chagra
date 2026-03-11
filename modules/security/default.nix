# modules/security/default.nix
# =============================================================================
# SECURITY DOMAIN — VPN and Network Security
# Includes: Tailscale
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.security;
in
{
  imports = [
    ./tailscale.nix
  ];

  options.guatoc.security = {
    enable = lib.mkEnableOption "Security - VPN & Network Security" // {
      default = false;
    };
    
    # tailscale options are defined in ./tailscale.nix
  };

  config = lib.mkIf cfg.enable {
    # Placeholder for future security options
  };
}
