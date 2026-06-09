# Contribuir a Chagra

## Antes de contribuir: CLA requerido

Toda contribución de código, documentación, traducciones o entradas de catálogo a este repositorio requiere la firma previa del **Contributor License Agreement (CLA)** ([`CLA.md`](./CLA.md)), basado en el Apache ICLA v2.0.

El workflow `.github/workflows/cla.yml` verifica automáticamente la firma en cada Pull Request abierto por un autor externo. Si todavía no firmaste, el bot dejará un comentario con las instrucciones (un comentario de una línea en el PR basta). Los bots conocidos (`dependabot`, `renovate`, `github-actions`) están en la `allowlist` y no requieren firma.

Si tu PR no avanza por estar pendiente de firma del CLA, lee primero [`CLA.md`](./CLA.md) y luego comentá en el PR:

> `I have read the CLA Document and I hereby sign the CLA`

Una vez firmado, el CLA aplica a todas tus contribuciones futuras bajo el mismo login de GitHub — no necesitás refirmar PR por PR.

## Reglas anti-leak (innegociables)

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
- Bloqueo de imports estáticos desde la extensión comercial privada (usar `moduleRegistry` en su lugar).
- ESLint con `--max-warnings=0`.
- Conventional commits obligatorio en el mensaje.

Auditoría post-build de bundle (`npm run audit:bundle`) consulta una lista universal de patterns prohibidos y verifica que `dist/` no contenga strings o archivos sensibles.

## Boundary con extensión comercial

Chagra tiene una extensión comercial privada con módulos adicionales. Este repo público **nunca** importa estáticamente de esa extensión. La integración se hace vía `src/core/moduleRegistry.js`: los módulos comerciales se registran en runtime si están presentes; la UI consulta `registry.byCapability(...)` y renderiza la variante enriquecida solo cuando existe.

Para desarrollar con la extensión presente, definir la variable de entorno `VITE_PRO_MODULES_PATH` apuntando a tu instalación local de los módulos comerciales:

```bash
VITE_PRO_MODULES_PATH=<path-local> npm run dev
```

Sin esa variable de entorno el build arranca puro OSS y la UI degrada elegantemente.

Ver:
- `src/core/moduleRegistry.js` — interfaz ChagraModule + registry singleton.
- `src/core/bootstrap-oss.js` — registra módulos OSS en bootstrap.
- `src/core/loadProModules.js` — carga dinámica de módulos opcionales vía env var.

## Para revisores externos: cómo participar

Valoramos contribuciones de la comunidad. Si eres nuevo en Chagra, este flujo guía tu primer aporte:

1. **Encuentra un issue**: explora los issues abiertos con label `good-first-issue` o `help-wanted`. También puedes reportar bugs o sugerir features abriendo un issue nuevo usando la plantilla `claude-code-request.yml`.
2. **Comenta que lo tomas**: así evitamos duplicación de trabajo. Un mantenedor asignará el issue y responderá dudas.
3. **Lee el CLA**: toda contribución requiere firmar el CLA (`CLA.md`). Un comentario "I have read the CLA Document and I hereby sign the CLA" en tu primer PR basta.
4. **Crea tu rama desde `origin/main`**: asegúrate de que tu fork esté actualizado antes de branchear.
5. **Sigue el estilo del proyecto**: conventional commits, sin em dashes en texto UI, respeta las reglas anti-leak de infraestructura privada ($6).
6. **Abre un Pull Request draft**: titúlalo con el prefijo del tipo de cambio (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`). Los checks de CI (CodeQL + Playwright E2E) correrán automáticamente.
7. **Espera review**: un mantenedor revisará en máximo 5 días hábiles. Si pasa más tiempo sin respuesta, ping en el PR.

**Criterios de merge**: ambos checks CI verdes, sin secretos leakados, CLA firmado, y aprobación de al menos un mantenedor.

## Reporte responsable de vulnerabilidades

Si detectas un problema de seguridad, por favor no abras un issue público. Usa el canal privado de GitHub Security Advisories sobre este repositorio, o contacta al mantenedor directamente.

## Asset and Task Status Enums

Para mantener consistencia en la UI y FarmOS, usamos un sistema de enums contextuales por tipo de entidad. Evite usar estados genéricos como "active" o "done" directamente si existe una opción más descriptiva en `src/constants/assetStatuses.js`.

- **Plantas**: seedling, growing, flowering, fruiting, harvested, dormant, dead.
- **Tareas**: pending, in_progress, completed, urgent, cancelled, blocked.
- **Plagas/Invasoras**: reported, inspecting, treating, resolved, escalated.

El componente `StatusBadge.jsx` maneja el mapeo visual (colores/etiquetas) y el fallback para registros legacy.

## Violación de reglas

Cualquier violación de las reglas 1–7 requiere `git reset` antes del push y rotación inmediata del secreto expuesto si alcanzó origen. No hay excepciones.
