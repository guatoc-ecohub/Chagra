# modules/media/default.nix
# =============================================================================
# MEDIA DOMAIN — Stack completo de gestión de medios
# Incluye: Lidarr, Radarr, Sonarr, Prowlarr, qBittorrent, Navidrome, slskd
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.media;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  imports = [
    ./lidarr.nix
    ./radarr.nix
    ./sonarr.nix
    ./prowlarr.nix
    ./qbittorrent.nix
    ./navidrome_temp.nix  # Versión temporal con contenedor comentado para diagnosticar errores
    ./slskd.nix
    ./streamrip.nix
  ];

  # ============================================
  # OPTIONS: Feature toggles para todo el dominio
  # ============================================
  options.guatoc.media = {
    enable = lib.mkEnableOption "Stack completo de medios (*arr applications)" // {
      default = false;
    };
    
    # Opciones globales del dominio
    dataDir = lib.mkOption {
      type = lib.types.path;
      default = registry.storage.data;
      description = "Directorio base para bibliotecas de medios";
    };
    
    downloadsDir = lib.mkOption {
      type = lib.types.path;
      default = "${registry.storage.data}/downloads";
      description = "Directorio para descargas en progreso";
    };
    
    musicDir = lib.mkOption {
      type = lib.types.path;
      default = "${registry.storage.data}/music";
      description = "Directorio para biblioteca musical";
    };
    
    moviesDir = lib.mkOption {
      type = lib.types.path;
      default = "${registry.storage.data}/movies";
      description = "Directorio para biblioteca de películas";
    };
    
    tvDir = lib.mkOption {
      type = lib.types.path;
      default = "${registry.storage.data}/tv";
      description = "Directorio para biblioteca de series";
    };
    
    # streamrip option is defined in ./streamrip.nix
  };

  # ============================================
  # CONFIG: Aplicar cuando media.enable = true
  # ============================================
  config = lib.mkIf cfg.enable {
    # Los usuarios/grupos se definen en los módulos legacy o en hosts
    # Esta configuración solo maneja los contenedores OCI
    
    # Crear directorios base con permisos correctos
    systemd.tmpfiles.rules = [
      "d ${cfg.downloadsDir} 0775 media media -"
      "d ${cfg.musicDir} 0775 media media -"
      "d ${cfg.moviesDir} 0775 media media -"
      "d ${cfg.tvDir} 0775 media media -"
    ];
    
    # Crear red Podman para media stack
    systemd.services.podman-create-media-net = {
      description = "Crear red Podman media-net";
      wantedBy = [ "multi-user.target" ];
      before = [
        "podman-lidarr.service"
        "podman-radarr.service"
        "podman-sonarr.service"
        "podman-prowlarr.service"
        "podman-qbittorrent.service"
        "podman-navidrome.service"
      ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        ExecStart = "${pkgs.podman}/bin/podman network create --ignore media-net";
      };
    };
  };
}
