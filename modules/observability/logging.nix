# modules/observability/logging.nix
# =============================================================================
# LOGGING — Loki (OCI) + Promtail (Native) for centralized log aggregation
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
    # Loki container (OCI)
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

    # Create Loki directories
    systemd.tmpfiles.rules = [
      "d /mnt/fast/appdata/loki      0755 root root -"
      "d /mnt/fast/appdata/loki/rules 0777 root root -"
      "d /mnt/fast/appdata/loki/chunks 0777 root root -"
    ] ++ lib.optionals cfg.uptimeKuma [
      "d /mnt/fast/appdata/uptime-kuma 0755 root root -"
    ];

    # Native Promtail service - reads from journald and Podman
    # Uses native NixOS module for declarative configuration
    services.promtail = {
      enable = true;
      settings = {
        server = {
          http_listen_port = 9080;
          grpc_listen_port = 9081;
        };
        
        clients = [{
          url = "http://localhost:${toString registry.ports.loki}/loki/api/v1/push";
        }];
        
        scrape_configs = [
          # Read systemd journal
          {
            job_name = "journal";
            journal = {
              path = "/var/log/journal";
              labels = {
                job = "system-journal";
              };
            };
            relabel_configs = [
              {
                source_labels = ["__journal_unit"];
                target_label = "unit";
              }
            ];
          }
          # Read Podman container logs
          {
            job_name = "podman";
            docker = {
              host = "unix:///run/podman/podman.sock";
            };
            labels = {
              job = "podman";
            };
          }
        ];
      };
    };

    # Allow promtail user to read journal and podman socket
    users.users.promtail.extraGroups = [ "systemd-journal" ];

    # Uptime Kuma container (OCI)
    virtualisation.oci-containers.containers.uptime-kuma = lib.mkIf cfg.uptimeKuma {
      image = "louislam/uptime-kuma:1";
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
