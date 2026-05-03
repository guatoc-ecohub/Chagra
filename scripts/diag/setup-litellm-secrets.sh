#!/usr/bin/env bash
# scripts/diag/setup-litellm-secrets.sh
# =============================================================================
# Setup operacional para LiteLLM proxy (Claude Code backup).
# Generado 2026-05-02 — feat/litellm-proxy-claude-code-backup branch.
#
# CORRER UNA VEZ desde stg (NO desde alpha) antes de hacer nixos-rebuild.
# Requiere: sops + age key configurados + branch de la feature checkout.
# =============================================================================

set -euo pipefail

NIXOS_DIR="${NIXOS_DIR:-$HOME/Workspace/guatoc-nixos}"
SECRETS_FILE="$NIXOS_DIR/hosts/alpha/secrets.yaml"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "Error: $SECRETS_FILE no existe. Verificar path NIXOS_DIR."
  exit 1
fi

# 1) Generar master key para LiteLLM (auth admin endpoints)
echo "=== Paso 1: Generando LITELLM_MASTER_KEY ==="
MASTER_KEY="sk-$(openssl rand -hex 32)"
echo "Master key generada (no mostrar)."
echo

# 2) Verificar que openfang-zai-env existe — necesitamos copiar el ZAI_API_KEY
echo "=== Paso 2: Verificando openfang-zai-env (fuente de ZAI_API_KEY) ==="
if grep -q "openfang-zai-env:" "$SECRETS_FILE"; then
  echo "✓ openfang-zai-env encontrado — copiar el VALOR al nuevo litellm-zai-env."
else
  echo "✗ openfang-zai-env NO encontrado. Necesitas configurarlo primero."
  echo "  Formato esperado en secrets.yaml:"
  echo "    openfang-zai-env: |"
  echo "      ZAI_API_KEY=eyJhbGc..."
  exit 1
fi

# 3) Editar secrets.yaml con sops
echo
echo "=== Paso 3: Agregar litellm-zai-env + litellm-master-key a SOPS ==="
echo "Cuando se abra sops:"
echo
echo "  1. Encontrar el VALOR de ZAI_API_KEY dentro de openfang-zai-env"
echo "     (decoded por sops automáticamente al abrir)"
echo
echo "  2. Agregar dos entradas nuevas al final del archivo:"
echo
echo "     litellm-zai-env: |"
echo "       ZAI_API_KEY=<MISMO_VALOR_QUE_OPENFANG_ZAI_ENV>"
echo
echo "     litellm-master-key: |"
echo "       LITELLM_MASTER_KEY=$MASTER_KEY"
echo
echo "  3. Guardar y salir (sops re-encripta)"
echo
echo "Presioná ENTER para abrir sops…"
read -r

sops "$SECRETS_FILE"

# Verificar que ambos secrets fueron agregados
echo
echo "=== Verificando secrets agregados ==="
if grep -q "litellm-zai-env:" "$SECRETS_FILE" && grep -q "litellm-master-key:" "$SECRETS_FILE"; then
  echo "✓ litellm-zai-env y litellm-master-key encontrados en secrets.yaml"
else
  echo "✗ Faltó agregar uno o ambos secrets. Re-correr el script."
  exit 1
fi

# 4) Commit + push
echo
echo "=== Paso 4: Commit cambios secrets.yaml ==="
cd "$NIXOS_DIR"
if git diff --quiet -- "$SECRETS_FILE"; then
  echo "Sin cambios para commit (¿ya estaba agregado?)."
else
  git add hosts/alpha/secrets.yaml
  git commit -m "feat(secrets): añadir litellm-master-key para LiteLLM proxy"
  echo "✓ Commit creado. Push manual con: git push"
fi

# 5) Pasos siguientes
echo
echo "=== Pasos siguientes (operador ejecuta) ==="
cat <<'EOF'

1. Push del branch:
   git push -u origin feat/litellm-proxy-claude-code-backup

2. Merge del PR (auto-creado o manual via gh CLI).

3. En alpha aplicar la nueva config:
   ssh alpha 'cd /etc/nixos && sudo nixos-rebuild switch --flake .#alpha'
   # O desde stg:
   nixos-rebuild switch --flake .#alpha --target-host kortux@alpha --use-remote-sudo

4. Verificar que el servicio arrancó:
   ssh alpha 'systemctl status litellm-proxy'
   ssh alpha 'journalctl -u litellm-proxy -n 30'

5. Smoke test desde stg (vía Tailscale):
   curl http://alpha.tailnet:4000/health
   curl http://alpha.tailnet:4000/v1/models -H "Authorization: Bearer $LITELLM_MASTER_KEY"

6. Configurar Claude Code CLI:
   # En ~/.zshrc o ~/.bashrc de stg:
   export ANTHROPIC_BASE_URL="http://alpha.tailnet:4000"
   export ANTHROPIC_API_KEY="sk-bypass-anything"  # ignorado por proxy

   # Recargar shell + smoke test:
   source ~/.zshrc
   claude --version  # debería responder, no requiere Internet directo a anthropic

7. Test funcional:
   echo "Hola, ¿qué LLM eres?" | claude
   # Esperado: respuesta de GLM-4.6 vía z.ai (puede ser obvia que no es Claude
   # real — eso es OK, el objetivo es que Claude Code CLI funcione como CLI
   # con un backend alternativo).

EOF

echo "✓ Setup LiteLLM secrets completado."
