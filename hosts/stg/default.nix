{ config, pkgs, lib, ... }: {
  
  imports = [
    ./hardware-configuration.nix
    ../../modules/dev-environment.nix
    ../../modules/desktop-gaming.nix
    ../../modules/tunnel-connectivity.nix
    ../../modules/experimental-agents.nix
    ../../modules/audio-hifi.nix  # Audio Hi-Fi para IEMs
    ../../modules/scripts/stack-update.nix  # Update CLIs mensual via systemd-timer user
  ];

  # Stack update mensual (claude-code, cursor-agent, uv) — reemplaza crontab
  # (que NixOS no incluye por default). Día 1 de cada mes 04:00 + jitter 30m.
  # Logs: journalctl --user -u stack-update.service
  guatoc.scripts.stackUpdate.enable = true;

  # --- Workaround para bug known en sphinx/docutils de nixos-unstable ---
  documentation.doc.enable = lib.mkDefault false;

  # --- SOPS: Gestión de Secretos para STG ---
  sops = {
    defaultSopsFile = ./secrets.yaml;
    defaultSopsFormat = "yaml";
    age.keyFile = "/home/kortux/.config/sops/age/keys.txt";
  };

  # Experimental Agents (Picoclaw + OpenClaw)
  services.experimental-agents = {
    enable = true;
    enablePicoclaw = true;  # glm-4.7 con API key
    enableOpenclaw = false;  # Por ahora deshabilitado
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
  
  # Experimental Agents (Picoclaw + OpenClaw)
  # services.experimental-agents = {
  #   enable = true;
  #   enablePicoclaw = true;
  #   enableOpenclaw = false;
  # };
  
  networking = {
    hostName = "stg";
    networkmanager.enable = true;
    useDHCP = false;

    # Resolución estática de alpha vía Tailscale (MagicDNS no activo en stg).
    # Permite que `ssh alpha`, `ping alpha` y el proxy de Vite (opcional)
    # funcionen sin depender de que tailscaled esté arriba al momento de
    # resolver. IP obtenida con `tailscale ip -4` en alpha (2026-04-22).
    hosts = {
      "100.117.193.102" = [ "alpha" ];
    };
  };

  # --- 6. PAQUETES ---
  # Los paquetes están definidos en los módulos importados
  # (dev-environment.nix y desktop-gaming.nix)
  
  # Agregar /usr/local/bin al PATH para binaries locales + TZ explícito
  # para Chromium/Brave/Firefox (V8 a veces ignora /etc/localtime y cachea
  # UTC de PID 1 — sin TZ exportado el browser muestra hora 5h adelante).
  environment.sessionVariables = {
    PATH = "${lib.makeBinPath [ ]}:/usr/local/bin";
    TZ = "America/Bogota";
  };
  
  # Instalar opencode (AI coding agent)
  environment.systemPackages = with pkgs; [
    opencode
    brave      # Browser secundario (perfil respaldado diariamente)
    rsync      # Requerido por brave-profile-backup
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

    # Warp: terminal moderno con AI agent integrado (unfree)
    warp-terminal

    # --- Herramientas de monitoreo de sistema ---
    htop       # Monitor de procesos
    # nvtop     # Monitor de GPU NVIDIA (comentado temporalmente)

    # Firefox, Chrome + Bitwarden (gestor de contraseñas)
    firefox
    google-chrome
    bitwarden-desktop

    # PlatformIO FHS Environment
    (pkgs.buildFHSEnv {
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
    # Fix SIGTRAP en Chromium/Brave/Electron con kernel 6.12+.
    # V8 pointer cage requiere bloque 4GB-alineado; mmap_rnd_bits=32
    # fragmenta el VA space → __builtin_trap(). 28 = mínimo seguro.
    "vm.mmap_rnd_bits" = 28;
  };

  # Backup browsers — Brave + Firefox cada 6h. Destino FUERA de cada
  # .config respectivo para sobrevivir un `rm -rf` del directorio del browser.
  # Excluye caches/GPU/ServiceWorker para mantener tamaño manejable (~200MB
  # en lugar de ~5GB). Rota 14 snapshots = ~3.5 días con OnCalendar=*-*-* 00,06,12,18:00:00
  systemd.user.services.browser-profile-backup = {
    description = "Backup periódico perfiles Brave + Firefox";
    serviceConfig = {
      Type = "oneshot";
      ExecStart = pkgs.writeShellScript "browser-backup" ''
        set -uo pipefail
        DST="$HOME/Backups/browsers"
        mkdir -p "$DST"
        STAMP=$(date +%Y%m%d-%H%M)

        EXCLUDES=(
          --exclude='Cache/*'
          --exclude='Code Cache/*'
          --exclude='GPUCache/*'
          --exclude='Service Worker/CacheStorage/*'
          --exclude='ShaderCache/*'
          --exclude='GraphiteDawnCache/*'
          --exclude='component_crx_cache/*'
          --exclude='extensions_crx_cache/*'
          --exclude='lock'
          --exclude='SingletonLock'
          --exclude='SingletonCookie'
          --exclude='SingletonSocket'
          --exclude='*.log'
          --exclude='cache2/*'
          --exclude='startupCache/*'
          --exclude='OfflineCache/*'
        )

        # --- Brave ---
        BRAVE_SRC="$HOME/.config/BraveSoftware/Brave-Browser"
        if [ -d "$BRAVE_SRC" ]; then
          if ! pgrep -x brave > /dev/null && ! pgrep -f "brave-browser" > /dev/null; then
            ${pkgs.rsync}/bin/rsync -a --delete "''${EXCLUDES[@]}" "$BRAVE_SRC/" "$DST/brave-$STAMP/" \
              && echo "✓ Brave snapshot: $DST/brave-$STAMP" \
              || echo "✗ Brave rsync falló"
          else
            echo "⊘ Brave corriendo — snapshot pospuesto"
          fi
        fi

        # --- Firefox (todos los profiles) ---
        FF_SRC="$HOME/.mozilla/firefox"
        if [ -d "$FF_SRC" ]; then
          if ! pgrep -x firefox > /dev/null && ! pgrep -f "firefox-bin" > /dev/null; then
            ${pkgs.rsync}/bin/rsync -a --delete "''${EXCLUDES[@]}" "$FF_SRC/" "$DST/firefox-$STAMP/" \
              && echo "✓ Firefox snapshot: $DST/firefox-$STAMP" \
              || echo "✗ Firefox rsync falló"
          else
            echo "⊘ Firefox corriendo — snapshot pospuesto"
          fi
        fi

        # Rotar a 14 snapshots por browser (~3.5 días con cadencia 6h)
        for prefix in brave firefox; do
          ls -1dt "$DST"/$prefix-*/ 2>/dev/null | tail -n +15 | xargs -r rm -rf
        done

        # Reporte tamaño
        du -sh "$DST" 2>/dev/null || true
      '';
    };
  };

  systemd.user.timers.browser-profile-backup = {
    description = "Timer backup browsers cada 6h";
    wantedBy = [ "timers.target" ];
    timerConfig = {
      OnCalendar = "*-*-* 00,06,12,18:00:00";
      Persistent = true;
      RandomizedDelaySec = "10min";
    };
  };

  # Migración: eliminar el servicio antiguo brave-profile-backup que nunca
  # corrió. NixOS limpia los unidades viejas si ya no están declaradas, pero
  # los snapshots viejos en ~/.config/BraveSoftware/backups/ quedan: el
  # operador puede borrarlos manualmente si quiere recuperar espacio.

  # Restaurar rotación HDMI al iniciar la sesión Plasma. Aplica
  # 'left' (90° antihorario) por default — cambiar a inverted/right según
  # orientación física del monitor externo. El service espera a que
  # graphical-session.target esté listo (KScreen DBus disponible).
  systemd.user.services.hdmi-rotation = {
    description = "Aplica rotación HDMI al iniciar Plasma";
    wantedBy = [ "graphical-session.target" ];
    after = [ "graphical-session.target" "plasma-kscreen.service" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      ExecStart = pkgs.writeShellScript "hdmi-rotation" ''
        # Esperar hasta 30s a que KScreen DBus + el output HDMI estén listos
        for i in $(seq 1 30); do
          if ${pkgs.kdePackages.libkscreen}/bin/kscreen-doctor -o 2>/dev/null | ${pkgs.gnugrep}/bin/grep -q "HDMI-A-1.*connected"; then
            break
          fi
          sleep 1
        done
        # Aplicar rotación. Cambiar 'left' por 'right'/'inverted'/'normal' según orientación.
        ${pkgs.kdePackages.libkscreen}/bin/kscreen-doctor output.HDMI-A-1.rotation.left || true
      '';
    };
  };
}