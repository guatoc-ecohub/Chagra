{ config, pkgs, lib, ... }:

# =============================================================================
# SERVER-SERVICES — Stack Podman del Nodo Alpha
# =============================================================================
# Patrón de seguridad:
#   - Credenciales sensibles → sops-nix → EnvironmentFile (nunca en texto plano)
#   - Configs estáticas      → pkgs.writeText → volumen :ro
#   - Permisos de datos      → ExecStartPre (install + chown) antes de arrancar
# =============================================================================

let
  # -------------------------------------------------------------------------
  # CONFIGURACIONES ESTÁTICAS DECLARATIVAS
  # -------------------------------------------------------------------------
  # Estos archivos se generan en el Nix store y se montan :ro en el contenedor.
  # Son inmutables: cualquier cambio requiere un nixos-rebuild switch.

  # mosquitto.conf — broker MQTT local
  mosquittoConf = pkgs.writeText "mosquitto.conf" ''
    # Mosquitto — Broker MQTT local (Guatoc Alpha)
    # Generado declarativamente por NixOS — NO editar manualmente.
    persistence true
    persistence_location /mosquitto/data/
    log_dest file /mosquitto/log/mosquitto.log
    log_dest stdout

    listener 1883
    allow_anonymous true

    # TODO: Cuando integres Zigbee2MQTT, considera habilitar autenticación:
    # password_file /mosquitto/config/passwd
    # allow_anonymous false
  '';

