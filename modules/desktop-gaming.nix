# ~/guatoc-nixos/modules/desktop-gaming.nix
# PROPOSITO: Entorno Gráfico Plasma 6 y Gaming (Steam/RetroArch).
# USO: Principalmente para STG (Laptop), opcional para Alpha.

{ pkgs, ... }: {
  # --- ENTORNOS DE ESCRITORIO ---
  services.xserver.enable = true;
  services.displayManager.sddm.enable = true;
  services.desktopManager.plasma6.enable = true;
  xdg.portal.enable = true;
  #xdg.portal.extraPortals = [ pkgs.xdg-desktop-portal-kde ];
  # --- SONIDO ---
  security.rtkit.enable = true;
  services.pipewire = {
    enable = true;
    alsa.enable = true;
    alsa.support32Bit = true;
    pulse.enable = true;
  };

  # --- GAMING ---
  programs.steam.enable = true;
  programs.gamemode.enable = true;

  environment.systemPackages = with pkgs; [
    retroarch
    pegasus-frontend
    vlc
    libva-utils # vainfo
    (brave.override {
      commandLineArgs = [
        "--password-store=basic"
        "--ozone-platform-hint=auto"
      ];
    })
    xdg-utils
    
  ];

  # --- GRÁFICOS (Vega/AMD) ---
  hardware.graphics = {
    enable = true;
    enable32Bit = true;
    extraPackages = with pkgs; [ mesa libvdpau-va-gl libva-vdpau-driver ];
  };
}