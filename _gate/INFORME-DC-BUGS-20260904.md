# Informe DC BUG-03a y BUG-01

## Decisiones conservadoras

- Un argumento de calendario que el planner no pudo derivar se omite del body.
  No se sustituye por una fecha, un piso térmico ni otro valor inventado.
- El sidecar que implementa `/api/mcp/agro/nlu` y el endpoint de herramientas no
  está en este repositorio público. Se aplicó la protección en el único límite
  modificable aquí: antes del POST a la herramienta.
- Para BUG-01 se siguió la bifurcación indicada en el encargo. El control manual
  tampoco escribe los dos stores consultados, por lo que no se fabricó un cambio
  exclusivo para la ruta NLU.

## BUG-03a

### Causa y líneas

| Componente | Hallazgo |
| --- | --- |
| Planner server-side `/api/mcp/agro/nlu` | Es quien produjo `{"mes":"","piso_termico":""}` según la Corrida 2. Su archivo y línea no están presentes en este worktree OSS; por tanto no es posible nombrarlos sin inventarlos. |
| `src/services/sidecarClient.js:246` | Adaptador público que acepta `raw.args` del planner sin modificarlo. |
| `src/services/sidecarClient.js:983-1006` | Corrección: `omitEmptyCalendarioArgs()` elimina únicamente `mes` y `piso_termico` cuando son strings vacíos antes del POST de `callTool()`. |

El contrato aplicado es: ausencia de dato = campo omitido. La normalización de
tildes continúa aplicándose después de la coerción existente. El control
negativo en `src/services/__tests__/sidecarClient.test.js` falla si cualquiera
de los dos campos vuelve a salir como `""`.

No fue posible cambiar ni probar la validación interna del endpoint: esa
implementación no está en este repositorio. El cliente deja de enviar el body
que provocaba el 502; si el servidor rechaza un argumento omitido, el contrato
actual del cliente lo transforma en `ToolError { reason: 'fetch_failed' }`, que
la UI ya muestra como fallo amable en lugar de dejar el turno colgado.

## BUG-01: control manual primero

Control ejecutado por el flujo manual `Registrar → escríbelo a mano → Guardar
registro`, con el volcado de IndexedDB de la Corrida 2. Extracto crudo relevante
del dump, sin valores de sesión:

```text
ANTES
farm_processes:        count 0
farm_process_events:   count 0
pending_transactions:  count 0
logs:                  count 0
inventory_events:      count 0

DESPUÉS
farm_processes:        count 0
farm_process_events:   count 0
pending_transactions:  count 0
logs:                  count 0
inventory_events:      count 0
pilot_telemetry:       count 2

POST /api/log/harvest: 201
pantalla final: "Cosecha guardado"
```

El control manual sí persiste remotamente, pero no actualiza `logs` ni
`inventory_events` en IndexedDB. La ruta es `src/services/payloadService.js:134`
(`sendToFarmOS(endpoint, payload)`), que solo emite eventos de ventana en las
líneas 135-142 y no llama a `logCache` ni a `inventoryService`.

Por ello la condición de la instrucción es la segunda: el manual tampoco escribe
estos stores. BUG-01 no se corrigió en la ingesta NLU. El defecto real es una
desalineación de caché local entre la tubería manual, la de FarmProcess y las
vistas que consumen `logs`/`inventory_events`; requiere decidir cuál es la fuente
de proyección antes de tocar persistencia.

## Verificación

```text
$ npx vitest run src/services/__tests__/sidecarClient.coerce.test.js src/services/__tests__/sidecarClient.test.js --reporter=verbose
Test Files  2 passed (2)
     Tests  112 passed (112)
```

```text
$ npm run test
> chagra@1.0.55 test
> vitest run && node scripts/validate-catalog-consistency.mjs --report-only

catalog/__tests__/migrate-v31-to-v32.test.js: 8 failed
FATAL ERROR: MarkCompactCollector: young object promotion failed Allocation failed - JavaScript heap out of memory
[vitest-pool]: Failed to terminate forks worker ...
```

El suite completo no terminó: falló con ocho pruebas de migración de catálogo y
después agotó memoria en workers de Vitest. No corresponden a los dos archivos
modificados; la regresión enfocada sí pasó.

```text
$ npx tsc --noEmit
Version 6.0.3
tsc: The TypeScript Compiler - Version 6.0.3
```

El comando salió con código cero, pero este worktree no tiene `tsconfig.json`:
TypeScript mostró ayuda y no verificó un proyecto. No se debe citar como chequeo
de tipos efectivo.
