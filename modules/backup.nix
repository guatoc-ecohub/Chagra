{ config, pkgs, ... }: {
  # En Alpha (Servidor Principal)
  services.syncthing = {
    enable = true;
    user = "kortux";
    dataDir = "/home/kortux"; 
    overrideDevices = true;     
    overrideFolders = true;
    settings = {
      devices = {
        "beta-pi" = { id = "ID-DE-LA-PI-AQUI"; }; # Lo obtendrás al iniciar la Pi
      };
      folders = {
        "CriticalConfig" = {
          path = "/var/lib/hass"; # Respalda config de Home Assistant
          devices = [ "beta-pi" ];
          versioning = {
            type = "simple";
            params = { keep = "5"; };
          };
        };
        "SopsKeys" = {
          path = "/home/kortux/.config/sops"; # Respalda tus llaves de encriptación
          devices = [ "beta-pi" ];
        };
      };
    };
  };
}