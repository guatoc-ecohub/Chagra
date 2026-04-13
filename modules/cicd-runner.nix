# modules/cicd-runner.nix
# PROPOSITO: CI/CD con GitHub Actions Runners
# USO: Alpha - Compilar infraestructura NixOS
# Seguridad: Runner dedicado, acceso controlado, sin privilegios
#
# NOTA: Usar el modulo nativo de NixOS en lugar del script externo
# El script externo requiere libstdc++.so.6 que no existe en NixOS
# Configurar con: services.github-runners.default

{ config, pkgs, lib, ... }:

{
  services.github-runners.chagra-deploy = {
    enable = true;
    url = "https://github.com/guatoc-ecohub/Chagra";
    tokenFile = "/run/secrets/github-runner-token";
    name = "alpha-chagra";
    extraLabels = [ "alpha" "nixos" ];

    extraPackages = with pkgs; [
      nodejs_22
      git
      rsync
    ];

    user = "runner";
    workDir = "/var/lib/github-runner/work";

    # Permitir escritura en el directorio de deploy (ProtectSystem=strict
    # monta todo como read-only por defecto)
    serviceOverrides = {
      ReadWritePaths = [ "/mnt/fast/appdata/farmos-pwa" ];
    };
  };

  users.users.runner = {
    isSystemUser = true;
    group = "runner";
    description = "GitHub Actions Runner — Chagra deploy";
    home = "/var/lib/github-runner";
    createHome = true;
    extraGroups = [ "users" ];  # acceso a /mnt/fast/appdata/farmos-pwa/
  };

  users.groups.runner = {};
}
