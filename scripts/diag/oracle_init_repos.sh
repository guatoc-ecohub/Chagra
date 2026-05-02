#!/usr/bin/env bash
# oracle_init_repos.sh — Inicializa /var/lib/oracle-lab/repos/ con clones
# shallow (depth 1) de los 4 repos guatoc-ecohub. Resuelve el bug del
# git_activity collector que retorna "no_data" porque no encuentra los
# repos en el path esperado.
#
# Uso (en alpha, requiere sudo + tu user GitHub credentials):
#   cd ~/guatoc-nixos-stable && git pull && sudo bash scripts/diag/oracle_init_repos.sh
#
# Idempotente: si un repo ya está clonado, hace git pull en lugar de clone.
# Repos privados: el clone usa SUDO_USER credentials (kortux) que tiene
# acceso. oracle-lab user no tiene token GitHub propio.
set -euo pipefail

REPOS_BASE="/var/lib/oracle-lab/repos"
REPOS=("Chagra" "chagra-pro" "Chagra-strategy" "guatoc-nixos")
GITHUB_OWNER="guatoc-ecohub"
INVOKING_USER="${SUDO_USER:-kortux}"

if [ "${EUID}" -ne 0 ]; then
  echo "ERROR: ejecutar con sudo (necesita crear $REPOS_BASE + chown)" >&2
  exit 1
fi

echo "→ asegurar dir $REPOS_BASE existe (root crea, oracle-lab owner final)"
mkdir -p "$REPOS_BASE"
# Mode 0755 (no 0750) para que kortux pueda atravesarlo sin estar en grupo oracle-lab
chown oracle-lab:oracle-lab "$REPOS_BASE"
chmod 0755 "$REPOS_BASE"

for repo in "${REPOS[@]}"; do
  REPO_PATH="$REPOS_BASE/$repo"
  REPO_URL="https://github.com/$GITHUB_OWNER/$repo.git"

  if [ -d "$REPO_PATH/.git" ]; then
    echo "→ $repo ya existe, git pull (como $INVOKING_USER)"
    # Garantizar que el invoking user tenga write durante el pull
    chown -R "$INVOKING_USER" "$REPO_PATH"
    sudo -u "$INVOKING_USER" git -C "$REPO_PATH" pull --ff-only --depth 1 2>&1 | tail -2
  else
    echo "→ clone --depth 1 $repo (como $INVOKING_USER, via /tmp + mv)"
    # Patrón "clone a /tmp + mv como root":
    # kortux NO tiene write en $REPOS_BASE (owned por oracle-lab:oracle-lab 0755)
    # → git clone DIRECTO al destino falla "could not create leading directories"
    # porque git internamente toca el parent durante la creación del repo.
    # Workaround: clone como kortux a /tmp (write libre), después mv como root
    # al destino final (root puede atravesar cualquier perm).
    TMP_CLONE=$(sudo -u "$INVOKING_USER" mktemp -d -t "ol-clone-${repo}-XXXX")
    sudo -u "$INVOKING_USER" git clone --depth 1 "$REPO_URL" "$TMP_CLONE/repo" 2>&1 | tail -2
    # Limpiar destino previo si existe (clone fallido anterior dejó restos)
    if [ -e "$REPO_PATH" ]; then
      case "$REPO_PATH" in
        "$REPOS_BASE"/*) rm -rf "$REPO_PATH" ;;
        *) echo "ERROR defensivo: REPO_PATH ($REPO_PATH) fuera de REPOS_BASE ($REPOS_BASE), abortando" >&2; exit 3 ;;
      esac
    fi
    mv "$TMP_CLONE/repo" "$REPO_PATH"
    rm -rf "$TMP_CLONE"
  fi
done

echo "→ chown final a oracle-lab:oracle-lab (read-only suficiente para collector)"
chown -R oracle-lab:oracle-lab "$REPOS_BASE"

echo "→ systemctl restart oracle-lab para que collector relea repos"
systemctl restart oracle-lab
sleep 2

echo
echo "=== git_activity provider post-init ==="
curl -s http://localhost:9090/api/oracle/snapshot 2>/dev/null \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
g = d['providers'].get('git_activity', {})
print(json.dumps(g, indent=2, ensure_ascii=False)[:600])
" 2>/dev/null || echo "(no se pudo parsear snapshot — revisar logs oracle-lab)"

echo
echo "✅ init completo. Refresh HYTA → card Git Activity 7d debe mostrar commits."
