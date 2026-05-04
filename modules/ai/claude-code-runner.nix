# modules/ai/claude-code-runner.nix
# =============================================================================
# Claude Code Runner — agente autónomo de generación de código para Chagra (público)
#
# Decisión arquitectónica: ADR-024 (Chagra-strategy/adrs/ADR-024-claude-code-runner-arch.md).
#
# Responsabilidad:
#   GitHub Actions self-hosted runner que ejecuta Claude Code CLI cuando un PR
#   draft es etiquetado con `ready-to-generate`. Claude lee el body del Issue
#   linkeado, edita ficheros del repo Chagra, hace push a la rama de la PR.
#
# Aislación:
#   - Runner aparte (`claude-runner` user, separado de `runner` chagra-deploy
#     y `nixos-deployer` infra). NO se cruzan workspaces.
#   - Repo URL apunta SOLO a guatoc-ecohub/Chagra (público AGPL). NO acceso
#     a guatoc-nixos, chagra-pro, ni Chagra-strategy.
#   - Sin age key SOPS, sin /etc/nixos, sin /mnt/fast. Solo lee el secret
#     claude-code-anthropic-key para invocar la API.
#   - Service-account GitHub `guatoc-claude-bot` con PAT scope mínimo
#     (contents:write + pull_requests:write + issues:read), branch protection
#     bloquea merge directo a main.
#
# Hardening v1 (este módulo): aislación de usuario + repo scope + secrets mínimos.
# Hardening v2 (planeado): network firewall allowlist, ZFS quota workspace,
# audit chain comments automatizados.
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.claudeCodeRunner;
in
{
  options.guatoc.ai.claudeCodeRunner = {
    enable = lib.mkEnableOption "Claude Code Runner — coding agent autónomo (Chagra público)";

    repoUrl = lib.mkOption {
      type = lib.types.str;
      default = "https://github.com/guatoc-ecohub/Chagra";
      description = ''
        URL del repo donde el runner se registra. Inviolable: NUNCA apuntar
        a un repo privado (guatoc-nixos, chagra-pro, Chagra-strategy).
        ADR-020 boundary anti-leak: Claude Code opera SOLO sobre AGPL público.
      '';
    };

    tokenFile = lib.mkOption {
      type = lib.types.str;
      default = "/run/secrets/github-runner-claude-token";
      description = ''
        Ruta al token de registro del runner en GitHub. SOPS-managed.
        Generar en: github.com/guatoc-ecohub/Chagra/settings/actions/runners
        con la cuenta de service-account guatoc-claude-bot.
      '';
    };

    anthropicKeyFile = lib.mkOption {
      type = lib.types.str;
      default = "/run/secrets/claude-code-anthropic-key";
      description = ''
        Ruta al SOPS secret con la API key de Anthropic dedicada al bot.
        Formato del file: `ANTHROPIC_API_KEY=sk-ant-...` (EnvironmentFile-compat).
        Key DEBE ser dedicada (NO el plan Pro personal del operador) — separa
        rate limits y permite auditar costo del bot independientemente.
      '';
    };
  };

  config = lib.mkIf cfg.enable {
    # ─────────────────────────────────────────────
    # User dedicado — aislado de runner / nixos-deployer
    # ─────────────────────────────────────────────
    users.users.claude-runner = {
      isSystemUser = true;
      group = "claude-runner";
      description = "GitHub Actions Runner — Claude Code agent (Chagra público)";
      home = "/var/lib/claude-runner";
      createHome = true;
      # Sin extraGroups: deliberado. NO chagra-deploy (no debe escribir prod),
      # NO wheel (sin sudo), NO docker/podman, NO nixos-deployer.
    };

    users.groups.claude-runner = {};

    # ─────────────────────────────────────────────
    # Self-hosted runner registrado a Chagra
    # ─────────────────────────────────────────────
    services.github-runners.claude-code = {
      enable = true;
      url = cfg.repoUrl;
      tokenFile = cfg.tokenFile;
      name = "alpha-claude-code";

      # 2026-05-04: replace=true permite re-registrar runner con mismo nombre
      # sin colisión. Sin esto, cada nixos-rebuild que reconfigura el runner
      # falla con "A runner exists with the same name" porque GitHub mantiene
      # el registro previo aunque el unconfigure.sh haya corrido localmente.
      # GitHub elimina el zombie automáticamente y registra el nuevo.
      replace = true;

      # Label `claude-runner` es el discriminator que usa el workflow
      # claude-code-request.yml para dirigir el job a este runner aislado.
      #
      # 2026-05-03: Removido `alpha` y `nixos` de labels. Detonante: deploy.yml
      # de Chagra usa `runs-on: [self-hosted, alpha]` que matcheaba este runner
      # cuando GH lo elegía sobre chagra-deploy. claude-runner no tiene rsync
      # → deploy fallaba con exit 127 → email spam. Ahora claude-runner solo
      # responde a workflows que explícitamente piden el label `claude-runner`,
      # sin colisionar con chagra-deploy `[alpha, nixos]` ni nixos-deploy
      # `[alpha, nixos, infra]`.
      extraLabels = [ "claude-runner" ];

      extraPackages = with pkgs; [
        claude-code      # CLI oficial de Anthropic (en nixpkgs)
        nodejs_22        # requerido por actions/checkout@v4 + dependencias npm de Chagra
        git
        gh               # GitHub CLI — el workflow lo usa para leer Issue body y postear comments
        jq               # parsing JSON output de claude (--output-format json)
        curl
        coreutils
        bash
      ];

      user = "claude-runner";
      workDir = "/var/lib/claude-runner/work";

      serviceOverrides = {
        # Solo lectura del API key — NO de age key SOPS, NO de telegram-token,
        # NO de farmos-token, NO de github-runner-token.
        ReadOnlyPaths = [
          cfg.anthropicKeyFile
        ];

        # Workspace efímero — el runner crea/destruye repos clones aquí.
        # NO /etc/nixos, NO /mnt/fast/appdata, NO /home/kortux.
        ReadWritePaths = [
          "/var/lib/claude-runner"
        ];

        # Carga el API key como env var ANTHROPIC_API_KEY automáticamente.
        # claude CLI la lee de ahí. NO se expone en argv ni se loguea.
        EnvironmentFile = [
          cfg.anthropicKeyFile
        ];
      };
    };

    # ─────────────────────────────────────────────
    # Permisos del workspace (defensa idempotente)
    # ─────────────────────────────────────────────
    # FIX 2026-04-29: el módulo upstream services.github-runners usa
    # StateDirectory=github-runner/claude-code que requiere /var/lib/github-runner
    # exista como dir padre. cicd-runner.nix tiene una regla `z` (zeroes perms
    # de un dir EXISTENTE) — pero `z` NO crea el dir si falta, y como esto es
    # un módulo distinto que se monta antes/después de cicd-runner, hay race.
    # Agregamos `d` aquí para garantizar que el padre exista antes que el sub.
    # `d` es idempotente y no rompe la regla `z` de cicd-runner (tmpfiles
    # acepta múltiples rules sobre el mismo path en orden).
    systemd.tmpfiles.rules = [
      "d /var/lib/github-runner          0755 root          root          -"
      "d /var/lib/claude-runner          0700 claude-runner claude-runner -"
      "d /var/lib/claude-runner/work     0700 claude-runner claude-runner -"
      "d /var/log/claude-runner          0755 root          root          -"
    ];

    # ─────────────────────────────────────────────
    # SOPS secrets requeridos (referencia — los secretos los provisiona
    # el operador en hosts/alpha/secrets.yaml)
    # ─────────────────────────────────────────────
    # Documentado para referencia. La provisión real es manual:
    #   sops -d hosts/alpha/secrets.yaml > /tmp/s.yaml
    #   # agregar:
    #   #   github-runner-claude-token: "<token from gh actions runner registration>"
    #   #   claude-code-anthropic-key: "ANTHROPIC_API_KEY=sk-ant-..."
    #   sops -e /tmp/s.yaml > hosts/alpha/secrets.yaml
    #   shred /tmp/s.yaml
    sops.secrets = lib.mkIf cfg.enable {
      "github-runner-claude-token" = {
        owner = "claude-runner";
        group = "claude-runner";
        mode = "0400";
      };
      "claude-code-anthropic-key" = {
        owner = "claude-runner";
        group = "claude-runner";
        mode = "0400";
      };
    };
  };
}
