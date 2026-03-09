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
  # Usar el modulo nativo de NixOS para GitHub runners
  # Esto evita problemas de dependencias dinamicas
  
  # Ejemplo de configuracion (descomentar y configurar):
  # services.github-runners.default = {
  #   enable = true;
  #   url = "https://github.com/kortux/guatoc-nixos";
  #   tokenFile = "/run/secrets/github-runner-token";  # Gestionado por sops
  #   name = "alpha-builder";
  #   runnerGroup = "default";
  #   labels = [ "nixos" "alpha" "x86_64" ];
  #   
  #   # Usar Nix para construir
  #   extraPackages = with pkgs; [
  #     nix
  #     git
  #     curl
  #     jq
  #   ];
  #   
  #   # No permitir root
  #   user = "runner";
  #   
  #   # Trabajar en el directorio del usuario
  #   workDir = "/var/lib/github-runner/work";
  # };
  
  # Usuario dedicado para el runner (crear si se usa)
  # users.users.runner = lib.mkIf config.services.github-runners.default.enable {
  #   isSystemUser = true;
  #   group = "runner";
  #   description = "GitHub Actions Runner service account";
  #   home = "/var/lib/github-runner";
  #   createHome = true;
  # };
  # 
  # users.groups.runner = lib.mkIf config.services.github-runners.default.enable {};
}
