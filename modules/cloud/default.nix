# modules/cloud/default.nix
# =============================================================================
# CLOUD DOMAIN — Nextcloud & Immich
# Includes: Nextcloud, Immich (with PostgreSQL & Redis)
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.cloud;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  imports = [
    ./nextcloud.nix
    ./immich.nix
  ];

  # ============================================
  # OPTIONS: Feature toggles for the domain
  # ============================================
  options.guatoc.cloud = {
    enable = lib.mkEnableOption "Cloud - Nextcloud & Immich" // {
      default = false;
    };
    
    # Submodules handle their own enable options
  };

  # ============================================
  # CONFIG: Apply when cloud.enable = true
  # ============================================
  config = lib.mkIf cfg.enable {
    # Los usuarios/grupos se definen en los módulos legacy
    # Esta configuración solo maneja los contenedores OCI
  };
}
