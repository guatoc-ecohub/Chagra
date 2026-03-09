# modules/iot-energy.nix
# PROPOSITO: IoT y Gestión de Energía - Home Assistant + MQTT + Frigate
# USO: Alpha (servidor principal con ZFS para almacenamiento)
# Seguridad: Red aislada para IoT, acceso controlado a datos

{ config, pkgs, lib, ... }:

let
  cfg = config.services.iot-energy;
in
{
  options.services.iot-energy = {
    enable = lib.mkEnableOption "IoT Energy Management (MQTT + HA + Frigate)";
    
    # Hardware específico
    inverterType = lib.mkOption {
      type = lib.types.enum [ "deye" "solarman" "modbus" ];
      default = "deye";
      description = "Tipo de inversor solar";
    };
  };

  config = lib.mkIf cfg.enable {
    # =====================
    # 1. MQTT Broker (Mosquitto)
    # =====================
    services.mosquitto = {
      enable = true;
      
      # Listener en localhost y LAN
      settings = {
        listener = {
          "1883" = {
            # Conexiones locales
            bind_address = "127.0.0.1";
          };
          "1884" = {
            # Conexiones desde LAN - solo para dispositivos IoT de confianza
            bind_address = "10.42.0.1";
          };
        };
        
        # Autenticación anónima deshabilitada para producción
        allow_anonymous = false;
        
        # Persistence
        persistence = true;
        persistence_location = "/var/lib/mosquitto/";
      };
    };

  # =====================
  # Red IoT Segura
  # =====================
    # Crear red interna para IoT
    networking.firewall.trustedInterfaces = [ "iot" ];
    
    # Interfaces
    networking.interfaces.iot = {
      useDHCP = false;
      ipv4.addresses = [{
        address = "10.42.0.1";
        prefixLength = 24;
      }];
    };

    # Firewall - permitir MQTT desde red IoT
    networking.firewall.allowedTCPPorts = [
      1883  # MQTT
      1884  # MQTT LAN
      8123  # Home Assistant
    ];

    # =====================
    # Paquetes del sistema
    # =====================
    environment.systemPackages = with pkgs; [
      # Herramientas MQTT
      mosquitto
      mqtt-panel
      
      # Python para scripting IoT
      python3
      python3Packages.pip
      
      # Herramientas de red para IoT
      nmap
      zerotierone
    ];
  };
}
