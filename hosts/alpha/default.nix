# hosts/alpha/default.nix - Servidor Ryzen, ZFS (tank + tank-fast)
# Zero-Touch Deployment con SOPS, ZFS, Podman, Cloudflare Tunnel
{ config, pkgs, lib, inputs, ... }:
{
  imports = [
    ./hardware-configuration.nix
    ./network.nix
    ./hardware.nix
    ./containers.nix
    ../../modules/ai
    ../../modules/iot.nix
    ../../modules/farmos.nix
  ];

  # --- TIMEZONE ---
  time.timeZone = "America/Bogota";

  # Workaround for sphinx/docutils bug in nixos-unstable
  documentation.doc.enable = lib.mkDefault false;

  # --- SECURITY HARDENING: Electric Fences ---
  systemd.services.sops-key-protection = {
    description = "Protect SOPS age key with immutable attribute";
    wantedBy = [ "multi-user.target" ];
    after = [ "local-fs.target" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      ExecStart = ''
        KEYFILE="/home/kortux/.config/sops/age/keys.txt"
        if [ -f "$KEYFILE" ]; then
          chattr +i "$KEYFILE" 2>/dev/null || true
        fi
      '';
    };
  };

  # --- SOPS: Gestión de Secretos ---
  sops = {
    defaultSopsFile = ./secrets.yaml;
    defaultSopsFormat = "yaml";
    age.keyFile = "/home/kortux/.config/sops/age/keys.txt";

    secrets = {
      github-runner-token = {
        owner = "root";
        group = "root";
        mode = "0400";
      };
      zpool-key = {
        path = "/etc/zfs/zpool.key";
        owner = "root";
        group = "root";
        mode = "0400";
      };
      cloudflared-token = {
        owner = "root";
        group = "root";
        mode = "0400";
      };
      syncthing-alpha-device-id = {};
      syncthing-beta-device-id = {};
      syncthing-api-key = {};
      influxdb_admin_token = {
        owner = "root";
        group = "root";
        mode = "0400";
      };
    };
  };

  # Paquetes del sistema
  environment.systemPackages = with pkgs; [
    sops
    age
    dmidecode
    openrgb
    nmap
    arp-scan
    bitwarden-desktop
  ];

  # --- HOME ASSISTANT & IOT (Legacy modules) ---
  # Los servicios IoT ya están configurados en modules/iot.nix
  # incluyendo Mosquitto, Home Assistant, Node-RED, InfluxDB y Grafana

  # --- WYOMING PIPER TTS INTEGRATION ---
  # Integración de Piper TTS vía protocolo Wyoming para Home Assistant
  services.wyoming.piper.servers.default = {
    enable = true;
    voice = "es_ES-davefx-medium";
    uri = "tcp://127.0.0.1:10200";
  };

  # --- MUSIC PIPELINE ---
  services.music-pipeline = {
    enable = true;
    downloadsDir = "/mnt/data/media/downloads";
    musicDir = "/mnt/data/media/musica";
  };

  # --- MEDIA STACK (*arr applications) ---
  guatoc.media = {
    enable = true;
    dataDir = "/mnt/data/media";
    downloadsDir = "/mnt/data/media/downloads";
    musicDir = "/mnt/data/media/musica";
    moviesDir = "/mnt/data/media/movies";
    tvDir = "/mnt/data/media/tv";

    lidarr.enable = true;
    radarr.enable = true;
    sonarr.enable = true;
    prowlarr.enable = true;
    qbittorrent.enable = true;
    navidrome.enable = true;
    slskd.enable = true;
  };

  # --- AI DOMAIN (Hub & Spoke Architecture) ---
  guatoc.ai = {
    enable = true;
    ollama.enable = true;
    whisper.enable = true;
    piper.enable = true;
    clawbots.enable = true;
    clawbots.instances = {
      guatoc = { port = 8090; };
    };
  };

  # --- HOME ASSISTANT CONFIG ---
  services.homeassistant-config = {
    enable = false;
  };

  # --- PICOCLAW (Experimental Agents) ---
  services.experimental-agents = {
    enable = true;
    enablePicoclaw = false;
    enableOpenclaw = false;
  };

  # --- CLOUD ---
  guatoc.cloud = {
    enable = true;
    nextcloud.enable = true;
    immich.enable = true;
  };

  # --- OBSERVABILITY DOMAIN ---
  guatoc.observability = {
    enable = true;
    logging = {
      enable = true;
      uptimeKuma = true;
    };
  };

  # --- STREAMRIP ---
  guatoc.media.streamrip = {
    enable = true;
  };

  # --- GAMING ---
  guatoc.gaming = {
    enable = true;
    romm.enable = true;
  };

  # --- SECURITY ---
  guatoc.security = {
    enable = true;
    tailscale.enable = true;
  };

  # --- CLOUDFLARE ZERO TRUST CONNECTOR (MANAGED TUNNEL) ---
  systemd.services.cloudflared-tunnel = {
    description = "Cloudflare Zero Trust Managed Tunnel";
    wantedBy = [ "multi-user.target" ];
    after = [ "network-online.target" ];
    wants = [ "network-online.target" ];

    # Inyección de binarios en el PATH del servicio
    path = [ pkgs.cloudflared pkgs.bash ];

    serviceConfig = {
      Type = "simple";
      # Ejecución mediante shell para evaluar el secreto almacenado por SOPS
      ExecStart = "${pkgs.bash}/bin/bash -c 'cloudflared tunnel --no-autoupdate run --token $(cat /run/secrets/cloudflared-token)'";
      Restart = "always";
      RestartSec = "10s";

      # Nota: Se asume que el archivo /run/secrets/cloudflared-token contiene
      # exclusivamente la cadena del token (eyJh...) sin saltos de línea ni comillas.
    };
  };

  # --- TELEGRAF (DESHABILITADO TEMPORALMENTE) ---
  # services.telegraf = {
  #   enable = true;
  #   environmentFiles = [ config.sops.secrets.influxdb_admin_token.path ];
  #   extraConfig = {
  #     inputs = {
  #       cpu = [ { percpu = false; totalcpu = true; } ];
  #       mem = {};
  #       zfs = [{
  #         kstatPath = "/proc/spl/kstat";
  #         poolNames = [ "tank" "tank-fast" ];
  #       }];
  #       smart = [{
  #         path = "/dev/nvme*";
  #         useSudo = true;
  #       }];
  #       docker = [{
  #         endpoint = "unix:///run/podman/podman.sock";
  #         container_names = [];
  #         container_states_include = ["running"];
  #       }];
  #     };
  #     outputs = {
  #       influxdb_v2 = [
  #         {
  #           urls = [ "http://127.0.0.1:8086" ];
  #           bucket = "telegraf";
  #           organization = "guatoc";
  #           token = "$INFLUXDB_ADMIN_TOKEN";
  #         }
  #       ];
  #     };
  #   };
  # };

  # users.users.telegraf.extraGroups = [ "disk" ];

  # --- OPENSSSH ---
  services.openssh = {
    enable = true;
    settings = {
      PermitRootLogin = lib.mkForce "prohibit-password";
      PasswordAuthentication = false;
    };
  };

  users.users.kortux = {
    isNormalUser = true;
    extraGroups = [ "wheel" "docker" "networkmanager" "audio" "dialout" ];
    openssh.authorizedKeys.keys = [
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFslJYY5DIarB0VYAP1FZ/Xt03OQufL8Q85fKlIRyIPj kortux@nixos"
    ];
  };

  users.users.rookiecol = {
    isNormalUser = true;
    extraGroups = [ "docker" "dialout" ];
    openssh.authorizedKeys.keys = [
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFslJYY5DIarB0VYAP1FZ/Xt03OQufL8Q85fKlIRyIPj juand.agudelom@gmail.com"
    ];
  };

  # --- BOOTLOADER ---
  boot.loader = {
    grub = {
      enable = true;
      zfsSupport = true;
      efiSupport = true;
      device = "nodev";
    };
  };

  boot.initrd = {
    network = {
      enable = true;
      ssh = {
        enable = true;
        port = 2222;
        authorizedKeys = [
          "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFslJYY5DIarB0VYAP1FZ/Xt03OQufL8Q85fKlIRyIPj kortux@nixos"
          # Agregar llave pública del Acer (STG) aquí cuando esté disponible
          # "ssh-ed25519 AAAA... stg@acer"
        ];
        hostKeys = [ "/boot/initrd_ssh_host_ed25519_key" ];
      };
    };
  };

  nixpkgs.config.allowUnfree = true;
  system.stateVersion = "24.11";

  # --- NGINX PARA PWA (API Gateway) ---
  services.nginx = {
    enable = true;

    # 1. El VirtualHost DEBE llamarse exactamente como el dominio público
    virtualHosts."app.guatoc.co" = {
      # 2. Binding universal para permitir tráfico desde la IP física de la LAN
      listen = [ { addr = "0.0.0.0"; port = 80; } ];
      root = "/mnt/fast/appdata/farmos-pwa";

      locations."/" = {
        tryFiles = "$uri $uri/ /index.html";
        extraConfig = ''
          add_header Cache-Control "no-store, no-cache, must-revalidate";
        '';
      };

      locations."/api/" = {
        # Enrutamiento interno directo al contenedor FarmOS
        proxyPass = "http://127.0.0.1:8081/api/";
        extraConfig = ''
          proxy_set_header Host farmos.guatoc.co;

          # Inyección de cabeceras CORS
          add_header 'Access-Control-Allow-Origin' '*' always;
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PATCH, DELETE' always;
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;

          if ($request_method = 'OPTIONS') {
              add_header 'Access-Control-Allow-Origin' '*';
              add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PATCH, DELETE';
              add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept';
              add_header 'Access-Control-Max-Age' 1728000;
              add_header 'Content-Type' 'text/plain; charset=utf-8';
              add_header 'Content-Length' 0;
              return 204;
          }
        '';
      };
    };
  };
}
