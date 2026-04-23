# Contribuir a Chagra

Chagra es un repositorio público. Las siguientes reglas son **absolutas e innegociables**:

1. **Prohibido hardcodear URLs** de infraestructura privada (hostnames, puertos internos, dominios operativos).
2. **Prohibido hardcodear IPs** de red interna (rangos RFC 1918 — `10.*`, `172.16-31.*`, `192.168.*`).
3. **Prohibido hardcodear tokens, claves API, credenciales, bearer tokens o secretos** de cualquier tipo.
4. **Toda configuración de entorno** pasa exclusivamente por `import.meta.env.VITE_*` (Vite env vars) y se proxyea vía Nginx mediante rutas relativas (`/api/...`, `/oauth/...`).
5. **`.env` y `.env.local`** están en `.gitignore` y deben permanecer así. Nunca comitear variantes.
6. **Revisión previa a commit**: ejecutar
   ```bash
   git diff --staged | grep -iE "(token|bearer|password|secret|api[_-]?key|\b10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)"
   ```
   antes de cada commit. Si hay hits, abortar y limpiar.
7. **Tokens OAuth2 de FarmOS** viven en `localStorage` del cliente únicamente — nunca loguearlos, nunca enviarlos a endpoints de telemetría o analítica.

## Merge gates

Pull requests hacia `main` requieren ambos checks en verde (obligatorios y bloqueantes):

- **`CodeQL / Analyze`** — SAST nativo (`javascript-typescript`, queries `security-extended` + `security-and-quality`).
- **`Playwright E2E / Offline-first E2E`** — valida el contrato offline-first (`tests/offline.spec.js`): guardado de transacciones en IndexedDB mientras el cliente está offline, sincronización al recuperar conectividad.

Cambios sobre `src/db/dbCore.js`, `src/services/syncManager.js`, `src/services/payloadService.js` o `public/sw.js` **deben** incluir actualización del test E2E correspondiente si la superficie offline cambia.

## Setup local

Tras clonar:

```bash
npm install
npm run hooks:install   # instala lefthook para el pre-commit anti-leak
```

Los hooks de `lefthook.yml` corren:
- Escaneo de secretos (tokens GitHub/OpenAI/AWS/Google/GitLab, llaves privadas).
- Escaneo de referencias a infraestructura interna (IPs RFC 1918, refs a repos privados).
- Bloqueo de imports estáticos desde `chagra-pro` (usar `moduleRegistry` en su lugar — ADR-002/ADR-011).
- ESLint con `--max-warnings=0`.
- Conventional commits obligatorio en el mensaje.

Auditoría post-build de bundle (`npm run audit:bundle`) consulta `oss-pro/PROHIBITED_IN_PUBLIC.md` y verifica que `dist/` no contenga strings o archivos prohibidos.

## Boundary OSS/Pro

Chagra tiene un repo hermano privado (`guatoc-ecohub/chagra-pro`) con módulos comerciales. Este repo público **nunca** importa estáticamente de ahí. La integración se hace vía `src/core/moduleRegistry.js`: los módulos Pro se registran en runtime si están presentes; la UI consulta `registry.byCapability(...)` y renderiza la variante enriquecida solo cuando existe.

Para desarrollar con Pro presente:

```bash
VITE_PRO_MODULES_PATH=../chagra-pro/modules npm run dev
```

Sin esa variable de entorno el build arranca puro OSS y la UI degrada elegantemente.

Ver:
- `src/core/moduleRegistry.js` — interfaz ChagraModule + registry singleton.
- `src/core/bootstrap-oss.js` — registra módulos OSS en bootstrap.
- `src/core/loadProModules.js` — carga dinámica de módulos Pro vía env var.
- `oss-pro/PROHIBITED_IN_PUBLIC.md` — lista viva de patterns prohibidos en el público.

## Reporte responsable de vulnerabilidades

Si detectas un problema de seguridad, por favor no abras un issue público. Usa el canal privado de GitHub Security Advisories sobre este repositorio, o contacta al mantenedor directamente.

## Violación de reglas

Cualquier violación de las reglas 1–7 requiere `git reset` antes del push y rotación inmediata del secreto expuesto si alcanzó origen. No hay excepciones.
