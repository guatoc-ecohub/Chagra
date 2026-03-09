# modules/smarthome/zigbee2mqtt.nix
# =============================================================================
# ZIGBEE2MQTT — Zigbee to MQTT Bridge
# Port: 8080 (WebUI)
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.smarthome.zigbee2mqtt;
  smarthomeCfg = config.guatoc.smarthome;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.smarthome.zigbee2mqtt = {
    enable = lib.mkEnableOption "Zigbee2MQTT - Puente Zigbee a MQTT" // {
      default = false;
    };
    
    serialDevice = lib.mkOption {
      type = lib.types.str;
      default = "/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0";
      description = "USB serial device for Zigbee dongle. Verify with: ls -la /dev/serial/by-id/";
    };
    
    # Placeholder para configuración futura si no hay dongle
    enablePlaceholder = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Enable placeholder mode when no Zigbee dongle is present";
    };
  };

  config = lib.mkIf (smarthomeCfg.enable && cfg.enable) {
    systemd.services.podman-zigbee2mqtt = {
      after = [ "zfs.target" "network-online.target" "podman-create-iot-net.service" "podman-mosquitto.service" ];
      requires = [ "zfs.target" "podman-create-iot-net.service" "podman-mosquitto.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/zigbee2mqtt"
        ];
      };
    };

    virtualisation.oci-containers.containers.zigbee2mqtt = {
      image = "koenkk/zigbee2mqtt:latest";
      ports = [ "${toString registry.ports.zigbee2mqtt}:${toString registry.ports.zigbee2mqtt}" ];
      volumes = [
        "/mnt/fast/appdata/zigbee2mqtt:/app/data"
        "/dev/serial/by-id:/dev/serial/by-id:ro"
      ];
      environment = {
        TZ = config.time.timeZone;
      };
      extraOptions = [
        "--network=iot-net"
        "--name=zigbee2mqtt"
        "--device=${cfg.serialDevice}:/dev/ttyUSB0:rwm"
        "--device=/dev/ttyUSB0:/dev/ttyUSB0:rwm"
      ];
    };

    # Advertencia si el dispositivo serie no existe
    systemd.services.podman-zigbee2mqtt.preStart = lib.mkIf (!cfg.enablePlaceholder) ''
      if [ ! -e ${cfg.serialDevice} ]; then
        echo "WARNING: Zigbee dongle not found at ${cfg.serialDevice}"
        echo "Verify with: ls -la /dev/serial/by-id/"
      fi
    '';

    networking.firewall.allowedTCPPorts = [ registry.ports.zigbee2mqtt ];
  };
}
