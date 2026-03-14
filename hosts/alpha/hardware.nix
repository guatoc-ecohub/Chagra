# hosts/alpha/hardware.nix
# Exclusivo para kernel modules, particiones ZFS y servicios atados al hardware (como hdparm).
{ config, pkgs, lib, ... }: {

  # --- HARDWARE: OpenRGB y Control de Sensores/LEDs ---
  services.hardware.openrgb.enable = true;
  hardware.i2c.enable = true;
  
  # --- RENDIMIENTO Y ENERGÍA ---
  powerManagement.cpuFreqGovernor = "performance";
  
  # --- SPINDOWN PARA DISCOS HDD (Tier 2 ZFS) ---
  systemd.services.hdparm-spindown = {
    description = "Ahorro energético y Spin-down para HDD ZFS (Tier 2)";
    wantedBy = [ "multi-user.target" ];
    after = [ "zfs.target" ]; # Garantiza que ZFS ha inicializado el hardware
    serviceConfig = {
      Type = "oneshot";
      # Actualmente solo hay un disco HDD físico conectado (/dev/sda)
      ExecStart = "${pkgs.hdparm}/sbin/hdparm -S 240 /dev/sda";
      RemainAfterExit = true;
    };
  };

  # --- KERNEL Y VIRTUALIZACIÓN ---
  boot.kernelModules = [ "kvm-amd" "i2c-dev" "i2c-piix4" ];
  boot.extraModprobeConfig = ''
    options kvm_amd nested=1
  '';

  # --- ZFS: LÍMITES DE MEMORIA (ARC) ---
  boot.kernelParams = [
    "acpi=force"
    "zfs.zfs_arc_max=4294967296"       # Limita ARC a 4GB (Protege Ollama de OOM)
    "zfs.zfs_arc_min=1073741824"        # Mínimo 1GB
    "zfs.zfs_arc_meta_limit=1073741824" # Límite de metadatos en RAM
    "zfs.zfs_txg_timeout=10"           # Agrupa escrituras cada 10s (reduce ruido HDD)
  ];

  boot.supportedFilesystems = [ "zfs" ];

  # --- OOM KILLER (Ajustes de Sysctl) ---
  boot.kernel.sysctl = {
    "vm.swappiness" = 10;
    "vm.vfs_cache_pressure" = 50;
    "vm.overcommit_memory" = 2;
    "vm.overcommit_ratio" = 80;
  };
  
  # Las entradas fstab manejan los montajes de pool
  systemd.services.zfs-mount.enable = false;
  
  # Desbloqueador de particiones encriptadas
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
}
