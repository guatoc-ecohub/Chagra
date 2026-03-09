{ config, pkgs, lib, ... }:

# =============================================================================
# AI.NIX — Stack IA Local del Nodo Alpha
# Servicios: Ollama (qwen2.5:1.5b, llama3.2:3b), wyoming-piper, wyoming-whisper
# Red interna: ai-net (10.89.3.0/24)
# Almacenamiento: /mnt/fast/appdata/<servicio> (Tier 1 SSD)
# =============================================================================

{
  # ---------------------------------------------------------------------------
  # USUARIOS Y GRUPOS AI
  # ---------------------------------------------------------------------------
  users.groups.ai = { gid = 4000; };

  users.users.ai-svc = {
    isSystemUser = true;
    uid          = 4000;
    group        = "ai";
    description  = "Usuario de servicios IA local (Ollama, Whisper, Piper)";
  };

  # ---------------------------------------------------------------------------
  # RED INTERNA PODMAN (ai-net)
  # ---------------------------------------------------------------------------
  systemd.services.podman-create-ai-net = {
    description   = "Crear red Podman ai-net para servicios AI";
    wantedBy      = [ "multi-user.target" ];
    before        = [
      "podman-ollama.service"
      "podman-wyoming-piper.service"
      "podman-wyoming-whisper.service"
    ];
    serviceConfig = {
      Type            = "oneshot";
      RemainAfterExit = true;
      ExecStart = "${pkgs.podman}/bin/podman network create --ignore ai-net";
    };
  };

  # ---------------------------------------------------------------------------
  # DIRECTORIOS (systemd-tmpfiles)
  # ---------------------------------------------------------------------------
  systemd.tmpfiles.rules = [
    "d /mnt/fast/appdata/ollama            0755 root root -"
    "d /mnt/fast/appdata/wyoming-piper     0755 root root -"
    "d /mnt/fast/appdata/wyoming-whisper   0755 root root -"
  ];

  # ---------------------------------------------------------------------------
  # CONTENEDORES OCI — IA Local
  # ---------------------------------------------------------------------------
  virtualisation.oci-containers.containers = {

    # -------------------------------------------------------------------------
    # OLLAMA — Motor de inferencia LLM local (DESHABILITADO)
    # NOTA: Usando servicio nativo services.ollama.enable en dev-environment.nix
    # para evitar conflicto de puerto 11434 (bind: address already in use)
    # -------------------------------------------------------------------------
    # ollama = {
    #   image = "ollama/ollama:latest";
    #   ports = [ "11434:11434" ];
    #   volumes = [ "/mnt/fast/appdata/ollama:/root/.ollama" ];
    #   ...
    # };
    # Ollama contenedor deshabilitado - usando servicio nativo

    # -------------------------------------------------------------------------
    # WYOMING-PIPER — TTS (Text-to-Speech)
    # Puerto: 10200
    # FIX: Añadido --voice requerido (error previo: "arguments required: --voice")
    # -------------------------------------------------------------------------
    wyoming-piper = {
      image = "rhasspy/wyoming-piper:latest";
      ports = [ "10200:10200" ];
      volumes = [
        "/mnt/fast/appdata/wyoming-piper:/data"
      ];
      # FIX: Argumentos para wyoming-piper (el entrypoint de la imagen ejecuta __main__.py)
      # La voz se descarga automáticamente si no existe
      cmd = [
        "--voice" "en_US-lessac-medium"
        "--data-dir" "/data"
        "--uri" "tcp://0.0.0.0:10200"
        "--download-dir" "/data/voices"
      ];
      extraOptions = [ "--network=ai-net" "--name=wyoming-piper" ];
    };

    # -------------------------------------------------------------------------
    # WYOMING-WHISPER — STT (Speech-to-Text)
    # Puerto: 10300
    # -------------------------------------------------------------------------
    wyoming-whisper = {
      image = "rhasspy/wyoming-whisper:latest";
      ports = [ "10300:10300" ];
      volumes = [
        "/mnt/fast/appdata/wyoming-whisper:/data"
      ];
      environment = {
        WHISPER_MODEL = "base";  # Modelos: tiny, base, small, medium, large
      };
      extraOptions = [ "--network=ai-net" "--name=wyoming-whisper" ];
    };

  };

  # ---------------------------------------------------------------------------
  # PERMISOS Y RECURSOS (ExecStartPre + cgroups estrictos)
  # FIX: Añadidas dependencias ZFS para evitar race condition en boot
  # ---------------------------------------------------------------------------
  # NOTA: podman-ollama removido - usa servicio nativo services.ollama.enable
  
  # FIX: Usar zfs.target en lugar de zfs-mount.service (deshabilitado)
  systemd.services.podman-wyoming-piper = {
    after = [ "zfs.target" "network-online.target" ];
    requires = [ "zfs.target" ];
    serviceConfig.RequiresMountsFor = [ "/mnt/fast/appdata" ];
  };
  
  systemd.services.podman-wyoming-whisper = {
    after = [ "zfs.target" "network-online.target" ];
    requires = [ "zfs.target" ];
    serviceConfig.RequiresMountsFor = [ "/mnt/fast/appdata" ];
  };

  # ---------------------------------------------------------------------------
  # FIREWALL — Puertos IA
  # NOTA: 11434 (Ollama) no incluido aquí - manejado por servicio nativo
  # ---------------------------------------------------------------------------
  networking.firewall.allowedTCPPorts = [
    10200  # Wyoming Piper (TTS)
    10300  # Wyoming Whisper (STT)
  ];
}
