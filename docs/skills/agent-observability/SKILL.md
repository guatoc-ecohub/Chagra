---
name: agent-observability
description: Instrumenta agentes y herramientas con métricas, trazas y logs estructurados para conocer latencia, errores, uso de credenciales y calidad sin exponer prompts ni datos personales.
license: AGPL-3.0
---

# Observabilidad de agentes

Usa esta guía cuando una ruta de agente haga llamadas a un modelo, recupere
contexto o invoque herramientas. La instrumentación debe ayudar a responder
qué ocurrió, cuánto tardó y dónde falló, sin convertir prompts o respuestas en
un almacén de datos sensibles.

## Señales recomendadas

Empieza con métricas de baja cardinalidad. Los nombres siguientes son una
convención; adapta el backend y no introduzcas un proveedor obligatorio.

| Señal | Medición | Labels seguros |
|---|---|---|
| Solicitud | duración total y estado | `agent`, `status` |
| Modelo | duración y errores | `model`, `provider`, `status` |
| Herramienta | duración, éxito, timeout | `tool`, `status` |
| Uso | unidades de entrada y salida | `model`, `agent` |
| Calidad | resultado de evaluación | `suite`, `case`, `status` |

Nombres Prometheus sugeridos: `agent_request_duration_seconds`,
`llm_call_duration_seconds`, `agent_tool_call_duration_seconds`,
`agent_tool_calls_total`, `llm_errors_total` y contadores separados para
unidades de entrada y salida. No uses prompt, asset ID, usuario, URL o texto de
error como label.

## Trazas por operación

Modela cada turno como una traza con spans anidados:

1. solicitud del agente;
2. recuperación de contexto;
3. cada llamada al modelo;
4. cada invocación de herramienta;
5. respuesta final o error.

Propaga un `trace_id` correlacionable entre logs y métricas. Registra en spans
solo metadatos operativos: nombre de modelo, herramienta, duración, estado,
conteos y códigos de error. El endpoint del exportador debe llegar por una
variable de entorno y la exportación debe poder apagarse en desarrollo.

## Logs seguros

Usa JSON estructurado con campos como `timestamp`, `trace_id`, `operation`,
`status`, `duration_ms` y `error_type`. Antes de emitirlos:

- redacta credenciales, cookies, cabeceras de autorización y PII;
- elimina prompts y respuestas completas, salvo un fixture sintético de test;
- trunca mensajes de error y conserva una clasificación estable;
- aplica retención y acceso mínimo al backend de logs;
- registra el motivo de una denegación sin revelar la regla interna completa.

No midas costo monetario asumiendo un proveedor. Si el modelo local no tiene
precio, registra unidades y tiempo. Si más adelante existe un precio, calcula el
costo fuera del prompt y mantén la tarifa versionada y auditable.

## SLOs y alertas

Define primero una línea base y luego umbrales que correspondan al producto:

- p95 de respuesta del agente;
- tasa de errores y timeouts por herramienta;
- porcentaje de respuestas que requieren reintento;
- crecimiento anómalo de unidades por operación;
- porcentaje de casos de evaluación que regresan.

Las alertas deben señalar síntomas, no incluir payloads. Un spike de unidades o
errores debe llevar a un `trace_id` y a una clasificación, nunca a copiar el
prompt en el canal de alertas.

## Checklist de implementación

- [ ] Existe una métrica de duración total y otra por llamada de modelo y
      herramienta.
- [ ] Éxitos, errores, timeouts y cancelaciones se distinguen.
- [ ] Labels y atributos tienen cardinalidad acotada.
- [ ] Los spans comparten `trace_id` con los logs.
- [ ] Redacción y truncado se prueban con fixtures sintéticos.
- [ ] La exportación es opt-in o configurable por entorno.
- [ ] No se guardan credenciales, prompts, respuestas completas ni identificadores de
      assets en observabilidad.
- [ ] Las métricas de calidad se conectan a una suite reproducible.
