# ~/guatoc-nixos/modules/virtualization.nix
# PROPOSITO: Gestión de Contenedores y Máquinas Virtuales (Torrents).
# CREA: Redes Docker aisladas para seguridad.

{ pkgs, ... }: {
  
  # --- DOCKER & PODMAN ---
  virtualisation.docker.enable = true;
  virtualisation.podman.enable = true;

  # --- KVM / QEMU (Para VM de Torrents) ---
  virtualisation.libvirtd.enable = true;
  programs.virt-manager.enable = true; # GUI para gestionar la VM

  # --- CREACIÓN DE REDES AISLADAS ---
  systemd.services.create-docker-networks = {
    description = "Crear redes bridge aisladas para IoT y Web";
    after = [ "docker.service" ];
    wantedBy = [ "multi-user.target" ];
    serviceConfig.Type = "oneshot";
    script = ''
      ${pkgs.docker}/bin/docker network create iot-network || true
      ${pkgs.docker}/bin/docker network create web-network || true
    '';
  };
}