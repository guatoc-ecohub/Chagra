# modules/smarthome/default.nix
# =============================================================================
# SMARTHOME DOMAIN — Smart Home & IoT Services
# Includes: Home Assistant, Mosquitto, Zigbee2MQTT
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.smarthome;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  imports = [
    ./homeassistant.nix
    ./mosquitto.nix
    ./zigbee2mqtt.nix
  ];

  # ============================================
  # OPTIONS: Feature toggles for the domain
  # ============================================
  options.guatoc.smarthome = {
    enable = lib.mkEnableOption "Smart Home & IoT services" // {
      default = false;
    };
    
    # Submodules handle their own enable options
  };

  # ============================================
  # CONFIG: Apply when smarthome.enable = true
  # ============================================
  config = lib.mkIf cfg.enable {
    # Note: User/group creation is handled by the legacy modules/iot.nix
    
    # Create Podman network for IoT
    systemd.services.podman-create-iot-net = {
      description = "Crear red Podman iot-net";
      wantedBy = [ "multi-user.target" ];
      before = [
        "podman-homeassistant.service"
        "podman-mosquitto.service"
        "podman-zigbee2mqtt.service"
      ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        ExecStart = "${pkgs.podman}/bin/podman network create --ignore iot-net";
      };
    };
    
    # Create base directories (legacy modules also define these)
    # systemd.tmpfiles.rules is handled by legacy modules/iot.nix
  };
}
