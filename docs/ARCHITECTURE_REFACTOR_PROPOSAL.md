# Propuesta de Refactorización: Flake AI-Friendly & Human-Friendly

## 1. Árbol de Directorios Propuesto

```
guatoc-nixos/
├── flake.nix                    # Entry point minimalista
├── flake.lock
├── README.md
├── LICENSE
│
├── lib/                         # Librerías y utilidades compartidas
│   ├── default.nix             # Exporta todas las libs
│   ├── registry.nix            # Inventario Central (puertos, servicios, UIDs)
│   ├── helpers.nix             # Funciones helper (mkContainer, mkService, etc.)
│   └── types.nix               # Tipos personalizados para options
│
├── modules/                     # Módulos NixOS organizados por dominio
│   ├── _shared/                # Configuración compartida entre hosts
│   │   ├── default.nix
│   │   ├── networking.nix      # DNS, firewall base, VPN
│   │   ├── users.nix           # Usuarios base (kortux, root)
│   │   └── storage.nix         # ZFS, montajes base
│   │
│   ├── core/                   # Infraestructura base (siempre activo)
│   │   ├── default.nix
│   │   ├── podman.nix          # Configuración de Podman
│   │   ├── security.nix        # Firewall, fail2ban, SSH hardening
│   │   ├── logging.nix         # Journald, logrotate
│   │   └── monitoring.nix      # Prometheus Node Exporter, etc.
│   │
│   ├── smarthome/              # Domótica e IoT
│   │   ├── default.nix         # Exporta todas las opciones guatoc.smarthome.*
│   │   ├── homeassistant.nix   # Home Assistant Core
│   │   ├── homeassistant-config.nix  # Config YAML, automatizaciones
│   │   ├── mqtt.nix            # Mosquitto
│   │   ├── zigbee.nix          # Zigbee2MQTT
│   │   └── openrgb.nix         # Control de luces RGB
│   │
│   ├── media/                  # Stack de medios (arr stack)
│   │   ├── default.nix
│   │   ├── lidarr.nix          # Música
│   │   ├── radarr.nix          # Películas
│   │   ├── sonarr.nix          # Series
│   │   ├── prowlarr.nix        # Indexadores
│   │   ├── qbittorrent.nix     # Descargas
│   │   ├── navidrome.nix       # Streaming de música
│   │   └── jellyfin.nix        # (opcional futuro)
│   │
│   ├── observability/          # Métricas y logs
│   │   ├── default.nix
│   │   ├── influxdb.nix        # Base de datos temporal
│   │   ├── grafana.nix         # Dashboards
│   │   └── loki.nix            # (opcional futuro)
│   │
│   ├── automation/             # Automatización de flujos
│   │   ├── default.nix
│   │   └── nodered.nix         # Node-RED
│   │
│   ├── ai/                     # Inteligencia Artificial local
│   │   ├── default.nix
│   │   ├── ollama.nix          # LLMs
│   │   ├── whisper.nix         # STT
│   │   └── piper.nix           # TTS
│   │
│   ├── agents/                 # Agentes IA autónomos
│   │   ├── default.nix
│   │   ├── picoclaw.nix        # Agente de Telegram
│   │   └── openrgb-api.nix     # API wrapper para OpenRGB
│   │
│   └── devops/                 # Herramientas de desarrollo/ops
│       ├── default.nix
│       ├── git.nix             # Git config
│       ├── github-runner.nix   # CI/CD
│       └── devshell.nix        # nix develop environment
│
├── hosts/                       # Configuración específica por host
│   ├── alpha/                  # Servidor Ryzen (Alpha)
│   │   ├── default.nix         # Solo activa features con booleans
│   │   ├── hardware.nix        # hardware-configuration.nix
│   │   ├── disko.nix           # Particionamiento ZFS
│   │   └── secrets.yaml        # SOPS secrets
│   │
│   ├── stg/                    # Laptop Acer (STG)
│   │   ├── default.nix
│   │   ├── hardware.nix
│   │   └── secrets.yaml
│   │
│   └── beta/                   # Raspberry Pi (Beta)
│       ├── default.nix
│       └── hardware.nix
│
├── docs/                        # Documentación
│   ├── ARCHITECTURE.md         # Esta arquitectura
│   ├── SERVICES.md             # Inventario legible por humanos
│   └── ADDING_SERVICES.md      # Guía para añadir nuevos servicios
│
└── pkgs/                        # Paquetes custom
    └── antigravity/
        └── default.nix
```

---

## 2. Ejemplo de Módulo Refactorizado: Lidarr

