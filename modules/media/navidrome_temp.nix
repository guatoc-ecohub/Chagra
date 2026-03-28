# modules/media/navidrome_temp.nix - Comentar temporalmente para diagnosticar errores
# =============================================================================
# NAVIDROME — Servidor de streaming musical (Subsonic API)
# Puerto: 4533 (del registry)
# =============================================================================
{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.media.navidrome;
  mediaCfg = config.guatoc.media;
  registry = import ../../lib/registry.nix { inherit lib; };

in
{
  options.guatoc.media.navidrome = {
    enable = lib.mkEnableOption "Navidrome - Servidor de streaming musical" // {
      default = false;  # Deshabilitado por defecto para evitar fallos
    };
  };

  config = lib.mkIf (mediaCfg.enable && cfg.enable) {
    # Dependencias ZFS para asegurar que los datasets estén montados
    # Contenedor Navidrome comentado temporalmente
    # systemd.services.podman-navidrome = {
      after = [ "zfs.target" "network-online.target" "podman-create-media-net.service" ];
      requires = [ "zfs.target" "podman-create-media-net.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" mediaCfg.musicDir "/mnt/data/media" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/navidrome"
          "${pkgs.coreutils}/bin/install -d -m 2775 ${mediaCfg.musicDir}"
          "${pkgs.coreutils}/bin/chown -R ${toString registry.uids.media}:${toString registry.gids.media} /mnt/fast/appdata/navidrome"
        ];
      };
    };

    # virtualisation.oci-containers.containers.navidrome = {
      # Comentar temporalmente para diagnosticar errores de inicio
      # virtualisation.oci-containers.containers.navidrome = {
        #   image = "deluan/navidrome:latest";
        #   ports = [ "${toString registry.ports.navidrome}:${toString registry.ports.navidrome}" ];
        #   volumes = [
        #     "/mnt/fast/appdata/navidrome:/data"
        #     "${mediaCfg.musicDir}:/music:ro"  # Solo lectura
        #   ];
        #   environment = {
        #     ND_SCANTYPES = "all";
        #     ND_LOGLEVEL = "info";
        #     ND_BASEURL = "";
        #   };
        #   extraOptions = [
        #     "--network=media-net"
        #     "--name=navidrome"
        #   ];
      # };
    };
  };
}