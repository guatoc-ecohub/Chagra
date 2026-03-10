# modules/observability/grafana.nix
# =============================================================================
# GRAFANA — Dashboards and visualization
# Port: 3000
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.observability.grafana;
  obsCfg = config.guatoc.observability;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.observability.grafana = {
    enable = lib.mkEnableOption "Grafana - Dashboards de monitoreo" // {
      default = false;
    };
    
    # Data source provisioning
    provisionInfluxDB = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Provision InfluxDB as data source automatically";
    };
    
    # Dashboard provisioning  
    provisionDashboards = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Provision Node Exporter dashboard automatically";
    };
  };

  config = lib.mkIf (obsCfg.enable && cfg.enable) {
    systemd.services.podman-grafana = {
      after = [ "zfs.target" "network-online.target" "podman-create-iot-net.service" ];
      requires = [ "zfs.target" "podman-create-iot-net.service" ];
      serviceConfig = {
        EnvironmentFile = config.sops.secrets."grafana_env".path;
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/grafana"
          "${pkgs.coreutils}/bin/chown -R 472:472 /mnt/fast/appdata/grafana"
          # Create provisioning directories
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/grafana/provisioning/datasources"
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/grafana/provisioning/dashboards"
        ];
      };
    };

    # Provision InfluxDB as data source (for Telegraf)
    systemd.services.podman-grafana-prep-datasources = lib.mkIf cfg.provisionInfluxDB {
      description = "Provision InfluxDB data source for Grafana";
      after = [ "podman-grafana.service" ];
      serviceConfig.Type = "oneshot";
      script = ''
        # Grafana InfluxDB datasource provisioning
        # Token will be added once influxdb_admin_token is in secrets.yaml
        cat > /mnt/fast/appdata/grafana/provisioning/datasources/influxdb.yml << 'EOF'
apiVersion: 1

datasources:
  - name: InfluxDB
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    database: ""
    bucket: iot
    organization: guatoc
    isDefault: true
    editable: false
    jsonData:
      timeInterval: "10s"
      httpMode: GET
    # secureJsonData.token will be added when token is available
EOF
        chmod 644 /mnt/fast/appdata/grafana/provisioning/datasources/influxdb.yml
      '';
    };

    # Provision Telegraf/InfluxDB dashboard
    systemd.services.podman-grafana-prep-dashboards = lib.mkIf cfg.provisionDashboards {
      description = "Provision Telegraf dashboard for Grafana";
      after = [ "podman-grafana.service" ];
      serviceConfig.Type = "oneshot";
      script = ''
        cat > /mnt/fast/appdata/grafana/provisioning/dashboards/telegraf.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'Telegraf'
    orgId: 1
    folder: 'System'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
      foldersFromFilesStructure: true
EOF
        chmod 644 /mnt/fast/appdata/grafana/provisioning/dashboards/telegraf.yml

        # Create the Telegraf dashboard JSON
        mkdir -p /mnt/fast/appdata/grafana/provisioning/dashboards/telegraf
        cat > /mnt/fast/appdata/grafana/provisioning/dashboards/telegraf/system-metrics.json << 'EOFDASHBOARD'
{
  "annotations": { "list": [] },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 1,
  "id": null,
  "links": [],
  "liveNow": false,
  "panels": [
    {
      "collapsed": false,
      "gridPos": { "h": 1, "w": 24, "x": 0, "y": 0 },
      "id": 1,
      "panels": [],
      "title": "CPU & Memory",
      "type": "row"
    },
    {
      "datasource": { "type": "influxdb", "uid": "influxdb" },
      "fieldConfig": {
        "defaults": {
          "color": { "mode": "palette-classic" },
          "custom": { "axisCenteredZero": false, "axisColorMode": "text", "axisLabel": "", "axisPlacement": "auto", "barAlignment": 0, "drawStyle": "line", "fillOpacity": 10, "gradientMode": "none", "hideFrom": { "legend": false, "tooltip": false, "viz": false }, "lineInterpolation": "linear", "lineWidth": 1, "pointSize": 5, "scaleDistribution": { "type": "linear" }, "showPoints": "never", "spanNulls": false, "stacking": { "group": "A", "mode": "none" }, "thresholdsStyle": { "mode": "off" } },
          "mappings": [],
          "thresholds": { "mode": "absolute", "steps": [{ "color": "green", "value": null }] },
          "unit": "percent"
        },
        "overrides": []
      },
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 1 },
      "id": 2,
      "options": {
        "legend": { "calcs": ["mean", "max"], "displayMode": "table", "placement": "bottom", "showLegend": true },
        "tooltip": { "mode": "multi", "sort": "none" }
      },
      "targets": [
        {
          "query": "SELECT mean(usage_idle) FROM \"cpu\" WHERE time > now() - 15m GROUP BY time($__interval), host",
          "rawQuery": true,
          "refId": "A",
          "resultFormat": "time_series"
        }
      ],
      "title": "CPU Usage",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "influxdb", "uid": "influxdb" },
      "fieldConfig": {
        "defaults": {
          "color": { "mode": "palette-classic" },
          "custom": { "axisCenteredZero": false, "axisColorMode": "text", "axisLabel": "", "axisPlacement": "auto", "barAlignment": 0, "drawStyle": "line", "fillOpacity": 10, "gradientMode": "none", "hideFrom": { "legend": false, "tooltip": false, "viz": false }, "lineInterpolation": "linear", "lineWidth": 1, "pointSize": 5, "scaleDistribution": { "type": "linear" }, "showPoints": "never", "spanNulls": false, "stacking": { "group": "A", "mode": "none" }, "thresholdsStyle": { "mode": "off" } },
          "mappings": [],
          "thresholds": { "mode": "absolute", "steps": [{ "color": "green", "value": null }] },
          "unit": "bytes"
        },
        "overrides": []
      },
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 1 },
      "id": 3,
      "options": {
        "legend": { "calcs": ["mean", "max"], "displayMode": "table", "placement": "bottom", "showLegend": true },
        "tooltip": { "mode": "multi", "sort": "none" }
      },
      "targets": [
        {
          "query": "SELECT mean(used) FROM \"mem\" WHERE time > now() - 15m GROUP BY time($__interval), host",
          "rawQuery": true,
          "refId": "A",
          "resultFormat": "time_series"
        },
        {
          "query": "SELECT mean(total) - mean(used) FROM \"mem\" WHERE time > now() - 15m GROUP BY time($__interval), host",
          "rawQuery": true,
          "refId": "B",
          "resultFormat": "time_series"
        }
      ],
      "title": "Memory Usage",
      "type": "timeseries"
    },
    {
      "collapsed": false,
      "gridPos": { "h": 1, "w": 24, "x": 0, "y": 9 },
      "id": 4,
      "panels": [],
      "title": "Disk & Network",
      "type": "row"
    },
    {
      "datasource": { "type": "influxdb", "uid": "influxdb" },
      "fieldConfig": {
        "defaults": {
          "color": { "mode": "palette-classic" },
          "custom": { "axisCenteredZero": false, "axisColorMode": "text", "axisLabel": "", "axisPlacement": "auto", "barAlignment": 0, "drawStyle": "line", "fillOpacity": 10, "gradientMode": "none", "hideFrom": { "legend": false, "tooltip": false, "viz": false }, "lineInterpolation": "linear", "lineWidth": 1, "pointSize": 5, "scaleDistribution": { "type": "linear" }, "showPoints": "never", "spanNulls": false, "stacking": { "group": "A", "mode": "none" }, "thresholdsStyle": { "mode": "off" } },
          "mappings": [],
          "thresholds": { "mode": "absolute", "steps": [{ "color": "green", "value": null }] },
          "unit": "bytes"
        },
        "overrides": []
      },
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 10 },
      "id": 5,
      "options": {
        "legend": { "calcs": ["mean", "max"], "displayMode": "table", "placement": "bottom", "showLegend": true },
        "tooltip": { "mode": "multi", "sort": "none" }
      },
      "targets": [
        {
          "query": "SELECT mean(used) FROM \"disk\" WHERE time > now() - 15m GROUP BY time($__interval), host, path",
          "rawQuery": true,
          "refId": "A",
          "resultFormat": "time_series"
        }
      ],
      "title": "Disk Usage",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "influxdb", "uid": "influxdb" },
      "fieldConfig": {
        "defaults": {
          "color": { "mode": "palette-classic" },
          "custom": { "axisCenteredZero": false, "axisColorMode": "text", "axisLabel": "", "axisPlacement": "auto", "barAlignment": 0, "drawStyle": "line", "fillOpacity": 10, "gradientMode": "none", "hideFrom": { "legend": false, "tooltip": false, "viz": false }, "lineInterpolation": "linear", "lineWidth": 1, "pointSize": 5, "scaleDistribution": { "type": "linear" }, "showPoints": "never", "spanNulls": false, "stacking": { "group": "A", "mode": "none" }, "thresholdsStyle": { "mode": "off" } },
          "mappings": [],
          "thresholds": { "mode": "absolute", "steps": [{ "color": "green", "value": null }] },
          "unit": "Bps"
        },
        "overrides": []
      },
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 10 },
      "id": 6,
      "options": {
        "legend": { "calcs": ["mean", "max"], "displayMode": "table", "placement": "bottom", "showLegend": true },
        "tooltip": { "mode": "multi", "sort": "none" }
      },
      "targets": [
        {
          "query": "SELECT mean(rx_bytes) FROM \"net\" WHERE time > now() - 15m AND interface != 'lo' GROUP BY time($__interval), host, interface",
          "rawQuery": true,
          "refId": "A",
          "resultFormat": "time_series"
        },
        {
          "query": "SELECT mean(tx_bytes) FROM \"net\" WHERE time > now() - 15m AND interface != 'lo' GROUP BY time($__interval), host, interface",
          "rawQuery": true,
          "refId": "B",
          "resultFormat": "time_series"
        }
      ],
      "title": "Network Traffic",
      "type": "timeseries"
    }
  ],
  "refresh": "10s",
  "schemaVersion": 38,
  "style": "dark",
  "tags": ["telegraf", "system"],
  "templating": { "list": [] },
  "time": { "from": "now-6h", "to": "now" },
  "timepicker": {},
  "timezone": "browser",
  "title": "System Metrics (Telegraf)",
  "uid": "telegraf-system",
  "version": 1,
  "weekStart": ""
}
EOFDASHBOARD
      '';
    };

    virtualisation.oci-containers.containers.grafana = {
      image = "grafana/grafana-oss:latest";
      ports = [ "${toString registry.ports.grafana}:${toString registry.ports.grafana}" ];
      volumes = [
        "/mnt/fast/appdata/grafana:/var/lib/grafana"
        "/mnt/fast/appdata/grafana/provisioning:/etc/grafana/provisioning:ro"
      ];
      environment = {
        GF_USERS_ALLOW_SIGN_UP = "false";
        GF_SERVER_ROOT_URL = "http://192.168.1.100:${toString registry.ports.grafana}";
      };
      extraOptions = [
        "--network=iot-net"
        "--name=grafana"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.grafana ];
  };
}
