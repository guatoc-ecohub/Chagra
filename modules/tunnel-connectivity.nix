# modules/tunnel-connectivity.nix
# PROPOSITO: Cloudflare Tunnel para acceso seguro sin abrir puertos
# USO: Alpha, STG
# SEGURIDAD: Zero Trust, sin puertos expuestos
# INGRESS: Solo servicios públicos (fotos, web), HA/Frigate solo local

{ config, pkgs, lib, ... }:

{
  # Cloudflare Tunnel - configuración por host
  # Cada host define sus propios tunnels en su default.nix
  # Este módulo solo habilita el servicio base
  
  services.cloudflared.enable = lib.mkDefault false;
  
  # Crear directorio para credentials
  systemd.tmpfiles.rules = lib.mkIf config.services.cloudflared.enable [
    "d /var/lib/cloudflared 0700 root root -"
  ];

  # --- CONFIGURACIÓN DE INGRESS PARA TUNNEL ---
  # Esta configuración se usa cuando el tunnel se configura con config file
  # En lugar de token-only mode
  #
  # REGLAS DE INGRESS:
  # - fotos.guatoc.co -> Immich (puerto 2283)
  # - web.guatoc.co -> CMS/Web estático (puerto 80)
  # - Home Assistant y Frigate NO se exponen (solo acceso local)
  # - Cualquier otra ruta -> 404
  #
  # Ejemplo de configuración (descomentar si usas config file mode):
  #
  # services.cloudflared.tunnels."guatoc-tunnel" = {
  #   credentialsFile = "/var/lib/cloudflared/credentials.json";
  #   ingress = {
  #     rules = [
  #       {
  #         hostname = "fotos.guatoc.co";
  #         service = "http://127.0.0.1:2283";
  #       }
  #       {
  #         hostname = "web.guatoc.co";
  #         service = "http://127.0.0.1:80";
  #       }
  #       {
  #         # Catch-all: rechazar todo lo demás con 404
  #         service = "http_status:404";
  #       }
  #     ];
  #   };
  # };
  #
  # NOTA: Para usar este modo, necesitas:
  # 1. Crear el tunnel en Cloudflare Zero Trust Dashboard
  # 2. Descargar el credentials.json
  # 3. Guardarlo en /var/lib/cloudflared/credentials.json (usar sops-nix)
  #
  # Alternativa actual: Usar TUNNEL_TOKEN en hosts/alpha/default.nix
  # El token mode NO permite custom ingress rules desde NixOS,
  # las reglas se configuran en el Dashboard de Cloudflare Zero Trust.
}
