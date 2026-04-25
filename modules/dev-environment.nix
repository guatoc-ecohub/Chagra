# PROPOSITO: Desarrollo IA Local (Ollama), Ingeniería IoT y Editores Pro.
# guatoc-nixos/modules/dev-environment.nix
{ config, pkgs, lib, ... }: {

  # --- IA LOCAL (Ollama) --- 
  # Solo habilitar servicio nativo si NO se usa el contenedor guatoc.ai.ollama
  # Check if guatoc.ai module is loaded before accessing its options
  services.ollama = let
    # Use config ? to check if option exists before accessing
    ollamaContainerEnabled = if config ? guatoc && config.guatoc ? ai && config.guatoc.ai ? ollama 
      then config.guatoc.ai.ollama.enable or false 
      else false;
  in lib.mkIf (!ollamaContainerEnabled) {
    enable = true;
    host = "0.0.0.0";
    # Descargar modelo por defecto al arrancar
    loadModels = [ "qwen2.5:3b" ];
  };

  # --- DIRENV para VSCode ---
  programs.direnv = {
    enable = true;
    nix-direnv.enable = true;
    # Paquete explícito para VSCode extension compatibility
    package = pkgs.direnv;
  };

  # --- PAQUETES DE SISTEMA ---
  environment.systemPackages = with pkgs; [
    # Cursor: En Nixpkgs el nombre correcto suele ser code-cursor
    code-cursor

    # VSCode FHS: Para que Continue y PlatformIO funcionen sin errores de permisos
    (vscode-fhsWithPackages (ps: with ps; [
      zlib
      openssl
      stdenv.cc.cc
      python3
      nodejs
      platformio
      gcc
      gnumake
    ]))

    # --- Node.js 22 + Claude Code (alias temporal sin instalación global) ---
    nodejs_22
    (writeShellScriptBin "claude-code" ''
      exec "${nodejs_22}/bin/npx" --yes "@anthropic-ai/claude-code" "$@"
    '')

    # --- OpenAI Codex CLI (delegación de tareas Chagra, conviviendo con Claude) ---
    codex

    # --- Herramientas de Desarrollo ---
    git
    gh
    wget
    python311
    binutils

    # --- IoT y Agricultura ---
    picocom
    mosquitto
    avrdude
    usbutils
    libusb1

    # --- Redes ---
    wireshark
  ]
  # --- ROCm: monitoreo GPU AMD (Vega) para IA (solo x86_64 Linux con rocmPackages disponible) ---
  ++ (lib.optionals (pkgs.stdenv.isx86_64 && pkgs.stdenv.isLinux && 
                     builtins.hasAttr "rocmPackages" pkgs) (
    lib.optionals (builtins.hasAttr "rocminfo" pkgs.rocmPackages) [ pkgs.rocmPackages.rocminfo ]
    ++ lib.optionals (builtins.hasAttr "rocm-smi" pkgs.rocmPackages) [ pkgs.rocmPackages.rocm-smi ]
  ));

  # --- CONFIGURACIÓN DE SEGURIDAD Y HARDWARE ---
  users.users.kortux.extraGroups = [
    "wireshark"
    "dialout"
    "tty"
    "storage"
    "video"
    "render"
  ];

  programs.wireshark.enable = true;

  # --- GPU AMD (Vega/Renoir): Ollama y ROCm reconocen la iGPU ---
  systemd.globalEnvironment.HSA_OVERRIDE_GFX_VERSION = "9.0.0";
  environment.variables = {
    HSA_OVERRIDE_GFX_VERSION = "9.0.0";
    OLLAMA_GPU_OVERHEAD = "1";
  };
}
