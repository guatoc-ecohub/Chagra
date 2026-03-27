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
  # NixOS automáticamente configura /etc/localtime como symlink a zoneinfo
  # Los contenedores pueden montar /etc/zoneinfo para acceder a zoneinfo completo
  time.timeZone = "America/Bogota";

  # Workaround for sphinx/docutils bug in nixos-unstable
  # Skip building Python documentation
  documentation.doc.enable = lib.mkDefault false;

  # --- SECURITY HARDENING: Electric Fences ---
  # 1. Make sops age key immutable (cannot be deleted without removing attribute first)
  systemd.services.sops-key-protection = {
    description = "Protect SOPS age key with immutable attribute";
    wantedBy = [ "multi-user.target" ];
    after = [ "local-fs.target" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      # Use bash to find chattr in PATH and apply immutable attribute
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
    # Usar el age key existente en el home del usuario
    age.keyFile = "/home/kortux/.config/sops/age/keys.txt";
    
    secrets = {
      # GitHub Runner
      github-runner-token = {
        owner = "root";
        group = "root";
        mode = "0400";
      };
      # ZFS encryption key
      zpool-key = {
        path = "/etc/zfs/zpool.key";
        owner = "root";
        group = "root";
        mode = "0400";
      };
      # Cloudflare Tunnel token
      cloudflared-token = {
        owner = "root";
        group = "root";
        mode = "0400";
      };
      # Syncthing device IDs
      syncthing-alpha-device-id = {};
      syncthing-beta-device-id = {};
      syncthing-api-key = {};
      # InfluxDB admin token for Telegraf
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
    dmidecode  # Para auditoría de hardware (RAM frecuencia, etc.)
    openrgb    # Control de LEDs RGB de la placa base
    nmap       # Escaneo de red
    arp-scan   # Descubrimiento de dispositivos en red local
    bitwarden-desktop  # Administrador de contraseñas (GUI)
  ];

  # --- HARDWARE & KERNEL (Imported via hardware.nix) ---
  # --- LOGICA DE CONTENEDORES (Imported via containers.nix) ---

  # --- RED (Imported via network.nix) ---

  services.nginx.enable = true;
  services.nginx.recommendedProxySettings = true;
  services.nginx.recommendedTlsSettings = true;

  services.nginx.virtualHosts."farmos.guatoc.co" = {
    root = "/mnt/fast/appdata/farmos-pwa-v1.1";
    forceSSL = true;
    enableACME = true;
    locations."/" = {
      tryFiles = "$uri $uri/ /index.html";
      extraConfig = ''
        if ($request_uri ~* "^/$" ) {
          add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        }
      '';
    };
    locations."/index.html" = {
      extraConfig = ''
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
      '';
    };
  };

    qbittorrent.enable = true;   # Descargas (puerto 8083)
    navidrome.enable = true;     # Streaming (puerto 4533)
    slskd.enable = true;         # Soulseek P2P (puertos 5030, 5031)
  };

  # --- AI DOMAIN (Hub & Spoke Architecture) ---
  # Ollama (LLM), Whisper (STT), Piper (TTS), ClawBots (Multi-tenant agents)
  guatoc.ai = {
    enable = true;
    
    # Hub services
    ollama.enable = true;        # LLM inference (puerto 11434)
    whisper.enable = true;       # Speech-to-text (puerto 10300)
    piper.enable = true;         # Text-to-speech (puerto 10200)
    
    # Spoke agents - multi-tenant
    clawbots.enable = true;
    clawbots.instances = {
      guatoc = { port = 8090; };
      # Xperiencia = { port = 8091; };  # Disabled - enable when needed
      # camilo = { port = 8092; };     # Disabled - enable when needed
    };
  };

  # --- HOME ASSISTANT & IOT (Legacy modules) ---
  # Los servicios IoT ya están configurados en modules/iot.nix
  # incluyendo Mosquitto, Home Assistant, Node-RED, InfluxDB y Grafana

  # --- TELEGRAF (for InfluxDB telemetry) ---
  services.telegraf = {
    enable = true;
    environmentFiles = [ config.sops.secrets.influxdb_admin_token.path ];
    extraConfig = {
      inputs = {
        cpu = [ { percpu = false; totalcpu = true; } ];
        mem = {};
        disk = {};
        diskio = {};
        net = {};
        system = {};
        
        # ZFS pool metrics
        zfs = {};
        
        # SMART metrics for NVMe/SATA disks
        smart = [{
          devices = [ "/dev/nvme0" "/dev/sda" ];
        }];
        
        # Podman container metrics
        docker = [{
          endpoint = "unix:///run/podman/podman.sock";
          container_name_include = [];
          container_state_include = ["running"];
        }];
      };
      outputs = {
        influxdb_v2 = [
          {
            urls = [ "http://127.0.0.1:8086" ];
            bucket = "telegraf";
            organization = "guatoc";
            token = "$INFLUXDB_ADMIN_TOKEN";  # Read from env var in environmentFile
          }
        ];
      };
    };
  };

  # Allow Telegraf to access smartmontools (for SMART monitoring)
  users.users.telegraf.extraGroups = [ "disk" "podman" ];
  systemd.services.telegraf.path = [ pkgs.smartmontools pkgs.nvme-cli pkgs.sudo ];

  # --- HOME ASSISTANT CONFIG ---
  # Nota: Ahora migrado a guatoc.smarthome.*
  # services.homeassistant-config = { enable = false; };

  # --- PICOCLAW (Experimental Agents) ---
  services.experimental-agents = {
    enable = true;
    enablePicoclaw = false;  # Disabled - use ClawBots instead
    enableOpenclaw = false;
  };

  # --- MODULES DEL MODO ---
  # Agriculture Delegate a modules/farmos.nix
  # Cloud Delegate a modules/cloud/default.nix
  guatoc.cloud = {
    enable = true;
    nextcloud.enable = true;
    immich.enable = true;
  };

  # Activar infraestructura base de HA (YAML setup)
  services.homeassistant-config.enable = true;
  
  # --- OBSERVABILITY DOMAIN (Sanoid, InfluxDB, Grafana, Loki, Uptime Kuma) ---
  guatoc.observability = {
    enable = true;
    logging = {
      enable = true;
      uptimeKuma = true;
    };
  };

  # --- STREAMRIP (Tidal/Qobuz/Deezer Downloader) ---
  guatoc.media.streamrip = {
    enable = true;
  };

  # --- GAMING DOMAIN (RomM) ---
  guatoc.gaming = {
    enable = true;
    romm.enable = true;
  };

  # --- SECURITY (Tailscale VPN) ---
  guatoc.security = {
    enable = true;
    tailscale.enable = true;
    #tailscale.exitNode = true;  # Uncomment to enable as exit node
  };

  # --- SSH ---
  services.openssh = {
    enable = true;
    settings = {
      PermitRootLogin = lib.mkForce "prohibit-password";
      PasswordAuthentication = false;
    };
  };

  users.users.kortux = {
    isNormalUser = true;
    # "dialout" otorga acceso a dispositivos seriales (/dev/ttyUSB*, /dev/ttyACM*).
    # Necesario para el futuro Dongle USB Zigbee (Zigbee2MQTT / ZHA en Home Assistant).
    # TODO: Cuando conectes el dongle Zigbee (ej. SONOFF Zigbee 3.0 USB Dongle Plus o
    #       ConBee II), verifica la ruta con: ls -la /dev/serial/by-id/
    #       Luego configura Zigbee2MQTT en /mnt/fast/appdata/z2m/ y añade el contenedor
    #       z2m al stack de Podman en server-services.nix.
    extraGroups = [ "wheel" "docker" "networkmanager" "audio" "dialout" ];
    openssh.authorizedKeys.keys = [
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFslJYY5DIarB0VYAP1FZ/Xt03OQufL8Q85fKlIRyIPj kortux@nixos"
    ];
  };

  # --- USUARIO COLABORADOR ---
  users.users.rookiecol = {
    isNormalUser = true;
    description = "Juan D. Agudelo - Colaborador";
    extraGroups = [ "docker" "dialout" ];  # docker para Podman, dialout para USB serial
    openssh.authorizedKeys.keys = [
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILxt3M8sSGtGaB5KAmDqbj+DmSPtFigZqQJP143NFdVF juand.agudelom@gmail.com"
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
    efi.canTouchEfiVariables = true;
  };

  # --- INITRD SSH UNLOCK (Remote ZFS Unlock) ---
  # Configuración para desbloqueo remoto de ZFS desde STG (Acer)
  # IMPORTANTE: Usar IP estática porque DHCP puede no responder a tiempo en initrd
  boot.initrd = {
    # Drivers de red necesarios para initrd
    # r8169: Realtek (común en placas AMD)
    # e1000e: Intel Gigabit
    # igb: Intel Gigabit Server
    availableKernelModules = [ "r8169" "e1000e" "igb" ];
    
    network = {
      enable = true;
      
      # IP estática para evitar dependencia de DHCP
      # Ajustar según la topología de red local
      # Formato: ip=<client-ip>:<server-ip>:<gateway>:<netmask>:<hostname>:<interface>:<autoconf>
      postCommands = ''
        # Configurar IP estática en la interfaz de red principal
        # Alpha: 192.168.10.100, Gateway: 192.168.10.1, Interfaz: enp3s0
        ip addr add 192.168.1.100/24 dev enp3s0
        ip link set enp3s0 up
        ip route add default via 192.168.1.1
        
        # Esperar a que la red esté lista
        sleep 2
      '';
      
      ssh = {
        enable = true;
        port = 2222;
        # Llaves autorizadas para desbloqueo remoto
        # Incluir llave del servidor STG (Acer) para desbloqueo desde ahí
        authorizedKeys = [ 
          "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFslJYY5DIarB0VYAP1FZ/Xt03OQufL8Q85fKlIRyIPj kortux@nixos"
          # Agregar llave pública del Acer (STG) aquí cuando esté disponible
          # "ssh-ed25519 AAAA... stg@acer"
        ];
        hostKeys = [ "/boot/initrd_ssh_host_ed25519_key" ];
      };
    };
  };

  # --- GITHUB RUNNER ---
  # Descomentar cuando sops esté funcionando
  # services.github-runners.default = {
  #   enable = true;
  #   url = "https://github.com/kortux/guatoc-nixos";
  #   tokenFile = config.sops.secrets.github-runner-token.path;
  #   name = "alpha-builder";
  #   extraPackages = with pkgs; [ nix git curl jq cachix ];
  # };

  # --- NOTA: TAILSCALE migracion a network.nix ---

  # NOTA: Navidrome ahora corre como contenedor Podman en server-services.nix
  # para integrarse con la estructura unificada de volúmenes (hardlinks)

  nixpkgs.config.allowUnfree = true;
  system.stateVersion = "24.11";

  # --- SUDO NOPASSWD FOR KORTUX ---
  security.sudo.extraRules = [
    {
      users = [ "kortux" ];
      commands = [
        { command = "ALL"; options = [ "NOPASSWD" ]; }
      ];
    }
  ];
}
