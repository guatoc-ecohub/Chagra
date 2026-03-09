# ~/guatoc-nixos/modules/virtualization.nix
# PROPOSITO: Gestión de Contenedores y Máquinas Virtuales (Torrents).
# CREA: Redes Docker aisladas para seguridad.

{ pkgs, ... }: {
  
  # --- DOCKER & PODMAN ---
  virtualisation.docker.enable = true;
  virtualisation.podman.enable = true;

  # --- KVM / QEMU (Para VM de Torrents) ---
  # NOTA: virt-secret-init-encryption service fails because it uses /usr/bin/sh
  # which doesn't exist in NixOS. Disable libvirtd until fixed.
  # virtualisation.libvirtd.enable = true;
  virtualisation.libvirtd = {
    enable = false;  # Disabled until the /usr/bin/sh issue is resolved
  };
  programs.virt-manager.enable = true; # GUI para gestionar la VM

  # --- CREACIÓN DE REDES AISLADAS ---
  # Crear redes bridge tanto para Docker como para Podman
  systemd.services.create-container-networks = {
    description = "Crear redes bridge aisladas para IoT y Web";
    after = [ "docker.service" "podman.service" ];  # Depends on both runtimes
    wantedBy = [ "multi-user.target" ];
    serviceConfig.Type = "oneshot";
    script = ''
      # Docker networks
      ${pkgs.docker}/bin/docker network create iot-network 2>/dev/null || true
      ${pkgs.docker}/bin/docker network create web-network 2>/dev/null || true
      
      # Podman networks (aliased to same subnet for compatibility)
      ${pkgs.podman}/bin/podman network create iot-network 2>/dev/null || true
      ${pkgs.podman}/bin/podman network create web-network 2>/dev/null || true
    '';
  };
}