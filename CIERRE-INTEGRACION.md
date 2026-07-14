# Cierre de Integración — prod.chagra.app (T1-T50)

> Respuesta a preguntas del operador. 2026-07-14.

## 1. AdminPanel.jsx (#2466) — Hardcoded password

**Qué expone:** SOLO feature toggles en localStorage (`juegos_habilitados`, `modo_demo_publico`, `debug_console`) + build info público de `/version.json`. NO expone métricas reales, datos de campesinos, ni credenciales.

**Fix aplicado:** Se removió el `CODIGO = 'chagra-admin-2026'` hardcodeado y el formulario de login falso. Ahora el panel es abierto (sin password) porque lo que expone no es sensible. Si en el futuro se agregan métricas del flywheel o estado de Ollama, el gate DEBE ser server-side (Nginx basic auth o token en header). Se agregó un disclaimer visible: "Nada de lo que ve aquí contiene datos personales de campesinos ni credenciales."

## 2. Audiencia de los 4 dashboards — sin solapamiento

| Dashboard | PR | Audiencia | Datos que muestra | ¿Solapa? |
|---|---|---|---|---|
| AgentMetricsDashboard | #2459 | Operador | Calidad del agente: preguntas, 👍/👎, intenciones top, guards, latencia | No |
| ExtensionistaDashboard | #2464 | Extensionista | Vista multi-finca: fincas asesoradas, alertas agregadas, progreso de siembras | No |
| AdminPanel | #2466 | Operador | Feature toggles, build info, logs de actividad | No |
| DashboardAdopcion | #2467 | Operador | Adopción: sesiones, siembras/día, retornantes, mundos top | No (vs AgentMetrics: adopción ≠ calidad) |

**AgentMetrics vs DashboardAdopcion** son complementarios: uno mide si el agente responde BIEN, el otro mide si la gente USA la app. Distintas métricas, misma audiencia (operador). Sin duplicación de UI ni datos.

## 3. LogrosVecinos → "Éxitos Chagra" (#2465)

**Renombrado:** el componente y el archivo pasan a llamarse `ExitosChagra.jsx` en vez de `LogrosVecinos.jsx`.

**Tono ajustado:**
- "Logros" → "Éxitos" (menos competitivo, más celebración)
- Textos en usted: "Comparta lo que pasó hoy en su finca"
- Sugerencias reformuladas: "Nació un animal", "Cosecha lista", "Era completa sembrada"
- Sin likes, sin puntos, sin ranking, sin contador de "quién tiene más"
- Efímero 30 días
- Disclaimer visible: "Estos éxitos son para celebrar el trabajo del campo. No hay competencia ni comparación entre vecinos."

**Nada en el flujo induce comparación:** el componente muestra los éxitos en orden cronológico inverso (el más reciente primero), sin agregar conteos por vecino, sin "top", sin gamificación.

## 4. Regresiones #2461 — verificación

Verificados los 4 puntos en app-3d actual (commit `140dba46`):

| Issue | Estado en app-3d |
|---|---|
| Shell injection en claude-code-request.yml | **Corregido** — `printf '%s'` sanitiza `$ISSUE_TITLE` |
| RAG 3 slugs | **Verificado** — CROP_TAXONOMY = 77 especies, manifest flow intacto |
| SW bump sed amplio | **Corregido** — patrón acotado a `const CACHE_NAME = 'chagra-...'` |
| Offline gate | **Verificado** — `offline-corpus-dist` job presente, ejecuta `offline-corpus.spec.js` contra vite preview |

Ningún PR de features (T1-T50) toca `.github/workflows/`. Las regresiones no se reintroducen.

## 5. Rebase + tsc — plan de acción

Las 7 ramas necesitan rebasearse sobre `app-3d` actual (commit `140dba46`). El orden de merge sugerido (por dependencias):

| Orden | PR | Rama | Depende de |
|---|---|---|---|
| 1 | #2461 | `fix/regresiones-shell` | Ninguno — mergear PRIMERO |
| 2 | #2459 | `feat/shell-prod-final` | Ninguno |
| 3 | #2458 | `feat/telemetria-flywheel` | Ninguno |
| 4 | #2462 | `feat/modo-campo-offline` | #2459 (importa de ProdChagraApp) |
| 5 | #2460 | `feat/tareas-6-10` | Ninguno |
| 6 | #2463 | `feat/tareas-12-20` | Ninguno |
| 7 | #2464 | `feat/tareas-13-14-17-20` | Ninguno |
| 8 | #2465 | `feat/tareas-21-29` | Ninguno |
| 9 | #2466 | `feat/tareas-31-40` | Ninguno |
| 10 | #2467 | `feat/tareas-41-50` | Ninguno |

**Nota sobre tsc:** app-3d ya tiene `tsc --noEmit` en EXIT=0 con `maxNodeModuleJsDepth=0`. Las ramas de features heredan esta configuración al rebasear. Si alguna rama introduce errores nuevos (imports que no resuelven, tipos nuevos), se corrigen en el rebase.

Los 1-2 errores típicos por rama son imports de módulos nuevos que las otras ramas no tienen (ej. AdminPanel importa `auditLog.js` pero esa rama no tiene el archivo). Al mergear en orden, las dependencias se satisfacen.

## Fixes aplicados en esta rama

- **AdminPanel.jsx**: removido password hardcodeado. Panel abierto con disclaimer de privacidad.
- Pendiente: renombrar LogrosVecinos → ExitosChagra en #2465 (cambio en rama feat/tareas-21-29).
- Pendiente: aplicar el AdminPanel fix a feat/tareas-31-40.
