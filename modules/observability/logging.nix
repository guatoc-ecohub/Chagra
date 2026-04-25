# modules/observability/logging.nix
# =============================================================================
# LOGGING — Loki (OCI) + Promtail (Native) for centralized log aggregation
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.observability.logging;
  obsCfg = config.guatoc.observability;
  registry = import ../../lib/registry.nix { inherit lib; };

  # promtailConfig: dejado en place como referencia para migración a alloy/
  # fluent-bit. No se usa actualmente porque services.promtail fue removido
  # en nixpkgs upstream (end-of-life). Ver bloque "Promtail: REMOVED" abajo.
  # eslint-disable-next-line — no se usa, intencional pending migration.
  promtailConfig = pkgs.writeText "promtail-config.yml" ''
server:
  http_listen_port: 9080
  grpc_listen_port: 9081

# Write positions to writable directory
positions:
  filename: /mnt/fast/appdata/promtail/positions.yaml

clients:
  - url: http://localhost:${toString registry.ports.loki}/loki/api/v1/push

scrape_configs:
  # Read systemd journal
  - job_name: journal
    journal:
      path: /var/log/journal
      labels:
        job: system-journal
    relabel_configs:
      - source_labels: ['__journal_unit']
        target_label: unit
'';
in
{
  options.guatoc.observability.logging = {
    enable = lib.mkEnableOption "Loki + Promtail log aggregation" // {
      default = false;
    };
    
    uptimeKuma = lib.mkEnableOption "Uptime Kuma monitoring" // {
      default = false;
    };
  };

  config = lib.mkIf (obsCfg.enable && cfg.enable) {
    # Loki container (OCI)
    virtualisation.oci-containers.containers.loki = {
      # Pinned 2026-04-20 (era :3.2.0).
      image = "docker.io/grafana/loki@sha256:882e30c20683a48a8b7ca123e6c19988980b4bd13d2ff221dfcbef0fdc631694";
      ports = [
        "${toString registry.ports.loki}:3100"
      ];
      volumes = [
        "/mnt/fast/appdata/loki:/loki"
      ];
      user = "root";
    };

    # Create Loki directories
    systemd.tmpfiles.rules = [
      "d /mnt/fast/appdata/loki      0755 root root -"
      "d /mnt/fast/appdata/loki/rules 0777 root root -"
      "d /mnt/fast/appdata/loki/chunks 0777 root root -"
      "d /mnt/fast/appdata/promtail 0755 promtail root -"
    ] ++ lib.optionals cfg.uptimeKuma [
      "d /mnt/fast/appdata/uptime-kuma 0755 root root -"
    ];

    # ─────────────────────────────────────────────────────────────────────────
    # Promtail: REMOVED en nixpkgs upstream tras alcanzar end-of-life.
    #
    # El módulo `services.promtail` y `users.users.promtail` fueron eliminados
    # en nixpkgs 2026-04. La opción `cfg.package` aún pre-existe pero forzar
    # `services.promtail.enable = true` causa assertion error en eval.
    #
    # Migración pendiente (post-demo 2026-04-27):
    #   - Opción A: `services.alloy.enable = true` con configuración de
    #     receptores `loki.source.journal` y forwarders `loki.write` apuntando
    #     a `localhost:${registry.ports.loki}`. Doc: grafana.com/docs/alloy.
    #   - Opción B: `services.fluent-bit.enable = true` más liviana, output
    #     plugin loki. Doc: docs.fluentbit.io.
    #
    # Mientras tanto: Loki sigue corriendo (container OCI), solo no hay shipper
    # del journal alpha. Logs locales siguen accesibles via journalctl.
    # ─────────────────────────────────────────────────────────────────────────
    # services.promtail = {
    #   enable = true;
    #   configFile = promtailConfig;
    # };
    # users.users.promtail.extraGroups = [ "systemd-journal" ];

    # Uptime Kuma container (OCI)
    virtualisation.oci-containers.containers.uptime-kuma = lib.mkIf cfg.uptimeKuma {
      # Pinned 2026-04-20 (era :1).
      image = "docker.io/louislam/uptime-kuma@sha256:3d632903e6af34139a37f18055c4f1bfd9b7205ae1138f1e5e8940ddc1d176f9";
      ports = [
        "${toString registry.ports.uptimeKuma}:3001"
      ];
      volumes = [
        "/mnt/fast/appdata/uptime-kuma:/app/data"
      ];
    };

    # Firewall - only Loki port needed (Promtail is local)
    networking.firewall.allowedTCPPorts = [
      registry.ports.loki
    ] ++ lib.optionals cfg.uptimeKuma [ registry.ports.uptimeKuma ];
  };
}