`modules/media/lidarr.nix`:

```nix
# modules/media/lidarr.nix
# Gestión de música via Lidarr - Feature Toggle con configuración declarativa

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.media.lidarr;
  
  # Leer valores del registry central
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  # ============================================
  # OPTIONS: Feature Toggle + Configuración
  # ============================================
  options.guatoc.media.lidarr = {
    enable = lib.mkEnableOption "Lidarr - Gestión de música" // {
      default = false;
    };
    
    port = lib.mkOption {
      type = lib.types.port;
      default = registry.ports.lidarr;  # 8686 del registry
      description = "Puerto web de Lidarr";
    };
    
    dataDir = lib.mkOption {
      type = lib.types.path;
      default = "/mnt/fast/appdata/lidarr";
      description = "Directorio de configuración";
    };
    
    musicDir = lib.mkOption {
      type = lib.types.path;
      default = "/mnt/data/media/music";
      description = "Directorio de biblioteca musical";
    };
    
    downloadsDir = lib.mkOption {
      type = lib.types.path;
      default = "/mnt/data/media/downloads";
      description = "Directorio de descargas";
    };
    
    uid = lib.mkOption {
      type = lib.types.int;
      default = registry.uids.media;  # 1001
      description = "UID para el contenedor";
    };
  };
  
  # ============================================
  # CONFIG: Solo se aplica si enable = true
  # ============================================
  config = lib.mkIf cfg.enable {
    # Preparar directorios con permisos correctos
    systemd.tmpfiles.rules = [
      "d ${cfg.dataDir} 0755 ${toString cfg.uid} ${toString cfg.uid} -"
    ];
    
    # Contenedor Podman
    virtualisation.oci-containers.containers.lidarr = {
      image = "lscr.io/linuxserver/lidarr:latest";
      ports = [ "${toString cfg.port}:${toString cfg.port}" ];
      volumes = [
        "${cfg.dataDir}:/config"
        "${cfg.musicDir}:/music"
        "${cfg.downloadsDir}:/downloads"
      ];
      environment = {
        PUID = toString cfg.uid;
        PGID = toString cfg.uid;
        TZ = config.time.timeZone;
      };
      extraOptions = [ 
        "--network=media-net"  # Red aislada para media stack
        "--name=lidarr"
      ];
    };
    
    # Firewall
    networking.firewall.allowedTCPPorts = [ cfg.port ];
    
    # Metadata para el registry (auto-registro)
    guatoc.registry.services.lidarr = {
      name = "Lidarr";
      port = cfg.port;
      url = "http://localhost:${toString cfg.port}";
      category = "media";
      icon = "🎵";
    };
  };
}
```

---

## 3. Ejemplo de Host Limpio: hosts/alpha/default.nix

```nix
# hosts/alpha/default.nix
# Alpha: Servidor Ryzen con ZFS
# Solo importa módulos y activa features con booleans

{ config, pkgs, lib, ... }:

{
  imports = [
    ./hardware.nix
    ./disko.nix
  ];
  
  # ============================================
  # CORE (Infraestructura base)
  # ============================================
  guatoc.core = {
    enable = true;  # Siempre activo
    podman.enable = true;
    security.enable = true;
  };
  
  # ============================================
  # SMARTHOME (Domótica)
  # ============================================
  guatoc.smarthome = {
    homeassistant = {
      enable = true;
      openrgbIntegration = true;
    };
    mqtt.enable = true;
    zigbee.enable = false;  # TODO: Activar cuando conecte dongle
  };
  
  # ============================================
  # MEDIA (Stack *arr)
  # ============================================
  guatoc.media = {
    lidarr.enable = true;
    radarr.enable = true;
    sonarr.enable = true;
    prowlarr.enable = true;
    qbittorrent.enable = true;
    navidrome.enable = true;
  };
  
  # ============================================
  # OBSERVABILITY (Métricas)
  # ============================================
  guatoc.observability = {
    influxdb.enable = true;
    grafana.enable = true;
  };
  
  # ============================================
  # AUTOMATION (Flujos)
  # ============================================
  guatoc.automation.nodered.enable = true;
  
  # ============================================
  # AI (Inteligencia Artificial)
  # ============================================
  guatoc.ai = {
    ollama.enable = true;
    whisper.enable = true;
    piper.enable = true;
  };
  
  # ============================================
  # AGENTS (IA Autónoma)
  # ============================================
  guatoc.agents = {
    picoclaw.enable = true;
    openrgbApi.enable = true;
  };
  
  # ============================================
  # HOST-SPECIFIC (Solo para Alpha)
  # ============================================
  networking.hostName = "alpha";
  time.timeZone = "America/Bogota";
  
  # ZFS unlock remoto (específico de Alpha)
  boot.initrd.network.ssh.enable = true;
}
```

