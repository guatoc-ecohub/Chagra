# ~/guatoc-nixos/modules/common-security.nix
# PROPOSITO: Reglas de seguridad base para todos los nodos.
# INCLUYE: OpenSnitch (Firewall App), Fail2Ban, SSH Hardening, i18n es_CO.

{ config, pkgs, ... }: {

  # --- Nix: flakes y nix-command (para nix flake update, etc.) ---
  nix.settings.experimental-features = [ "nix-command" "flakes" ];

  # --- i18n (es_CO, evita errores Perl/Locale y teclado español) ---
  i18n.defaultLocale = "es_CO.UTF-8";
  i18n.extraLocaleSettings = {
    LANG = "es_CO.UTF-8";
    LC_ALL = "es_CO.UTF-8";
    LC_NUMERIC = "es_CO.UTF-8";
    LC_TIME = "es_CO.UTF-8";
    LC_MONETARY = "es_CO.UTF-8";
  };
  i18n.supportedLocales = [ "es_CO.UTF-8/UTF-8" "en_US.UTF-8/UTF-8" ];
  console.keyMap = "es";

  # Firewall de Red
  networking.firewall.enable = true;

  # Firewall de Aplicación (Te avisa qué app quiere salir a internet)
  services.opensnitch.enable = true;

  # SSH Seguro
  services.openssh = {
    enable = true;
    settings = {
      PasswordAuthentication = false; # Solo llaves
      PermitRootLogin = "no";
    };
  };

  # Bloqueo de IPs maliciosas
  services.fail2ban.enable = true;

  # Auditoría
  security.auditd.enable = true;
}