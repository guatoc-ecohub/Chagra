# modules/observability/logging.nix
# =============================================================================
# LOGGING — Loki + Promtail for centralized log aggregation
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.observability.logging;
  obsCfg = config.guatoc.observability;
  registry = import ../../lib/registry.nix { inherit lib; };
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
    # Loki container (run as root to avoid permission issues)
    virtualisation.oci-containers.containers.loki = {
      image = "grafana/loki:3.2.0";
      ports = [
        "${toString registry.ports.loki}:3100"
      ];
      volumes = [
        "/mnt/fast/appdata/loki:/loki"
      ];
      user = "root";
    };

    # Promtail container - reads journal and podman logs
    virtualisation.oci-containers.containers.promtail = {
      image = "grafana/promtail:3.2.0";
      volumes = [
        "/mnt/fast/appdata/promtail:/etc/promtail"
        "/var/log/journal:/var/log/journal:ro"
        "/run/podman/podman.sock:/run/podman/podman.sock:ro"
      ];
      user = "root";
      dependsOn = [ "loki" ];
    };

    # Create directories and config
    systemd.tmpfiles.rules = [
      "d /mnt/fast/appdata/loki      0755 root root -"
      "d /mnt/fast/appdata/loki/rules 0777 root root -"
      "d /mnt/fast/appdata/loki/chunks 0777 root root -"
      "d /mnt/fast/appdata/promtail 0755 root root -"
    ] ++ lib.optionals cfg.uptimeKuma [
      "d /mnt/fast/appdata/uptime-kuma 0755 root root -"
    ];

    # Generate Loki config
    systemd.services.loki-config = {
      description = "Generate Loki configuration";
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        ExecStart = pkgs.writeShellScript "loki-gen-config" ''
          #!/bin/bash
          mkdir -p /mnt/fast/appdata/loki
          cat > /mnt/fast/appdata/loki/loki-config.yml << 'EOF'
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v12
      index:
        prefix: index_
        period: 24h

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
EOF
          chmod 644 /mnt/fast/appdata/loki/loki-config.yml
        '';
      };
    };

    # Generate Promtail config
    systemd.services.promtail-config = {
      description = "Generate Promtail configuration";
      wantedBy = [ "multi-user.target" ];
      requires = [ "loki-config.service" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        ExecStart = pkgs.writeShellScript "promtail-gen-config" ''
          #!/bin/bash
          mkdir -p /mnt/fast/appdata/promtail
          cat > /mnt/fast/appdata/promtail/promtail-config.yml << 'EOF'
server:
  http_listen_port: 9080
  grpc_listen_port: 9081

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Read NixOS system journal
  - job_name: journal
    journal:
      path: /var/log/journal
      labels:
        job: system-journal
    relabel_configs:
      - source_labels: ['__journal_unit']
        target_label: unit

  # Read Podman container logs
  - job_name: podman
    docker_targets:
      - podman.sock
    labels:
      job: podman
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: container_name
EOF
          chmod 644 /mnt/fast/appdata/promtail/promtail-config.yml
        '';
      };
    };

    # Uptime Kuma container
    virtualisation.oci-containers.containers.uptime-kuma = lib.mkIf cfg.uptimeKuma {
      image = "louislam/uptime-kuma:1";
      ports = [
        "${toString registry.ports.uptimeKuma}:3001"
      ];
      volumes = [
        "/mnt/fast/appdata/uptime-kuma:/app/data"
      ];
    };

    networking.firewall.allowedTCPPorts = [
      registry.ports.loki
    ] ++ lib.optionals cfg.uptimeKuma [ registry.ports.uptimeKuma ];
  };
}
