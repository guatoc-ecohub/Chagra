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

    interfaces.enp3s0.ipv4.addresses = [{
      address = "192.168.1.100";
      prefixLength = 24;
    }];
    
    firewall = {
      enable = true;
      allowedTCPPorts = [
        80      # HTTP (Nginx - PWA + API Gateway + Cloudflare Tunnel)
        22      # SSH
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
        allowedTCPPorts = [ 80 8123 1883 5000 8554 8555 5030 5031 8086 1880 3000 8081 ];
        allowedUDPPorts = [ 5353 8555 ];
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
