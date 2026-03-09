{ config, pkgs, ... }: {

  virtualisation.oci-containers.containers = {
    
    # --- UPTIME KUMA (Corrección de error de sintaxis) ---
    uptime-kuma = {
      image = "louislam/uptime-kuma:1";
      ports = [ "3001:3001" ];
      volumes = [ "/mnt/fast/apps/uptime-kuma:/app/data" ];
      extraOptions = [ "--network=web-network" ];
    };

    # IMMICH migrated to modules/cloud/immich.nix
  };
}