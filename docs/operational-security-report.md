# Informe de Seguridad Operativa del Agente

> Generado: 2026-06-08
> Propósito: Checklist de riesgos antes de liberar cambios que afectan la experiencia del agente.

## 1. Build

| Riesgo | Señal temprana | Prueba de detección | Efecto en usuario |
|--------|---------------|---------------------|-------------------|
| better-sqlite3 ABI incompatible | `npm run build` falla | `node scripts/diagnose-build.mjs` (ABI check) | App no carga, página en blanco |
| Catalog.sqlite corrupto o ausente | Diagnóstico reporta `CATALOG_OFFLINE` | `node scripts/diagnose-build.mjs` (integrity check) | Consultas de especies retornan vacío sin advertencia |
| Dist/ sin permisos de lectura | Build exitoso pero 403 en static assets | `ls -la dist/`, verificar `node_modules/` en dist/ | Assets no cargan (JS/CSS rotos) |
| Dependencia faltante en producción | Build exitoso, error en runtime | `npm ls --depth=0 --prod` contra package.json | Pantallazo de error en producción |
| Bundle excede límite de memoria | `npm run build` OOM | Monitorear RSS durante build (< 4GB) | Build nunca termina |

### Acción al detectar
- No hacer deploy. Correr `scripts/diagnose-build.mjs` completo, reportar hallazgos al operador.

---

## 2. Bench / Modelo

| Riesgo | Señal temprana | Prueba de detección | Efecto en usuario |
|--------|---------------|---------------------|-------------------|
| Modelo no disponible en Ollama | Preflight falla | `scripts/bench-agente-completo.mjs` preflight | Agente no responde ("IA no disponible") |
| GPU OOM durante inferencia | Benchmark reporta OOM errors | Revisar `maxwellErrorDetected` en summary.md | Respuestas cortadas o timeout |
| Spill a swap >500MB | Summary reporta swap warnings | Revisar `swap_peak_mb` en JSONL | Latencia extrema (>30s por consulta) |
| Modelo incorrecto en producción (config) | Gate de producción no configurable | `config/setup-llm-prod.json` no existe | Error no detectable automáticamente |
| Latencia >15s promedio | Benchmark reporta latencia alta | Revisar `avgLatencyTotal` en summary.md | usuario cierra app antes de respuesta |

### Acción al detectar
- Modelo no disponible: ejecutar `ollama pull <modelo>` según bench preflight.
- OOM/swap: seleccionar modelo más pequeño o liberar VRAM.
- Sin config de producción: crear manual antes de liberar.

---

## 3. MCP / Sidecar

