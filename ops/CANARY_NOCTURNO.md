# Canario nocturno de Chagra

Test de salud **durable** que corre todas las noches (1 AM hora Colombia) contra
**DEV** y **PROD** y prueba, de punta a punta, que Chagra no está roto — más una
capa de **cosecha de inteligencia** (dataset de destilado + gaps del grafo) que
alimenta la mejora continua del agente. Usa un usuario de pruebas dedicado, nunca
toca los datos reales de la finca.

> Framework extensible: cada check y cada cosecha es un **módulo pluggable**
> registrado en `scripts/lib/canary-modules.mjs`. La hoja de ruta completa de
> módulos (ejes A/B/C/D, fases P0/P1/P2) vive en el doc de operación
> `NIGHTLY_SYSTEM.md`. Agregar un módulo nuevo = escribir su `run()` en el
> registro; el runner lo corre solo.

## Qué prueba (módulos P0 activos)

| id | Módulo | Qué verifica |
|----|--------|--------------|
| `login` | Login OAuth | El usuario de pruebas autentica contra el target. |
| `B0` | Conversación dinámica 4-msgs | Un tema duro que **rota por fecha** (roya del café, gota de papa, monilia del cacao, sigatoka, picudo, …). Conversación compleja: pregunta → repregunta con matiz → caso de borde → pedir fuente. Pasa por el pipeline real (NLU + resolve-entities + chat grounded + post-validate). |
| `B0g` | Grounding | Juez `claude-code -p` evalúa cada respuesta buscando alucinación, contaminación cruzada, familias fabricadas e instituciones inventadas. |
| `B0b` | Planta con foto | Registra una planta de prueba **con foto** bajo una ubicación dedicada `CANARIO-PRUEBAS` (aislada de la finca real) y verifica que persiste. **No borra**: se acumula, filtrable por el prefijo `CANARIO`. |
| `B0c` | Captura de conversación | Verifica que la conversación quedó **registrada** en el store del sidecar (cuenta líneas antes/después). Si no incrementa → falla (bug de captura). |
| `B0d` | Smoke visual | Playwright con backend real: login → home monta → navega pantallas clave → **cero errores de consola** → screenshot de cada una. |
| `D1`–`D5` | Datos dinámicos | Salud diaria de las integraciones en vivo: **Clima IDEAM** (fresco, no stale), **Precio SIPSA** (real y reciente), **ENSO** (fase actual), **Calendario de siembra**, **Sidecar/agente** (`/health`, tools, kokoro TTS, ollama/granite). |
| `A1` | Dataset de destilado | Guarda cada tupla del juez (`{tema, pregunta, respuesta_granite, veredicto_juez, grounded, tipo_error}`) a JSONL — insumo para un futuro LoRA de granite. Solo **acumula**; datos sintéticos (usuario de pruebas), sin PII. |
| `A2` | Gaps de grounding → DR | Cuando el sujeto del tema **no resolvió en el grafo** (falta la especie/arista, no que alucinó), anota el hueco a JSONL para alimentar la cola de DR/scrapers. |

Los módulos P1/P2 (SLA, latencia, integridad, seguridad/anti-leak, cobertura de
debilidad, re-bench de guards, resiliencia offline, FAQ precomputada, golden
corpus, …) están **registrados como stubs** con su firma lista y un TODO claro.

Ver el registro completo:

```bash
node scripts/nightly-canary.mjs --list
```

## Cómo correrlo a mano

```bash
# Contra dev (recomendado para probar cambios):
node scripts/nightly-canary.mjs --target=dev

# Contra prod:
node scripts/nightly-canary.mjs --target=prod

# Sin alerta de Telegram (para no molestar al operador de madrugada):
node scripts/nightly-canary.mjs --target=dev --no-alert

# Solo algunos módulos / saltar otros:
node scripts/nightly-canary.mjs --target=dev --only=D1,D2,D3,D4,D5
node scripts/nightly-canary.mjs --target=dev --skip-visual --skip-plant

# Incluir fases P1/P2 (cuando se implementen sus run()):
node scripts/nightly-canary.mjs --target=dev --phases=P0,P1
```

