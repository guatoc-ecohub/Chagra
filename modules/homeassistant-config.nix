{ config, pkgs, lib, ... }:

# =============================================================================
# HOMEASSISTANT-CONFIG.NIX — Infraestructura base para Home Assistant
# 
# Propósito: Configurar la conectividad y dependencias de HA, NO la lógica de automatización.
# Los scripts, automatizaciones y escenas deben crearse/edítarse vía la UI de HA.
# 
# Incluye:
#   - Configuración base (configuration.yaml) con integraciones esenciales
#   - Conexión a Mosquitto (MQTT)
#   - Conexión a InfluxDB
#   - Puertos de red para Modbus TCP y telemetría
#   - Zigbee2MQTT (opcional, requiere configuración manual del serial)
# =============================================================================

let
  cfg = config.services.homeassistant-config;

  # Configuración mínima de Home Assistant — solo infraestructura
  haConfiguration = pkgs.writeText "configuration.yaml" ''
    # =============================================================================
    # Home Assistant Configuration - Infraestructura Base
    # Generado declarativamente — Solo editar vía UI para automatizaciones/scripts
    # =============================================================================

    homeassistant:
      name: Guatoc Home
      latitude: 4.6097
      longitude: -74.0817
      elevation: 2550
      unit_system: metric
      time_zone: America/Bogota
      internal_url: "http://192.168.1.100:8123"
      currency: COP
      country: CO
      language: es

    # Configuración básica requerida
    config:
    frontend:
    http:
      use_x_forwarded_for: true
      trusted_proxies:
        - 127.0.0.1
        - 192.168.1.0/24

    # Descubrimiento de dispositivos
    discovery:
    ssdp:
    zeroconf:

    # Historial y registro
    history:
    logbook:
    logger:
      default: warning
      logs:
        homeassistant.core: info

    # Panel de control y default config
    default_config:

    # =============================================================================
    # INTEGRACIÓN MQTT — Conexión a Mosquitto
    # =============================================================================
    mqtt:
      broker: mosquitto
      port: 1883
      client_id: home-assistant-alpha
      discovery: true
      discovery_prefix: homeassistant
      birth_message:
        topic: 'hass/status'
        payload: 'online'
      will_message:
        topic: 'hass/status'
        payload: 'offline'

    # =============================================================================
    # INTEGRACIÓN INFLUXDB — Base de datos de series temporales
    # =============================================================================
    influxdb:
      host: influxdb
      port: 8086
      database: iot
      username: guatoc
      password: !secret influxdb_password
      max_retries: 3
      default_measurement: state
      include:
        domains:
          - sensor
          - binary_sensor
          - climate
          - energy
      exclude:
        entities:
          - sensor.time
          - sensor.date

    # =============================================================================
    # MODBUS TCP — Para telemetría de energía y vehículos
    # =============================================================================
    # Descomentar y configurar cuando se añadan dispositivos Modbus
    # modbus:
    #   - name: hub1
    #     type: tcp
    #     host: 192.168.1.xxx
    #     port: 502

    # =============================================================================
    # ARCHIVOS INCLUIDOS (gestionados vía UI, no editar manualmente)
    # =============================================================================
    automation: !include automations.yaml
    script: !include scripts.yaml
    scene: !include scenes.yaml

    # Nota: Estos archivos se crean automáticamente por HA. 
    # Usar la UI (Ajustes > Automatizaciones y escenas) para editarlos.
  '';

  # Secrets mínimos
  haSecrets = pkgs.writeText "secrets.yaml" ''
    # Secrets de Home Assistant
    # Configurar vía UI: Ajustes > Dispositivos y servicios > ... > Configurar
    
    influxdb_password: changeme  # Cambiar en InfluxDB primero
  '';