| Riesgo | Señal temprana | Prueba de detección | Efecto en usuario |
|--------|---------------|---------------------|-------------------|
| Sidecar caído | `callTool` retorna null timeouteado | `mcpHonestidad.test.js` (21 tests) | Agente responde sin grounding (generativo puro → alucinación) |
| Tool no permitido | `callTool` retorna null por flag off | `agentCapabilities.audit.test.js` (chip/tool cross-ref) | Chip visible en UI pero no ejecuta nada |
| Tool devuelve datos sintéticos como reales | `stubMessage` se presenta como dato verificado | `mcpHonestidad.test.js` (stub vs tool distinción) | usuario recibe precio/mercado falso |
| 5xx del sidecar | `callTool` retorna null | No hay reconexión automática actual | Silencio: el agente no dice "sidecar caído" |
| Timeout por contención de GPU | NLU planner devuelve null (#349) | `agentNluFallback.js` cubre con grounding best-effort | Degradación silenciosa a grounding parcial |

### Acción al detectar
- Sidecar caído: reiniciar servicio en infra (NixOS: `systemctl restart chagra-sidecar`).
- Tool no permitido: verificar `ALLOWED_TOOLS` en sidecarClient.js coincide con lo que la UI expone.
- Datos sintéticos: verificar `kind:'stub'` no se presenta como `kind:'tool'`.

---

## 4. UI / Chips

| Riesgo | Señal temprana | Prueba de detección | Efecto en usuario |
|--------|---------------|---------------------|-------------------|
| Chip visible pero tool no existe | Test de cross-reference falla | `chipIntentRouter.test.js` (29 tests) | usuario toca chip, no pasa nada |
| Chip deshabilitado global habilita parcialmente | Test de disabled global falla | `ChipsToolbar.smoke.test.jsx` (24 tests) | usuario confundido: tool no funcional |
| Label promete lo que no puede cumplir | Test de stubMessage revela promesa | `agentUserFlow.smoke.test.jsx` (12 tests) | usuario espera precio y recibe "no disponible" sin explicación |
| Router de intención mapea a tool equivocado | Test de contrato falla | `chipIntentRouter.test.js` | usuario pide clima, ejecuta species |
| Tooltip sin descripción | `aria-label` vacío | Accessibility audit | lector de pantalla no describe acción |

### Acción al detectar
- Chip/tool mismatch: actualizar `CHIP_DEFS` o `ALLOWED_TOOLS`.
- Label engañosa: cambiar texto del chip para reflejar capacidad real.
- Contrato de router: si firma de tool cambia, el test debe romperse — no ignorar.

---

## 5. LLM / Output

| Riesgo | Señal temprana | Prueba de detección | Efecto en usuario |
|--------|---------------|---------------------|-------------------|
| Respuesta off-topic (política, salud) | Heurística de guardrails detecta | `llmGuardrails.js` detectOffTopicResponse | usuario recibe respuesta fuera de dominio |
| Alucinación de agroquímico sintético | Output guard detecta | `outputGuards.test.js` (guardSyntheticAgrochemical) | usuario aplica producto falso |
| Inversión de viabilidad (dice "siembre" donde no) | Output guard invierte | `outputGuards.test.js` (guardInvertedViability) | usuario siembra cultivo que morirá |
| Diagnóstico visual sin foto | Output guard detecta afirmación visual | `outputGuards.test.js` (guardVisionWithoutPhoto) | usuario cree que se analizó foto inexistente |
| Respuesta >400 palabras (TTS roto) | Guard de concisión recorta | `outputGuards.test.js` (guardConciseResponse) | Latencia TTS > 20s, usuario abandona |
| Empty response por LLM caído | Fallback construye respuesta estructurada | `agentService.test.js` (buildFallbackResponse) | usuario ve "No pude completar" en vez de silencio |
| Premisa falsa / complacencia | Guard anti-premisa detecta afirmación gratuita | `outputGuards.premisaFalsa.test.js` | usuario recibe respuesta que asume algo falso |

### Acción al detectar
- Off-topic: telemetría en localStorage (`chagra:llm_rejections`). Revisar si el model drift es sistémico → cambiar modelo.
- Output guard dispara: telemetría en localStorage (`chagra:output_guard_triggers`). Revisar si es falso positivo o modelo necesita ajuste.
- Empty response: verificar conectividad con Ollama/sidecar.

---

## 6. Offline

| Riesgo | Señal temprana | Prueba de detección | Efecto en usuario |
|--------|---------------|---------------------|-------------------|
| IndexedDB schema cambia y datos previos se pierden | Migration no corre | `tests/offline.spec.js` | usuario pierde finca/historial al actualizar |
| SyncManager queue corrompida | Transacciones no fluyen | Revisar `pending_transactions` en IndexedDB | datos no sincronizan con FarmOS |
| Cache de visión estale | Visión retorna resultado viejo | `visionCacheService.test.js` | usuario recibe diagnóstico de foto anterior |
| Service worker no cachea assets | App no carga offline | `tests/offline.spec.js` | Pantalla en blanco sin conexión |

### Acción al detectar
- Schema migration: actualizar `dbCore.js` + `tests/offline.spec.js` juntos.
- Sync queue: revisar logs de syncManager; backoff exponencial debe manejar.
- Cache stale: TTL de visionCacheService es best-effort; no bloqueante.

---

## 7. Resumen de cobertura de tests

| Capa | Archivo de test | Tests | Cubre riesgos |
|------|----------------|-------|--------------|
| Build | `scripts/__tests__/bench-agente-completo.test.mjs` | 15 | Bench metrics, modelos, preflight |
| Diagnóstico | `scripts/diagnose-build.mjs` | N/A (script) | ABI, catalog, permisos |
| MCP honestidad | `mcpHonestidad.test.js` | 21 | callTool null, stub, price decline |
| Auditoría araña | `agentCapabilities.audit.test.js` | 23 | Chips vs ALLOWED_TOOLS |
| Router intenciones | `chipIntentRouter.test.js` | 29 | Mapeo intent→tool, argumentos |
| Toolbar chips | `ChipsToolbar.smoke.test.jsx` | 24 | Estados disabled, labels |
| Flujo usuario | `agentUserFlow.smoke.test.jsx` | 12 | Jerga cero, stub honesto, placeholders |
| Output guards | `outputGuards.test.js` (+ 13 sub-tests) | 122 | Agroq, viabilidad, visión, térmico, concisión |
| Offline E2E | `tests/offline.spec.js` | ~50 | Schema, sync, SW |
| Guardrails LLM | (en outputGuards y llmGuardrails) | 266 total | Off-topic, drift, rejection |
| Fallback LLM | `agentService.test.js` | 133 | buildFallbackResponse, price decline, voseo |

### Huecos identificados
1. No hay test E2E de sidecar caído → agente degrade con fallback (solo unitario).
2. No hay reconexión automática a sidecar cuando recupera.
3. Config de producción (`setup-llm-prod.json`) no existe — gate manual.
4. Telemetría de output guards es best-effort (localStorage) — no hay dashboard.

---

## Checklist pre-liberación

- [ ] `npm run build` exitoso + `node scripts/diagnose-build.mjs` sin errores
- [ ] Todos los test files pasan: `npx vitest run` (266+ tests)
- [ ] Offline E2E pasa: `npx playwright test tests/offline.spec.js`
- [ ] Bench de modelo candidato ejecutado con 50 prompts (ver bench-agente-completo.mjs)
- [ ] Summary.md no reporta OOM/swap warnings para el modelo seleccionado
- [ ] `config/setup-llm-prod.json` existe con modelo confirmado
- [ ] Chips visible en UI corresponden 1:1 con ALLOWED_TOOLS
- [ ] Labels de chips no prometen datos que no pueden entregar
- [ ] Output guards no muestran falsos positivos en última tanda de prompts
- [ ] buildFallbackResponse cubre casos vacío/timeout/error
- [ ] AGENTS.md actualizado si cambió modelo de datos o arquitectura
