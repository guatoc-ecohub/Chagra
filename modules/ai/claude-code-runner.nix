# modules/ai/claude-code-runner.nix
# =============================================================================
# AI Coding Runner — agente autónomo de generación de código para Chagra (público)
#
# Decisión arquitectónica: ADR-024 (Chagra-strategy/adrs/ADR-024-claude-code-runner-arch.md).
#
# Pivot 2026-05-09: backend principal es `opencode` (no claude-code). Razones
# documentadas en queue/063 + memoria reference_bridge_telegram_runner.md.
# El nombre del módulo + servicio queda como `claude-code-runner` por
# compatibilidad operativa (refs en yaml, monitoreo, queue items). No
# valió la pena renombrar todo cuando el binario backend se cambia entre
# proveedores opacamente al runner.
#
# Responsabilidad:
#   GitHub Actions self-hosted runner que ejecuta `opencode run` cuando un PR
#   draft es etiquetado con `ready-to-generate`. opencode lee el body del Issue
#   linkeado, edita ficheros del repo Chagra, hace push a la rama de la PR.
#
# Aislación:
#   - Runner aparte (`claude-runner` user, separado de `runner` chagra-deploy
#     y `nixos-deployer` infra). NO se cruzan workspaces.
#   - Repo URL apunta SOLO a guatoc-ecohub/Chagra (público AGPL). NO acceso
#     a guatoc-nixos, chagra-pro, ni Chagra-strategy.
#   - Sin age key SOPS, sin /etc/nixos, sin /mnt/fast.
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
        Ruta al SOPS secret con auth para Anthropic API directa.
        Formato del file: `ANTHROPIC_API_KEY=<value>` (EnvironmentFile-compat).

        Pivot 2026-05-09: el bot usa `opencode/big-pickle` (free tier opencode.ai)
        que NO requiere API key. Esta option queda DESHABILITADA por default
        en serviceOverrides (no EnvironmentFile, no ReadOnlyPaths sobre el
        secret) — el secret SOPS sigue provisionado para reactivación rápida
        si el operador activa billing Anthropic.

        Para reactivar Anthropic API directa:
        1. Asegurar que el secret SOPS tiene la key Anthropic real con prefix
           `ANTHROPIC_API_KEY=sk-ant-...`.
        2. En serviceOverrides agregar:
             ReadOnlyPaths = [ cfg.anthropicKeyFile ];
             EnvironmentFile = [ cfg.anthropicKeyFile ];
        3. Cambiar el yaml workflow de Chagra para invocar `claude-code` en
           lugar de `opencode run`.
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

      # PIVOT 2026-05-09 (Bug 12 + tool-calling): el bot ahora corre `opencode`
      # (no claude-code de Anthropic). Razones:
      #   1. Operador no tiene balance Anthropic API pay-per-use.
      #   2. claude-code + GLM-4.6 vía litellm-proxy: GLM no soporta tool-call
      #      format Anthropic → emite tool calls como TEXTO (no edita archivos).
      #   3. opencode soporta multi-provider nativo + tool calling correcto.
      #   4. opencode/big-pickle (free tier built-in opencode.ai) hace tool
      #      calls reales sin auth (validado 2026-05-09 con prompt Write file).
      # Mantener claude-code en extraPackages como backup (cuando operador
      # tenga balance Anthropic, revertir el yaml a claude-code).
      extraPackages = with pkgs; [
        opencode         # CLI multi-provider con tool calling — backend principal del bot
        claude-code      # backup CLI Anthropic — útil si operador activa billing API
        nodejs_22        # actions/checkout@v4 + dependencias npm de Chagra
        git
        gh               # GitHub CLI — workflow usa para leer Issue body, postear comments
        jq               # parsing JSON output (audit transcript)
        curl
        coreutils
        bash
      ];

      user = "claude-runner";
      workDir = "/var/lib/claude-runner/work";

      serviceOverrides = {
        # Workspace efímero — el runner crea/destruye repos clones aquí.
        # NO /etc/nixos, NO /mnt/fast/appdata, NO /home/kortux.
        ReadWritePaths = [
          "/var/lib/claude-runner"
        ];

        # PIVOT 2026-05-09: removido EnvironmentFile y Environment.
        # opencode/big-pickle (free tier opencode.ai) NO requiere API key —
        # el binario maneja auth contra opencode.ai sin secrets.
        # Si el operador activa billing Anthropic API directa en el futuro,
        # agregar de vuelta:
        #   ReadOnlyPaths = [ cfg.anthropicKeyFile ];
        #   EnvironmentFile = [ cfg.anthropicKeyFile ];  # ANTHROPIC_API_KEY=...
        # Y revertir el yaml de Chagra a invocar claude-code.
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
