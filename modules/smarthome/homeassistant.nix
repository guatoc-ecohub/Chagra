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

    # Generate Home Assistant configuration with RGB integration
    systemd.services.podman-homeassistant-config = lib.mkIf cfg.enableRGB {
      description = "Configure Home Assistant RGB integration";
      after = [ "podman-homeassistant.service" ];  
      serviceConfig.Type = "oneshot";
      script = ''
        # Create REST sensor configuration for RGB
        cat >> /mnt/fast/appdata/homeassistant/configuration.yaml << 'EOF'

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
EOF
        echo "Home Assistant RGB configuration created"
      '';
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.homeassistant ];
  };
}
