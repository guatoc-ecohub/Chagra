# modules/media/streamrip.nix
# =============================================================================
# STREAMRIP — Tidal/Qobuz/Deezer Music Downloader
# Uses nixpkgs version instead of container
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.media.streamrip;
  mediaCfg = config.guatoc.media;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.media.streamrip = {
    enable = lib.mkEnableOption "Streamrip - Tidal/Qobuz/Deezer Downloader" // {
      default = false;
    };
  };

  config = lib.mkIf (mediaCfg.enable && cfg.enable) {
    # Install streamrip from nixpkgs
    environment.systemPackages = [ pkgs.streamrip ];

    # Create directories
    systemd.tmpfiles.rules = [
      "d /mnt/fast/appdata/streamrip    0755 3000 3000 -"
      "d /mnt/data/media/downloads/music 2775 3000 3000 -"
    ];

    # Wrapper script for convenience
    environment.etc."streamrip-runner".text = ''
      #!/bin/bash
      # Wrapper para streamrip con configuración correcta
      
      export XDG_CONFIG_HOME="/mnt/fast/appdata/streamrip"
      export DOWNLOAD_DIR="/mnt/data/media/downloads/music"
      
      exec streamrip "$@"
    '';
    
    systemd.services.streamrip-download = {
      description = "Streamrip music downloader wrapper";
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        ExecStart = "${pkgs.bash}/bin/bash /etc/streamrip-runner";
      };
    };
  };
}
