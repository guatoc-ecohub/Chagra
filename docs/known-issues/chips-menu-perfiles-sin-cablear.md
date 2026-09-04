# Chips del menú por perfiles que se pintan y no routena (asociaciones, fuente_doi)

**Fecha de verificación**: 2026-09-04
**Origen**: hallazgo al verificar el PR #3106 (090.b) · task queue #092
**Commit que introdujo los chips**: `fc2b6aa0b` (2026-08-27, "menú por perfiles")
**Estado del control**: `INTENTS_SIN_ROUTING` en `src/services/__tests__/chipIntentRouter.test.js`
(19 intents en el enum; 17 cableados en `planForcedIntent`; estos 2 devuelven `null` y el turno
cae al flujo NLU normal sin avisar).

## Resumen ejecutivo

| Chip | kind | Estado | Acción tomada (2026-09-04) |
|---|---|---|---|
| `fuente_doi` 📚 | `tool` (declara `get_fuente_doi`) | **La tool NO existe** — ni en el sidecar vivo, ni en el código de chagra-pro, ni en `ALLOWED_TOOLS` del cliente | **NO se cablea.** Verificación en 4 capas abajo. Cablear queda bloqueado hasta que la tool exista y esté verificada en el sidecar |
| `asociaciones` 🌽 | `nav` (heroRoute → vista `asociaciones`) | El chip navega desde el AgentHero, pero al escribir texto con el chip activo el turno cae al NLU | **Sin cambio.** La decisión de producto es del operador (opciones abajo) |

## Verificación de `get_fuente_doi` (4 capas, 2026-09-04)

La regla de la task es explícita y el orden NO se invierte: primero verificar la tool en el
sidecar y en `ALLOWED_TOOLS`; solo entonces cablear. Cablear contra una allow-list que no la
tiene degrada el turno a RAG sin grounding en silencio — la misma patología del fix de
grounding P0 del 2026-06-25 (reconciliación allow-list cliente ↔ 41 tools del NLU).

1. **`ALLOWED_TOOLS` del cliente** (`src/services/sidecarClient.js`): `get_fuente_doi` NO está
   en el Set (41 entradas verificadas una a una). Un `callTool('get_fuente_doi', ...)` del
   cliente se rechazaría en la guarda local con `{_error: true, reason: 'not_allowed'}`.
2. **Listado en vivo del sidecar** (`GET /tools` con token, agro-mcp-sidecar.service en
   loopback 7880, build_sha `5bd011ff`, `started_at` 2026-08-26, `mcp_alive: true`):
   **45 tools** registradas; ninguna contiene "fuente" ni "doi".
3. **Llamada directa en vivo**: `POST /tools/get_fuente_doi` →
   `HTTP 404 {"error":"not_found","path":"/tools/get_fuente_doi"}`.
4. **Código fuente del sidecar** (repositorio chagra-pro, `modules/agro-mcp/src` y
   `modules/agro-mcp/sidecar`): cero apariciones de `get_fuente_doi` / `get_fuente`.
   La tool **no existe ni siquiera sin desplegar** — no es un problema de build ni de
   despliegue: la tool nunca se escribió. El NLU del sidecar tampoco conoce ninguna tool de
   DOI/fuente bajo otro nombre (búsqueda sobre el planner sin resultados).

**Conclusión**: la verificación FALLA en las 4 capas. Según el criterio de aceptación de la
task, el cableado **se detiene y se reporta** (este documento y el PR que lo lleva). La única
referencia a `get_fuente_doi` en el cliente es la declaración `tool:` en el manifiesto
`agentCapabilities.js` (línea ~413), que hoy es una promesa sin backend.

## Ruta correcta para cablear `fuente_doi` cuando exista la tool

Orden estricto, cada paso verificable antes del siguiente:

1. **Sidecar (chagra-pro)**: implementar la tool (read-only, fuente de DOIs — el grafo AGE ya
   tiene DOIs en nodos de contenido; decidir la firma de args, p. ej. `tema`/`species_id`).
2. **Verificar EN VIVO** que responde en el sidecar (200 con datos o `found:false` honesto;
   NUNCA 404 ni `available:false` por falta de backend) y que figura en `GET /tools`.
3. **Cliente**: agregar `get_fuente_doi` a `ALLOWED_TOOLS` en `sidecarClient.js` con comentario
   de trazabilidad (patrón de las fases de reconciliación 2026-06-25 y 2026-07-29).
4. **Routing**: caso `CHIP_INTENTS.fuente_doi` en `planForcedIntent` con tool + args,
   test de routing real con control negativo, y **sacar `fuente_doi` de
   `INTENTS_SIN_ROUTING`** (el test dedicado fallará solito al cablear: esa es la señal
   diseñada; no hay que inventar un control nuevo).
5. Actualizar este documento (el chip deja de ser deuda).

## `asociaciones` — opciones para la decisión del operador (NO tomada aquí)

El chip `asociaciones` (kind `nav`, `heroRoute` → vista `asociaciones`, destacado para el
perfil campesino) navega bien cuando se toca desde el AgentHero. Lo indefinido es qué hace el
CHIP de la toolbar cuando el usuario escribe texto con la intención activa. Opciones sobre la
mesa (una la decide el operador; ninguna se implementa en este PR):

| Opción | Qué implicaría | Riesgo |
|---|---|---|
| **A. Navegar** con el texto como semilla de filtro (la vista `asociaciones` ya existe y tiene servicio client-side: `src/services/asociacionesFilter.js`) | Replicar en el chip lo que hace el heroRoute + prellenar la consulta | Bajo: todo es client-side, sin backend nuevo |
| **B. localGrounding** con el filtro de asociaciones y respuesta en el chat | Nuevo modo de resolución en el router (patrón `precio`/`incendio`) | Medio: nuevo contrato de plan |
| **C. Dejarlo al NLU** pero avisando (telemetría del turno degradado) | Mínimo código, pero el chip sigue sin cumplir lo que promete | Alto: persiste la patología "pintado sin efecto" |
| **D. Despintar el chip** (dejarlo solo como heroRoute del AgentHero) hasta decidir A/B | La alternativa honesta según el brief de la task | Bajo; pierde descubribilidad en la toolbar |

Mientras no haya decisión, el chip queda como está (congelado en `INTENTS_SIN_ROUTING` con su
test dedicado, que falla si alguien lo cablea sin sacarlo de la lista).

## Qué cambia en este repositorio

**Nada en comportamiento.** Solo este documento y un comentario de evidencia en el test de
congelamiento (`chipIntentRouter.test.js`) para que la verificación del 2026-09-04 quede en el
lugar donde alguien miraría antes de cablear. `INTENTS_SIN_ROUTING` NO se toca: no se cableó
nada, así que no se saca nada de la lista.
