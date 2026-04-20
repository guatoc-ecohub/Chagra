# hosts/alpha/hardware.nix
# Exclusivo para kernel modules, particiones ZFS y servicios atados al hardware (como hdparm).
{ config, pkgs, lib, ... }: {

  # --- HARDWARE: OpenRGB y Control de Sensores/LEDs ---
  services.hardware.openrgb.enable = true;
  hardware.i2c.enable = true;
  
  # --- RENDIMIENTO Y ENERGÍA ---
  powerManagement.cpuFreqGovernor = "performance";
  
  # --- SPINDOWN PARA DISCOS HDD (Tier 2 ZFS) ---
  # Referencia por ID estable: /dev/sdX cambia entre boots cuando se
  # conectan/desconectan dispositivos SATA. Con el mirror 2×12 TB ambos
  # HDD deben recibir el mismo idle timeout (240 × 5 s = 20 min).
  systemd.services.hdparm-spindown = {
    description = "Ahorro energético y Spin-down para HDD ZFS (Tier 2)";
    wantedBy = [ "multi-user.target" ];
    after = [ "zfs.target" ]; # Garantiza que ZFS ha inicializado el hardware
    serviceConfig = {
      Type = "oneshot";
      ExecStart = "${pkgs.hdparm}/sbin/hdparm -S 240 /dev/disk/by-id/ata-TOSHIBA_MG07ACA12TE_2080A1GWFDUG /dev/disk/by-id/ata-TOSHIBA_MG07ACA12TE_2080A2AHFDUG";
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

  # --- OOM KILLER + MM TUNING PARA LLM INFERENCE (Ajustes de Sysctl) ---
  boot.kernel.sysctl = {
    # swappiness=1 (antes 10): protege al runner residente de Ollama contra
    # swap temprano. Con 14 GiB RAM y un modelo 4B Q4_K_M que consume 5.3 GiB
    # RSS, cualquier swap hit sobre las paginas del runner degrada drasticamente
    # la latencia de inferencia (swap read ≈ ms vs RAM ≈ ns). El kernel sigue
    # pudiendo swappear paginas realmente anonimas bajo presion, pero solo como
    # ultimo recurso.
    "vm.swappiness" = 1;
    "vm.vfs_cache_pressure" = 50;
    "vm.overcommit_memory" = 2;
    # ratio=150: CommitLimit ≈ 52 GiB (swap 31 + RAM 14×1.5). Antes 80 dejaba solo
    # ~42 GiB y con Committed_AS ~40 GiB el runner de Ollama no podía asignar los
    # 3.7 GiB contiguos del modelo qwen3.5:4b tras un reload (2026-04-19).
    "vm.overcommit_ratio" = 150;
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
