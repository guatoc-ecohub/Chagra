{ config, pkgs, lib, ... }: {
  
  imports = [ 
    ./hardware-configuration.nix
    ../../modules/dev-environment.nix
    ../../modules/desktop-gaming.nix
    ../../modules/tunnel-connectivity.nix
    ../../modules/audio-hifi.nix  # Audio Hi-Fi para IEMs
  ];

  # --- Workaround para bug known en sphinx/docutils de nixos-unstable ---
  documentation.doc.enable = lib.mkDefault false;

  # --- SOPS: Gestión de Secretos para STG ---
  sops = {
    defaultSopsFile = ./secrets.yaml;
    defaultSopsFormat = "yaml";
    age.keyFile = "/home/kortux/.config/sops/age/keys.txt";
  };

  # --- 1. FIX DE GPU AMD (Vital para tu Acer) ---
  # "amdgpu.sg_display=0" arregla el error "Secure display: Generic Failure"
  # que ves en las letras rojas y evita que la gráfica congele el arranque.
  boot.kernelParams = [ 
    "amdgpu.sg_display=0" 
  ];

  # --- 2. RESTAURAR PLYMOUTH ---
  # Lo reactivamos para que si hay error, el modo emergencia cargue bien.
  boot.plymouth.enable = true; 

  # --- 3. USUARIO Y GRUPOS ---
  # video, render, wireshark, dialout vienen de modules/dev-environment.nix
  users.users.kortux = {
    isNormalUser = true;
    description = "Kortux";
    extraGroups = [ "wheel" "networkmanager" "storage" ];
    # SubUID/GID para Podman rootless
    subUidRanges = [ { startUid = 100000; count = 65536; } ];
    subGidRanges = [ { startGid = 100000; count = 65536; } ];
  };
  programs.wireshark.enable = true;
  
  # Habilitar Podman con soporte rootless
  virtualisation.containers.enable = true;
  virtualisation.podman = {
    enable = true;
    defaultNetwork.settings.dns_enabled = true;
  };

  # --- 4. IDIOMA --- (base en common-security.nix; teclado ya en consola y Plasma)

  # --- 5. RED ---
  
  # Cloudflare Tunnel (STG - Laptop)
  # Usar el módulo tunnel-connectivity.nix con tunnels
  services.cloudflared = {
    enable = true;
    tunnels."stg-guatoc" = {
      default = "http_status:404";
      credentialsFile = "/home/kortux/.cloudflared/04a91b40-3699-48cc-b2d8-cce23b5ed755.json";
      ingress = {
        # Agregar rutas específicas de STG aquí
        "*.stg.guatoc.co" = {
          service = "http://localhost:8080";
        };
      };
    };
  };
  
  # Experimental Agents (Picoclaw + OpenClaw)
  services.tailscale = {
    enable = true;
    useRoutingFeatures = "client";
    extraUpFlags = [ "--ssh" ];
  };
  
  networking = {
    hostName = "stg";
    networkmanager.enable = true; 
    useDHCP = false; 
  };

  # --- 6. PAQUETES ---
  # Los paquetes están definidos en los módulos importados
  # (dev-environment.nix y desktop-gaming.nix)
  
  # Agregar /usr/local/bin al PATH para binaries locales
  environment.sessionVariables.PATH = "${lib.makeBinPath [ ]}:/usr/local/bin";
  
  # Instalar opencode (AI coding agent)
  environment.systemPackages = with pkgs; [
    opencode
    nmap       # Escaneo de red
    arp-scan   # Descubrimiento de dispositivos en red local
    bitwarden-desktop  # Administrador de contraseñas (GUI)

    # --- Herramientas de música / descarga ---
    # ffmpeg: requerido por Tiddl (descargador de Tidal) para transcodificación de audio
    ffmpeg

    # pipx: instala herramientas Python en entornos aislados (sin contaminar el sistema)
    # Uso post-rebuild: pipx install tiddl
    pipx

    # Antigravity: editor de código con IA de Google
    # Derivación local en pkgs/antigravity/default.nix (no disponible en nixpkgs)
    # Expuesto via overlay en flake.nix → pkgs.antigravity
    antigravity

    # --- Herramientas de monitoreo de sistema ---
    htop       # Monitor de procesos
    # nvtop     # Monitor de GPU NVIDIA (comentado temporalmente)

    # Firefox, Chrome + Bitwarden (gestor de contraseñas)
    firefox
    google-chrome
    bitwarden-desktop

    # PlatformIO FHS Environment
    (pkgs.buildFHSUserEnv {
      name = "platformio-fhs-env";
      targetPkgs = pkgs: (with pkgs; [
        platformio-core
        python3
        zlib
        ncurses
        libusb1
      ]);
      runScript = "bash";
    })
  ];
  
  nixpkgs.config.allowUnfree = true;

  # --- 7. HARDWARE ---
  hardware.enableAllFirmware = true;
  
  # Bluetooth para laptop Acer
  hardware.bluetooth = {
    enable = true;
    powerOnBoot = true;  # Encender automáticamente al arrancar
    settings = {
      General = {
        Enable = "Source,Sink,Media,Socket";
        FastConnectable = true;
      };
    };
  };
  
  # Servicios de Bluetooth
  services.blueman.enable = true;  # GUI para gestionar Bluetooth
  
  # Enable nix-ld to run dynamic linked binaries
  programs.nix-ld.enable = true;
  # IMPORTANTE: No cambies esto, déjalo en la versión original de instalación
  system.stateVersion = "24.11"; 
  
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;
  boot.kernel.sysctl = {
    "kernel.unprivileged_userns_clone" = 1;
  };
}