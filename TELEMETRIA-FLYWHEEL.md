# Telemetría Flywheel — Chagra Agent

> Rama `feat/telemetria-flywheel`. El motor de mejora continua del agente.

## Propósito

Convertir interacciones reales de campesinos en datasets de entrenamiento SFT/DPO para fine-tuning del modelo de lenguaje del agente. Hoy el agente solo mejora con benchmarks sintéticos; esto cierra el loop de mejora con datos REALES.

## Principios

1. **Privacidad primero**: NADA de PII. Ni nombres, ni fincas, ni ubicaciones GPS. Solo IDs anónimos del grafo de conocimiento.
2. **Offline-first intacto**: La telemetría se persiste en IndexedDB local. Sincronización cuando hay red, sin bloquear el agente.
3. **Aditivo y silencioso**: La telemetría nunca rompe el agente. Si falla, degrada sin ruido.
4. **Señal mínima sin fricción**: Dos botones (👍/👎). Una interacción. Sin formularios ni rating scales.

## Esquema de interacción

```json
{
  "id": "01J... (ULID)",
  "ts": "2026-07-14T12:00:00.000Z",
  "pregunta": "¿cómo controlo la broca del café sin químicos?",
  "intencion": "cafe_plaga_broca",
  "subgrafo_ids": ["node:broca", "edge:control_biologico", "node:beauveria"],
  "respuesta": "La broca se controla con Beauveria bassiana, un hongo...",
  "latencia_ms": 2340,
  "tokens_prompt": 450,
  "tokens_completion": 120,
  "guards_disparados": ["piso_termico_guard", "confusion_especie"],
  "senal_calidad": "explicita_buena",
  "sesion_id": "ses_20260714_abc123",
  "metadata": { "source": "chagra-agent", "version": "1.0" }
}
```

## Flujo de privacidad

```
Campesino pregunta → AgentScreen captura → agentTelemetryFlywheel:
  1. Anonimiza pregunta (strip de nombres propios)
  2. Guarda subgrafo_ids (nodos/aristas del grafo, nunca nombres de finca)
  3. Persiste en IndexedDB (offline-first)
  4. Al sincronizar: solo envía IDs, nunca texto con PII
```

## Señal de calidad

### Explícita (FeedbackSutil.jsx)
- 👍 "Me sirvió" → `explicita_buena`
- 👎 "No me sirvió" → `explicita_mala`
- Una sola interacción por respuesta. Sin re-voto.

### Implícita (detectarSenalImplicita)
- Reformuló la misma pregunta en <30s → `implicita_mala`
- Hizo otra pregunta distinta en <60s → `implicita_buena`
- Ninguna → `ambigua`

## Loop de mejora (flywheel)

```
[Uso real] → [Telemetría en IndexedDB] → [Export JSONL] → [mine-pairs]
  → [sft.jsonl + dpo.jsonl] → [qlora-qwen35 fine-tune] → [eval gate]
  → [deploy a prod] → [más uso real] → ...
```

## Archivos

| Archivo | Rol |
|---|---|
| `services/agentTelemetryFlywheel.js` | Esquema + IndexedDB + export |
| `components/agent/FeedbackSutil.jsx` | Widget 👍/👎 |
| `scripts/mine-pairs-from-telemetry.mjs` | Minador SFT/DPO desde JSONL |
| `services/__tests__/agentTelemetryFlywheel.test.js` | Tests del esquema y minador |

## Stats esperadas (por dimensión)

| Dimensión | Señal buena | Señal mala | DPO pairs |
|---|---|---|---|
| Plagas | 40 | 12 | 8 |
| Suelo | 25 | 5 | 3 |
| Clima | 15 | 3 | 2 |
| ... | ... | ... | ... |
