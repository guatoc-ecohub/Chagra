# modules/agriculture/farmos.nix
# =============================================================================
# FARMOS — Gestión agrícola
# Puerto: 8081
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.agriculture.farmos;
  agrCfg = config.guatoc.agriculture;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.agriculture.farmos = {
    enable = lib.mkEnableOption "FarmOS - Gestión agrícola" // {
      default = false;
    };
  };

  config = lib.mkIf (agrCfg.enable && cfg.enable) {
    systemd.services.podman-farmos = {
      after = [ "zfs.target" "network-online.target" "podman-postgres-farm.service" ];
      requires = [ "zfs.target" "podman-postgres-farm.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/farmos"
          "${pkgs.coreutils}/bin/chown -R 33:33 /mnt/fast/appdata/farmos"
        ];
      };
    };

    virtualisation.oci-containers.containers.farmos = {
      image = "farmos/farmos:3.x";
      ports = [ "${toString registry.ports.farmos}:80" ];
      volumes = [
        "/mnt/fast/appdata/farmos:/opt/drupal/web/sites"
      ];
      environment = {
        TZ = config.time.timeZone;
        # PostgreSQL external database connection
        DRUPAL_DB_DRIVER = "pgsql";
        DRUPAL_DB_HOST = "postgres-farm";
        DRUPAL_DB_PORT = "5432";
        DRUPAL_DB_NAME = "farmos";
        DRUPAL_DB_USER = "farmos";
        DRUPAL_DB_PASSWORD = "changeme";  # TODO: migrate to sops-nix
      };
      extraOptions = [
        "--network=iot-net"
        "--name=farmos"
        "--hostname=farmos"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.farmos ];

    # === NGINX CONFIGURATION FOR FARMOS PWA ===
    # Frontend PWA: Archivos estáticos servidos por Nginx desde /mnt/fast/appdata/farmos-pwa/
    # Backend FarmOS (Drupal): Contenedor Podman en puerto 8081
    # PWA necesita archivos estáticos (GET) + API backend (POST/PUT/DELETE)
    services.nginx.virtualHosts."farmos.guatoc.co" = {
      root = "/mnt/fast/appdata/farmos-pwa";
      locations = {
        # Archivos estáticos de la PWA (solo GET)
        "/" = {
          tryFiles = "$uri $uri/ /index.html";
          extraConfig = ''
            # Headers de seguridad
            add_header X-Frame-Options "SAMEORIGIN" always;
            add_header X-Content-Type-Options "nosniff" always;
            add_header X-XSS-Protection "1; mode=block" always;
          '';
        };
        "~ \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$" = {
          extraConfig = ''
            expires 1y;
            add_header Cache-Control "public, immutable";
          '';
        };
        # Proxy de API al backend Drupal (POST/PUT/DELETE)
        "/api/" = {
          proxyPass = "http://127.0.0.1:8081";
          extraConfig = ''
            # CORS headers para API
            add_header Access-Control-Allow-Origin "*" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept, Authorization, X-Requested-With" always;

            # Proxy headers
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Manejo de OPTIONS
            if ($request_method = 'OPTIONS') {
              return 204;
            }
          '';
        };
        # Proxy de otras rutas de Drupal
        "~ ^/(user|admin|node|taxonomy|farm|asset|log|plan|quantity|unit|season|inventory)" = {
          proxyPass = "http://127.0.0.1:8081";
          extraConfig = ''
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
          '';
        };
      };
    };

    # Crear directorio para la PWA si no existe
    systemd.tmpfiles.rules = [
      "d /mnt/fast/appdata/farmos-pwa 0755 kortux users -"
    ];
  };
}