Exit code `!= 0` si algún check falla.

### Requisitos (host de operación)

- Credenciales del usuario de pruebas en un archivo gitignored fuera del repo
  (`CANARY_CREDS_FILE`, formato `usuario=…` / `clave=…` / `farmos=…`). **Nunca**
  en git ni en logs.
- Token del sidecar (`CANARY_SIDECAR_TOKEN_FILE`).
- Node ≥ 20 y `playwright` instalado (para el smoke visual; usa el chromium del
  sistema vía `PLAYWRIGHT_CHROMIUM_PATH`).
- Para la verificación de captura **en disco**: `CANARY_CONV_COUNT_CMD`, un
  comando que imprime el número de líneas del store de conversaciones del
  sidecar. Si no se define, el check se degrada a "el endpoint aceptó el POST".

## Cómo ver el último reporte

Los reportes se guardan en una ruta **estable** (fuera de cualquier worktree
efímero), configurable con `CANARY_OUT_DIR` (default `~/chagra-canary-runs`):

```bash
OUT=${CANARY_OUT_DIR:-~/chagra-canary-runs}
ls -t "$OUT"/canary-*.json | head            # reportes JSON
cat "$OUT/canary-$(date -u +%F)-dev.md"      # reporte Markdown de hoy (dev)
ls "$OUT/shots/"                             # screenshots del smoke visual
```

Cosecha de inteligencia:

```bash
OUT=${CANARY_OUT_DIR:-~/chagra-canary-runs}
ls "$OUT/distill-dataset/"                   # dataset de destilado (→ LoRA)
cat "$OUT"/grounding-gaps-*.jsonl            # gaps del grafo (→ cola DR)
```

## Automatización (systemd `--user`, en el host de operación)

Tres timers durables (sobreviven a la sesión; el host corre en UTC):

| Timer | Hora | Qué hace |
|-------|------|----------|
| `chagra-canary.timer` | 1 AM Colombia (06:00 UTC) | Corre el canario contra dev y prod. Si algo falla, dispara un fix autónomo. |
| `chagra-canary-report.timer` | 9 AM Colombia (14:00 UTC) | Manda el digest de la noche por Telegram. |
| `chagra-canary-weekly.timer` | Domingos 8 AM Colombia (13:00 UTC) | Auditoría profunda semanal con un juez más capaz. |

```bash
systemctl --user list-timers | grep canary
systemctl --user start chagra-canary.service   # correr la corrida completa a mano
journalctl --user -u chagra-canary.service -n 100
```

**Alerta inmediata:** ante *cualquier* fallo, el runner envía una alerta a
Telegram al instante (además del digest de las 9 AM).

**Fix autónomo:** si un check no-visual falla y el fix pasa CI verde + anti-leak,
se auto-mergea a prod; los fallos **visuales** esperan OK del operador; los
**gaps de grafo** se encolan como DR (enriquecer el grafo, no tocar código).

## Datos de prueba: aislamiento y limpieza

- Todo lo que el canario crea en farmOS va bajo la ubicación dedicada
  **`CANARIO-PRUEBAS`** (`asset--land`) y lleva el prefijo **`CANARIO`** en el
  nombre. El usuario de pruebas es el dueño. **No se mezcla** con la finca real.
- Los datos **no se auto-borran** — se acumulan bajo esa ubicación (decisión del
  operador: "aparte", no "auto-limpiar"). Para inspeccionarlos o depurarlos
  manualmente, filtra por el prefijo `CANARIO` / la ubicación `CANARIO-PRUEBAS`
  en farmOS.
- El dataset de destilado y los gaps son **sintéticos** (usuario de pruebas), sin
  datos personales de usuarios reales → seguros para acumular y para entrenar.
