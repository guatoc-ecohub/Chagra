# ~/guatoc-nixos/hosts/beta/default.nix
{ config, pkgs, lib, ... }: {
  
  networking.hostName = "beta-pi";
  networking.networkmanager.enable = true;
  
  # No necesitamos ZFS aquí (mucha RAM), usaremos ext4 sobre el SSD USB
  fileSystems."/mnt/backup" = {
    device = "/dev/sda1"; # Tu SSD de 1TB (Repositorio BorgBackup)
    fsType = "ext4";
    options = [ "noatime" ];
  };

  # Paquetes base y Scripts del sistema
  environment.systemPackages = with pkgs; [
    wakeonlan
    borgbackup
    # Script utilitario para despertar a Alpha fácilmente vía WOL
    (pkgs.writeShellScriptBin "wake-alpha" ''
      # Reemplace con la MAC Address de la interfaz enp3s0 de Alpha
      ALPHA_MAC="XX:XX:XX:XX:XX:XX"
      if [ "$ALPHA_MAC" = "XX:XX:XX:XX:XX:XX" ]; then
        echo "Por favor asigne la MAC Address de Alpha en hosts/beta/default.nix"
        exit 1
      fi
      ${pkgs.wakeonlan}/bin/wakeonlan $ALPHA_MAC
      echo "Paquete mágico enviado a Alpha ($ALPHA_MAC)"
    '')
  ];

  # --- SISTEMA DE BACKUPS (BORGBACKUP REPO) ---
  # Convierte la Pi en un servidor de repositorios de Borg
  # Alpha se conectará por SSH (llave pública) al usuario 'borg'
  services.borgbackup.repos = {
    alpha-backup = {
      path = "/mnt/backup/borg/alpha";
      # Definir cuota opcional si se requiere
      authorizedKeys = [
        "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFslJYY5DIarB0VYAP1FZ/Xt03OQufL8Q85fKlIRyIPj kortux@nixos"
        # TODO: Adicionar también la llave pública SSH del root de Alpha
      ];
    };
  };

  # --- SERVICIOS DE VIGÍA ---

  # 1. AdGuard Home: DNS y Bloqueo de anuncios (Redundancia)
  services.adguardhome = {
    enable = true;
    host = "0.0.0.0";
    port = 3000;
  };

  # 2. Uptime Kuma: Monitor de Alpha
  services.uptime-kuma = {
    enable = true;
    settings = {
      HOST = "0.0.0.0";
      PORT = "3001";
    };
  };

  # 3. Syncthing: Para recibir backups críticos de Alpha
  services.syncthing = {
    enable = true;
    user = "kortux";
    dataDir = "/mnt/backup/syncthing";
    configDir = "/home/kortux/.config/syncthing";
    guiAddress = "0.0.0.0:8384";
  };
  
  # 4. Tailscale: Bastión y Acceso Zero-Trust
  services.tailscale = {
    enable = true;
    useRoutingFeatures = "both";  # Permite funcionar como Subnet Router / Exit Node
  };

  # Habilitar IP Forwarding (Necesario para que Tailscale funcione de Bastión)
  boot.kernel.sysctl = {
    "net.ipv4.ip_forward" = 1;
    "net.ipv6.conf.all.forwarding" = 1;
  };

  # Habilitar SSH
  services.openssh.enable = true;
  
  # Usuario
  users.users.kortux = {
    isNormalUser = true;
    extraGroups = [ "wheel" ];
    openssh.authorizedKeys.keys = [ "sh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFslJYY5DIarB0VYAP1FZ/Xt03OQufL8Q85fKlIRyIPj kortux@nixos" ]; 
  };
  
  system.stateVersion = "26.05";
}