in
{
  options.services.homeassistant-config = {
    enable = lib.mkEnableOption "Configuración de infraestructura para Home Assistant";

    zigbee2mqtt = {
      enable = lib.mkEnableOption "Zigbee2MQTT — Controlador Zigbee" // {
        default = false;
      };
    };
  };

  config = lib.mkIf cfg.enable {
    # =============================================================================
    # PREPARACIÓN DE DIRECTORIOS
    # =============================================================================
    systemd.services.homeassistant-setup = {
      description = "Setup Home Assistant infrastructure";
      wantedBy = [ "multi-user.target" ];
      before = [ "podman-homeassistant.service" ];
      after = [ "local-fs.target" ];
      
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        User = "root";
      };
      
      script = ''
        HA_DIR="/mnt/fast/appdata/homeassistant"
        
        # Crear estructura
        mkdir -p "$HA_DIR"
        
        # Copiar configuración base si NO existe (preservar ediciones manuales)
        if [ ! -f "$HA_DIR/configuration.yaml" ]; then
          echo "Creando configuration.yaml inicial..."
          cp ${haConfiguration} "$HA_DIR/configuration.yaml"
        fi
        
        # Copiar secrets si no existe
        if [ ! -f "$HA_DIR/secrets.yaml" ]; then
          cp ${haSecrets} "$HA_DIR/secrets.yaml"
          chmod 600 "$HA_DIR/secrets.yaml"
        fi
        
        # Crear archivos vacíos para HA si no existen (evita errores de parseo)
        if [ ! -s "$HA_DIR/automations.yaml" ]; then
          cat > "$HA_DIR/automations.yaml" << 'EOF'
- id: rgb_agro_soil_watchdog
  alias: "[Agro] Monitoreo Humedad de Suelo (Tabaco y Pruebas)"
  trigger:
    - platform: numeric_state
      entity_id: 
        - sensor.sensor_tabaco_humidity
        - sensor.sensor_pruebas_1_humidity
      below: 30
      id: "alerta_critica"
    - platform: numeric_state
      entity_id: 
        - sensor.sensor_tabaco_humidity
        - sensor.sensor_pruebas_1_humidity
      above: 40
      id: "recuperacion_suelo"
  action:
    - choose:
        - conditions:
            - condition: trigger
              id: "alerta_critica"
          sequence:
            - service: light.turn_on
              target:
                entity_id: [light.motherboard, light.keyboard]
              data:
                color_name: red
                brightness_pct: 100
        - conditions:
            - condition: trigger
              id: "recuperacion_suelo"
            - condition: numeric_state
              entity_id: sensor.sensor_tabaco_humidity
              above: 40
            - condition: numeric_state
              entity_id: sensor.sensor_pruebas_1_humidity
              above: 40
          sequence:
            - service: light.turn_on
              target:
                entity_id: [light.motherboard, light.keyboard]
              data:
                color_name: green
                brightness_pct: 20
  mode: restart
EOF
        fi
        touch "$HA_DIR/scripts.yaml"
        touch "$HA_DIR/scenes.yaml"
        
        # Permisos
        chown -R root:root "$HA_DIR"
        chmod 755 "$HA_DIR"
        chmod 644 "$HA_DIR"/*.yaml 2>/dev/null || true
        
        echo "Home Assistant infraestructura lista"
      '';
    };

    # Asegurar orden de servicios
    systemd.services.podman-homeassistant = {
      requires = [ "homeassistant-setup.service" ];
      after = [ "homeassistant-setup.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
      };
    };

    # =============================================================================
    # ZIGBEE2MQTT (Opcional)
    # =============================================================================
    # 
    # ⚠️  IMPORTANTE: Antes de habilitar, DEBES configurar el puerto serial.
    # 
    # 1. Conecta el dongle USB Zigbee
    # 2. Verifica la ruta: ls -la /dev/serial/by-id/
    # 3. Edita /mnt/fast/appdata/z2m/configuration.yaml:
    #    serial:
    #      port: /dev/serial/by-id/usb-XXXXXXXXX
    #      adapter: zstack  # o ezsp, deconz, etc. según tu dongle
    # 4. Cambia zigbee2mqtt.enable = true en este archivo
    # 5. Rebuild y reinicia
    #
    # Sin la ruta serial configurada correctamente, el servicio FALLARÁ.
    
    systemd.services.zigbee2mqtt-setup = lib.mkIf cfg.zigbee2mqtt.enable {
      description = "Setup Zigbee2MQTT configuration";
      wantedBy = [ "multi-user.target" ];
      before = [ "podman-zigbee2mqtt.service" ];
      
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
      
      script = ''
        Z2M_DIR="/mnt/fast/appdata/z2m"
        mkdir -p "$Z2M_DIR"
        
        # Verificar que existe configuración con serial.port definido
        if [ -f "$Z2M_DIR/configuration.yaml" ]; then
          if ! grep -q "port: /dev/serial/by-id" "$Z2M_DIR/configuration.yaml" 2>/dev/null; then
            echo "ERROR: Zigbee2MQTT requiere serial.port configurado en $Z2M_DIR/configuration.yaml"
            echo "Ejecuta: ls -la /dev/serial/by-id/ para encontrar tu dongle"
            exit 1
          fi
        else
          # Crear configuración inicial con advertencia
          cat > "$Z2M_DIR/configuration.yaml" << 'EOF'
        # ⚠️  CONFIGURACIÓN INCOMPLETA
        # 
        # Debes configurar el puerto serial antes de iniciar Zigbee2MQTT.
        # 
        # 1. Identifica tu dongle:
        #    ls -la /dev/serial/by-id/
        # 
        # 2. Reemplaza la línea de abajo con tu ruta:
        #    port: /dev/serial/by-id/usb-XXXXXXXXX
        #
        # 3. Reinicia el servicio: sudo systemctl restart podman-zigbee2mqtt
        
        homeassistant: true
        permit_join: false
        mqtt:
          server: mqtt://mosquitto:1883
          base_topic: zigbee2mqtt
        serial:
          # ⚠️ CONFIGURAR ESTO O EL SERVICIO FALLARÁ
          port: /dev/serial/by-id/PLACEHOLDER-CAMBIA-ESTO
          adapter: zstack
        frontend:
          port: 8080
        advanced:
          log_level: info
          pan_id: 6754
          channel: 11
          network_key: GENERATE
        EOF
          echo "ERROR: Configuración de Zigbee2MQTT creada pero requiere serial.port"
          echo "Edita: $Z2M_DIR/configuration.yaml"
          exit 1
        fi
        
        chown -R root:root "$Z2M_DIR"
      '';
    };

    virtualisation.oci-containers.containers.zigbee2mqtt = lib.mkIf cfg.zigbee2mqtt.enable {
      image = "koenkk/zigbee2mqtt:latest";
      ports = [ "8080:8080" ];
      volumes = [
        "/mnt/fast/appdata/z2m:/app/data"
      ];
      environment = {
        TZ = "America/Bogota";
      };
      extraOptions = [
        "--network=iot-net"
        # El dispositivo se monta dinámicamente según configuración
      ];
    };

    # =============================================================================
    # FIREWALL — Puertos para HA y telemetría
    # =============================================================================
    networking.firewall = {
      allowedTCPPorts = [
        8123  # Home Assistant Web UI
      ] ++ lib.optionals cfg.zigbee2mqtt.enable [
        8080  # Zigbee2MQTT Web UI
      ];
      
      # Puertos para integraciones específicas (habilitar según necesidad)
      interfaces.enp3s0 = {
        allowedTCPPorts = [
          # Modbus TCP para telemetría de energía
          # 502   # Modbus TCP estándar
          
          # Puertos comunes para vehículos eléctricos / wallbox
          # 8081  # Wallbox API
          # 8082  # EVSE Controller
          
          # Otros protocolos de telemetría
          # 4196  # SAE J1939 over TCP (vehículos pesados)
          # 44818 # Allen-Bradley / OPC UA
        ];
      };
    };

    # =============================================================================
    # DOCUMENTACIÓN DE PUERTOS PARA REFERENCIA
    # =============================================================================
    # Modbus TCP (502): Telemetría de medidores de energía (Schneider, Siemens, etc.)
    # HTTP alternativos (8081-8090): APIs de wallboxes y cargadores EV
    # 
    # Para habilitar, añadir al firewall en hosts/alpha/default.nix:
    # networking.firewall.allowedTCPPorts = [ 502 8081 ];
  };
}
