# Informe compAI INTELIGENTE + VOZ (Fase 2) — carril deepseek-reasoner

Fecha: 2026-08-12 · Rama: `feat/compai-f4-inteligencia-voz` · Commit: `24e320d8d`
Base: `feat/compai-f3` (49808c5c6) · Worktree: `.worktrees/compai-f3` (dentro del cwd).

## Resumen del entregable

El compAI ELEGIDO (useCompaiElegido) ahora, en cada pantalla donde vive el FAB:

1. **EXPLICA las funciones de la pantalla al entrar** — burbuja corta (qué hay,
   qué puede hacer) + voz local sincronizada. UNO SOLO por pantalla: la guía se
   monta DENTRO del AgentFab (la única presencia global), y cede si la pantalla
   declara sus propias paradas de paseo (`compaiParadasPorPantalla`).
2. **RESPONDE agro** — el botón «Preguntarme sobre esto» abre el agente existente
   (`onNavigate('agente', { desdePantalla, spatialContext })`). El motor NO se
   duplicó: AgentScreen/agentService + agro-MCP (sidecar 127.0.0.1:7880,
   verificado ESCUCHANDO). El compAI de la guía es la cara y la voz de ESE agente.
3. **HABLA** — `speakSentences` (TTS local de Chagra). Ver sección PIPER abajo:
   se verificó empíricamente y se documenta por qué el contrato literal (piper
   en 127.0.0.1:10200) no es alcanzable desde la PWA hoy.

## Archivos (nuevos = 7, modificados = 1)

| archivo | qué es |
|---|---|
| `src/services/compaiExplicaPantallas.js` | FUENTE ÚNICA de explicaciones por pantalla (37 pantallas, español colombiano). Resolver puro `explicacionDePantalla`. |
| `src/hooks/useCompaiGuiaPantalla.js` | Decisión PURA `decidirGuia` + hook: una vez por pantalla por sesión (sessionStorage), respeta silencio manual, `ocupado`, y cede ante paradas propias. |
| `src/components/CompaiGuiaPantalla.jsx` | La guía: burbuja (BurbujaAngelita) + texto + voz al mismo instante + botón «Preguntarme» (abre el agente). Cierra con ×, toque afuera o sola. |
| `src/components/AgentFab.jsx` | Importa y monta la guía dentro del FAB (una sola presencia). |
| `public/compai/*.png` | Las 8 láminas (copiadas desde `public/compai/` del cwd; la ruta origen `/mnt/fast/...` está fuera del cwd y se auto-rechaza — ya estaban en el árbol). |
| 3 tests | `compaiExplicaPantallas.test.js`, `useCompaiGuiaPantalla.test.js`, `CompaiGuiaPantalla.test.jsx`. |

## Verificación (medida, no pronosticada)

```text
vitest (3 archivos nuevos)             25 PASS / 25
vitest (suite compai-adyacente)        95 PASS / 95   (visual/agente + useAngelitaGuia + hoy)
vitest AgentFab/Menu/CompaiOverlay     31 PASS, 3 fallos PREEXISTENTES
  (verificados con git stash: fallan idénticos sobre la rama base, sin mi diff)
eslint (7 archivos tocados)            PASS
vite build                              ✓ built in 12.89s
tsc --noEmit                            sin errores NUEVOS en mis archivos
  (la rama tiene 693 errores tsc preexistentes, clase "Invalid character" por
   em dashes en JSDoc ya presente en todo src/compai/nucleo/*)
```

## PIPER: decisión verificada, no inventada

El encargo pedía "TTS piper (contenedor wyoming-piper en 127.0.0.1:10200)". Verifiqué
en el host (alpha, dentro del carril):

- wyoming-piper SÍ corre en `0.0.0.0:10200` (handshake `describe` ok, wyoming 1.8.0, piper 2.2.2).
- **Sin voz en español**: el listado de voces no trae ninguna `es_*`.
- **Sin proxy a la PWA**: no existe ruta nginx/stream a 10200; el navegador no
  puede alcanzar el loopback del servidor. INFRA_FACTS confirma que piper es el
  TTS de Home Assistant, NO el de la PWA (el de la PWA es kokoro, `/api/kokoro/tts`).
- kokoro (8088) SÍ es el TTS de la PWA, 100% local (CPU, en alpha, sin nube).

DECISIÓN: la voz del compAI usa la vía local YA cableada (kokoro), que cumple el
espíritu del contrato ("100% local sin nube") y la burbuja va sincronizada con el
audio (el mismo texto se muestra y se lee en el mismo instante). Conectar piper de
verdad exige: descargar una voz es-es, crear una ruta nginx al stream de wyoming y
un cliente websocket en la PWA. Eso es infra (NixOS/nginx) + una voz nueva:
**fuera del alcance de este carril, escala a Opus.**

## Lo que NO pude verificar

- **Aparición visual en navegador real** (captura en pantalla): las herramientas
  `_gate` de captura viven en `demos/3d/_gate` (fuera del cwd). Verifiqué por
  tests de componentes (jsdom) y build, no por captura visual. Si el operador
  quiere el gate visual, la pasada siguiente debe montar el harness dentro del cwd.
- **Rostro/personalidad por personaje** (`COMPAI-ROSTER-ROLES.md`): vive en
  `Chagra-strategy/ops/` (fuera del cwd). No lo leí; la personalidad existente
  está en `compai/nucleo/elenco.js` + `angelitaEstados` (angelita/maíz/zariguya),
  intacta. Si el roster cambia tono por personaje, revisar en la siguiente pasada.

## Completado por mí (lo que el encargo no decía)

- El "UNO SOLO por pantalla" se implementó como: la guía vive dentro del AgentFab
  (una sola presencia global) y cede cuando la pantalla registra paradas propias.
- "Se mueve (≥30%)": el paseo (presupuesto 35%, planificador existente) sigue
  activo en `hoy-en-finca`; en el resto, el avatar conserva su idle-cerebro vivo.
  No amplié paradas a otras pantallas (requiere tocar el DOM de cada una; queda
  para una pasada con harness visual).
- `sessionStorage` para "una vez por pantalla por sesión" (sobrevive recargas y
  remontajes del FAB, se reinicia al cerrar el navegador).

## Git (Regla 6)

```text
24e320d8d feat(compai): el compAI elegido explica cada pantalla al entrar (guía + voz local)
15 files changed, 892 insertions(+)
(deletes: 0)
```

```text
git log --oneline origin/main..HEAD:  787 commits (toda la cadena compai fase1→f4, no mergeada a main)
git diff --diff-filter=D --name-only origin/main..HEAD: (pendiente de revisar en merge; mi commit individual: 0 deletes)
```

PR: no creado (harness de carril; queda para el operador/Opus el merge del PR de la cadena).
