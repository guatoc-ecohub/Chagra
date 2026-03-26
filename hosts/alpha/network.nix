# hosts/alpha/network.nix
# Exclusivo para reglas de firewall, puertos y Tailscale.
{ config, pkgs, ... }: {

  # --- RED ---
  networking = {
    hostName = "alpha";
    hostId = "8425e349";
    networkmanager.enable = true;
    nameservers = [ "1.1.1.1" "8.8.8.8" ];
    defaultGateway = "192.168.1.1";
    
    firewall = {
      enable = true;
      allowedTCPPorts = [
        22      # SSH
        80      # HTTP (PWA)
        443     # HTTPS (PWA)
        8123    # Home Assistant
        1883    # Mosquitto MQTT
        5000    # Frigate
        8554    # Frigate RTSP
        8555    # Frigate WebRTC
        5030    # Soulseek (slskd WebUI)
        5031    # Soulseek (transferencias P2P)
        8086    # InfluxDB
        1880    # Node-RED
        3000    # Grafana
        8081    # FarmOS (gestión agrícola)
      ];
      allowedUDPPorts = [
        5353     # mDNS (descubrimiento Home Assistant)
        8555     # Frigate WebRTC
        41641    # Tailscale VPN (relay/bootstrap)
      ];
      
      # Permitir todo el tráfico en la interfaz Tailscale (túnel VPN seguro)
      trustedInterfaces = [ "tailscale0" ];
      
      interfaces.enp3s0 = {
        allowedTCPPorts = [ 80 443 8123 1883 5000 8554 8555 5030 5031 8086 1880 3000 8081 ];
        allowedUDPPorts = [ 5353 8555 ];
      };
    };
  };

  # --- PWA DEPLOYMENT (NGINX) ---
  services.nginx = {
    enable = true;
    virtualHosts."farmos.guatoc.co" = {
      root = "/mnt/fast/appdata/farmos-pwa";
      locations."/" = {
        tryFiles = "$uri $uri/ /index.html";
      };
      locations."/oauth/" = {
        proxyPass = "http://127.0.0.1:8081";
        extraConfig = ''
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
        '';
      };
      locations."/api/" = {
        proxyPass = "http://127.0.0.1:8081";
        extraConfig = ''
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
        '';
      };
      # Necesario para el contexto de inicio de sesión de Drupal si se requiere
      locations."/user/" = {
        proxyPass = "http://127.0.0.1:8081";
        extraConfig = ''
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
        '';
      };
    };
  };

  # --- TAILSCALE VPN (Acceso remoto privado) ---
  services.tailscale = {
    enable = true;
    useRoutingFeatures = "client";  # Permite usar la red Tailscale
    extraUpFlags = [ "--ssh" ];     # Habilita Tailscale SSH
  };
}
