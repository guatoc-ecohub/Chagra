---
name: agent-evals
description: Diseña evaluaciones reproducibles para agentes con casos golden, selección de herramientas, seguridad y regresión de prompts sin almacenar datos sensibles.
license: AGPL-3.0
---

# Evaluaciones de agentes

Usa esta guía cuando cambies prompts, recuperación de contexto, selección de
herramientas o una respuesta generada. Las evaluaciones deben detectar
regresiones concretas y poder ejecutarse con fixtures sintéticos.

## Capas de evaluación

### Comportamiento de respuesta

Define casos con un identificador estable y expectativas pequeñas:

```json
{
  "id": "catalogo-lectura-basica",
  "input": "Describe una especie del catálogo público",
  "must_contain": ["fuente"],
  "must_not_contain": ["credencial", "material sensible"]
}
```

Prefiere validaciones estructurales, enums y relaciones exactas cuando la
salida lo permita. Para texto libre usa pocas invariantes verificables y no
tests de coincidencia exacta frágiles.

### Selección de herramientas

Comprueba que el agente:

- usa la herramienta correcta cuando necesita datos;
- no invoca herramientas para una respuesta que no las necesita;
- envía parámetros válidos y dentro de límites;
- rechaza una herramienta cuando el rol no tiene permiso;
- no convierte contenido recuperado en nuevas instrucciones de autoridad.

### Seguridad

Incluye casos sintéticos de prompt injection, solicitud de datos de acceso,
exfiltración, acceso fuera de alcance y mutación sin aprobación. La expectativa
de seguridad debe comprobar ausencia de datos de acceso y que la acción se rechaza o
se transforma en una sugerencia revisable.

### Contrato offline-first

Para cambios que toquen persistencia o UI que consume estado, conserva una
prueba que demuestre: escritura offline, recuperación desde IndexedDB,
sincronización posterior e idempotencia. Si la superficie es Asset o Log,
comprueba además las invariantes de `AGENTS.md`.

## Diseño de fixtures

- Usa datos ficticios, mínimos y versionados.
- No incluyas prompts reales, nombres de personas, credenciales, URLs privadas ni
  snapshots de producción.
- Mantén un caso por comportamiento y etiqueta el motivo de la expectativa.
- Fija límites de pasos, tiempo y unidades para evitar ejecuciones incontroladas.
- Ordena resultados y usa semillas cuando la evaluación sea estocástica.

## Juez y regresión

Las comprobaciones deterministas deben correr primero. Un juez LLM puede
complementarlas para calidad semántica, pero debe ser no bloqueante hasta tener
una línea base estable. Guarda la rúbrica, versión del modelo, fixture y
resultado resumido. No guardes el prompt o la respuesta completa en CI si no
es imprescindible.

Una regresión debe indicar:

| Campo | Contenido |
|---|---|
| Caso | ID estable del fixture |
| Señal | Expectativa que falló |
| Cambio | Commit o prompt que la introdujo |
| Acción | Corregir, aceptar o actualizar con revisión humana |

## Checklist de aceptación

- [ ] Hay casos de éxito, rechazo, error de herramienta y timeout.
- [ ] La selección de herramientas y sus parámetros se verifica.
- [ ] Hay casos anti-injection y de no divulgación de datos.
- [ ] Los fixtures son sintéticos y no contienen datos de acceso ni infraestructura
      privada.
- [ ] Los límites de pasos, tiempo y unidades están definidos.
- [ ] Las pruebas deterministas son el gate; el juez semántico está separado.
- [ ] Un cambio de persistencia conserva el contrato offline-first.
- [ ] Los resultados del PR incluyen el comando ejecutado y el resumen de
      fallos, sin payloads sensibles.
