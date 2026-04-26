# modules/smarthome/homeassistant.nix
# =============================================================================
# HOME ASSISTANT — Smart Home Automation
# Port: 8123
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.smarthome.homeassistant;
  smarthomeCfg = config.guatoc.smarthome;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.smarthome.homeassistant = {
    enable = lib.mkEnableOption "Home Assistant - Automatización del hogar" // {
      default = false;
    };
    
    serialDevice = lib.mkOption {
      type = lib.types.str;
      default = "/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0";
      description = "USB serial device for Zigbee dongle";
    };
    
    # RGB Integration options
    enableRGB = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Enable RGB control via Picoclaw API";
    };
  };

  config = lib.mkIf (smarthomeCfg.enable && cfg.enable) {
    systemd.services.podman-homeassistant = {
      after = [ "zfs.target" "network-online.target" "podman-create-iot-net.service" ];
      requires = [ "zfs.target" "podman-create-iot-net.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/homeassistant"
        ];
      };
    };

    virtualisation.oci-containers.containers.homeassistant = {
      image = "ghcr.io/home-assistant/home-assistant:stable";
      extraOptions = [
        "--network=host"
        "--cap-add=NET_RAW"
        "--cap-add=NET_ADMIN"
        "--device=${cfg.serialDevice}:/dev/ttyUSB0"
      ];
      volumes = [
        "/mnt/fast/appdata/homeassistant:/config"
        "/etc/localtime:/etc/localtime:ro"
      ];
      environment = { 
        TZ = config.time.timeZone;
      };
    };

    # Generate Home Assistant configuration with RGB, FarmOS, and TTS integration
    systemd.services.podman-homeassistant-config = lib.mkIf cfg.enableRGB {
      description = "Configure Home Assistant with RGB, FarmOS, and TTS";
      after = [ "podman-homeassistant.service" ];
      serviceConfig.Type = "oneshot";
      script = ''
        # Create Lovelace directory structure
        install -d -m 0755 /mnt/fast/appdata/homeassistant/lovelace

        # Create comprehensive Home Assistant configuration
        cat >> /mnt/fast/appdata/homeassistant/configuration.yaml << 'EOF'
homeassistant:
  name: Guatoc Alpha
  time_zone: America/Bogota
  # --- BLOQUE CRÍTICO DE ENRUTAMIENTO ---
  internal_url: "http://192.168.1.100:8123"
  external_url: "https://ha.guatoc.co"

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

# FarmOS API Integration (CORRECTED ROUTING)
  - resource: "https://farmos.guatoc.co/api/log/task?filter[status]=pending&sort=-timestamp"
    scan_interval: 300
    timeout: 30
    verify_ssl: false
    headers:
      Authorization: "Bearer !secret farmos_bearer_token"
      Content-Type: "application/vnd.api+json"
      Accept: "application/vnd.api+json"
    sensor:
      - name: "farmos_pending_tasks"
        value_template: "{{ value_json.data | length if value_json.data is defined else 0 }}"
        json_attributes:
          - data
      - name: "farmos_latest_task"
        value_template: >
          {% if value_json.data is defined and value_json.data | length > 0 %}
            {{ value_json.data[0].attributes.name }}
          {% else %}
            None
          {% endif %}

# Wyoming Piper TTS Integration
wyoming:
  - host: "127.0.0.1"
    port: 10200
    platform: "piper"

# Media Player Nest Hub
media_player:
  - platform: cast
    host: 192.168.1.105

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

# RGB Switch for common colors
switch:
  - platform: template
    switches:
      rgb_red:
        value_template: "{{ states.light.server_rgb.state }}"
        turn_on:
          service: rest_command.set_rgb_color
          data:
            color: "FF0000"
        turn_off:
          service: rest_command.set_rgb_color
          data:
            color: "000000"

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

# Google Assistant Voice Interception
script:
  intercept_voice_command:
    alias: "Procesar Comando de Voz con Ollama"
    sequence:
      - service: tts.google_translate_say
        data:
          entity_id: media_player.nest_hub
          message: "Sí pa, ¿pa qué soy bueno?"

automation:
  - id: "nest_hub_screensaver_observability"
    alias: "Nest Hub Screensaver - Observability Dashboard"
    description: "Activar dashboard de observabilidad en Nest Hub cuando entre en inactividad"
    trigger:
      - platform: state
        entity_id: sensor.nest_hub_idle_time
        to: "idle"
        for:
          minutes: 5
    condition:
      - condition: state
        entity_id: media_player.nest_hub
        state: "idle"
    action:
      - service: cast.show_lovelace_view
        data:
          entity_id: media_player.nest_hub
          view_path: "/lovelace/screensaver"
  - id: "guatoc_active_watchdog"
    alias: "Guatoc Watchdog - Alertas Proactivas Nest Hub"
    description: "Monitoreo de umbrales críticos de infraestructura y agroecología"
    trigger:
      - platform: numeric_state
        entity_id: sensor.soil_moisture_greenhouse
        below: 20
        id: "alerta_hidrica"
      - platform: state
        entity_id: sensor.zfs_tank_status
        to: "DEGRADED"
        id: "alerta_hardware"
      - platform: state
        entity_id: sensor.farmos_pending_tasks
        to: "unavailable"
        id: "alerta_software"
    action:
      - service: tts.speak
        target:
          entity_id: tts.piper
        data:
          media_player_entity_id: media_player.nest_hub
          message: >
            {% if trigger.id == 'alerta_hidrica' %}
              En la buena pa, el invernadero presenta estrés hídrico crítico. Intervención requerida.
            {% elif trigger.id == 'alerta_hardware' %}
              En la buena pa, el arreglo de discos ZFS del servidor Alpha se ha degradado.
            {% elif trigger.id == 'alerta_software' %}
              En la buena pa, la conexión con Farm o.s. se ha perdido. No hay sincronización de bitácora.
            {% endif %}
      - delay: "00:00:08"
      - service: cast.show_lovelace_view
        data:
          entity_id: media_player.nest_hub
          view_path: "/lovelace/screensaver"

# Lovelace en modo YAML — el dashboard "screensaver" se carga del archivo
# /config/lovelace/screensaver.yaml escrito por este mismo módulo. Sin esta
# sección, HA usaba storage-mode (UI-managed) y el yaml jamás se renderizaba
# (incidente 2026-04-25: tras re-onboarding HA quedó con dashboard vacío).
lovelace:
  mode: yaml
  resources: []
  dashboards:
    chagra-screensaver:
      mode: yaml
      filename: lovelace/screensaver.yaml
      title: Chagra Screensaver
      icon: mdi:leaf
      show_in_sidebar: true
      require_admin: false
EOF

        # Create Lovelace dashboard for screensaver
        cat > /mnt/fast/appdata/homeassistant/lovelace/screensaver.yaml << 'LOVELACEEOF'
title: "Guatoc Centro de Operaciones"
theme: "dark"
views:
  - id: overview_dynamic
    title: "Telemetría Global"
    path: "screensaver"
    panel: true
    cards:
      - type: custom:layout-card
        layout_type: custom:grid-layout
        layout:
          grid-template-columns: 33% 33% 33%
          grid-template-rows: auto
          grid-template-areas: |
            "infra agroecologia bitacora"
        cards:
          - type: custom:auto-entities
            view_layout:
              grid-area: infra
            card:
              type: entities
              title: "Nodo Alpha (Hardware)"
            filter:
              include:
                - entity_id: "sensor.alpha_*"
                - entity_id: "sensor.zfs_*"
              exclude:
                - state: "unavailable"
          - type: custom:auto-entities
            view_layout:
              grid-area: agroecologia
            card:
              type: entities
              title: "Red Zigbee (Cultivos)"
            filter:
              include:
                - entity_id: "sensor.soil_moisture_*"
                - entity_id: "sensor.temperature_*"
          - type: markdown
            view_layout:
              grid-area: bitacora
            title: "Operaciones (FarmOS)"
            content: |
              ### Tareas Pendientes: {{ states('sensor.farmos_pending_tasks') }}
              **Última:** {{ state_attr('sensor.farmos_latest_task', 'tasks') }}
LOVELACEEOF
        echo "Home Assistant and Lovelace configuration created"
      '';
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.homeassistant ];
  };
}
