# ADR-047: FEAT-A · Memoria conversacional en sidecar agente

**Status:** Proposed — implementación pendiente (#292)
**Date:** 2026-05-27
**Deciders:** Operator (Miguel) + Claude Opus 4.7
**Related:** V-03 (RAG context bloat), #137 (N3 cross-conversation contamination), #246 (D2 tool composition), #251 (E1 self-correction)

## Contexto

El agente Chagra hoy es **stateless**: cada turno se procesa aislado, sin memoria de turnos anteriores en la misma conversación. Esto crea fricción reportada por testers técnicos:

> *"Le digo 'tengo aguacate Hass con cogollero', le respondo 'sí, en 2 hectáreas', y la siguiente pregunta ya olvidó que hablábamos de aguacate."*

Necesitamos persistir el contexto de **los últimos N turnos** por sesión sin:
- Sumar dependencias externas (Redis, DB extra).
- Inflar el prompt indefinidamente (degrada modelo local en Maxwell sm_5.2, ver bench V-03 vision).
- Romper el estado stateless en otros flujos (vision, voz) que NO necesitan memoria.

## Decisión

Implementar memoria conversacional **dentro del sidecar `chagra-agro-mcp`** con SQLite en memoria del proceso, gated detrás de feature flag `SIDECAR_CONVERSATIONAL_MEMORY` (default off).

### Modelo de datos

```sql
CREATE TABLE sessions (
  session_id   TEXT PRIMARY KEY,          -- UUIDv4 cliente-generated
  user_id      TEXT,                       -- opcional, multifinca scoping
  created_at   INTEGER NOT NULL,           -- unix epoch
  last_seen_at INTEGER NOT NULL,
  turn_count   INTEGER DEFAULT 0
);

CREATE TABLE turns (
  turn_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,           -- 1, 2, 3... orden dentro de sesión
  user_msg     TEXT NOT NULL,
  assistant_msg TEXT NOT NULL,
  entities     TEXT,                       -- JSON de resolve-entities cache
  tool_calls   TEXT,                       -- JSON de tools invocados
  created_at   INTEGER NOT NULL,
  is_summary   INTEGER DEFAULT 0           -- 1 si es resumen post-compresión
);

CREATE INDEX idx_turns_session ON turns(session_id, position);
CREATE INDEX idx_sessions_idle ON sessions(last_seen_at);
```

### API HTTP del sidecar

```
POST /memory/append
  Body: { session_id, user_msg, assistant_msg, entities?, tool_calls? }
  Resp: { turn_id, position, total_turns_in_session }

GET /memory/context?session_id=...&max_turns=5
  Resp: { turns: [{position, user_msg, assistant_msg, is_summary}], summary_chunks_count }

DELETE /memory/session?session_id=...
  Resp: { deleted: true }

POST /memory/compress?session_id=...
  Trigger manual (cron + auto dispara cada 6 turnos).
  Resp: { compressed_turns: 3, summary_id, new_total: N }
```

Todos protegidos con `Authorization: Bearer ${CHAGRA_MCP_TOKEN}` (mismo token que el resto del sidecar).

### Compresión por LLM-as-judge

Cuando `turn_count % 6 === 0`, ejecutar:

1. Tomar turnos `position = 1..3` (los más viejos).
2. Llamar `granite3.1-dense:8b` con prompt: "Resume estas 3 interacciones en ≤200 palabras manteniendo: entidades mencionadas (plantas, plagas, biopreparados), decisiones del user, datos numéricos (área, cantidades). Output sin prefijos, prosa directa."
3. Reemplazar los 3 turnos por 1 con `is_summary=1`, `user_msg=""`, `assistant_msg=<resumen>`.
4. Renumerar positions: el summary queda en `position=1`, el resto baja.

Esto evita prompt bloat exponencial mientras preserva el contexto semántico clave.

### Inyección al prompt LLM

Cuando `SIDECAR_CONVERSATIONAL_MEMORY=on` Y la request trae `X-Session-Id`:

```
<CONTEXTO_CONVERSACIONAL>
{{ each turn in session_history }}
[Turno {{position}}{{ '(resumen)' if is_summary }}]
Usuario: {{user_msg}}
Asistente: {{assistant_msg}}
{{ /each }}
</CONTEXTO_CONVERSACIONAL>

<TURNO_ACTUAL>
{{user_msg}}
</TURNO_ACTUAL>
```

Cap defensivo: si `(historial total) + (mensaje actual) > 60% num_ctx`, **truncar oldest** (NO summarize en runtime — sería caro). Telemetría loggea `memory_truncated:true`.

### Lifecycle

- **TTL**: sesiones idle >60min → flush automático (cron del sidecar cada 5min).
- **Manual**: cliente puede DELETE para reset (botón "Nueva conversación").
- **Cap**: máx 100 sesiones activas simultáneas. Si excede, evict LRU (last_seen_at asc).

### Cliente PWA

`X-Session-Id` se genera en localStorage al login (UUIDv4 vía `crypto.randomUUID()`), persiste mientras dure la sesión OAuth. Reset explícito desde UI ("Nueva conversación") genera nuevo UUID + DELETE al sidecar previo.

## Alternativas consideradas

| Opción | Por qué se descartó |
|---|---|
| **Memoria 100% client-side** | Imposible para sidecar / tools compuestos. El agente necesita ver contexto para decidir qué tool llamar. |
| **Redis externo** | Cost operacional (otro container) + latencia red (+5-15ms) sin beneficio para 100 sesiones. |
| **Sin memoria (status quo)** | Feedback unánime tester: fricción intolerable en flow de diagnóstico complejo. |
| **PostgreSQL del backend** | Acopla sidecar a esquema farmOS, mezcla preocupaciones. Sesiones efímeras no merecen tabla persistente. |

## Consecuencias

**Positivas:**
- Conversaciones coherentes multi-turno (resuelve fricción tester).
- Cap defensivo de prompt protege accuracy del modelo local.
- `entities_extracted` persistido habilita D2 (tool composition) y E1 (self-correction).
- Feature flag: rollback inmediato si bench gate degrada.

**Negativas:**
- +200ms latencia por turno (retrieve + inyección + compresión condicional).
- +50MB memoria sidecar @ 100 sesiones activas.
- +3-5 archivos nuevos en sidecar (`memory.ts`, `compressor.ts`, tests).
- Bug surface: race conditions entre append/compress requieren transacción SQLite.

## Plan de implementación (3 PRs)

**PR-A1**: Schema SQLite + repositorio CRUD básico
- `modules/agro-mcp/sidecar/src/memory/schema.ts`
- `modules/agro-mcp/sidecar/src/memory/repository.ts`
- Tests unit: append, get, delete, ttl-cleanup.
- Feature flag agregado a env config (default off).

**PR-A2**: Endpoints HTTP + middleware X-Session-Id
- `POST /memory/append`, `GET /memory/context`, `DELETE /memory/session`.
- Auth con `CHAGRA_MCP_TOKEN`.
- Tests integración: simular flow de 10 turnos, verificar order.

**PR-A3**: Inyección al prompt + compresión LLM-as-judge
- Modificar handler de `/chat` para inyectar contexto cuando flag on.
- Compressor con granite3.1-dense:8b.
- Cap defensivo + telemetría `memory_truncated`.
- Bench gate: 30 prompts multi-turn vs stateless baseline.

## Bench gate (criterios de aceptación)

Para mergear PR-A3 a main:
- **Accuracy keywords** (multi-turn): no cae >5pp vs stateless.
- **Latency p50**: no sube >20% (~200ms es objetivo).
- **Hallucination rate**: no sube vs baseline.
- **Multi-turn coherence** (eval manual o LLM-judge): ≥80% de conversaciones de 5 turnos preserva entidad mencionada en turno 1.

Si falla, feature flag stays off; iteración antes de re-activar.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Race condition append/compress | Transacción SQLite + lock por session_id (mutex en memoria proceso). |
| SQLite in-memory volátil (sidecar restart) | Aceptado — sesiones son efímeras de propósito. Próxima sesión arranca fresca, comportamiento documentado en UI. |
| Compresión LLM se equivoca y pierde info clave | Logging de input+output de cada compresión para auditoría. Bench gate atrapa regresión. |
| Multifinca: usuarios distintos en mismo device | `session_id` se invalida al cambio de tenant (mismo evento que dispara `tenantChanged` en cliente). |
| Memoria + entities_extracted → leak entre conversaciones | Aislamiento por `session_id` en repositorio + tests cross-session adversariales. |

## Referencias

- ADR-045 (sidecar MCP architecture)
- Bench V-03 (RAG context bloat — base para cap defensivo)
- Memoria N3 (#137): cross-conversation contamination — informa la decisión de aislar por session_id.
- `Chagra-strategy/personal/feat-a-memory-bench-plan-2026-05-27.md`: bench detallado.
