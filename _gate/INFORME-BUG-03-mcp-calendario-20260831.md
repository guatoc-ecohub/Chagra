# BUG-03, cierre de stream ante fallo MCP

## Resultado

La UI ya no depende del sentinel `[DONE]` para terminar una respuesta. Un chunk
OpenAI con `finish_reason` cierra el lector aunque el proxy no envíe el sentinel.
En el stream directo, un evento `type:error` del sidecar también es terminal y
se propaga como error tipado. `AgentScreen` siempre libera el estado `PENSANDO`
en `finally` y muestra un aviso específico cuando falla el calendario.

Mensaje de usuario cubierto por la regresión:

> No pude consultar el calendario ahora. Intenta de nuevo en un momento.

## Causa del 502

El cliente público no contiene la implementación de `get_calendario_siembra`.
Solo contiene el adaptador HTTP y la lista de herramientas permitidas. El
adaptador ya convierte cualquier respuesta no exitosa, incluido 502, en un
`ToolError` no lanzable. Por eso la causa del 502 pertenece al sidecar o a su
dependencia de datos, no a una función implementada en este repositorio.

El fallo de UI sí estaba en este repositorio: el parser de streaming esperaba
que llegara `[DONE]` incluso después de un `finish_reason` o un evento de error.

## Medición

- Regresión UI: 2 tests pasan. Se simula la respuesta de calendario como
  `ToolError` y se verifica que desaparece `eta-label`, que aparece el mensaje
  honesto y que el LLM puede completar una respuesta general.
- Parser OpenAI, sidecar stream y cliente MCP: el lote específico de 4 archivos
  pasa con 119 tests.
- No se pudo verificar aquí una petición viva al sidecar de desarrollo ni
  obtener el cuerpo del 502. La medición anterior es determinista y local, no
  debe citarse como diagnóstico de infraestructura.
