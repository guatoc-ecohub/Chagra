# Auditoria de la arana de capacidades y MCP

Fecha: 2026-06-08

Alcance: revisar, sin implementar cambios de UX, si el menu desplegable de
capacidades del agente comunica y ejecuta ayuda predecible para una persona
campesina. Incluye la integracion MCP realmente desplegada y las tareas que
salen de la inspeccion.

## Veredicto

La arana no es suficientemente clara ni confiable para entrega a usuarios.
Opciones visualmente equivalentes tienen tres comportamientos distintos:

1. En inicio, algunas opciones envian de inmediato una pregunta generica.
2. En el chat, la misma seleccion solo activa un modo para el siguiente mensaje.
3. Otros chips pasan por deteccion normal de intencion.

Ademas, varios modos MCP usan nombres o argumentos desactualizados. Cuando el
tool falla, el agente puede continuar silenciosamente con una respuesta
generativa. La persona no puede saber si Chagra consulto una fuente, no encontro
datos o tuvo un fallo.

## Hallazgos comprobados

- Existen dos catalogos separados: `AgentHero.jsx` y `chipIntentRouter.js`.
  Sus etiquetas, herramientas y comportamiento ya divergieron.
- El menu de `AgentScreen.jsx` promete empezar al tocar una opcion, pero en
  realidad solo prepara el siguiente envio. No explica claramente que falta
  indicar cultivo, problema o municipio, ni que el modo se consume una vez.
- La hoja interna muestra todas las capacidades sin respetar de forma uniforme
  disponibilidad, feature flag o nivel de cuenta.
- Se promete que toda respuesta trae fuente, aunque existen rutas generativas y
  fallos MCP sin evidencia.
- El router declara inexistentes calendario y precio, pero el MCP desplegado
  contiene `get_calendario_siembra` y `get_precio_sipsa`.
- El cliente sidecar de Chagra no permite `get_calendario_siembra`.
- Los argumentos forzados no coinciden con varios schemas reales: por ejemplo,
  `query` frente a `id_or_name`, `pest` frente a `pest_id_or_name`, y `query`
  frente a `species_id_or_pest`.
- Un fallo, timeout, argumento invalido o respuesta vacia del sidecar se reduce
  a `null`. Para la persona todos esos casos son indistinguibles.
- Si falla una capacidad elegida explicitamente, el flujo puede desactivar el
  grounding de respaldo y aun asi generar una respuesta sin advertirlo.
- El servicio productivo usa el MCP de `chagra-pro/modules/agro-mcp`, mientras
  existe otro repositorio POC con solo tres tools. Documentacion y contratos no
  dejan clara esta diferencia.
- El MCP productivo se ejecuta desde un worktree mutable. Eso dificulta saber
  con precision que contratos estan activos.

## Prueba de claridad campesina

Cada opcion visible debe permitir responder, antes de tocarla:

- Que ayuda concreta voy a recibir.
- Que dato debo dar ahora.
- Si Chagra va a consultar datos o realizar/registrar una accion.
- De donde viene la respuesta.
- Que pasa si no hay internet, datos o acceso a la herramienta.

La interfaz actual no supera esta prueba. Terminos tecnicos como nombres de
tools no deben ser necesarios para entenderla; tampoco se debe presentar como
accion inmediata algo que solamente cambia el modo del siguiente mensaje.

## Tareas repriorizadas

### P0 - Bloquean entrega

1. **CAP-MCP-001: Fuente unica de capacidades.** Crear un manifiesto compartido
   por inicio, chat, toolbar, router y contrato sidecar. Debe declarar etiqueta
   campesina, accion, datos requeridos, tool/schema, fuente, disponibilidad,
   nivel de cuenta y semantica inmediata o de siguiente mensaje.
2. **CAP-MCP-002: Corregir contratos MCP de extremo a extremo.** Alinear nombres
   y argumentos con el MCP desplegado; incluir calendario y precio reales.
   Agregar una prueba automatica contra `/tools` que falle ante drift.
3. **CAP-MCP-003: Prohibir fallback silencioso.** Si falla una capacidad elegida
   por la persona, mostrar causa util, dato faltante o reintento. No presentar
   una respuesta generativa como consultada o respaldada.
4. **CAP-MCP-004: Unificar la semantica de seleccion.** Una opcion debe ejecutar
   ayuda inmediatamente o activar de forma visible `Ahora dime...`, con ejemplo,
   estado activo de un solo uso y forma clara de cancelar.

### P1 - Claridad y confianza

5. **CAP-MCP-005: Fuente honesta por respuesta.** Sustituir la promesa absoluta
   por estado verificable: fuente consultada, sin datos o respuesta general.
6. **CAP-MCP-006: Mostrar solo capacidades disponibles.** Aplicar feature flags,
   nivel de cuenta, conectividad y salud MCP en todos los menus.
7. **CAP-MCP-007: Reescribir para tareas campesinas.** Usar frases como
   `Quiero saber que sembrar` y `Tengo una plaga`, explicar el dato requerido y
   validar comprension con escenarios reales, sin exponer IDs tecnicos.
8. **CAP-MCP-008: Diferenciar preguntar, abrir y registrar.** La etiqueta debe
   coincidir con el efecto real. Toda escritura o registro requiere confirmacion.

### P2 - Prevencion y operacion

9. **CAP-MCP-009: Matriz E2E de la arana.** Probar cada opcion visible contra
   ruta, tool, argumentos, mensaje de exito/error y fuente en online, offline,
   tool caido, sin datos, cuenta gratuita y Pro.
10. **CAP-MCP-010: Telemetria privada de utilidad.** Medir seleccion, envio,
    exito/fallo del tool, abandono y tiempo hasta respuesta util, sin almacenar
    contenido sensible.
11. **CAP-MCP-011: Fijar el MCP productivo.** Documentar el repositorio
    canonico y desplegar un artefacto versionado reproducible, no un worktree
    mutable.
12. **CAP-MCP-012: Gate CI contra drift.** Comparar manifiesto, schemas MCP,
    allowlists y documentacion en cada cambio.

## Orden de resolucion recomendado

No conviene empezar por cambiar textos. Primero deben resolverse
`CAP-MCP-001` a `CAP-MCP-004`; de lo contrario, una interfaz mas clara seguiria
enviando herramientas incorrectas o escondiendo fallos. Despues se valida la
comprension campesina y finalmente se agregan observabilidad y gates.

## Estado de implementacion P0

Implementado el 2026-06-08:

- `CAP-MCP-001`: manifiesto unico en `src/services/agentCapabilities.js`.
- `CAP-MCP-002`: nombres y argumentos alineados con los schemas MCP reales;
  calendario y precio habilitados en el cliente.
- `CAP-MCP-003`: una capacidad explicita sin evidencia corta el pipeline antes
  del LLM y muestra un mensaje sin afirmar fuente.
- `CAP-MCP-004`: inicio y chat activan un modo visible de un solo uso, explican
  el dato requerido y permiten cancelarlo.

La regresion se vigila en
`src/services/__tests__/agentCapabilities.audit.test.js`. La prueba falla ante
catalogos duplicados, tools fuera de allowlist, argumentos requeridos ausentes,
promesas absolutas de fuente o desaparicion del corte de fallback silencioso.
