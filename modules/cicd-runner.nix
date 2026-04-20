# modules/cicd-runner.nix
# CI/CD con GitHub Actions Runners — Chagra (público) + NixOS (privado)
# Seguridad: Runners dedicados, acceso controlado, permisos mínimos

{ config, pkgs, lib, ... }:

{
  # ═══════════════════════════════════════════════
  # RUNNER 1: Chagra PWA (repo público)
  # ═══════════════════════════════════════════════
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

    serviceOverrides = {
      ReadWritePaths = [ "/mnt/fast/appdata/farmos-pwa" ];
    };
  };

  # ═══════════════════════════════════════════════
  # RUNNER 2: NixOS infra (repo privado)
  # ═══════════════════════════════════════════════
  # Habilitado 2026-04-19 — token nixos-runner-token poblado en SOPS.
  services.github-runners.nixos-deploy = {
    enable = true;
    url = "https://github.com/kortux/guatoc-nixos-stable";
    tokenFile = "/run/secrets/nixos-runner-token";
    name = "alpha-nixos";
    extraLabels = [ "alpha" "nixos" "infra" ];

    extraPackages = with pkgs; [
      git
      nix
      nixos-rebuild
    ];

    user = "nixos-deployer";
    workDir = "/var/lib/nixos-runner/work";

    serviceOverrides = {
      # nixos-rebuild necesita acceso a /nix/store y al flake
      ReadWritePaths = [
        "/nix/var/nix"
      ];
      # Heredar acceso a la age key para SOPS (read-only)
      ReadOnlyPaths = [
        "/home/kortux/.config/sops/age/keys.txt"
      ];
    };
  };

  # ═══════════════════════════════════════════════
  # USUARIOS
  # ═══════════════════════════════════════════════
  users.users.runner = {
    isSystemUser = true;
    group = "runner";
    description = "GitHub Actions Runner — Chagra deploy";
    home = "/var/lib/github-runner";
    createHome = true;
    extraGroups = [ "users" ];
  };

  # Crear directorios de trabajo para los runners
  systemd.tmpfiles.rules = [
    "d /var/lib/nixos-runner 0750 nixos-deployer nixos-deployer -"
    "d /var/lib/nixos-runner/work 0750 nixos-deployer nixos-deployer -"
  ];

  users.users.nixos-deployer = {
    isSystemUser = true;
    group = "nixos-deployer";
    description = "GitHub Actions Runner — NixOS infra deploy";
    home = "/var/lib/nixos-runner";
    createHome = true;
  };

  users.groups.runner = {};
  users.groups.nixos-deployer = {};

  # Permitir al deployer ejecutar nixos-rebuild sin password
  security.sudo.extraRules = [{
    users = [ "nixos-deployer" ];
    commands = [
      {
        command = "/run/current-system/sw/bin/nixos-rebuild";
        options = [ "NOPASSWD" ];
      }
    ];
  }];
}
