# hosts/alpha/default.nix - Servidor Ryzen, ZFS (tank + tank-fast)
# Zero-Touch Deployment con SOPS, ZFS, Podman, Cloudflare Tunnel
{ config, pkgs, lib, inputs, ... }:

{
  imports = [ 
    ./hardware-configuration.nix
  ];

  # --- TIMEZONE ---
  # NixOS automáticamente configura /etc/localtime como symlink a zoneinfo
  # Los contenedores pueden montar /etc/zoneinfo para acceder a zoneinfo completo
  time.timeZone = "America/Bogota";

  # Workaround for sphinx/docutils bug in nixos-unstable
  # Skip building Python documentation
  documentation.doc.enable = lib.mkDefault false;

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

  # ============================================================================
  # AJUSTES DE RENDIMIENTO POST-AUDITORÍA
  # ============================================================================
  
  # 1. GOVERNADOR CPU: Cambiar de powersave a performance
  powerManagement.cpuFreqGovernor = "performance";

  # 2. KVM: Habilitar virtualización AMD (SVM ya disponible en hardware)
  # 3. OpenRGB / I2C: Soporte para LEDs RGB de placa base y SMBus
  boot.kernelModules = [ "kvm-amd" "i2c-dev" "i2c-piix4" ];

  # --- HARDWARE: OpenRGB e I2C ---
  # Habilita control de LEDs RGB de placa base
  services.hardware.openrgb.enable = true;
  hardware.i2c.enable = true;
  boot.extraModprobeConfig = ''
    options kvm_amd nested=1
  '';
  
  # Nota: ZFS params ya configurados arriba en boot.kernelParams

  # --- KERNEL: ZFS + ACPI ---
  boot.kernelParams = [
    "acpi=force"
    "zfs.zfs_arc_max=4294967296"       # Limita ARC a 4GB (Protege Ollama de OOM)
    "zfs.zfs_arc_min=1073741824"        # Mínimo 1GB
    "zfs.zfs_arc_meta_limit=1073741824" # Límite de metadatos en RAM
    "zfs.zfs_txg_timeout=10"           # Agrupa escrituras cada 10s (reduce ruido HDD)
  ];

  boot.supportedFilesystems = [ "zfs" ];

  # --- FILESYSTEMS ---
  # FIX: Deshabilitar zfs-mount.service para evitar conflicto con fstab
  # Las entradas fstab (generadas automáticamente por los pools ZFS) manejarán los montajes
  systemd.services.zfs-mount.enable = false;

  # OOM Killer tuning
  boot.kernel.sysctl = {
    "vm.swappiness" = 10;
    "vm.vfs_cache_pressure" = 50;
    "vm.overcommit_memory" = 2;
    "vm.overcommit_ratio" = 80;
  };

  # Docker limits
  systemd.services.docker.serviceConfig = {
    MemoryMax = "10G";
    CPUQuota = "800%";
    MemorySwapMax = "2G";
  };

  # Swap gestionado por disko.nix con randomEncryption

  # --- LIMPIEZA DE PUNTOS DE MONTAJE ---
  # NOTA: Deshabilitado - Es mejor limpiar manualmente una vez:
  #   sudo umount /mnt/data /mnt/fast
  #   sudo rm -rf /mnt/data/* /mnt/fast/*
  #   sudo zfs mount -a
  # Que tener un script automático borrando cosas en el arranque.
  # systemd.services.zfs-mount-cleaner = { ... };

  # ZFS unlock service - Usa rutas Nix explícitas
  systemd.services.zfs-unlock = {
    description = "Unlock ZFS pools with age key";
    wantedBy = [ "multi-user.target" ];
    path = [ config.boot.zfs.package ];
    after = [ "zfs-import.target" "sops-nix.service" ];
    requires = [ "zfs-import.target" ];
    wants = [ "sops-nix.service" ];
    serviceConfig.Type = "oneshot";
    script = ''
      if [ -f /etc/zfs/zpool.key ]; then
        chmod 600 /etc/zfs/zpool.key
        ${config.boot.zfs.package}/bin/zfs load-key -a
        ${config.boot.zfs.package}/bin/zfs mount -a
      else
        echo "WARNING: ZFS key not found at /etc/zfs/zpool.key"
        exit 1
      fi
    '';
  };

  # --- AUTO-CREACIÓN DE DIRECTORIOS ---
  # NOTA: Estos directorios se crean DESPUÉS del montaje de ZFS
  # Los directorios base (/mnt/data, /mnt/fast) son manejados por ZFS mountpoint
  # 
  # ARQUITECTURA ACTUAL: Todo en HDD (tank)
  #   - /mnt/data/appdata/*: Configs de contenedores
  #   - /mnt/data/media/*: Media files
  #   - /mnt/data/backups: Backups
  #   - /mnt/fast/*: Disponible para uso futuro
  systemd.tmpfiles.rules = [
    # === HDD (tank) - APPDATA ===
    "d /mnt/data/appdata 0755 root root -"
    "d /mnt/data/appdata/frigate 0755 root root -"
    "d /mnt/data/appdata/frigate/config 0755 root root -"
    "d /mnt/data/appdata/homeassistant 0755 root root -"
    "d /mnt/data/appdata/mosquitto 0755 root root -"
    "d /mnt/data/appdata/influxdb 0755 root root -"
    "d /mnt/data/appdata/grafana 0755 root root -"
    "d /mnt/data/appdata/nodered 0755 root root -"
    "d /mnt/data/appdata/slskd 0755 root root -"
    "d /mnt/data/appdata/z2m 0755 root root -"
    "d /mnt/data/appdata/immich 0755 root root -"
    
    # === HDD (tank) - MEDIA Y BACKUPS ===
    "d /mnt/data/media 0755 root root -"
    "d /mnt/data/media/frigate 0755 root root -"
    "d /mnt/data/media/music 0755 root root -"
    "d /mnt/data/media/immich 0755 root root -"
    "d /mnt/data/immich 0755 root root -"
    "d /mnt/data/backups 0755 root root -"
    
    # === SSD (tank-fast) - Uso futuro ===
    "d /mnt/fast/appdata 0755 root root -"
    "d /mnt/fast/apps 0755 root root -"
    "d /mnt/fast/soulseek 0755 root root -"
    
    # Directorios para Home Assistant y Mosquitto (legacy paths)
    "d /var/lib/hass 0755 root root -"
    "d /var/lib/mosquitto 0755 root root -"
    
    # Directorio para syncthing
    "d /var/lib/syncthing 0755 kortux users -"
    "d /var/lib/syncthing/.config 0755 kortux users -"
    "d /var/lib/syncthing/.config/syncthing 0755 kortux users -"
    
    # Directorio para cloudflared credentials
    "d /var/lib/cloudflared 0700 root root -"
  ];

  # --- RED ---
  networking = {
    hostName = "alpha";
    hostId = "8425e349";
    networkmanager.enable = true;
    nameservers = [ "1.1.1.1" "8.8.8.8" ];
    defaultGateway = "192.168.1.1";
    # useDHCP lo maneja NetworkManager
    firewall = {
      enable = true;
      allowedTCPPorts = [
        22      # SSH
        8123    # Home Assistant
        1883    # Mosquitto MQTT
        5000    # Frigate
        8554    # Frigate RTSP
        8555    # Frigate WebRTC
        5030    # Soulseek (slskd WebUI)
        5031    # Soulseek (transferencias P2P)
        8086    # InfluxDB
        1880    # Node-RED
        3000    # Grafana
        # NOTA: 4533 Navidrome - ACCESO EXCLUSIVO vía Tailscale (trustedInterfaces)
        8081    # FarmOS (gestión agrícola)
        # TODO: 8080 - Zigbee2MQTT WebUI (habilitar cuando se conecte el dongle Zigbee)
      ];
      allowedUDPPorts = [
        5353     # mDNS (descubrimiento Home Assistant)
        8555     # Frigate WebRTC
        41641    # Tailscale VPN (relay/bootstrap)
      ];
      
      # Permitir todo el tráfico en la interfaz Tailscale (túnel VPN seguro)
      trustedInterfaces = [ "tailscale0" ];
      # Permitir tráfico desde la red local
      # NOTA: Navidrome (4533) NO está listado aquí - acceso exclusivo vía Tailscale
      interfaces.enp3s0 = {
        allowedTCPPorts = [ 8123 1883 5000 8554 8555 5030 5031 8086 1880 3000 8081 ];
        allowedUDPPorts = [ 5353 8555 ];
      };
    };
  };

  # --- CLOUDFLARE TUNNEL ---
  # Usar systemd service personalizado con token
  # El secreto contiene solo el JWT token (sin TUNNEL_TOKEN= prefix)
  systemd.services.cloudflared-tunnel-alpha = {
    description = "Cloudflare Tunnel for Alpha";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" "sops-nix.service" ];
    requires = [ "network.target" ];
    serviceConfig = {
      Type = "simple";
      # Usar tr para eliminar newlines y pasar el token limpio
      ExecStart = "${pkgs.bash}/bin/bash -c 'token=$(tr -d \"\\n\" < ${config.sops.secrets.cloudflared-token.path}) && exec ${pkgs.cloudflared}/bin/cloudflared tunnel --no-autoupdate run --token \"$token\"'";
      Restart = "on-failure";
      RestartSec = "5s";
      User = "root";
    };
  };

  # --- MUSIC PIPELINE ---
  services.music-pipeline = {
    enable = true;
    downloadsDir = "/mnt/data/media/downloads";
    musicDir = "/mnt/data/media/musica";
  };

  # --- MEDIA STACK (*arr applications) ---
  # REFACTOR 2024-03: Migrado a estructura guatoc.media.* con registry central
  guatoc.media = {
    enable = true;
    # Rutas compartidas del dominio media
    dataDir = "/mnt/data/media";
    downloadsDir = "/mnt/data/media/downloads";
    musicDir = "/mnt/data/media/music";
    moviesDir = "/mnt/data/media/movies";
    tvDir = "/mnt/data/media/tv";
    
    # Feature toggles individuales
    lidarr.enable = true;        # Música (puerto 8686)
    radarr.enable = true;        # Películas (puerto 7878)
    sonarr.enable = true;        # Series (puerto 8989)
    prowlarr.enable = true;      # Indexadores (puerto 9696)
    qbittorrent.enable = true;   # Descargas (puerto 8083)
    navidrome.enable = true;     # Streaming (puerto 4533)
    slskd.enable = true;         # Soulseek P2P (puertos 5030, 5031)
  };

  # --- HOME ASSISTANT & IOT (Legacy modules) ---
  # Los servicios IoT ya están configurados en modules/iot.nix
  # incluyendo Mosquitto, Home Assistant, Node-RED, InfluxDB y Grafana

  # --- TELEGRAF (for InfluxDB telemetry) ---
  services.telegraf = {
    enable = true;
    extraConfig = {
      inputs = {
        cpu = [ { percpu = false; totalcpu = true; } ];
        mem = {};
        disk = [];
        diskio = [];
        net = [];
        system = [];
      };
      outputs = {
        influxdb_v2 = [
          {
            urls = [ "http://127.0.0.1:8086" ];
            bucket = "iot";
            organization = "guatoc";
            # Token will be required once influxdb_admin_token is added to secrets.yaml
            # token_file = config.sops.secrets."influxdb_admin_token".path;
          }
        ];
      };
    };
  };

  # --- HOME ASSISTANT CONFIG ---
  # Nota: Ahora migrado a guatoc.smarthome.*
  # services.homeassistant-config = { enable = false; };

  # --- PICOCLAW (Experimental Agents) ---
  services.experimental-agents = {
    enable = true;
    enablePicoclaw = true;
    enableOpenclaw = false;
  };

  # --- AGRICULTURE DOMAIN (FarmOS, PostgreSQL) ---
  guatoc.agriculture = {
    enable = true;
    postgresFarm.enable = true;
    farmos.enable = true;
  };

  # --- CLOUD DOMAIN (Nextcloud, Immich) ---
  guatoc.cloud = {
    enable = true;
    nextcloud.enable = true;
    immich.enable = true;
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

  # --- TAILSCALE VPN (Acceso remoto privado) ---
  # Mesh VPN para acceso seguro sin abrir puertos en el router
  services.tailscale = {
    enable = true;
    useRoutingFeatures = "client";  # Permite usar la red Tailscale
    extraUpFlags = [ "--ssh" ];     # Habilita Tailscale SSH
  };

  # NOTA: Navidrome ahora corre como contenedor Podman en server-services.nix
  # para integrarse con la estructura unificada de volúmenes (hardlinks)

  nixpkgs.config.allowUnfree = true;
  system.stateVersion = "24.11";
}
