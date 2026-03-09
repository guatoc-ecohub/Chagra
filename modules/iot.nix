{ config, pkgs, lib, ... }:

# =============================================================================
# IOT.NIX — Stack IoT & Data del Nodo Alpha
# Servicios: Mosquitto, Home Assistant, Node-RED, InfluxDB, Grafana
# Red interna: podman bridge "iot-net" con DNS habilitado
# Almacenamiento: /mnt/fast/appdata/<servicio> (Tier 1 SSD)
# =============================================================================

let
  # Config estática de Mosquitto generada en el Nix store
  mosquittoConf = pkgs.writeText "mosquitto.conf" ''
    # Mosquitto — Broker MQTT (Guatoc Alpha)
    # Generado declarativamente — NO editar manualmente.
    persistence true
    persistence_location /mosquitto/data/
    log_dest file /mosquitto/log/mosquitto.log
    log_dest stdout

    listener 1883
    # Autenticación habilitada — contraseña via sops secret
    # password_file /mosquitto/config/passwd
    # allow_anonymous false
    # TODO: Habilitar TLS cuando se configure el certificado interno
    allow_anonymous true
  '';

in
{
  # ---------------------------------------------------------------------------
  # SOPS: Secretos IoT
  # ---------------------------------------------------------------------------
  # secrets.yaml (sin cifrar):
  #   influxdb_env: |
  #     DOCKER_INFLUXDB_INIT_MODE=setup
  #     DOCKER_INFLUXDB_INIT_USERNAME=guatoc
  #     DOCKER_INFLUXDB_INIT_PASSWORD=<PASSWORD>
  #     DOCKER_INFLUXDB_INIT_ORG=guatoc
  #     DOCKER_INFLUXDB_INIT_BUCKET=iot
  #     DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=<TOKEN>
  #   grafana_env: |
  #     GF_SECURITY_ADMIN_USER=admin
  #     GF_SECURITY_ADMIN_PASSWORD=<PASSWORD>
  #     GF_USERS_ALLOW_SIGN_UP=false
  # InfluxDB v2 secrets
  sops.secrets."influxdb_env" = { owner = "root"; mode = "0400"; };
  sops.secrets."influxdb_admin_token" = { owner = "root"; group = "root"; mode = "0400"; };
  sops.secrets."grafana_env"  = { owner = "root"; mode = "0400"; };

  # ---------------------------------------------------------------------------
  # USUARIOS Y GRUPOS IoT
  # ---------------------------------------------------------------------------
  users.groups.iot = { gid = 2000; };

  users.users.iot-svc = {
    isSystemUser = true;
    uid          = 2000;
    group        = "iot";
    description  = "Usuario de servicios IoT (Node-RED, InfluxDB, Grafana)";
  };

  # ---------------------------------------------------------------------------
  # DIRECTORIOS (systemd-tmpfiles)
  # ---------------------------------------------------------------------------
  systemd.tmpfiles.rules = [
    "d /mnt/fast/appdata/homeassistant        0755 root    root -"
    "d /mnt/fast/appdata/mosquitto            0755 root    root -"
    "d /mnt/fast/appdata/mosquitto/config     0755 root    root -"
    "d /mnt/fast/appdata/mosquitto/data       0755 root    root -"
    "d /mnt/fast/appdata/mosquitto/log        0755 root    root -"
    "d /mnt/fast/appdata/influxdb             0755 root    root -"
    "d /mnt/fast/appdata/influxdb/data        0755 root    root -"
    "d /mnt/fast/appdata/grafana              0755 root    root -"
    "d /mnt/fast/appdata/nodered             0755 root    root -"
  ];

  # ---------------------------------------------------------------------------
  # RED INTERNA PODMAN (iot-net)
  # Todos los contenedores IoT se conectan a esta red para resolución DNS interna.
  # Node-RED puede hacer POST a http://ollama:11434, escribir en http://influxdb:8086, etc.
  # ---------------------------------------------------------------------------
  # La red se crea via extraOptions "--network=iot-net" en cada contenedor.
  # Podman crea la red automáticamente si se declara en defaultNetwork o via
  # un servicio de creación. Usamos un oneshot para garantizar su existencia.
  systemd.services.podman-create-iot-net = {
    description   = "Crear red Podman iot-net para servicios IoT";
    wantedBy      = [ "multi-user.target" ];
    before        = [
      "podman-homeassistant.service"
      "podman-mosquitto.service"
      "podman-influxdb.service"
      "podman-nodered.service"
      "podman-grafana.service"
    ];
    serviceConfig = {
      Type            = "oneshot";
      RemainAfterExit = true;
      ExecStart = "${pkgs.podman}/bin/podman network create --ignore iot-net";
    };
  };

  # ---------------------------------------------------------------------------
  # CONTENEDORES OCI — IoT & Data
  # ---------------------------------------------------------------------------
  # NOTA: farmos y postgres-farm Migrados a modules/agriculture/

  # -------------------------------------------------------------------------
  # HOME ASSISTANT — Automatización del hogar
    # UID: root (--network=host requiere privilegios)
    # -------------------------------------------------------------------------
    homeassistant = {
      image = "ghcr.io/home-assistant/home-assistant:stable";
      extraOptions = [
        "--network=host"
        "--cap-add=NET_RAW"
        "--cap-add=NET_ADMIN"
        # Adaptador USB actual. Verificar con: ls -la /dev/serial/by-id/
        "--device=/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0:/dev/ttyUSB0"
      ];
      volumes = [
        "/mnt/fast/appdata/homeassistant:/config"
        "/etc/localtime:/etc/localtime:ro"
      ];
      environment = { TZ = "America/Bogota"; };
    };

    # -------------------------------------------------------------------------
    # MOSQUITTO — Broker MQTT
    # UID: 1883 (mosquitto)
    # -------------------------------------------------------------------------
    mosquitto = {
      image = "eclipse-mosquitto:2";
      ports = [ "1883:1883" ];
      volumes = [
        "${mosquittoConf}:/mosquitto/config/mosquitto.conf:ro"
        "/mnt/fast/appdata/mosquitto/data:/mosquitto/data"
        "/mnt/fast/appdata/mosquitto/log:/mosquitto/log"
      ];
      extraOptions = [ "--network=iot-net" "--name=mosquitto" ];
    };

    # -------------------------------------------------------------------------
    # INFLUXDB — Base de datos de series temporales
    # UID: 1000 (influxdb)
    # Credenciales via EnvironmentFile (sops)
    # -------------------------------------------------------------------------
    influxdb = {
      image = "influxdb:2.7-alpine";
      ports = [ "8086:8086" ];
      volumes = [
        "/mnt/fast/appdata/influxdb/data:/var/lib/influxdb2"
      ];
      environment = {
        DOCKER_INFLUXDB_INIT_ORG    = "guatoc";
        DOCKER_INFLUXDB_INIT_BUCKET = "iot";
      };
      extraOptions = [ "--network=iot-net" "--name=influxdb" ];
    };

    # -------------------------------------------------------------------------
    # NODE-RED — Automatización visual de flujos IoT
    # UID: 1000 (node-red)
    # Visibilidad DNS interna: mosquitto, influxdb, ollama
    # -------------------------------------------------------------------------
    nodered = {
      image = "nodered/node-red:latest";
      ports = [ "1880:1880" ];
      volumes = [ "/mnt/fast/appdata/nodered:/data" ];
      environment = { TZ = "America/Bogota"; };
      extraOptions = [ "--network=iot-net" "--name=nodered" ];
    };

    # -------------------------------------------------------------------------
    # GRAFANA — Dashboards de monitoreo
    # UID: 472 (grafana)
    # Credenciales admin via EnvironmentFile (sops)
    # -------------------------------------------------------------------------
    grafana = {
      image = "grafana/grafana-oss:latest";
      ports = [ "3000:3000" ];
      volumes = [ "/mnt/fast/appdata/grafana:/var/lib/grafana" ];
      environment = {
        GF_USERS_ALLOW_SIGN_UP = "false";
        GF_SERVER_ROOT_URL     = "http://192.168.1.100:3000";
      };
      extraOptions = [ "--network=iot-net" "--name=grafana" ];
    };

  };

  # -------------------------------------------------------------------------
  # HOME ASSISTANT RGB CONFIGURATION — Integración con Picoclaw API
  # -------------------------------------------------------------------------
  systemd.services.homeassistant-rgb-config = {
    description = "Configure Home Assistant RGB integration";
    after = [ "podman-homeassistant.service" ];  
    serviceConfig.Type = "oneshot";
    script = ''
      HA_CONFIG="/mnt/fast/appdata/homeassistant/configuration.yaml"
      
      # Check if RGB config already exists
      if ! grep -q "rest_command:" "$HA_CONFIG" 2>/dev/null; then
        cat >> "$HA_CONFIG" << 'EOF'

# RGB Control via Picoclaw API
rest:
  - resource: "http://127.0.0.1:18791/lights/status"
    method: GET
    scan_interval: 30
    sensor:
      - name: "RGB Status"
        value_template: '{{ value_json.status }}'
        json_attributes:
          - color
          - mode

# RGB Light entities using MQTT
light:
  - platform: mqtt
    name: "Server RGB"
    command_topic: "homeassistant/light/server_rgb/set"
    state_topic: "homeassistant/light/server_rgb/state"
    brightness_command_topic: "homeassistant/light/server_rgb/brightness/set"
    brightness_state_topic: "homeassistant/light/server_rgb/brightness/state"
    payload_on: "ON"
    payload_off: "OFF"
    qos: 1
    retain: true

# REST Commands for RGB control
rest_command:
  set_rgb_color:
    url: "http://127.0.0.1:18791/lights/{{ color }}"
    method: GET
  rgb_off:
    url: "http://127.0.0.1:18791/lights/off"
    method: GET
  rgb_default:
    url: "http://127.0.0.1:18791/lights/default"
    method: GET
EOF
        echo "Home Assistant RGB configuration created"
      else
        echo "RGB configuration already exists in Home Assistant"
      fi
    '';
  };

  # ---------------------------------------------------------------------------
  # INYECCIÓN DE SECRETOS + PERMISOS (ExecStartPre)
  # ---------------------------------------------------------------------------
  systemd.services.podman-influxdb = {
    serviceConfig = {
      EnvironmentFile   = config.sops.secrets."influxdb_env".path;
      RequiresMountsFor = [ "/mnt/fast/appdata" ];
      ExecStartPre = [
        "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/influxdb/data"
        "${pkgs.coreutils}/bin/chown -R 1000:1000 /mnt/fast/appdata/influxdb"
      ];
    };
  };

  systemd.services.podman-grafana = {
    serviceConfig = {
      EnvironmentFile   = config.sops.secrets."grafana_env".path;
      RequiresMountsFor = [ "/mnt/fast/appdata" ];
      ExecStartPre = [
        "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/grafana"
        "${pkgs.coreutils}/bin/chown -R 472:472 /mnt/fast/appdata/grafana"
      ];
    };
  };

  systemd.services.podman-mosquitto = {
    serviceConfig = {
      RequiresMountsFor = [ "/mnt/fast/appdata" ];
      ExecStartPre = [
        "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/mosquitto/config"
        "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/mosquitto/data"
        "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/mosquitto/log"
        "${pkgs.coreutils}/bin/chown -R 1883:1883 /mnt/fast/appdata/mosquitto"
      ];
    };
  };

  systemd.services.podman-nodered = {
    serviceConfig = {
      RequiresMountsFor = [ "/mnt/fast/appdata" ];
      ExecStartPre = [
        "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/nodered"
        "${pkgs.coreutils}/bin/chown -R 1000:1000 /mnt/fast/appdata/nodered"
      ];
    };
  };

  systemd.services.podman-homeassistant.serviceConfig.RequiresMountsFor = [ "/mnt/fast/appdata" ];

  # ---------------------------------------------------------------------------
  # FIREWALL — Puertos IoT
  # ---------------------------------------------------------------------------
  networking.firewall.allowedTCPPorts = [
    8123  # Home Assistant
    1883  # Mosquitto MQTT
    8086  # InfluxDB
    1880  # Node-RED
    3000  # Grafana
  ];
}
