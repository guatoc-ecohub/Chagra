# AI_PIPELINE_SOP — Standard Operating Procedure

**Repositorio:** Chagra (PWA offline-first, público)
**Última revisión:** 2026-04-16
**Versión en producción:** 0.5.1

---

## 1. Boot Sequence Obligatoria (Auto-conciencia de sesión)

Toda nueva sesión de IA sobre este repositorio **DEBE** ejecutar antes de cualquier otra acción:

```bash
cat package.json | grep '"version"'
cat AI_PIPELINE_SOP.md
```

Queda **estrictamente prohibido**:

- Asumir la versión actual sin leerla de `package.json`.
- Asumir el estado de la arquitectura sin leer este SOP y los archivos de código referenciados.
- Citar rutas, endpoints o identificadores de memoria sin validarlos contra el árbol actual del repositorio.
- Proceder con despliegue, merge o push sin confirmar la versión leída coincide con lo esperado.

**Si la versión leída difiere de la asumida → detener e informar al operador antes de continuar.**

---

## 2. Reglas de Seguridad — Repositorio Público

Chagra es un repositorio público. Las siguientes reglas son **absolutas e innegociables**:

1. **Prohibido hardcodear URLs** de infraestructura interna (Nodo Alpha, FarmOS, Ollama, Whisper, Home Assistant, MQTT, cualquier hostname privado).
2. **Prohibido hardcodear IPs** del Nodo Alpha o de la red interna (`10.88.x.x`, rangos privados, LAN).
3. **Prohibido hardcodear tokens, claves API, credenciales, bearer tokens o secretos** de cualquier tipo.
4. **Toda configuración de entorno** debe pasar exclusivamente por `import.meta.env.VITE_*` (Vite env vars) y proxyearse vía Nginx mediante rutas relativas (`/api/...`, `/oauth/...`).
5. **El archivo `.env` está en `.gitignore`** y debe permanecer así. Nunca comitear `.env`, `.env.local` ni variantes.
6. **Revisión previa a commit**: ejecutar `git diff --staged | grep -iE "(token|bearer|password|secret|10\.88|alpha)"` antes de cada commit. Si hay hits, abortar y limpiar.
7. **Tokens OAuth2 de FarmOS** viven en `localStorage` del cliente únicamente — nunca loguearlos, nunca enviarlos a endpoints de telemetría o analítica.

Cualquier violación de estas reglas requiere `git reset` antes del push y rotación inmediata del secreto expuesto.

---

## 3. Pipeline CI/CD y SemVer Estricto

### 3.1 Ramas Efímeras (obligatorias)

Todo cambio inicia en una rama efímera derivada de `main`:

```bash
git checkout main && git pull origin main
git checkout -b fix/<nombre-corto>     # para parches
git checkout -b feat/<nombre-corto>    # para nuevas funcionalidades
```

**Prohibido** comitear directamente a `main`. El merge ocurre solo tras build verde y deploy exitoso a staging local.

### 3.2 Versionado Semántico

| Incremento | Rango | Uso exclusivo |
|---|---|---|
| **Patch** | `0.4.x → 0.4.y` | Corrección de bugs, refactorizaciones menores, ajustes de UI/estilos, actualizaciones de dependencias sin breaking change. |
| **Minor** | `0.4.x → 0.5.0` | Despliegue de funcionalidad principal. **Reservado para Registro por Voz (v0.5.0).** |
| **Major** | `0.x.x → 1.0.0` | Estabilización de API pública, rediseño arquitectónico, breaking change en contratos con FarmOS. |

Toda release requiere además:

1. Bump en `package.json → version`.
2. Bump en `public/sw.js → CACHE_NAME` (`chagra-vN → chagra-v(N+1)`) para invalidar clientes.
3. Commit con mensaje `chore(release): v<x.y.z> — <resumen>`.
4. Push a `origin/main`.
5. Rsync de `dist/` a `/mnt/fast/appdata/farmos-pwa/`.