---

## 4. Estrategia para el Inventario Central

### 4.1 Estructura de `lib/registry.nix`:

```nix
# lib/registry.nix
# Inventario Central: Puertos, UIDs, y metadatos de servicios

{ lib }:

{
  # ============================================
  # PUERTOS: Asignación estática evita colisiones
  # ============================================
  ports = {
    # Media Stack
    lidarr      = 8686;
    radarr      = 7878;
    sonarr      = 8989;
    prowlarr    = 9696;
    qbittorrent = 8083;
    navidrome   = 4533;
    
    # Smart Home
    homeassistant = 8123;
    zigbee2mqtt   = 8080;
    
    # Observability
    grafana  = 3000;
    influxdb = 8086;
    
    # Automation
    nodered = 1880;
    
    # AI
    ollama = 11434;
    
    # Agents
    picoclaw      = 18790;
    openrgbApi    = 18791;
    
    # System
    mqtt      = 1883;
    ssh       = 22;
  };
  
  # ============================================
  # UIDs: IDs de usuario estáticos para mapeo
  # ============================================
  uids = {
    media = 1001;  # Lidarr, Radarr, Sonarr, etc.
    iot   = 1002;  # Home Assistant, Node-RED
    ai    = 1003;  # Ollama, etc.
  };
  
  # ============================================
  # REDES: Configuración de redes Podman
  # ============================================
  networks = {
    iot-net   = { subnet = "10.88.10.0/24"; };
    media-net = { subnet = "10.88.20.0/24"; };
    ai-net    = { subnet = "10.88.30.0/24"; };
  };
  
  # ============================================
  # SERVICIOS: Metadatos auto-registrados
  # (Se actualiza dinámicamente cuando se activa un módulo)
  # ============================================
  services = {};  # Se llena en runtime via guatoc.registry.services
}
```

### 4.2 Uso por parte de IA:

Cuando necesito añadir un nuevo servicio, consulto el registry:

```nix
# IA pregunta: ¿Qué puertos están disponibles?
# Respuesta: Revisar lib/registry.nix -> ports

# IA quiere añadir un nuevo servicio:
# 1. Busca el siguiente puerto libre en la secuencia
# 2. Añade al registry
# 3. Crea el módulo usando el puerto del registry
```

### 4.3 Documentación generada:

Podemos generar automáticamente `docs/SERVICES.md`:

```markdown
# Inventario de Servicios

| Servicio    | Puerto | URL                        | Categoría   | Hosts       |
|-------------|--------|----------------------------|-------------|-------------|
| Lidarr      | 8686   | http://localhost:8686      | Media       | alpha       |
| Home Assistant | 8123 | http://localhost:8123   | SmartHome   | alpha       |
| Grafana     | 3000   | http://localhost:3000      | Observability | alpha     |
```

---

## 5. Beneficios de esta Arquitectura

### Para Humanos:
- **Legibilidad**: Los hosts son listas de features, no definiciones complejas
- **Descubrimiento**: Fácil ver qué servicios están activos en cada host
- **Mantenimiento**: Cambios centralizados en módulos, no dispersos

### Para IA:
- **Contexto claro**: Cada módulo es autónomo y declara sus dependencias
- **Prevención de colisiones**: Registry central con puertos/UIDs asignados
- **Composabilidad**: Fácil activar/desactivar features sin romper otros
- **Documentación viva**: El código es la documentación

---

## 6. Plan de Migración (Fases)

### Fase 1: Estructura base
- Crear `lib/registry.nix`
- Crear `lib/helpers.nix` con funciones comunes
- Mover módulos existentes a nueva estructura

### Fase 2: Migrar módulos por dominio
- Migrar `media/` (Lidarr, Radarr, etc.)
- Migrar `smarthome/` (HA, MQTT, Zigbee)
- Migrar `observability/` (InfluxDB, Grafana)

### Fase 3: Refactorizar hosts
- Limpiar `hosts/alpha/default.nix`
- Limpiar `hosts/stg/default.nix`
- Actualizar `flake.nix` para importar nueva estructura

### Fase 4: Validación
- Probar cada servicio en alpha
- Documentar en `docs/SERVICES.md`
- Crear guía `docs/ADDING_SERVICES.md`
