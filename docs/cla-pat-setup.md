# Configurar CLA Assistant con PERSONAL_ACCESS_TOKEN

## Instrucciones para el operador

El CLA Assistant vuelve a estar activo en `.github/workflows/cla.yml`.
El workflow espera el secret de GitHub Actions `CLAUDE_CODE_BOT_PAT`, restaurado
operativamente desde la key SOPS `claude-code-bot-pat` en `guatoc-nixos`.

No imprimir el valor del PAT en logs, issues, PRs ni documentación.

## Paso 1: Restaurar el secret desde SOPS

El PAT ya debe existir cifrado como `claude-code-bot-pat`. El operador con
acceso SOPS debe extraerlo localmente y cargarlo como secret de GitHub:

```bash
gh secret set CLAUDE_CODE_BOT_PAT --repo guatoc-ecohub/Chagra --body "$TOKEN_DESDE_SOPS"
```

O vía GitHub UI:

1. Ir a: https://github.com/guatoc-ecohub/Chagra/settings/secrets/actions
2. Click "New repository secret"
3. Name: `CLAUDE_CODE_BOT_PAT`
4. Secret: pegar el token restaurado desde SOPS
5. Click "Add secret"

## Rotación si el PAT no existe o expiró

1. Ir a GitHub: https://github.com/settings/tokens
2. Click "Generate new token" -> "Generate new token (classic)"
3. Configurar:
   - **Note**: "CLA Bot Chagra"
   - **Expiration**: 90 días o más
   - **Scopes**: `repo` (full control of private repositories)
4. Guardar el valor nuevo en SOPS como `claude-code-bot-pat`
5. Publicarlo al repo como `CLAUDE_CODE_BOT_PAT`

```bash
gh secret set CLAUDE_CODE_BOT_PAT --repo guatoc-ecohub/Chagra --body "$TOKEN_NUEVO"
```

## Workflow activo

`.github/workflows/cla.yml` referencia:

```yaml
PERSONAL_ACCESS_TOKEN: ${{ secrets.CLAUDE_CODE_BOT_PAT }}
```

## Verificación

Después de configurar, el workflow debería pasar en PRs futuros:

```bash
gh pr view <PR_NUMBER> --json statusCheckRollup
```

## Referencias

- Documentación CLA Assistant: https://github.com/contributor-assistant/github-action
- Explicación pull_request_target: https://securitylab.github.com/posts/github-actions-preventing-pwn-requests/
