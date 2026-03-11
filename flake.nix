{
  description = "Infraestructura Guatoc - Zero-Touch Deployment";

  inputs = {
    # Alpha usará nixpkgs-unstable para compatibilidad con sops-nix
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    nixpkgs-stable.url = "github:nixos/nixpkgs/nixos-24.11";
    
    nixos-hardware.url = "github:NixOS/nixos-hardware/master";
    
    disko.url = "github:nix-community/disko";
    disko.inputs.nixpkgs.follows = "nixpkgs";
    
    # sops-nix para gestión de secretos
    sops-nix.url = "github:Mic92/sops-nix";
    sops-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, nixpkgs-stable, disko, sops-nix, ... }@inputs:
    let
      system = "x86_64-linux";

      # Overlay con paquetes locales no disponibles en nixpkgs
      localOverlay = final: prev: {
        # Antigravity: editor de código con IA de Google
        # Derivación local en pkgs/antigravity/default.nix
        # URL: https://edgedl.me.gvt1.com/edgedl/release2/j0qc3/antigravity/stable/...
        antigravity = final.callPackage ./pkgs/antigravity/default.nix {};

        # Streamrip override con credenciales Tidal personalizadas
        streamrip = prev.streamrip.overrideAttrs (oldAttrs: {
          patches = [ ./patches/streamrip-tidal.patch ];
        });
      };

    in {
    nixosConfigurations = {

      # --- SERVIDOR ALPHA: nixos-unstable (para sops-nix) ---
      alpha = nixpkgs.lib.nixosSystem {
        inherit system;
        specialArgs = { inherit inputs; };
        modules = [
          { nixpkgs.overlays = [ localOverlay ]; }
          disko.nixosModules.disko
          sops-nix.nixosModules.sops
          ./hosts/alpha/hardware-configuration.nix
          ./hosts/alpha/disko.nix
          ./hosts/alpha/default.nix
          ./modules/common-security.nix
          ./modules/virtualization.nix
          ./modules/server-services.nix
          ./modules/iot-energy.nix
          ./modules/iot.nix          # IoT: Mosquitto, Home Assistant, Node-RED, InfluxDB, Grafana
          ./modules/media/default.nix  # Multimedia: Radarr, Sonarr, Lidarr, Prowlarr, qBittorrent, Navidrome (refactorizado)
          ./modules/ai.nix           # IA Local: Ollama, wyoming-piper, wyoming-whisper
          ./modules/music-pipeline.nix  # Music: Beets, YouTube, Nextcloud
          ./modules/experimental-agents.nix  # Picoclaw
          ./modules/homeassistant-config.nix  # Configuración de infraestructura Home Assistant
          ./modules/dev-environment.nix
          ./modules/syncthing.nix
          ./modules/audio-hifi.nix
          ./modules/tunnel-connectivity.nix
          # Nuevos dominios modulares
          ./modules/agriculture/default.nix  # Agriculture: FarmOS, PostgreSQL
          ./modules/cloud/default.nix        # Cloud: Nextcloud, Immich
          ./modules/observability/default.nix  # Observability: InfluxDB, Grafana, Sanoid
        ];
      };

      # --- LAPTOP STG: nixos-unstable (drivers AMD, Cursor) ---
      stg = nixpkgs.lib.nixosSystem {
        inherit system;
        specialArgs = { inherit inputs; };
        modules = [
          { nixpkgs.overlays = [ localOverlay ]; }
          sops-nix.nixosModules.sops
          ./hosts/stg/hardware-configuration.nix
          ./hosts/stg/default.nix
          ./modules/desktop-gaming.nix
          ./modules/common-security.nix
          ./modules/dev-environment.nix
          ./modules/virtualization.nix
          ./modules/audio-hifi.nix
        ];
      };

      # --- RASPBERRY PI (BETA) ---
      beta = nixpkgs.lib.nixosSystem {
        system = "aarch64-linux";
        specialArgs = { inherit inputs; };
        modules = [
          # No aplicamos localOverlay en beta (aarch64) — los paquetes locales son x86_64 only
          sops-nix.nixosModules.sops
          "${inputs.nixpkgs}/nixos/modules/installer/sd-card/sd-image-aarch64.nix"
          ./hosts/beta/default.nix
          ./modules/common-security.nix
          ./modules/syncthing.nix
        ];
      };
    };
  };
}
