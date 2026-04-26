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
      # nodejs requerido por actions/checkout@v4 y otras actions basadas en JS.
      # El runner de GitHub las descarga como scripts JS que necesitan un Node
      # local (el runner bundle no incluye su propio node).
      nodejs_22
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
    # chagra-deploy: requerido para escribir en /mnt/fast/appdata/farmos-pwa/
    # (dir con setgid 2775, owner kortux:chagra-deploy). Sin esta membresía
    # rsync exit code 23 con "mkstemp ... Permission denied (13)".
    extraGroups = [ "users" "chagra-deploy" ];
  };

  # Crear directorios de trabajo para los runners
  #
  # Contexto: services.github-runners.* coloca el RunnerDir de cada runner en
  # /var/lib/github-runner/<name>/. 'runner' user tiene /var/lib/github-runner
  # como home con createHome=true, lo que fuerza mode 0700 en cada activation
  # de NixOS — bloqueando a nixos-deployer cuando intenta crear su subdir.
  #
  # Las reglas tmpfiles 'z' solo se aplican cuando systemd-tmpfiles-resetup
  # re-ejecuta (algo que no pasa en todos los switches), por eso usamos ademas
  # un oneshot dedicado (github-runner-perms-fix) que corre antes del runner
  # nixos-deploy en cada start, garantizando 0755 independiente del estado.
  systemd.tmpfiles.rules = [
    "z /var/lib/github-runner                 0755 runner          runner          -"
    "d /var/lib/github-runner/nixos-deploy    0700 nixos-deployer  nixos-deployer  -"
    "d /var/log/github-runner                 0755 root            root            -"
    "d /var/log/github-runner/nixos-deploy    0750 nixos-deployer  nixos-deployer  -"
    "d /var/lib/nixos-runner                  0750 nixos-deployer  nixos-deployer  -"
    "d /var/lib/nixos-runner/work             0750 nixos-deployer  nixos-deployer  -"
  ];

  # Fix idempotente en cada arranque del runner nixos-deploy: abre perms del
  # padre compartido. Evita la race contra users.users.runner.createHome que
  # reasigna 0700 durante cada activation de NixOS.
  systemd.services.github-runner-perms-fix = {
    description = "Ensure /var/lib/github-runner traversable for multi-user runners";
    before = [ "github-runner-nixos-deploy.service" ];
    wantedBy = [ "github-runner-nixos-deploy.service" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = false;  # corre en cada arranque del runner, no cacheado
      ExecStart = "${pkgs.coreutils}/bin/chmod 0755 /var/lib/github-runner";
    };
  };

  systemd.services.github-runner-nixos-deploy = {
    after = [ "github-runner-perms-fix.service" ];
    requires = [ "github-runner-perms-fix.service" ];
  };

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
