# TODO — Chagra Roadmap

**Versión actual:** 0.5.6
**Última actualización:** 2026-04-20

---

## Decisiones de arquitectura (ya acordadas)

1. **Streaming LLM real** — Ollama con `stream: true` + `ReadableStream` en cliente + ajuste de Nginx (`proxy_buffering off` en `/api/ollama/`). Aplica a visión (`aiService.js`) y respuestas de voz/Sembrar.
2. **Estadísticas públicas — fase A (inmediata):** contadores reales locales de la instalación, pintados **en verde** para marcar "dato real". Resto de métricas (cosecha agregada, agua ahorrada, etc.) con datos simulados en otro color, con etiqueta "red Chagra (beta)". Estructura de datos diseñada desde ya para fase B.
3. **Autorización de telemetría global** — se solicita explícitamente durante el flujo del instalador. Solo datos agregados y anonimizados salen al agregador público.
4. **Appliance Chagra (visión)** — Raspberry Pi5 (o equivalente) por finca ejecutando Chagra local + kit de sensores. Interconexión LoRa entre appliances para sincronizar datos agregados (prioridad más baja del roadmap, explorar viabilidad antes de comprometer esfuerzo).
5. **UX de estadísticas** — visualmente atractiva es un criterio de aceptación, no un nice-to-have.

---

## Roadmap priorizado

### P0 — Bugs bloqueantes (patches 0.5.7 – 0.5.9)

| # | Tarea | Versión | Esfuerzo | Notas |
|---|---|---|---|---|
| 1 | Fix React #185 al abrir planta (ej. fresa) en `AssetDetailView` — auditar deps de `useEffect`, proteger con error boundary | 0.5.7 | S | Confirmar si es universal o específico de plantas con ciertos atributos |
| 2 | Fix conteo "guatoc 0" en vista Activos vs "zonas ver todos 17" — revisar `getParentLandId` y matching de IDs | 0.5.7 | S | Mismo archivo que #1, un solo PR |
| 3 | Fix "wifi is not defined" en menú Tareas | 0.5.7 | XS | **Primero:** purgar SW del dispositivo (CACHE_NAME + unregister). Si persiste tras build fresco, capturar stacktrace completo. Grep actual no lo encuentra → probable build obsoleto cacheado. |
| 4 | Fix voz pendiente que no se reprocesa al reconectar — trazar `syncManager.syncVoiceRecordings`, agregar backoff exponencial con tope, hacer visible el estado real en UI | 0.5.8 | M | Confirmar si el bug es de lógica o de refresh de UI |

### P1 — UX de alto valor (minor 0.6.0)

| # | Tarea | Versión | Esfuerzo | Notas |
|---|---|---|---|---|
| 5 | **Streaming LLM real** con efecto typewriter (Ollama `stream: true` + `ReadableStream` + ajuste Nginx). Aplicar a visión y voz. | 0.6.0 | M | Tocar `aiService.js`, `voiceService.js`, Nginx conf |
| 6 | **Error boundaries por vista** con fallback visible (cinturón de seguridad para futuros errores minificados) | 0.6.0 | S | |
| 7 | **Banner "nueva versión disponible"** cuando SW detecta CACHE_NAME nuevo | 0.6.0 | S | Ayuda a descartar reportes de bugs ya resueltos |

### P2 — Features nuevas (minor 0.7.0)

| # | Tarea | Versión | Esfuerzo | Notas |
|---|---|---|---|---|
| 8 | **Botón "Alertas secundarias"** en top bar — panel lista con batería de sensores, sensor offline, umbrales suaves fuera de rango | 0.7.0 | M | Depende de que sensores HA expongan `sensor.xxx_battery`. Confirmar antes de empezar. |
| 9 | **Línea de estadísticas en Login** — fase A: contadores reales locales en verde + simulados en gris/azul con etiqueta "red Chagra (beta)". Diseño visual cuidado (animaciones sutiles, tipografía tabular). | 0.7.0 | M | Métricas mínimas: total especies monitoreadas (real), total frutos cosechados (real o sim), litros de agua ahorrados (sim), CO₂ capturado (sim) |
| 10 | **Export CSV** de estadísticas para reportes a entidades | 0.7.1 | S | |

### P3 — Proyectos grandes

| # | Tarea | Versión | Esfuerzo | Notas |
|---|---|---|---|---|
| 11 | **Agregador global de estadísticas** — endpoint público opt-in, anonimización, hosting. Fase B de stats. | 0.8.0 | XL | Requiere hosting público y políticas de privacidad |
| 12 | **Instalador Chagra** — onboarding con GPS + API de elevación + catálogo de especies por piso térmico + seed de zonas/insumos base + consentimiento de telemetría global | 0.9.0 | XL | Catálogo curado propio (~50 cultivos colombianos por altitud). Ejecutar una vez por appliance. |
| 13 | **Interconexión LoRa entre appliances** — sincronización de datos agregados finca↔finca vía LoRaWAN. Investigar viabilidad (alcance, duty cycle, costo de módulo) antes de comprometer esfuerzo. | Futuro | XL | **Máxima baja prioridad.** Explorar solo tras v1.0 estable. |

---

## Preguntas abiertas (a resolver en el momento de cada tarea)

- **#1 (React #185):** ¿ocurre solo en fresa o en todas las plantas? Pedir reproducción limpia antes de tocar código.
- **#3 (wifi):** stacktrace completo del navegador + versión exacta del build cacheado.
- **#8 (alertas secundarias):** ¿los sensores actuales exponen batería en Home Assistant? Si no, bloqueante de firmware.
- **#12 (instalador):** fuente autoritativa del catálogo de especies por piso térmico (Agrosavia, Humboldt, ICA) vs catálogo curado propio.

---

## Reglas de ejecución

- Toda tarea inicia en rama efímera `fix/` o `feat/` desde `main` actualizado (ver `AI_PIPELINE_SOP.md §3.1`).
- Antes de cada push: bump `package.json`, bump `CACHE_NAME` en `public/sw.js`, commit firmado, rsync a `/mnt/fast/appdata/farmos-pwa/`.
- Merge a `main` solo con CodeQL ✅ + Playwright E2E offline ✅ (ver SOP §5).
