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
    - "::1"
    - 192.168.1.0/24
    - 172.16.0.0/12

# Integración Cast (requiere external_url HTTPS)
cast:

# FarmOS API Integration
rest:
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

# Wyoming Piper TTS — contenedor en 127.0.0.1:10200 (HA usa --network=host)
# Requiere: Agregar integración Wyoming via HA UI si no está configurada
# Settings → Integrations → Add → Wyoming Protocol → host: 127.0.0.1, port: 10200

# Media Player Nest Hub (Cast)
media_player:
  - platform: cast
    host: 192.168.1.107

# =============================================================================
# Fase 10 — Sensores de Contenedores Críticos (TCP port check)
# Ejecutados dentro del contenedor HA (--network=host → acceso a localhost)
# =============================================================================
command_line:
  - binary_sensor:
      name: "Contenedor FarmOS"
      unique_id: container_farmos
      command: >-
        python3 -c "import socket; s=socket.create_connection(('127.0.0.1', 8081), 5); s.close(); print('ON')" 2>/dev/null || echo "OFF"
      payload_on: "ON"
      payload_off: "OFF"
      device_class: connectivity
      scan_interval: 60
  - binary_sensor:
      name: "Contenedor PostgreSQL"
      unique_id: container_postgres
      command: >-
        python3 -c "import socket; s=socket.create_connection(('127.0.0.1', 5432), 5); s.close(); print('ON')" 2>/dev/null || echo "OFF"
      payload_on: "ON"
      payload_off: "OFF"
      device_class: connectivity
      scan_interval: 60
  - binary_sensor:
      name: "Contenedor Mosquitto"
      unique_id: container_mosquitto
      command: >-
        python3 -c "import socket; s=socket.create_connection(('127.0.0.1', 1883), 5); s.close(); print('ON')" 2>/dev/null || echo "OFF"
      payload_on: "ON"
      payload_off: "OFF"
      device_class: connectivity
      scan_interval: 60
  - binary_sensor:
      name: "Contenedor Node-RED"
      unique_id: container_nodered
      command: >-
        python3 -c "import socket; s=socket.create_connection(('127.0.0.1', 1880), 5); s.close(); print('ON')" 2>/dev/null || echo "OFF"
      payload_on: "ON"
      payload_off: "OFF"
      device_class: connectivity
      scan_interval: 60
  - binary_sensor:
      name: "Contenedor Ollama"
      unique_id: container_ollama
      command: >-
        python3 -c "import socket; s=socket.create_connection(('127.0.0.1', 11434), 5); s.close(); print('ON')" 2>/dev/null || echo "OFF"
      payload_on: "ON"
      payload_off: "OFF"
      device_class: connectivity
      scan_interval: 60
  - binary_sensor:
      name: "Contenedor Piper TTS"
      unique_id: container_piper
      command: >-
        python3 -c "import socket; s=socket.create_connection(('127.0.0.1', 10200), 5); s.close(); print('ON')" 2>/dev/null || echo "OFF"
      payload_on: "ON"
      payload_off: "OFF"
      device_class: connectivity
      scan_interval: 60

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