### 3.3 Rollback Rápido

Ante fallo crítico en desarrollo (build roto, tipado incoherente, regresión evidente en local):

```bash
git reset --hard HEAD              # descarta cambios no comiteados de la rama efímera
git checkout main                  # retorna a la rama estable
git branch -D <rama-efimera>       # elimina rama rota
```

Ante fallo crítico **post-deploy** en producción:

```bash
git checkout main
git revert <sha-del-release-roto>  # revert explícito, genera nuevo commit
npm run build
rsync -av --delete dist/ /mnt/fast/appdata/farmos-pwa/
git push origin main
```

**Nunca** usar `git push --force` sobre `main`. **Nunca** usar `--no-verify` para saltar hooks.

---

## 4. Checklist de Release (obligatorio antes de push)

- [ ] Boot sequence ejecutada (versión leída de `package.json`).
- [ ] Rama efímera creada desde `main` actualizado.
- [ ] `npm run build` verde sin warnings nuevos.
- [ ] Escaneo `git diff --staged` sin URLs/IPs/tokens hardcodeados.
- [ ] Versión bumpeada en `package.json` según SemVer.
- [ ] `CACHE_NAME` en `public/sw.js` incrementado.
- [ ] Rsync a producción verificado (`diff` entre `dist/` y `/mnt/fast/appdata/farmos-pwa/` vacío).
- [ ] Commit firmado y pusheado a `origin/main`.

---

## 5. Merge-Gate de Seguridad y Comportamiento (QA/DevSecOps)

Toda Pull Request hacia `main` debe atravesar dos merge-checks **obligatorios y bloqueantes**. Ningún PR puede fusionarse si alguno de los siguientes workflows falla, está pendiente o es omitido:

### 5.1 SAST — CodeQL (`.github/workflows/codeql.yml`)

- Motor: GitHub CodeQL nativo, lenguaje `javascript-typescript`.
- Conjunto de queries: `security-extended` + `security-and-quality`.
- Dispara en `pull_request` contra `main`, `push` a `main`, y cron semanal.
- Falla el PR ante inyección (XSS, código, path traversal), secretos expuestos en código, uso inseguro de `eval`/`innerHTML`, y patrones de credenciales hardcodeadas.

### 5.2 E2E — Playwright (`.github/workflows/playwright.yml`)

- Framework: `@playwright/test` (Chromium, headless, 1 worker en CI).
- Test canónico obligatorio: `tests/offline.spec.js` — valida el contrato offline-first:
  1. `context.setOffline(true)` antes de guardar una siembra.
  2. Persiste una transacción en IndexedDB store `pending_transactions` (esquema v6, ver `src/db/dbCore.js`).
  3. `context.setOffline(false)` y verificación de transición del indicador a estado `Online` + `Sync/Pendientes`.
- El build de Vite y el servidor dev se arrancan vía `webServer` en `playwright.config.js`.

### 5.3 Regla de bloqueo

> **Dictamen:** un PR con `CodeQL / Analyze` ❌ o `Playwright E2E / Offline-first E2E` ❌ **no puede** mergearse a `main`. El mantenedor debe configurar ambos checks como *Required* en las reglas de protección de rama (`Settings → Branches → main → Require status checks to pass`). El único atajo permitido es revertir el PR, no hacer bypass.

Cualquier cambio sobre `src/db/dbCore.js`, `src/services/syncManager.js`, `src/services/payloadService.js` o `public/sw.js` **debe** incluir actualización del test E2E correspondiente si la superficie offline cambia.

---

## 6. Referencias Cruzadas

- Auditoría técnica v0.4.6: `AUDIT_0.4.6.md`
- Arquitectura de voz v0.5.0: `ARCHITECTURE_VOICE_0.5.0.md`
- Pipeline SAST: `.github/workflows/codeql.yml`
- Pipeline E2E: `.github/workflows/playwright.yml` + `tests/offline.spec.js`
- Guía de contexto global: `~/.claude/CLAUDE.md`
