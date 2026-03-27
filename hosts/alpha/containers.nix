# hosts/alpha/containers.nix
# Exclusivo para la declaración de volúmenes de Podman y límites de memoria/CPU.
{ config, pkgs, ... }: {
  
  # Docker y Podman Limits de OOM
  systemd.services.docker.serviceConfig = {
    MemoryMax = "10G";
    CPUQuota = "800%";
    MemorySwapMax = "2G";
  };

  # --- AUTO-CREACIÓN DE ESTRUCTURAS DE CONTENEDORES ---
  # La creación de directorios para bind-mounts de Podman y Docker
  # Se ejecuta POST ZFS-Mount (Tier 1 vs Tier 2 Tiering)
  systemd.tmpfiles.rules = [
    # === SSD (tank-fast) - APPDATA ===
    "d /mnt/fast/appdata 0755 root root -"
    "d /mnt/fast/appdata/frigate 0755 root root -"
    "d /mnt/fast/appdata/frigate/config 0755 root root -"
    "d /mnt/fast/appdata/homeassistant 0755 root root -"
    "d /mnt/fast/appdata/mosquitto 0755 root root -"
    "d /mnt/fast/appdata/influxdb 0755 root root -"
    "d /mnt/fast/appdata/grafana 0755 root root -"
    "d /mnt/fast/appdata/nodered 0755 root root -"
    "d /mnt/fast/appdata/slskd 0755 root root -"
    "d /mnt/fast/appdata/z2m 0755 root root -"
    "d /mnt/fast/appdata/immich 0755 root root -"
    
    # === HDD (tank) - MEDIA Y BACKUPS ===
    "d /mnt/data/media 0755 root root -"
    "d /mnt/data/media/frigate 0755 root root -"
    "d /mnt/data/media/music 0755 root root -"
    "d /mnt/data/media/immich 0755 root root -"
    "d /mnt/data/immich 0755 root root -"
    "d /mnt/data/backups 0755 root root -"
    
    # === SSD (tank-fast) - Uso general ===
    "d /mnt/fast/apps 0755 root root -"
    "d /mnt/fast/soulseek 0755 root root -"
    
    # Directorios base del sistema y redes
    "d /var/lib/hass 0755 root root -"
    "d /var/lib/mosquitto 0755 root root -"
    "d /var/lib/syncthing 0755 kortux users -"
    "d /var/lib/syncthing/.config 0755 kortux users -"
    "d /var/lib/syncthing/.config/syncthing 0755 kortux users -"
    "d /var/lib/cloudflared 0700 root root -"
  ];
}
