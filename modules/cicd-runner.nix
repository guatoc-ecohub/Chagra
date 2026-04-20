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
    url = "https://github.com/guatoc-ecohub/guatoc-nixos";
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
  #
  # El modulo upstream services.github-runners.* usa /var/lib/github-runner/<name>
  # como RunnerDir para TODOS los runners declarados, independientemente del
  # usuario. Como 'runner' tiene /var/lib/github-runner como home con mode 0700
  # (default de createHome), nixos-deployer no puede escribir su subdir y falla
  # al arrancar con: "mkdir: cannot create directory '/var/lib/github-runner':
  # Permission denied" (problema recurrente desde abr-13, hasta que se habilito
  # el segundo runner hoy).
  #
  # Solucion: abrir traversal (0755) del padre y pre-crear /nixos-deploy con
  # ownership correcto. 'z' aplica permisos sin recrear si ya existe.
  systemd.tmpfiles.rules = [
    "z /var/lib/github-runner                 0755 runner          runner          -"
    "d /var/lib/github-runner/nixos-deploy    0700 nixos-deployer  nixos-deployer  -"
    "d /var/log/github-runner                 0755 root            root            -"
    "d /var/log/github-runner/nixos-deploy    0750 nixos-deployer  nixos-deployer  -"
    "d /var/lib/nixos-runner                  0750 nixos-deployer  nixos-deployer  -"
    "d /var/lib/nixos-runner/work             0750 nixos-deployer  nixos-deployer  -"
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
