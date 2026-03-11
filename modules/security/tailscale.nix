# modules/security/tailscale.nix
# =============================================================================
# TAILSCALE — VPN y Networking
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.security.tailscale;
in
{
  options.guatoc.security.tailscale = {
    enable = lib.mkEnableOption "Tailscale VPN" // {
      default = false;
    };
    
    acceptDns = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Whether to use Tailscale's DNS configuration";
    };
    
    acceptRoutes = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Whether to accept routes from Tailscale";
    };
    
    exitNode = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Enable this node as a Tailscale exit node";
    };
  };

  config = lib.mkIf cfg.enable {
    # Tailscale service
    services.tailscale = {
      enable = true;
    };

    # Enable IP forwarding for exit node functionality
    boot.kernel.sysctl = lib.mkIf cfg.exitNode {
      "net.ipv4.ip_forward" = 1;
      "net.ipv6.ip_forward" = 1;
    };

    # Firewall rules for Tailscale
    networking.firewall.trustedInterfaces = [ "tailscale0" ];
    
    # Allow Tailscale ports
    networking.firewall.allowedUDPPorts = [ 41641 ];  # Tailscale wireguard
    
    # Open port 443 if acting as exit node
    networking.firewall.allowedTCPPorts = lib.mkIf cfg.exitNode [ 443 ];
  };
}
