# modules/smarthome/homeassistant.nix
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
      default = "/dev/ttyUSB0";
    };
  };

  config = lib.mkIf (smarthomeCfg.enable && cfg.enable) {
    virtualisation.oci-containers.containers.homeassistant = {
      image = "homeassistant/home-assistant:stable";
      volumes = [
        "/mnt/fast/appdata/homeassistant:/config"
        "/etc/localtime:/etc/localtime:ro"
        "${cfg.serialDevice}:${cfg.serialDevice}"
      ];
      ports = [ "${toString registry.ports.homeassistant}:8123" ];
      extraOptions = [ "--privileged" "--network=host" ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.homeassistant ];
  };
}
