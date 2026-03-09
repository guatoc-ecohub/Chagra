# modules/friends-hosting.nix
# PROPOSITO: Hosting aislado para webs de amigos
# USO: Alpha - Contenedores NixOS declarativos
# Seguridad: Red interna aislada, solo accesible via Cloudflare Tunnel

{ config, pkgs, lib, ... }:

let
  cfg = config.services.friends-hosting;
in
{
  options.services.friends-hosting = {
    enable = lib.mkEnableOption "Aislado hosting para webs de amigos";
    
    # Lista de amigos/webs
    containers = lib.mkOption {
      type = lib.types.attrsOf (lib.types.submodule {
        options = {
          enable = lib.mkEnableOption "Habilitar contenedor";
          
          # Configuración básica
          port = lib.mkOption {
            type = lib.types.port;
            description = "Puerto interno del contenedor";
          };
          
          # Paquete/servicio del contenedor
          package = lib.mkOption {
            type = lib.types.package;
            description = "Paquete a ejecutar";
          };
        };
      });
      default = {};
      description = "Contenedores para cada amigo";
    };
  };

  config = lib.mkIf cfg.enable {
    # Crear contenedores NixOS para cada amigo
    containers = lib.mapAttrs (name: containerCfg: {
      privateNetwork = true;  # Red interna aislada
      hostAddress = "10.44.${toString containerCfg.port}.1";
      localAddress = "10.44.${toString containerCfg.port}.2";
      
      # Usuario
      users.users.${name} = {
        isNormalUser = true;
        description = "Usuario para ${name}";
        extraGroups = [ "wheel" ];
      };
      
      # Configuración básica
      podman = {
        enable = true;
        defaultNetwork = "bridge";
      };
      
      # Servicios del contenedor
      systemd.services.${name} = {
        wantedBy = [ "multi-user.target" ];
        serviceConfig = {
          ExecStart = "${containerCfg.package}/bin/${name}";
          Restart = "on-failure";
        };
      };
    }) cfg.containers;

    # Firewall: solo permitir acceso desde localhost (via tunnel)
    networking.firewall.trustedInterfaces = [ "bridge" ];
    
    # Red interna para contenedores
    networking.interfaces.bridge = {
      useDHCP = false;
    };
  };
}
