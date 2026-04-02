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

    # Generate Home Assistant configuration (cast, dashboard, FarmOS, TTS, RGB)
    systemd.services.podman-homeassistant-config = {
      description = "Configure Home Assistant — Declarative YAML generation";
      after = [ "podman-homeassistant.service" ];
      serviceConfig.Type = "oneshot";
      script = ''
        # Create Lovelace directory structure
        install -d -m 0755 /mnt/fast/appdata/homeassistant/lovelace

        # Overwrite — idempotent on every rebuild
        cat > /mnt/fast/appdata/homeassistant/configuration.yaml << 'EOF'
default_config:

homeassistant:
  name: Guatoc Alpha
  time_zone: America/Bogota
  # --- BLOQUE CRÍTICO DE ENRUTAMIENTO ---
  internal_url: "http://192.168.1.100:8123"
  external_url: "https://ha.guatoc.co"

# HTTP — Proxies confiables para Cast y Nginx/Cloudflare Tunnel
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 127.0.0.1
    - 192.168.1.0/24
    - 172.16.0.0/12

# Integración Cast (requiere external_url HTTPS)
cast:

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

# FarmOS API Integration
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

# Media Player Nest Hub (Cast)
media_player:
  - platform: cast
    host: 192.168.1.107

# Conmutador de control para rotación del screensaver
input_boolean:
  nest_screensaver_active:
    name: "Nest Hub Screensaver Activo"
    icon: mdi:monitor-shimmer

# Lovelace dashboards — referencia al panel kiosk
lovelace:
  mode: yaml
  dashboards:
    nest-hub:
      mode: yaml
      title: "Nest Hub Kiosk"
      icon: mdi:cast
      show_in_sidebar: false
      filename: lovelace/nest_hub.yaml

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
          entity_id: media_player.oficina
          message: "Sí pa, ¿pa qué soy bueno?"

automation:
  # =====================================================================
  # Fase 9 — Rotación continua de vistas en Google Nest Hub
  # =====================================================================
  - id: "nest_hub_kiosk_rotation"
    alias: "Nest Hub Kiosk - Rotación de Vistas"
    description: "Proyecta cíclicamente las 3 vistas del dashboard en el Nest Hub mientras el conmutador esté activo"
    trigger:
      - platform: homeassistant
        event: start
      - platform: state
        entity_id: input_boolean.nest_screensaver_active
        to: "on"
    condition:
      - condition: state
        entity_id: input_boolean.nest_screensaver_active
        state: "on"
    action:
      - repeat:
          while:
            - condition: state
              entity_id: input_boolean.nest_screensaver_active
              state: "on"
          sequence:
            # Vista 1: Hardware del Nodo Alpha
            - service: cast.show_lovelace_view
              data:
                entity_id: media_player.oficina
                dashboard_path: nest-hub
                view_path: view_hw
            - delay:
                seconds: 20
            # Vista 2: Sensores IoT del Invernadero
            - service: cast.show_lovelace_view
              data:
                entity_id: media_player.oficina
                dashboard_path: nest-hub
                view_path: view_iot
            - delay:
                seconds: 20
            # Vista 3: Bitácora FarmOS
            - service: cast.show_lovelace_view
              data:
                entity_id: media_player.oficina
                dashboard_path: nest-hub
                view_path: view_farm
            - delay:
                seconds: 20

  - id: "nest_hub_kiosk_stop"
    alias: "Nest Hub Kiosk - Detener Rotación"
    description: "Detiene la proyección cuando el conmutador se desactiva"
    trigger:
      - platform: state
        entity_id: input_boolean.nest_screensaver_active
        to: "off"
    action:
      - service: media_player.turn_off
        target:
          entity_id: media_player.oficina

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
          media_player_entity_id: media_player.oficina
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
          entity_id: media_player.oficina
          dashboard_path: nest-hub
          view_path: view_hw
EOF

        # Create Lovelace kiosk dashboard — 3 vistas rotativas para Nest Hub
        cat > /mnt/fast/appdata/homeassistant/lovelace/nest_hub.yaml << 'LOVELACEEOF'
title: "Guatoc Centro de Operaciones"
kiosk_mode:
  hide_sidebar: true
  hide_header: true

views:
  # =================================================================
  # Vista 1 — Infraestructura del Nodo Alpha
  # =================================================================
  - title: "Hardware"
    path: view_hw
    icon: mdi:server
    panel: false
    # theme: Backend-slate
    cards:
      - type: vertical-stack
        cards:
          - type: markdown
            content: "## Nodo Alpha — Infraestructura"
          - type: gauge
            entity: sensor.alpha_cpu_usage
            name: "CPU"
            min: 0
            max: 100
            severity:
              green: 0
              yellow: 60
              red: 85
          - type: gauge
            entity: sensor.alpha_memory_usage
            name: "Memoria RAM"
            min: 0
            max: 100
            severity:
              green: 0
              yellow: 70
              red: 90
          - type: sensor
            entity: sensor.alpha_cpu_temperature
            name: "Temperatura CPU"
            graph: line
            hours_to_show: 6
          - type: entities
            title: "Estado del Sistema"
            entities:
              - entity: sensor.zfs_tank_status
                name: "ZFS Pool"
              - entity: sensor.alpha_disk_usage
                name: "Disco"
              - entity: sensor.alpha_uptime
                name: "Uptime"

  # =================================================================
  # Vista 2 — Sensores IoT del Invernadero
  # =================================================================
  - title: "Invernadero"
    path: view_iot
    icon: mdi:sprout
    panel: false
    # theme: Backend-slate
    cards:
      - type: vertical-stack
        cards:
          - type: markdown
            content: "## Invernadero 1 — Sensores Agroecológicos"
          - type: glance
            title: "Humedad del Suelo"
            columns: 3
            entities:
              - entity: sensor.soil_moisture_greenhouse
                name: "Invernadero"
          - type: glance
            title: "Temperatura Ambiente"
            columns: 3
            entities:
              - entity: sensor.temperature_greenhouse
                name: "Invernadero"
          - type: history-graph
            title: "Tendencia Hídrica (24h)"
            hours_to_show: 24
            entities:
              - entity: sensor.soil_moisture_greenhouse
                name: "Humedad Invernadero"
          - type: entities
            title: "Conectividad Zigbee"
            entities:
              - entity: sensor.zigbee2mqtt_bridge_state
                name: "Bridge Zigbee"

  # =================================================================
  # Vista 3 — Bitácora FarmOS (Tareas Orgánicas)
  # =================================================================
  - title: "Bitácora"
    path: view_farm
    icon: mdi:book-open-page-variant
    panel: false
    # theme: Backend-slate
    cards:
      - type: vertical-stack
        cards:
          - type: markdown
            content: "## Bitácora Agroecológica — FarmOS"
          - type: entity
            entity: sensor.farmos_pending_tasks
            name: "Tareas Pendientes"
            icon: mdi:clipboard-list
          - type: markdown
            title: "Última Tarea Registrada"
            content: >
              **{{ states('sensor.farmos_latest_task') }}**


              {% if state_attr('sensor.farmos_pending_tasks', 'data') %}
              {% for task in state_attr('sensor.farmos_pending_tasks', 'data')[:5] %}
              - {{ task.attributes.name }}
              {% endfor %}
              {% else %}
              Sin tareas pendientes en la cola.
              {% endif %}
          - type: conditional
            conditions:
              - entity: sensor.farmos_pending_tasks
                state_not: "0"
            card:
              type: markdown
              content: >
                ### Acción Requerida

                Hay **{{ states('sensor.farmos_pending_tasks') }}** tareas orgánicas pendientes de ejecución.
LOVELACEEOF
        echo "Home Assistant and Lovelace configuration created"
      '';
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.homeassistant ];
  };
}
