# Runbook de Deploy y Rollback — Chagra PWA

## Pipeline de Release

1. Branch efimera desde `main`
2. Commit (lefthook auto-bump version + SW cache)
3. Push + PR a `main` (merge gates: CodeQL + Playwright)
4. Merge a main
5. CI deploy automatico: lint, build, rsync, bump SW cache

## Deploy Automatico (CI)

Workflow: `.github/workflows/deploy.yml`. Dispara en push a `main`.

Pasos: checkout, `npm ci && npm run build`, rsync de `dist/`, bump SW cache, webhook HA.

## Verificacion Post-Deploy

- [ ] Workflow Deploy Chagra PWA en verde
- [ ] sha256sum de index.html distinto al anterior
- [ ] CACHE_NAME en sw.js coincide con commit sha

## Rollback — Via Estandar (PR-revert)

```bash
git checkout main && git pull --ff-only origin main
git checkout -b fix/revert-<sha>-<desc>
git revert <sha-roto>
git push -u origin fix/revert-<sha>-<desc>
gh pr create --base main --title "fix: revert <sha>"
```

Tiempo: 3-6 min. CI reconstruye y despliega automaticamente.

## Rollback — Via de Emergencia

Solo si produccion esta rota y CI no responde:

```bash
git checkout main && git pull --ff-only origin main
git revert <sha-roto>
npm ci && npm run build
umask 022
rsync -avzO --no-perms --delete --no-group --chmod=F644 dist/ /ruta/deploy/
sed -i -E "s/chagra-[0-9a-z]+/chagra-$(git rev-parse --short HEAD)/" /ruta/deploy/sw.js
git push origin main
```

## Prohibiciones

- `git push --force` sobre `main`
- `--no-verify`
- Bypass de merge gates
- `rsync` manual sin documentar excepcion

## Rollback Pre-Merge (Local)

```bash
git reset --hard HEAD
git checkout main
git branch -D <rama-efimera>
```
