# modules/gaming/default.nix
# =============================================================================
# GAMING DOMAIN — Retro Gaming
# Includes: RomM
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.gaming;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  imports = [
    ./romm.nix
  ];

  options.guatoc.gaming = {
    enable = lib.mkEnableOption "Gaming - Retro Game ROM Management" // {
      default = false;
    };
    
    # romm option is defined in ./romm.nix
  };

  config = lib.mkIf cfg.enable {
    # Create directories via systemd-tmpfiles
    systemd.tmpfiles.rules = [
      "d /mnt/fast/appdata/romm          0755 root root -"
      "d /mnt/data/media/games            0755 root root -"
      "d /mnt/data/media/games/covers     0755 root root -"
    ];
  };
}
