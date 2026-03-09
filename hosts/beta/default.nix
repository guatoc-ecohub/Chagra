# ~/guatoc-nixos/hosts/beta/default.nix
{ config, pkgs, lib, ... }: {
  
  networking.hostName = "beta-pi";
  networking.networkmanager.enable = true;
  
  # No necesitamos ZFS aquí (mucha RAM), usaremos ext4 sobre el SSD USB
  fileSystems."/mnt/backup" = {
    device = "/dev/sda1"; # Tu SSD de 256GB
    fsType = "ext4";
    options = [ "noatime" ];
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