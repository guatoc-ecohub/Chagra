# modules/automation/nodered.nix
# =============================================================================
# NODE-RED — Visual flow automation
# Port: 1880
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.automation.nodered;
  autoCfg = config.guatoc.automation;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.automation.nodered = {
    enable = lib.mkEnableOption "Node-RED - Automatización de flujos visuales" // {
      default = false;
    };
  };

  config = lib.mkIf (autoCfg.enable && cfg.enable) {
    systemd.services.podman-nodered = {
      after = [ "zfs.target" "network-online.target" "podman-create-iot-net.service" ];
      requires = [ "zfs.target" "podman-create-iot-net.service" ];
      serviceConfig = {
        RequiresMountsFor = [ "/mnt/fast/appdata" ];
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/nodered"
          "${pkgs.coreutils}/bin/chown -R 1000:1000 /mnt/fast/appdata/nodered"
        ];
      };
    };

    virtualisation.oci-containers.containers.nodered = {
      image = "nodered/node-red:latest";
      ports = [ "${toString registry.ports.nodered}:${toString registry.ports.nodered}" ];
      volumes = [
        "/mnt/fast/appdata/nodered:/data"
      ];
      environment = {
        TZ = config.time.timeZone;
      };
      extraOptions = [
        "--network=iot-net"
        "--name=nodered"
      ];
    };

    networking.firewall.allowedTCPPorts = [ registry.ports.nodered ];
  };
}
