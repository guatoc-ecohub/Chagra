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

  # --- TELEGRAF ---
  services.telegraf = {
    enable = true;
    environmentFiles = [ config.sops.secrets.influxdb_admin_token.path ];
    extraConfig = {
      inputs = {
        cpu = [ { percpu = false; totalcpu = true; } ];
        mem = {};
        zfs = [{
          kstatPath = "/proc/spl/kstat";
          poolNames = [ "tank" "tank-fast" ];
        }];
        smart = [{
          path = "/dev/nvme*";
          useSudo = true;
        }];
        docker = [{
          endpoint = "unix:///run/podman/podman.sock";
          container_names = [];
          container_states_include = ["running"];
        }];
      };
      outputs = {
        influxdb_v2 = [
          {
            urls = [ "http://127.0.0.1:8086" ];
            bucket = "telegraf";
            organization = "guatoc";
            token = "$INFLUXDB_ADMIN_TOKEN";
          }
        ];
      };
    };
  };

  users.users.telegraf.extraGroups = [ "disk" ];

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

    # VIRTUAL HOST: PWA CON API GATEWAY
    virtualHosts."pwa_guatoc" = {
      listen = [ { addr = "127.0.0.1"; port = 80; } ];
      root = "/var/www/guatoc-pwa";

      # 1. Enrutamiento Frontend (SPA)
      locations."/" = {
        tryFiles = "$uri $uri/ /index.html";
        extraConfig = ''
          add_header Cache-Control "no-store, no-cache, must-revalidate";
        '';
      };

      # 2. Enrutamiento Backend (CORS Bypass / API Gateway)
      locations."/api/" = {
        proxyPass = "https://farmos.guatoc.co/api/";
        extraConfig = ''
          proxy_ssl_server_name on;
          proxy_set_header Host farmos.guatoc.co;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;

          # Inyección de cabeceras de control de acceso
          add_header 'Access-Control-Allow-Origin' '*';
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PATCH, DELETE';
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept';
        '';
      };
    };
  };
}