in
{
  # ---------------------------------------------------------------------------
  # SOPS: Declaración de secretos (placeholders — llenar en secrets.yaml)
  # ---------------------------------------------------------------------------
  # Cada secreto se materializa como un archivo en /run/secrets/<nombre>
  # con los permisos indicados. El contenido lo cifras tú con:
  #   sops --encrypt --in-place hosts/alpha/secrets.yaml
  #
  # Formato del bloque en secrets.yaml (ANTES de cifrar con sops):
  #
  #   influxdb_env: |
  #     DOCKER_INFLUXDB_INIT_MODE=setup
  #     DOCKER_INFLUXDB_INIT_USERNAME=guatoc
  #     DOCKER_INFLUXDB_INIT_PASSWORD=<TU_PASSWORD>
  #     DOCKER_INFLUXDB_INIT_ORG=guatoc
  #     DOCKER_INFLUXDB_INIT_BUCKET=iot
  #     DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=<TU_TOKEN_LARGO>
  #
  #   slskd_env: |
  #     SLSKD_REMOTE_CONFIGURATION=true
  #     SLSKD_HTTP_BASIC_AUTH_USERNAME=guatoc
  #     SLSKD_HTTP_BASIC_AUTH_PASSWORD=<TU_PASSWORD>
  #     SLSKD_SHARED_DIR=/app/music
  #
  #   grafana_env: |
  #     GF_SECURITY_ADMIN_USER=admin
  #     GF_SECURITY_ADMIN_PASSWORD=<TU_PASSWORD>
  #     GF_USERS_ALLOW_SIGN_UP=false
  #
  # NOTA: El defaultSopsFile ya está configurado en hosts/alpha/default.nix.
  # Estos secretos heredan esa ruta automáticamente.
  # ---------------------------------------------------------------------------
  sops.secrets."slskd_env" = {
    owner = "root";
    group = "root";
    mode  = "0400";
  };

  # ---------------------------------------------------------------------------
  # AUTO-CREACIÓN DE DIRECTORIOS (systemd-tmpfiles)
  # ---------------------------------------------------------------------------
  systemd.tmpfiles.rules = [
    # === SSD (tank-fast) — APPDATA ===
    "d /mnt/fast/appdata                  0755 root root -"
    "d /mnt/fast/appdata/frigate          0755 root root -"
    "d /mnt/fast/appdata/frigate/config   0755 root root -"
    "d /mnt/fast/appdata/homeassistant    0755 root root -"
    "d /mnt/fast/appdata/mosquitto        0755 root root -"
    "d /mnt/fast/appdata/mosquitto/config 0755 root root -"
    "d /mnt/fast/appdata/mosquitto/data   0755 root root -"
    "d /mnt/fast/appdata/mosquitto/log    0755 root root -"
    "d /mnt/fast/appdata/influxdb         0755 root root -"
    "d /mnt/fast/appdata/influxdb/data    0755 root root -"
    "d /mnt/fast/appdata/grafana          0755 root root -"
    "d /mnt/fast/appdata/nodered          0755 root root -"
    "d /mnt/fast/appdata/z2m              0755 root root -"  # Zigbee2MQTT (futuro)
    "d /mnt/fast/appdata/immich           0755 root root -"
    "d /mnt/fast/appdata/navidrome        0755 3000 3000 -"
    "d /mnt/fast/appdata/farmos           0755 root root -"  # FarmOS (gestión agrícola)
    "d /mnt/fast/appdata/streamrip        0755 3000 3000 -"  # Descargador Tidal/Spotify
    
    # Descargas P2P unificadas (mismo filesystem para hardlinks)
    "d /mnt/data/media/downloads/streamrip 2775 3000 3000 -"

    # === HDD (tank) — MEDIA ===
    "d /mnt/data/media                    0755 root root -"
    "d /mnt/data/media/frigate            0755 root root -"
    "d /mnt/data/media/music              0755 root root -"
    "d /mnt/data/media/immich             0755 root root -"
    "d /mnt/data/backups                  0755 root root -"
  ];

  # ---------------------------------------------------------------------------
  # RED PODMAN
  # ---------------------------------------------------------------------------
  virtualisation.podman.defaultNetwork.settings = {
    dns_enabled = true;
  };

  # ---------------------------------------------------------------------------
  # CONTENEDORES OCI (Podman)
  # ---------------------------------------------------------------------------
  virtualisation.oci-containers = {
    backend = "podman";
    containers = {

      # -----------------------------------------------------------------------
      # FRIGATE — NVR con detección de objetos
      # -----------------------------------------------------------------------
      frigate = {
        # Pinned 2026-04-20 (era :stable).
        image = "ghcr.io/blakeblackshear/frigate@sha256:5be5ce3b79f8b09a52957afea9d4a23ad62c9f077a05d9047e3404eb78c304a8";
        ports = [ "5000:5000" "8554:8554" "8555:8555" ];
        volumes = [
          "/mnt/fast/appdata/frigate/config:/config"
          "/mnt/data/media/frigate:/media/frigate"
        ];
        extraOptions = [ "--shm-size=512m" "--device=/dev/dri" ];
      };

      # ---------------------------------------------------------------------
      # NAVIDROME — Servidor de música personal (API Subsonic)
      # Volumen unificado: /mnt/data/media:/data (solo lectura para música)
      # Lee desde: /data/music (organizado por Lidarr)
      # DB en: /data/.navidrome (recomendado separar configs de música)
      # -----------------------------------------------------------------------
      navidrome = {
        # Pinned 2026-04-20 (era :latest).
        image = "docker.io/deluan/navidrome@sha256:a5dce8f33304714dd138e870cca0dcab3d937ca236be1a9f2b97da009d1a0048";
        ports = [ "4533:4533" ];
        volumes = [
          "/mnt/fast/appdata/navidrome:/data"        # DB y config en SSD
          "/mnt/data/media/music:/music:ro"           # Librería en HDD (RO)
        ];
        environment = {
          PUID           = "3000";
          PGID           = "3000";
          ND_SCANTYPES   = "all";
          ND_LOGLEVEL    = "info";
          ND_MUSICFOLDER = "/music";
        };
      };


      # -----------------------------------------------------------------------
      # FIN FARMOS — Migrado a modules/agriculture/farmos.nix
      # -----------------------------------------------------------------------

    };
  };

  # ---------------------------------------------------------------------------
  # INYECCIÓN DE SECRETOS VIA EnvironmentFile (sops-nix)
  # ---------------------------------------------------------------------------
  # systemd.services.podman-<nombre> es el wrapper que NixOS genera
  # automáticamente para cada oci-container. Lo extendemos con EnvironmentFile
  # para inyectar credenciales sin exponerlas en el Nix store.

  # Permisos unificados PUID/PGID 3000 para servicios de música
  
  # ---------------------------------------------------------------------------
  # DEPENDENCIAS DE MONTAJE ZFS + LÍMITES DE RECURSOS
  # FIX: Usar zfs.target en lugar de zfs-mount.service (deshabilitado)
  # ---------------------------------------------------------------------------
  systemd.services.podman-frigate = {
    after = [ "zfs.target" "network-online.target" ];
    requires = [ "zfs.target" ];
    serviceConfig = {
      MemoryMax = "2G";
      CPUQuota  = "200%";
      RequiresMountsFor = [ "/mnt/fast/appdata" "/mnt/data/media" ];
    };
  };
  
  systemd.services.podman-navidrome = {
    after = [ "zfs.target" "network-online.target" ];
    requires = [ "zfs.target" ];
    serviceConfig.RequiresMountsFor = [ "/mnt/fast/appdata" "/mnt/data/media" ];
  };
  
  # ---------------------------------------------------------------------------
  # STREAMRIP NIXPKGS (native installation)
  # ---------------------------------------------------------------------------
  environment.systemPackages = [ pkgs.streamrip ];
  # FARMOS systemd services migrated to modules/agriculture/farmos.nix
  # Forzar que todos esperen el desbloqueo de ZFS
  systemd.services.podman-base-dep = {
    description = "Asegurar desbloqueo ZFS para Podman";
    after    = [ "zfs-unlock.service" ];
    requires = [ "zfs-unlock.service" ];
  };

  # ---------------------------------------------------------------------------
  # PERMISOS DECLARATIVOS (ExecStartPre) — servicios sin EnvironmentFile
  # ---------------------------------------------------------------------------
  # Navidrome y FarmOS requieren permisos específicos (fuentes de iot.nix)

  systemd.services.podman-navidrome = {
    serviceConfig.ExecStartPre = [
      "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/navidrome"
      "${pkgs.coreutils}/bin/chown -R 1000:1000 /mnt/fast/appdata/navidrome"
    ];
  };

  # FARMOS ExecStartPre migrated to modules/agriculture/farmos.nix
  # ---------------------------------------------------------------------------
  # FIREWALL
  # ---------------------------------------------------------------------------
  networking.firewall.allowedTCPPorts = [
    22    # SSH
    8123  # Home Assistant
    5000  # Frigate WebUI
    1883  # Mosquitto MQTT
    8086  # InfluxDB
    1880  # Node-RED
    3000  # Grafana
    5030  # Soulseek WebUI
    5031  # Soulseek P2P
    4533  # Navidrome (Subsonic API + WebUI)
    8081  # FarmOS WebUI
    # 8080 reservado para Zigbee2MQTT (habilitar cuando se conecte el dongle)
  ];
}
