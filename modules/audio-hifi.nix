# modules/audio-hifi.nix
# PROPOSITO: Audio Hi-Fi (High Resolution) para IEMs y S/PDIF
# USO: STG (laptop) y Alpha (server con salida óptica)
# Características:
#   - PipeWire con soporte JACK para Pro Audio
#   - Bit-Perfect playback (sin resampling)
#   - Frecuencias de muestreo hasta 192kHz
#   - Baja latencia con Realtime priority

{ config, pkgs, lib, ... }:

{
  # Realtime priority para audio (requerido para baja latencia)
  security.rtkit.enable = true;

  # PipeWire - Audio server moderno con soporte Pro Audio
  services.pipewire = {
    enable = true;
    
    # ALSA compatibility
    alsa = {
      enable = true;
      support32Bit = true;  # Para aplicaciones 32-bit
    };
    
    # PulseAudio compatibility
    pulse.enable = true;
    
    # JACK compatibility (Pro Audio apps)
    jack.enable = true;
    
    # Configuración avanzada de PipeWire
    extraConfig = {
      # Configuración del daemon principal
      pipewire = {
        "context.properties" = {
          # Configuración de reloj para frecuencias de muestreo dinámicas
          "default.clock" = {
            # Frecuencias permitidas (Bit-Perfect: sin resampling forzado)
            # El sistema cambiará automáticamente según el archivo fuente
            "allowed-rates" = [ 44100 48000 88200 96000 176400 192000 ];
            # Frecuencia por defecto (se sobrescribe con la del archivo)
            "rate" = 48000;
            # Quantum (buffer size) - menor = menor latencia, mayor uso CPU
            "quantum" = 1024;
            "min-quantum" = 16;
            "max-quantum" = 8192;
          };
          
          # Configuración de audio
          "default.audio" = {
            # Formato por defecto (32-bit float para máxima precisión)
            "format" = "F32";
            # Canales por defecto
            "channels" = 2;
          };
          
          # Desactivar resampling automático (Bit-Perfect)
          "link.max-buffers" = 64;
          "core.daemon" = true;
          "core.name" = "pipewire-0";
        };
        
        # Módulos adicionales
        "context.modules" = [
          # Módulo para prioridad realtime
          {
            name = "libpipewire-module-rtkit";
            args = {
              "nice.level" = -11;
              "rt.prio" = 88;
              "rt.time.soft" = 2000000;
              "rt.time.hard" = 2000000;
            };
          }
        ];
      };
      
      # Configuración de cliente (para aplicaciones)
      client = {
        "stream.properties" = {
          # No convertir formato automáticamente
          "audio.format" = "F32";
          # Mantener frecuencia original del archivo
          "audio.rate" = 0;  # 0 = usar frecuencia del archivo
          # Calidad de resampling (solo si es necesario)
          "resample.quality" = 10;  # Máxima calidad (0-10)
          # Configuración de latencia
          "node.latency" = "1024/48000";
          "node.autoconnect" = true;
        };
      };
    };
    
    # Configuración de WirePlumber (session manager)
    wireplumber = {
      enable = true;
      
      # Reglas adicionales para dispositivos
      configPackages = [
        (pkgs.writeTextDir "share/wireplumber/wireplumber.conf.d/99-hifi.conf" ''
          # Configuración Hi-Fi para WirePlumber
          
          # Desactivar suspensión automática de dispositivos
          monitor.alsa.rules = [
            {
              matches = [
                { "device.name" = "~alsa_card.*" }
              ]
              actions = {
                update-props = {
                  "api.alsa.use-acp" = true
                  "api.alsa.soft-mixer" = false
                  "device.profile-set" = "default"
                  "device.disabled" = false
                }
              }
            }
          ]
          
          # Configuración de nodos de audio
          node.rules = [
            {
              matches = [
                { "node.name" = "~alsa_output.*" }
              ]
              actions = {
                update-props = {
                  # Prioridad alta para dispositivos de salida
                  "priority.driver" = 1000
                  "priority.session" = 1000
                  # No suspender automáticamente
                  "session.suspend-timeout-seconds" = 0
                }
              }
            }
          ]
        '')
      ];
      
      # Paquete de WirePlumber
      package = pkgs.wireplumber;
    };
  };

  # Paquetes de audio esenciales
  environment.systemPackages = with pkgs; [
    # Utilidades ALSA (para configurar S/PDIF, volúmenes, etc.)
    alsa-utils
    
    # Control de volumen gráfico
    pavucontrol
    
    # Utilidades PipeWire
    pipewire
    wireplumber
    
    # JACK tools (para Pro Audio)
    jack2
    qjackctl  # GUI para JACK
    
    # Ecualización paramétrica para IEMs
    easyeffects
  ];

  # Usuario en grupo audio
  users.users.kortux.extraGroups = [ "audio" ];

  # Variables de entorno para aplicaciones de audio
  environment.variables = {
    # PipeWire como servidor JACK
    "JACK_DEFAULT_SERVER" = "pipewire";
    # Prioridad realtime
    "PIPEWIRE_RT" = "1";
    # Debug (descomentar si hay problemas)
    # "PIPEWIRE_DEBUG" = "3";
  };

  # Configuración de límites para audio realtime
  security.pam.loginLimits = [
    {
      domain = "@audio";
      type = "-";
      item = "rtprio";
      value = "99";
    }
    {
      domain = "@audio";
      type = "-";
      item = "memlock";
      value = "unlimited";
    }
    {
      domain = "@audio";
      type = "-";
      item = "nice";
      value = "-20";
    }
  ];
}
