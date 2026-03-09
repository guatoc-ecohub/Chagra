# modules/agents/default.nix
# =============================================================================
# AGENTS DOMAIN — IA Agents for automation
# Includes: Picoclaw
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.agents;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  imports = [
    ./picoclaw.nix
  ];

  # ============================================
  # OPTIONS: Feature toggles for the domain
  # ============================================
  options.guatoc.agents = {
    enable = lib.mkEnableOption "Agents - IA automation agents" // {
      default = false;
    };
    
    # Submodules handle their own enable options
  };
}
