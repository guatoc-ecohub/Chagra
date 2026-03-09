# modules/smarthome/mosquitto.nix
# =============================================================================
# MOSQUITTO — MQTT Broker
# Port: 1883
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.smarthome.mosquitto;
  smarthomeCfg = config.guatoc.smarthome;
  registry = import ../../lib/registry.nix { inherit lib; };
  
  # Static Mosquitto config generated in Nix store
  mosquittoConf = pkgs.writeText "mosquitto.conf" ''
    persistence true
    persistence_location /mosquitto/data/
    log_dest file /mosquitto/log/mosquitto.log
    log_dest stdout
    
    listener 1883
    allow_anonymous true
  '';
in
{
  options.guatoc.smarthome.mosquitto = {
    enable = lib.mkEnableOption "Mosquitto - Broker MQTT" // {
      default = false;
    };
  };

  config = lib.mkIf (smarthomeCfg.enable && cfg.enable) {
    systemd.services.podman-mosquitto = {
      after = [ "zfs.target" "network-online.target" "podman-create-iot-net.service" ];
      requires = [ "zfs.target" "podman-create-iot-net.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/mosquitto/config"
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/mosquitto/data"
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/mosquitto/log"
        ];
      };
    };

    virtualisation.oci-containers.containers.mosquitto = {
      image = "eclipse-mosquitto:2";
      ports = [ "${toString registry.ports.mqtt}:${toString registry.ports.mqtt}" ];
      volumes = [
        "${mosquittoConf}:/mosquitto/config/mosquitto.conf:ro"
        "/mnt/fast/appdata/mosquitto/data:/mosquitto/data"
        "/mnt/fast/appdata/mosquitto/log:/mosquitto/log"
      ];
      extraOptions = [
        "--network=iot-net"
        "--name=mosquitto"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.mqtt ];
  };
}
