{ config, pkgs, lib, ... }:

# =============================================================================
# MEDIA.NIX — Stack Multimedia del Nodo Alpha
# Servicios: Radarr, Sonarr, Lidarr, Prowlarr, qBittorrent
# Red interna: media-net (10.89.2.0/24)
# Almacenamiento: /mnt/fast/appdata/<servicio> (configs), /mnt/data/media/ (media)
# =============================================================================

{
  # ---------------------------------------------------------------------------
  # USUARIOS Y GRUPOS Media
  # ---------------------------------------------------------------------------
  users.groups.media = { gid = 3000; };

  users.users.media-svc = {
    isSystemUser = true;
    uid          = 3000;
    group        = "media";
    description  = "Usuario de servicios multimedia (Radarr, Sonarr, qBittorrent)";
  };

  # ---------------------------------------------------------------------------
  # RED INTERNA PODMAN (media-net)
  # ---------------------------------------------------------------------------
  systemd.services.podman-create-media-net = {
    description   = "Crear red Podman media-net para servicios Media";
    wantedBy      = [ "multi-user.target" ];
    before        = [
      "podman-qbittorrent.service"
      "podman-radarr.service"
      "podman-sonarr.service"
      "podman-lidarr.service"
      "podman-prowlarr.service"
    ];
    serviceConfig = {
      Type            = "oneshot";
      RemainAfterExit = true;
      ExecStart = "${pkgs.podman}/bin/podman network create --ignore media-net";
    };
  };

  # ---------------------------------------------------------------------------
  # DIRECTORIOS (systemd-tmpfiles) — Estructura unificada /data
  # ---------------------------------------------------------------------------
  systemd.tmpfiles.rules = [
    "d /mnt/fast/appdata/radarr     0755 3000 3000 -"
    "d /mnt/fast/appdata/sonarr     0755 3000 3000 -"
    "d /mnt/fast/appdata/lidarr     0755 3000 3000 -"
    "d /mnt/fast/appdata/prowlarr   0755 3000 3000 -"
    "d /mnt/fast/appdata/qbittorrent 0755 3000 3000 -"

    # Estructura unificada /mnt/data/media → montada como /data en contenedores
    # Permisos 2775 (setgid) para heredar grupo 'media' en nuevos archivos
    "d /mnt/data/media                2775 3000 3000 -"
    "d /mnt/data/media/downloads      2775 3000 3000 -"
    "d /mnt/data/media/downloads/torrents 2775 3000 3000 -"
    "d /mnt/data/media/downloads/slskd    2775 3000 3000 -"
    "d /mnt/data/media/staging        2775 3000 3000 -"
    "d /mnt/data/media/staging/legacy_mp3 2775 3000 3000 -"
    "d /mnt/data/media/music          2775 3000 3000 -"
    "d /mnt/data/media/movies         2775 3000 3000 -"
    "d /mnt/data/media/tv             2775 3000 3000 -"
  ];

  # ---------------------------------------------------------------------------
  # CONTENEDORES OCI — Stack Multimedia
  # ---------------------------------------------------------------------------
  virtualisation.oci-containers.containers = {

    # -------------------------------------------------------------------------
    # QBITTORRENT — Cliente BitTorrent
    # Volumen unificado: /mnt/data/media:/data
    # Descargas en: /data/downloads/torrents
    # -------------------------------------------------------------------------
    qbittorrent = {
      image = "lscr.io/linuxserver/qbittorrent:latest";
      ports = [ "8083:8083" "6881:6881" "6881:6881/udp" ];
      volumes = [
        "/mnt/fast/appdata/qbittorrent:/config"
        "/mnt/data/media:/data"
      ];
      environment = {
        PUID  = "3000";
        PGID  = "3000";
        TZ    = "America/Bogota";
        WEBUI_PORT = "8083";
      };
      extraOptions = [ "--network=media-net" "--name=qbittorrent" ];
    };

    # -------------------------------------------------------------------------
    # RADARR — Gestor de películas
    # UID: 1000 (radarr)
    # Puerto: 7878
    # -------------------------------------------------------------------------
    radarr = {
      image = "lscr.io/linuxserver/radarr:latest";
      ports = [ "7878:7878" ];
      volumes = [
        "/mnt/fast/appdata/radarr:/config"
        "/mnt/data/media/movies:/movies"
        "/mnt/data/media/downloads:/downloads"
      ];
      environment = {
        PUID  = "3000";
        PGID  = "3000";
        TZ    = "America/Bogota";
      };
      extraOptions = [ "--network=media-net" "--name=radarr" ];
    };

    # -------------------------------------------------------------------------
    # SONARR — Gestor de series de TV
    # UID: 1000 (sonarr)
    # Puerto: 8989
    # -------------------------------------------------------------------------
    sonarr = {
      image = "lscr.io/linuxserver/sonarr:latest";
      ports = [ "8989:8989" ];
      volumes = [
        "/mnt/fast/appdata/sonarr:/config"
        "/mnt/data/media/tv:/tv"
        "/mnt/data/media/downloads:/downloads"
      ];
      environment = {
        PUID  = "3000";
        PGID  = "3000";
        TZ    = "America/Bogota";
      };
      extraOptions = [ "--network=media-net" "--name=sonarr" ];
    };

    # -------------------------------------------------------------------------
    # LIDARR — Gestor de música
    # Volumen unificado: /mnt/data/media:/data
    # Importa desde: /data/staging/legacy_mp3 (biblioteca existente)
    # Organiza a: /data/music (via hardlinks desde /data/downloads)
    # -------------------------------------------------------------------------
    lidarr = {
      image = "lscr.io/linuxserver/lidarr:latest";
      ports = [ "8686:8686" ];
      volumes = [
        "/mnt/fast/appdata/lidarr:/config"
        "/mnt/data/media:/data"
      ];
      environment = {
        PUID  = "3000";
        PGID  = "3000";
        TZ    = "America/Bogota";
      };
      extraOptions = [ "--network=media-net" "--name=lidarr" ];
    };

    # -------------------------------------------------------------------------
    # PROWLARR — Indexador de torrent/NZB
    # UID: 1000 (prowlarr)
    # Puerto: 9696
    # -------------------------------------------------------------------------
    prowlarr = {
      image = "lscr.io/linuxserver/prowlarr:latest";
      ports = [ "9696:9696" ];
      volumes = [
        "/mnt/fast/appdata/prowlarr:/config"
      ];
      environment = {
        PUID  = "3000";
        PGID  = "3000";
        TZ    = "America/Bogota";
      };
      extraOptions = [ "--network=media-net" "--name=prowlarr" ];
    };

  };

  # ---------------------------------------------------------------------------
  # PERMISOS Y RECURSOS (ExecStartPre + cgroups)
  # FIX: Añadidas dependencias ZFS para evitar race condition en boot
  # ---------------------------------------------------------------------------
  systemd.services.podman-qbittorrent = {
    after = [ "zfs.target" "network-online.target" ];
    requires = [ "zfs.target" ];
    serviceConfig = {
      MemoryMax = "2G";
      CPUQuota  = "300%";
      IOSchedulingClass = "realtime";
      IOSchedulingPriority = "0";
      RequiresMountsFor = [ "/mnt/fast/appdata" "/mnt/data/media" ];
      ExecStartPre = [
        "${pkgs.coreutils}/bin/install -d -m 0755 -o 3000 -g 3000 /mnt/fast/appdata/qbittorrent"
        "${pkgs.coreutils}/bin/install -d -m 2775 -o 3000 -g 3000 /mnt/data/media/downloads/torrents"
      ];
    };
  };

  # Permisos unificados PUID/PGID 3000 + dependencias ZFS
  systemd.services.podman-radarr = {
    after = [ "zfs.target" "network-online.target" ];
    requires = [ "zfs.target" ];
    serviceConfig = {
      RequiresMountsFor = [ "/mnt/fast/appdata" "/mnt/data/media" ];
      ExecStartPre = [
        "${pkgs.coreutils}/bin/install -d -m 0755 -o 3000 -g 3000 /mnt/fast/appdata/radarr"
      ];
    };
  };
  
  systemd.services.podman-sonarr = {
    after = [ "zfs.target" "network-online.target" ];
    requires = [ "zfs.target" ];
    serviceConfig = {
      RequiresMountsFor = [ "/mnt/fast/appdata" "/mnt/data/media" ];
      ExecStartPre = [
        "${pkgs.coreutils}/bin/install -d -m 0755 -o 3000 -g 3000 /mnt/fast/appdata/sonarr"
      ];
    };
  };
  
  systemd.services.podman-lidarr = {
    after = [ "zfs.target" "network-online.target" ];
    requires = [ "zfs.target" ];
    serviceConfig = {
      RequiresMountsFor = [ "/mnt/fast/appdata" "/mnt/data/media" ];
      ExecStartPre = [
        "${pkgs.coreutils}/bin/install -d -m 0755 -o 3000 -g 3000 /mnt/fast/appdata/lidarr"
        "${pkgs.coreutils}/bin/install -d -m 2775 -o 3000 -g 3000 /mnt/data/media/staging/legacy_mp3"
        "${pkgs.coreutils}/bin/install -d -m 2775 -o 3000 -g 3000 /mnt/data/media/music"
      ];
    };
  };
  
  systemd.services.podman-prowlarr = {
    after = [ "zfs.target" "network-online.target" ];
    requires = [ "zfs.target" ];
    serviceConfig = {
      RequiresMountsFor = [ "/mnt/fast/appdata" ];
      ExecStartPre = [
        "${pkgs.coreutils}/bin/install -d -m 0755 -o 3000 -g 3000 /mnt/fast/appdata/prowlarr"
      ];
    };
  };

  # ---------------------------------------------------------------------------
  # FIREWALL — Puertos Multimedia
  # ---------------------------------------------------------------------------
  networking.firewall.allowedTCPPorts = [
    8083  # qBittorrent WebUI
    7878  # Radarr
    8989  # Sonarr
    8686  # Lidarr
    9696  # Prowlarr
    6881  # qBittorrent BT
  ];
}
