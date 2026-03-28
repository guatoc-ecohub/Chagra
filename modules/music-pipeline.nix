{ config, pkgs, lib, ... }:

let
  cfg = config.services.music-pipeline;
in
{
  options.services.music-pipeline = {
    enable = lib.mkEnableOption "Music curation pipeline (Beets, YouTube, Nextcloud)";
    
    downloadsDir = lib.mkOption {
      type = lib.types.path;
      default = "/mnt/data/media/downloads";
      description = "Download staging directory";
    };
    
    musicDir = lib.mkOption {
      type = lib.types.path;
      default = "/mnt/data/media/musica";
      description = "Final music library directory";
    };
  };

  config = lib.mkIf cfg.enable {
    # === TOOLS ===
    environment.systemPackages = with pkgs; [
      yt-dlp
      ffmpeg
      picard
      (pkgs.writeShellScriptBin "youtube-dl-audio" ''
        #!/bin/sh
        DOWNLOAD_DIR="${cfg.downloadsDir}/staging"
        mkdir -p "$DOWNLOAD_DIR"
        
        yt-dlp \
          --format 'bestaudio/best' \
          --extract-audio \
          --audio-format flac \
          --embed-thumbnail \
          --add-metadata \
          -o "$DOWNLOAD_DIR/%(title)s.%(ext)s" \
          "$@"
        
        echo "Downloaded to $DOWNLOAD_DIR"
      '')
    ];

    # === BEETS CONFIG ===
    environment.etc."beets/config.yaml".text = ''
directory: ${cfg.musicDir}/high-res
library: ${cfg.musicDir}/beets-library.db
import:
    write: yes
    copy: no
    move: yes
    resume: yes
    quiet: yes
    quiet_fallback: skip
    timid: no
    log: ${cfg.musicDir}/beets_import.log
plugins: chroma duplicates fetchart embedart lyrics scrub mbsync info
paths:
    default: %the{$albumartist}/$album%aunique{}/$track - $title
    singleton: Non-Album/%the{$artist}/$title
    comp: Compilations/$album%aunique{}/$track - $title
duplicates:
    keys: [mb_trackid, mb_albumid]
    tiebreak:
        items: [format, bitrate]
    action: delete
chroma:
    auto: yes
fetchart:
    auto: yes
    cover_names: cover front art
embedart:
    auto: yes
scrub:
    auto: yes
'';

    # === BEETS IMPORT SERVICE ===
    systemd.services.beets-import = {
      description = "Beets Music Import Service";
      after = [ "network.target" ];
      path = [ pkgs.beets ];
      serviceConfig = {
        Type = "oneshot";
        User = "kortux";
        WorkingDirectory = cfg.downloadsDir;
        Environment = "HOME=/home/kortux";
      };
      script = ''
        # Verificar que el directorio staging existe y tiene contenido
        if [ -d "${cfg.downloadsDir}/staging" ] && [ "$(ls -A ${cfg.downloadsDir}/staging 2>/dev/null)" ]; then
          ${pkgs.beets}/bin/beet import --not-copy "${cfg.downloadsDir}/staging" 2>&1 || true
          echo "$(date): Beets import completed" >> ${cfg.musicDir}/beets_import.log
        else
          echo "$(date): No files in staging directory, skipping import" >> ${cfg.musicDir}/beets_import.log
        fi
      '';
    };

    systemd.timers.beets-import = {
      description = "Daily Beets Import Timer";
      wantedBy = [ "timers.target" ];
      timerConfig = {
        OnCalendar = "02:00";
        Persistent = true;
      };
    };

    # NEXTCLOUD container migrated to modules/cloud/nextcloud.nix

    # === NGINX REVERSE PROXY ===
    # NOTA: Nginx ahora está consolidado en hosts/alpha/default.nix
    # Esta configuración ha sido removida para evitar conflictos
    # La configuración completa incluye farmos.guatoc.co, localhost, y pwa.guatoc.co

    # === DIRECTORIES ===
    systemd.tmpfiles.rules = [
      "d ${cfg.downloadsDir}/staging 0755 kortux users -"
      "d ${cfg.musicDir}/high-res 0755 kortux users -"
      # /mnt/fast/appdata/nextcloud migrated to modules/cloud/nextcloud.nix
    ];
  };
}
