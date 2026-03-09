# modules/agriculture/default.nix
# =============================================================================
# AGRICULTURE DOMAIN — FarmOS & PostgreSQL
# Includes: FarmOS, PostgreSQL for FarmOS
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.agriculture;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  imports = [
    ./postgres-farm.nix
    ./farmos.nix
  ];

  # ============================================
  # OPTIONS: Feature toggles for the domain
  # ============================================
  options.guatoc.agriculture = {
    enable = lib.mkEnableOption "Agriculture - FarmOS & PostgreSQL" // {
      default = false;
    };
    
    # Submodules handle their own enable options
  };

  # ============================================
  # CONFIG: Apply when agriculture.enable = true
  # ============================================
  config = lib.mkIf cfg.enable {
    # Los usuarios/grupos se definen en los módulos legacy
    # Esta configuración solo maneja los contenedores OCI
  };
}
