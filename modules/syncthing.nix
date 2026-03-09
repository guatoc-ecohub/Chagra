# modules/syncthing.nix
# PROPOSITO: Sincronización de archivos entre hosts
# USO: Alpha, Beta

{ config, lib, ... }:

{
  # Secrets para syncthing (cuando sops esté activo)
  # sops.secrets = {
  #   syncthing-alpha-device-id = {};
  #   syncthing-beta-device-id = {};
  #   syncthing-api-key = {};
  # };

  services.syncthing = {
    enable = true;
    user = "kortux";
    group = "users";
    dataDir = "/var/lib/syncthing";
    configDir = "/var/lib/syncthing/.config/syncthing";
    
    # Abrir puerto en firewall para LAN
    openDefaultPorts = true;
    
    settings = {
      # Configuración básica
      options = {
        urAccepted = 1;  # Aceptar uso anónimo
      };
      
      # Devices se configuran via GUI
      # o descomentar cuando sops esté listo:
      # devices = {
      #   "beta-pi" = {
      #     id = builtins.readFile config.sops.secrets.syncthing-beta-device-id.path;
      #   };
      # };
      
      folders = {
        "CriticalConfig" = {
          path = "/mnt/fast/appdata/homeassistant";
          # devices = [ "beta-pi" ];
          versioning = {
            type = "staggered";
            params = {
              cleanInterval = "3600";
              maxAge = "2592000";  # 30 días
            };
          };
        };
      };
    };
  };

  # Asegurar que el directorio existe
  systemd.tmpfiles.rules = [
    "d /var/lib/syncthing 0755 kortux users -"
    "d /var/lib/syncthing/.config 0755 kortux users -"
    "d /var/lib/syncthing/.config/syncthing 0755 kortux users -"
  ];
}
