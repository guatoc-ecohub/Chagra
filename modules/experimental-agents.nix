# modules/experimental-agents.nix
# PROPOSITO: Agentes IA aislados (Picoclaw/OpenClaw) para clima y estado del sistema.
# USO: Alpha, STG, Beta (x86 y ARM). NO para navegación bancaria.
# Seguridad: DynamicUser, firewall de red, variables de entorno seguras

{ config, pkgs, lib, ... }:

let
  # Picoclaw v0.2.0 - formato tar.gz para Linux
  picoclaw-src = pkgs.fetchurl {
    url = "https://github.com/sipeed/picoclaw/releases/download/v0.2.0/picoclaw_Linux_${if pkgs.stdenv.hostPlatform.isx86_64 then "x86_64" else if pkgs.stdenv.hostPlatform.isAarch64 then "arm64" else pkgs.stdenv.hostPlatform.system}.tar.gz";
    sha256 = "sha256-bP+RgvrQ6B4nsF8vpdK5n1KiitSAFoK0/8cqM0KyNvY="; # TODO: Update after first build failure
  };

  # Paquete de Picoclaw: extraer el binario del tar.gz
  picoclaw-pkg = pkgs.runCommand "picoclaw-pkg" { nativeBuildInputs = [ pkgs.gnutar ]; } ''
    mkdir -p $out/bin
    tar -xzf ${picoclaw-src} -C $out/bin
    chmod +x $out/bin/picoclaw
  '';

  # Lidarr CLI - Script para gestión de descargas de música
  lidarr-cli = pkgs.writeShellScriptBin "lidarr-cli" ''
    set -euo pipefail

    BANDA="''${1:-}"
    if [ -z "$BANDA" ]; then
      echo "Error: Debes proporcionar el nombre de una banda"
      echo "Uso: lidarr-cli \"Nombre de la banda\""
      exit 1
    fi

    API_KEY_FILE="/var/lib/picoclaw/.lidarr_api_key"
    if [ ! -f "$API_KEY_FILE" ]; then
      echo "Error: No se encontró el archivo de API key en $API_KEY_FILE"
      exit 1
    fi

    API_KEY=$(cat "$API_KEY_FILE")
    LIDARR_URL="http://localhost:8686/api/v1"

    # Paso 1: Buscar la banda
    echo "Buscando: $BANDA..."
    SEARCH_RESULT=$(curl -s -H "X-Api-Key: $API_KEY" \
      "$LIDARR_URL/artist/lookup?term=$(echo "$BANDA" | ${pkgs.jq}/bin/jq -sRr @uri)")

    # Verificar si se encontró resultado
    ARTIST=$(echo "$SEARCH_RESULT" | ${pkgs.jq}/bin/jq -r '.[0] // empty')
    if [ -z "$ARTIST" ] || [ "$ARTIST" = "null" ]; then
      echo "Error: No se encontró la banda '$BANDA' en la base de datos de Lidarr"
      exit 1
    fi

    ARTIST_NAME=$(echo "$ARTIST" | ${pkgs.jq}/bin/jq -r '.artistName')
    echo "Encontrado: $ARTIST_NAME"

    # Paso 2: Modificar JSON con campos requeridos
    MODIFIED_ARTIST=$(echo "$ARTIST" | ${pkgs.jq}/bin/jq '
      .qualityProfileId = 1 |
      .metadataProfileId = 1 |
      .rootFolderPath = "/data/music" |
      .monitored = true |
      .addOptions = {
        "searchForMissingAlbums": true,
        "monitor": "all"
      }
    ')

    # Paso 3: Añadir artista a Lidarr
    echo "Añadiendo a Lidarr..."
    RESPONSE=$(curl -s -X POST \
      -H "Content-Type: application/json" \
      -H "X-Api-Key: $API_KEY" \
      -d "$MODIFIED_ARTIST" \
      "$LIDARR_URL/artist")

    # Verificar respuesta
    if echo "$RESPONSE" | ${pkgs.jq}/bin/jq -e '.id' > /dev/null 2>&1; then
      echo "Éxito: La discografía de $ARTIST_NAME se ha añadido a la cola de Lidarr"
      echo "Lidarr buscará automáticamente los álbumes mediante Prowlarr"
    else
      ERROR=$(echo "$RESPONSE" | ${pkgs.jq}/bin/jq -r '.message // "Error desconocido"')
      echo "Error al añadir artista: $ERROR"
      exit 1
    fi
  '';

  # Contenido de la Skill para Picoclaw
  # NOTA: Usamos ruta completa porque el PATH de shell en Picoclaw es limitado
  gestorMediosSkill = pkgs.writeText "gestor_medios.md" ''
    ---
    name: GestorDeDescargasLidarr
    description: Busca y añade discografías completas de artistas o bandas de música a la cola de descargas automatizada del servidor.
    tools:
      - shell
    system: |
      Eres un asistente de gestión de medios musicales. Cuando el usuario pida descargar música o buscar una banda, DEBES usar la herramienta shell para ejecutar:
      ${lidarr-cli}/bin/lidarr-cli "Nombre exacto de la banda"
      No uses Python, wget, curl ni otras herramientas. Solo lidarr-cli.
    ---
    Tienes a tu disposición el comando lidarr-cli en la ruta ${lidarr-cli}/bin/lidarr-cli. Cuando el usuario pida descargar música, discografías o buscar una banda específica, DEBES usar la herramienta de shell para ejecutar estrictamente esto:

    ${lidarr-cli}/bin/lidarr-cli "Nombre exacto de la banda"

    No intentes descargar los archivos manualmente con Python ni wget. Usa esta herramienta. Devuelve al usuario la salida de la terminal para confirmar.
  '';

  # Skill para control de LEDs RGB vía OpenRGB
  # NOTA: Usamos ruta completa porque el PATH de shell en Picoclaw es limitado
  lucesServidorSkill = pkgs.writeText "luces_servidor.md" ''
    ---
    name: ControlLucesServidor
    description: Controla, cambia el color o apaga las luces LED RGB de la placa base y el hardware del servidor Alpha.
    tools:
      - shell
    system: |
      Eres un asistente de control de hardware RGB. Cuando el usuario pida cambiar las luces del servidor o apagarlas, DEBES usar la herramienta shell con openrgb.
      Rutas completas:
      - Apagar: ${pkgs.openrgb}/bin/openrgb -m direct -c 000000
      - Color: ${pkgs.openrgb}/bin/openrgb -c HEXCODE
      - Default: ${pkgs.openrgb}/bin/openrgb -p default
    ---
    Tienes acceso al comando openrgb en la ruta ${pkgs.openrgb}/bin/openrgb. Cuando el usuario te pida cambiar el color de las luces del servidor o apagarlas, DEBES usar la herramienta de shell con la RUTA COMPLETA al ejecutable.

    Para apagar todas las luces, ejecuta estrictamente: ${pkgs.openrgb}/bin/openrgb -m direct -c 000000

    Para cambiar a un color específico, convierte el color solicitado a código HEX (sin el símbolo #) y ejecuta: ${pkgs.openrgb}/bin/openrgb -c HEXCODE (ejemplo para rojo: ${pkgs.openrgb}/bin/openrgb -c FF0000).

    Para restaurar el modo arcoíris o por defecto, ejecuta: ${pkgs.openrgb}/bin/openrgb -p default

    Tras ejecutar el comando, confirma al usuario que las luces del hardware han sido ajustadas.
  '';

  cfg = config.services.experimental-agents;
in
{
  options.services.experimental-agents = {
    enable = lib.mkEnableOption "Agentes IA experimentales aislados (Picoclaw/OpenClaw)";
    
    enablePicoclaw = lib.mkEnableOption "Picoclaw - Agente de clima y sistema";
    enableOpenclaw = lib.mkEnableOption "OpenClaw - Agente avanzado";
    
    allowedIPs = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [ "0.0.0.0/0" "127.0.0.1" ];
      description = "IPs permitidas para conexiones salientes";
    };
    
    blockedIPs = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [ "192.168.0.0/16" "10.0.0.0/8" "172.16.0.0/12" ];
      description = "IPs bloqueadas (LAN privada)";
    };
  };

  config = lib.mkIf cfg.enable {
    environment.systemPackages = [ picoclaw-pkg lidarr-cli ];

    # =====================
    # Picoclaw Service
    # =====================
    # Usuario fijo para Picoclaw (evita problemas de permisos con DynamicUser)
    # FIX: Cambiado a uid 2001 porque 2000 está usado por iot
    users.users.picoclaw = {
      isSystemUser = true;
      uid = 2001;
      group = "picoclaw";
      home = "/var/lib/picoclaw";
      createHome = true;
    };
    users.groups.picoclaw = { gid = 2001; };

    # Crear directorios con permisos correctos antes de que el servicio arranque
    systemd.tmpfiles.rules = [
      "d /var/lib/picoclaw 0750 picoclaw picoclaw -"
      "d /var/lib/picoclaw/.picoclaw 0750 picoclaw picoclaw -"
      "d /var/lib/picoclaw/.picoclaw/workspace 0750 picoclaw picoclaw -"
    ];

    systemd.services.picoclaw = lib.mkIf cfg.enablePicoclaw {
      description = "Picoclaw - Agente IA ligero";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];

      path = with pkgs; [
        # Herramientas base y manipulación
        coreutils gnugrep findutils gawk gnused
        # Red, APIs y parseo
        curl wget jq yq
        # Domótica y mensajería
        mosquitto
        # Diagnóstico
        procps lm_sensors iputils dnsutils
        # Entorno Python con baterías incluidas para IoT/APIs
        (python3.withPackages (ps: with ps; [ requests pyyaml paho-mqtt ]))
        # Script puente personalizado para Lidarr
        lidarr-cli
        # Control de LEDs RGB de la placa base
        openrgb
      ];

      serviceConfig = {
        User = "picoclaw";
        Group = "picoclaw";
        StateDirectory = "picoclaw";
        StateDirectoryMode = "0750";
        WorkingDirectory = "/var/lib/picoclaw";
        Environment = [
          "OPENAI_BASE_URL=https://openrouter.ai/api/v1"
          "PATH=/run/current-system/sw/bin:/nix/store/2j2b92x239pyx4gv781y5901sj8ljnm5-openrgb-1.0rc2/bin:/usr/bin:/bin"
        ];
        EnvironmentFile = "/var/secrets/picoclaw.env";

        IPAddressDeny = cfg.blockedIPs;
        IPAddressAllow = cfg.allowedIPs;
        
        # FIX: Permitir ejecución de comandos del sistema
        NoNewPrivileges = false;  # Permitir ejecución de comandos con privilegios normales
        PrivateTmp = true;
        ProtectSystem = "false";  # Deshabilitar para permitir acceso a binarios del sistema
        ProtectHome = false;      # Permitir acceso necesario
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;

        ReadWritePaths = [ "/var/lib/picoclaw" "/var/cache/picoclaw" ];
        ReadOnlyPaths = [ "/etc/os-release" "/etc/machine-id" "/run/current-system" ];
        
        # Permitir acceso a dispositivos I2C para OpenRGB
        DeviceAllow = [ "/dev/i2c-* rw" "/dev/ttyUSB* rw" ];
      };

      environment = {
        HOME = "/var/lib/picoclaw";
        PICOCLAW_WORKSPACE = "/var/lib/picoclaw/.picoclaw/workspace";
      };

      # Pre-start: preparar directorios y copiar skills
      preStart = ''
        export HOME=/var/lib/picoclaw
        # Crear estructura de directorios con permisos correctos
        ${pkgs.coreutils}/bin/mkdir -p "$HOME/.picoclaw/workspace/skills"
        ${pkgs.coreutils}/bin/chown -R picoclaw:picoclaw "$HOME/.picoclaw"
        # Copiar skill de Lidarr usando install para forzar permisos
        ${pkgs.coreutils}/bin/install -m 644 -o picoclaw -g picoclaw \
          ${gestorMediosSkill} "$HOME/.picoclaw/workspace/skills/gestor_medios.md"
        # Copiar skill de control de luces RGB
        ${pkgs.coreutils}/bin/install -m 644 -o picoclaw -g picoclaw \
          ${lucesServidorSkill} "$HOME/.picoclaw/workspace/skills/luces_servidor.md"
      '';

      script = ''
        export HOME=/var/lib/picoclaw
        
        # 1. Inyección forzada de variables de entorno para enrutar el tráfico
        export OPENAI_BASE_URL="https://openrouter.ai/api/v1"
        export OPENAI_API_BASE="https://openrouter.ai/api/v1"
        export OPENROUTER_API_KEY="$OPENROUTER_API_KEY"
        
        # 2. Archivo de configuración con system prompt
        # NOTA: Usamos system_prompt para instruir al LLM sobre herramientas disponibles
        cat > "$HOME/.picoclaw/config.json" << EOF
    {
      "agents": {
        "list": [
          {
            "id": "main",
            "name": "Alpha Assistant",
            "description": "Asistente del servidor Alpha con control de luces RGB y gestión de medios",
            "model_name": "gemini-flash",
            "workspace": "$HOME/.picoclaw/workspace",
            "system_prompt": "Eres el asistente del servidor Alpha.\n\nHERRAMIENTAS DISPONIBLES:\n\n1. Control de luces RGB (usar tool 'fetch'):\n   - Apagar luces: GET http://127.0.0.1:18791/lights/off\n   - Cambiar color: GET http://127.0.0.1:18791/lights/COLOR (ej: GET /lights/FF0000 para rojo, FFFF00 para amarillo)\n   - Modo default: GET http://127.0.0.1:18791/lights/default\n   - LIMITACIÓN: Solo colores estáticos. NO se pueden hacer efectos intermitentes, animaciones o bucles.\n\n2. Gestión de música (Lidarr, usar tool 'exec'):\n   - Añadir artista: /run/current-system/sw/bin/lidarr-cli \"Nombre de la banda\"\n\nREGLAS IMPORTANTES:\n- Para luces RGB: USA SIEMPRE la herramienta 'fetch' con GET a las URLs del API\n- Si el usuario pide efectos animados (intermitente, pulso, etc.), explica que solo se pueden colores estáticos\n- Para música: USA la herramienta 'exec' con la ruta completa de lidarr-cli\n- NUNCA uses tool 'exec' para comandos de luces RGB - usa SIEMPRE 'fetch' al API\n- NO crees scripts, bucles ni comandos complejos para luces\n- Confirma al usuario el resultado de cada acción",
            "skills": [
              "$HOME/.picoclaw/workspace/skills/gestor_medios.md",
              "$HOME/.picoclaw/workspace/skills/luces_servidor.md"
            ]
          }
        ],
        "defaults": {
          "workspace": "$HOME/.picoclaw/workspace",
          "model_name": "gemini-flash",
          "max_tokens": 8192,
          "temperature": 0.7,
          "max_tool_iterations": 20
        }
      },
      "model_list": [
        {
          "model_name": "gemini-flash",
          "model": "openrouter/google/gemini-2.0-flash-001",
          "api_key": "$OPENROUTER_API_KEY",
          "base_url": "https://openrouter.ai/api/v1"
        }
      ],
      "channels": {
        "telegram": {
          "enabled": true,
          "token": "$TELEGRAM_BOT_TOKEN",
          "allow_from": ["208512105"]
        }
      }
    }
EOF

        exec ${picoclaw-pkg}/bin/picoclaw gateway
      '';
    };

    # =====================
    # OpenClaw Service (placeholder)
    # =====================
    systemd.services.openclaw = lib.mkIf cfg.enableOpenclaw {
      description = "OpenClaw - Agente IA avanzado";
      after = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];

      serviceConfig = {
        DynamicUser = true;
        StateDirectory = "openclaw";
        IPAddressDeny = cfg.blockedIPs;
        IPAddressAllow = cfg.allowedIPs;
        NoNewPrivileges = true;
        PrivateTmp = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        RestrictNamespaces = true;
        ReadWritePaths = [ "/var/lib/openclaw" ];
        ReadOnlyPaths = [ "/etc/os-release" "/etc/machine-id" ];
      };
      
      script = ''
        echo "OpenClaw not yet implemented"
        exit 1
      '';
    };
  };
}
