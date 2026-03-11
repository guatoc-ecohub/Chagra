# lib/registry.nix
# =============================================================================
# REGISTRY CENTRAL — Inventario de puertos, UIDs y metadatos
# 
# Propósito: Prevenir colisiones y proporcionar contexto global a IA y humanos.
# 
# Reglas:
#   - Los puertos son estáticos y se asignan por bloques de categoría
#   - Los UIDs son estáticos para mapeo consistente contenedor↔host
#   - Antes de añadir un nuevo servicio, consulta este archivo
# =============================================================================

{ lib }:

rec {
  # =============================================================================
  # BLOQUE DE PUERTOS: Asignación por categoría
  # =============================================================================
  
  ports = {
    # --- 5xxx: Media Stack (*arr applications) ---
    lidarr      = 8686;  # Gestión de música
    radarr      = 7878;  # Gestión de películas  
    sonarr      = 8989;  # Gestión de series
    prowlarr    = 9696;  # Indexadores
    qbittorrent = 8083;  # Cliente BitTorrent
    navidrome   = 4533;  # Streaming de música (Subsonic API)
    slskd       = 5030;  # Soulseek P2P WebUI
    slskdP2P    = 5031;  # Soulseek P2P transfers (TCP/UDP)
    
    # --- 8xxx: Media Server & Content ---
    jellyfin    = null;  # Reservado para futuro
    
    # --- 3xxx: Observability & Data ---
    grafana     = 3000;  # Dashboards
    influxdb    = 8086;  # Base de datos temporal
    loki        = 3100;  # Log aggregation
    uptimeKuma  = 3001;  # Uptime monitoring
    
    # --- 8xxx-alt: Smart Home & IoT ---
    homeassistant = 8123;  # Home Assistant Core
    zigbee2mqtt   = 8080;  # Controlador Zigbee (Web UI)
    nodered       = 1880;  # Automatización de flujos
    
    # --- 1xxx: Messaging & Protocols ---
    mqtt        = 1883;  # Mosquitto MQTT broker
    mqtt-ssl    = 8883;  # MQTT over TLS (reservado)
    
    # --- 1xxxx: AI Services ---
    ollama      = 11434; # LLM local API
    
    # --- External Services ---
    picoclaw    = 18790; # Agente IA Telegram
    
    # --- 5xx: Protocolos industriales (reservados) ---
    modbus-tcp  = 502;   # Telemetría de energía
    
    # --- 8xxx: Agriculture ---
    farmos       = 8081;  # FarmOS gestión agrícola
    postgresFarm = 5432;  # PostgreSQL para FarmOS
    
    # --- 9xxx: Cloud Services ---
    nextcloud    = 8082;  # Nextcloud WebDAV/CalDAV
    immich       = 2283;  # Immich servidor
    immichML     = 3003;  # Immich Machine Learning

    # --- Gaming ---
    romm         = 8087;  # RomM - Retro Game ROM Manager
  };
  
  # =============================================================================
  # BLOQUE DE UIDs: Mapeo estático usuario↔contenedor
  # =============================================================================
  
  uids = {
    media = 1001;  # Lidarr, Radarr, Sonarr, Prowlarr, qBittorrent
    iot   = 1002;  # Home Assistant, Node-RED, Mosquitto
    ai    = 1003;  # Ollama, servicios de IA
  };
  
  # =============================================================================
  # BLOQUE DE GIDs: Grupos compartidos
  # =============================================================================
  
  gids = uids;  # Por simplicidad, usamos mismos IDs para grupos
  
  # =============================================================================
  # REDES PODMAN: Configuración de subnets
  # =============================================================================
  
  networks = {
    iot-net = {
      subnet = "10.88.10.0/24";
      gateway = "10.88.10.1";
      dns_enabled = true;
    };
    media-net = {
      subnet = "10.88.20.0/24";
      gateway = "10.88.20.1";
      dns_enabled = true;
    };
    ai-net = {
      subnet = "10.88.30.0/24";
      gateway = "10.88.30.1";
      dns_enabled = true;
    };
  };
  
  # =============================================================================
  # RUTAS DE ALMACENAMIENTO: Convenciones de paths
  # =============================================================================
  
  storage = {
    fast = "/mnt/fast/appdata";   # SSD: Configuraciones de contenedores
    data = "/mnt/data/media";     # HDD: Bibliotecas de medios
    backups = "/mnt/data/backups"; # HDD: Backups
  };
  
  # =============================================================================
  # METADATOS DE SERVICIOS: Información descriptiva
  # =============================================================================
  
  services = {
    # Media
    lidarr = {
      name = "Lidarr";
      description = "Gestión de biblioteca musical";
      category = "media";
      icon = "🎵";
      dependencies = [ "prowlarr" ];  # Opcional
    };
    radarr = {
      name = "Radarr";
      description = "Gestión de biblioteca de películas";
      category = "media";
      icon = "🎬";
      dependencies = [ "prowlarr" ];
    };
    sonarr = {
      name = "Sonarr";
      description = "Gestión de biblioteca de series";
      category = "media";
      icon = "📺";
      dependencies = [ "prowlarr" ];
    };
    prowlarr = {
      name = "Prowlarr";
      description = "Gestor de indexadores";
      category = "media";
      icon = "🔍";
      dependencies = [];
    };
    qbittorrent = {
      name = "qBittorrent";
      description = "Cliente BitTorrent";
      category = "media";
      icon = "⬇️";
      dependencies = [];
    };
    navidrome = {
      name = "Navidrome";
      description = "Servidor de streaming musical";
      category = "media";
      icon = "🎧";
      dependencies = [];
    };
    slskd = {
      name = "slskd";
      description = "Cliente P2P de música Soulseek";
      category = "media";
      icon = "🎶";
      dependencies = [];
    };
  };
  
  # =============================================================================
  # HELPERS: Funciones útiles para módulos
  # =============================================================================
  
  # Verifica si un puerto está disponible
  isPortAvailable = port: !(lib.elem port (lib.attrValues ports));
  
  # Obtiene el siguiente puerto disponible en un rango
  nextAvailablePort = start: end:
    lib.findFirst (p: isPortAvailable p) null (lib.range start end);
}
