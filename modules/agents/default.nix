# modules/agents/default.nix
# =============================================================================
# AGENTS DOMAIN — Reservado para futuros agentes autónomos
# Picoclaw eliminado 2026-03-31 (consolidado en ClawBots)
# =============================================================================

{ config, pkgs, lib, ... }:

{
  options.guatoc.agents = {
    enable = lib.mkEnableOption "Agents - IA automation agents" // {
      default = false;
    };
  };
}
