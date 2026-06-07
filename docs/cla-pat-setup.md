# Configurar CLA Assistant con PERSONAL_ACCESS_TOKEN

## Instrucciones para el operador

El CLA Assistant está temporalmente deshabilitado (cla.yml.disabled). Para re-habilitarlo correctamente, necesita un Personal Access Token (PAT).

## Paso 1: Crear Personal Access Token

1. Ir a GitHub: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Configurar:
   - **Note**: "CLA Bot Chagra"
   - **Expiration**: 90 días o más
   - **Scopes**: ✅ `repo` (full control of private repositories)
4. Click "Generate token"
5. **COPIAR EL TOKEN** (solo se muestra una vez)

## Paso 2: Agregar secret al repo

```bash
# Reemplazar TOKEN_GENERADO con el token del paso 1
gh secret set CLA_BOT_PAT --body "TOKEN_GENERADO"
```

O vía GitHub UI:
1. Ir a: https://github.com/guatoc-ecohub/Chagra/settings/secrets/actions
2. Click "New repository secret"
3. Name: `CLA_BOT_PAT`
4. Secret: pegar el token
5. Click "Add secret"

## Paso 3: Re-habilitar CLA Assistant

```bash
# 1. Descomentar línea 47
sed -i 's/# PERSONAL_ACCESS_TOKEN:/PERSONAL_ACCESS_TOKEN:/' .github/workflows/cla.yml.disabled

# 2. Renombrar archivo
mv .github/workflows/cla.yml.disabled .github/workflows/cla.yml

# 3. Commitear
git add .github/workflows/cla.yml
git commit -m "chore(cla): re-habilitar CLA Assistant con PAT configurado"
git push origin main
```

## Verificación

Después de configurar, el workflow debería pasar en PRs futuros:

```bash
gh pr view <PR_NUMBER> --json statusCheckRollup
```

## Referencias

- Documentación CLA Assistant: https://github.com/contributor-assistant/github-action
- Explicación pull_request_target: https://securitylab.github.com/posts/github-actions-preventing-pwn-requests/