# Script de voz
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

  # =====================================================================
  # Fase 10 — Watchdog de Contenedores Críticos
  # Trigger: cualquier binary_sensor de contenedor OFF por >1 minuto
  # Actions: Interrumpe Nest Hub con vista de alertas + TTS Piper
  # =====================================================================
  - id: "container_critical_watchdog"
    alias: "Fase 10 - Watchdog Contenedores Críticos"
    description: "Alerta reactiva cuando un contenedor crítico cae por más de 1 minuto"
    trigger:
      - platform: state
        entity_id:
          - binary_sensor.contenedor_farmos
          - binary_sensor.contenedor_postgresql
          - binary_sensor.contenedor_mosquitto
          - binary_sensor.contenedor_node_red
          - binary_sensor.contenedor_ollama
          - binary_sensor.contenedor_piper_tts
        to: "off"
        for:
          minutes: 1
    action:
      # Paso 1: Interrumpir rotación del screensaver
      - service: input_boolean.turn_off
        target:
          entity_id: input_boolean.nest_screensaver_active
      # Paso 2: Proyectar vista de alertas en Nest Hub
      - service: cast.show_lovelace_view
        data:
          entity_id: media_player.oficina
          dashboard_path: nest-hub
          view_path: alert_view
      - delay: "00:00:02"
      # Paso 3: Alerta de voz via Wyoming Piper
      - service: tts.speak
        target:
          entity_id: tts.piper
        data:
          media_player_entity_id: media_player.oficina
          message: >-
            Alerta crítica en el Nodo Alfa. El servicio {{ trigger.to_state.name }} está inactivo. Requiere revisión inmediata.
      # Paso 4: Esperar recuperación y restaurar rotación
      - wait_for_trigger:
          - platform: state
            entity_id:
              - binary_sensor.contenedor_farmos
              - binary_sensor.contenedor_postgresql
              - binary_sensor.contenedor_mosquitto
              - binary_sensor.contenedor_node_red
              - binary_sensor.contenedor_ollama
              - binary_sensor.contenedor_piper_tts
            to: "on"
        timeout: "01:00:00"
        continue_on_timeout: true
      - service: input_boolean.turn_on
        target:
          entity_id: input_boolean.nest_screensaver_active
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
  # Vista 3 — PWA Chagra (iframe fullscreen) — Fase 11
  # Requiere: Nginx CSP frame-ancestors permite http://192.168.1.100:8123
  # =================================================================
  - title: "Chagra"
    path: view_farm
    icon: mdi:book-open-page-variant
    panel: true
    cards:
      - type: iframe
        url: "http://192.168.1.100/#dashboard"
        aspect_ratio: "100%"

  # =================================================================
  # Vista 4 — Alertas de Contenedores (Fase 10)
  # Solo muestra servicios caídos. Proyectada por automatización.
  # =================================================================
  - title: "Alertas"
    path: alert_view
    icon: mdi:alert-octagon
    panel: false
    cards:
      - type: markdown
        content: "## ALERTA — Servicios Críticos Inactivos"
        style: |
          ha-card { background-color: #b71c1c; color: white; }
      - type: conditional
        conditions:
          - entity: binary_sensor.contenedor_farmos
            state: "off"
        card:
          type: entity
          entity: binary_sensor.contenedor_farmos
          name: "FarmOS (puerto 8081)"
          icon: mdi:server-off
      - type: conditional
        conditions:
          - entity: binary_sensor.contenedor_postgresql
            state: "off"
        card:
          type: entity
          entity: binary_sensor.contenedor_postgresql
          name: "PostgreSQL (puerto 5432)"
          icon: mdi:database-off
      - type: conditional
        conditions:
          - entity: binary_sensor.contenedor_mosquitto
            state: "off"
        card:
          type: entity
          entity: binary_sensor.contenedor_mosquitto
          name: "Mosquitto MQTT (puerto 1883)"
          icon: mdi:access-point-off
      - type: conditional
        conditions:
          - entity: binary_sensor.contenedor_node_red
            state: "off"
        card:
          type: entity
          entity: binary_sensor.contenedor_node_red
          name: "Node-RED (puerto 1880)"
          icon: mdi:pipe-disconnected
      - type: conditional
        conditions:
          - entity: binary_sensor.contenedor_ollama
            state: "off"
        card:
          type: entity
          entity: binary_sensor.contenedor_ollama
          name: "Ollama LLM (puerto 11434)"
          icon: mdi:brain
      - type: conditional
        conditions:
          - entity: binary_sensor.contenedor_piper_tts
            state: "off"
        card:
          type: entity
          entity: binary_sensor.contenedor_piper_tts
          name: "Piper TTS (puerto 10200)"
          icon: mdi:microphone-off
      - type: markdown
        content: >
          **Timestamp:** {{ now().strftime('%Y-%m-%d %H:%M:%S') }}


          La rotación del screensaver se reanudará automáticamente cuando los servicios se recuperen.
LOVELACEEOF
        echo "Home Assistant and Lovelace configuration created"
      '';
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.homeassistant ];
  };
}
