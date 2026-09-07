# Informe CodeQL, 2026-09-06

## Alcance medido

Repositorio: `guatoc-ecohub/Chagra`.

La API consultada fue:

```text
gh api --method GET repos/guatoc-ecohub/Chagra/code-scanning/alerts --paginate -f state=open
```

La respuesta tuvo 37 alertas abiertas. No hay una sola categoría llamada “altas” que dé el total completo:

| Criterio | Conteo |
| --- | ---: |
| `security_severity_level=high` | 4 |
| `security_severity_level=medium` | 5 |
| `security_severity_level` sin clasificar | 28 |
| `rule.severity=error` | 25 |
| `rule.severity=warning` | 7 |
| `rule.severity=note` | 5 |

El análisis de la tabla siguiente usa `rule.severity` para agrupar el gate de errores y conserva por separado la severidad de seguridad. La lectura corresponde al estado abierto del repositorio al iniciar esta tarea, no al resultado futuro del nuevo análisis del PR.

## Alertas por regla y ruta

Todas las rutas afectadas están bajo `scripts/` y no forman parte del artefacto servido. La comprobación se hizo contra los workflows de deploy: sincronizan el contenido generado de `dist/` y su subdirectorio `dist/assets/`; no copian `scripts/`, `scripts/__tests__/` ni `scripts/experimentos/`.

| Regla | Alertas | Severidad de seguridad | Severidad de regla | Archivo(s) | ¿llega al usuario final? | Resultado de esta rama |
| --- | ---: | --- | --- | --- | --- | --- |
| `js/call-to-non-callable` | 22 | sin clasificar | error | `scripts/__tests__/puente-nonco.test.mjs` | No, está fuera de `dist/` | Corregidas en código: import de namespace y llamadas explícitas |
| `js/unused-local-variable` | 2 | sin clasificar | note | `scripts/__tests__/puente-nonco.test.mjs` | No | Corregidas: imports `fs` y `path` eliminados |
| `js/unused-local-variable` | 3 | sin clasificar | note | `scripts/scrape-gbif-plaga-fotos.mjs` | No | Corregidas: constantes y variable de bucle sin uso eliminadas |
| `js/unused-loop-variable` | 1 | sin clasificar | error | `scripts/scrape-gbif-plaga-fotos.mjs` | No | Corregida: el bucle ya no declara `pestData` sin usar |
| `js/log-injection` | 2 | medium | error | `scripts/scrape-gbif-plaga-fotos.mjs` | No | Corregidas: valores de log sin saltos de línea |
| `js/file-system-race` | 3 | high | warning | `scripts/scrape-gbif-plaga-fotos.mjs` | No | Corregidas: se eliminó el patrón comprobar-existir y luego escribir |
| `js/insecure-temporary-file` | 1 | high | warning | `scripts/__tests__/reindex-rag.test.mjs` | No | Corregida: `mkdtempSync` crea un directorio temporal exclusivo |
| `js/http-to-file-access` | 1 | medium | warning | `scripts/enrich-familia-botanica-gbif.mjs` | No | Pendiente: flujo intencional de respuesta GBIF a cache local |
| `js/file-access-to-http` | 1 | medium | warning | `scripts/enrich-familia-botanica-gbif.mjs` | No | Pendiente: nombres científicos del snapshot se envían al endpoint fijo de GBIF |
| `js/http-to-file-access` | 1 | medium | warning | `scripts/experimentos/reindex-rag.mjs` | No | Pendiente: logger opcional persiste mensajes derivados del proceso RAG |

## Cambios y pruebas

Commit: `d64bc997b fix(security): close actionable CodeQL alerts in scripts`.

PR contra `dev`: https://github.com/guatoc-ecohub/Chagra/pull/3178

Pruebas locales completadas:

- `npx vitest run scripts/__tests__/puente-nonco.test.mjs scripts/__tests__/reindex-rag.test.mjs`: 2 archivos, 22 tests, todos pasan.
- `node scripts/scrape-gbif-plaga-fotos.mjs`: dry-run correcto, 77 mapeos cargados y 9 pendientes, sin descarga ni escritura de datos.
- `git diff --check`: correcto.

El parche cubre 34 alertas abiertas por ubicación y deja 3 alertas intencionales de flujo de datos sin “silenciar” ni excluir. La confirmación remota de cuántas cierra CodeQL sigue pendiente porque el check `Analyze (javascript-typescript)` del PR #3178 estaba `in_progress` al cerrar este informe.

Si el nuevo análisis acepta las 34 correcciones, las 3 restantes son `medium/warning`: no cumplirían ni `high_or_higher` ni `errors`. Por tanto, el pronóstico es que CodeQL dejaría de bloquear por esos umbrales, pero no es una medición final hasta que el check termine. No se modificaron CodeQL, el ruleset ni las protecciones de rama.

El PR #2649 continúa sin tocarse ni mergearse. En la medición inicial de esta tarea tenía `CodeQL` fallando y `vitest` fallando; por separado, el PR de esta tarea todavía tenía sus checks en ejecución al redactar este documento.

## Pendientes razonables

Los tres flujos restantes necesitan una revisión del contrato de datos, no un cambio para maquillar el alerta:

1. Validar y acotar explícitamente la respuesta remota antes de persistir el cache GBIF.
2. Mantener el endpoint GBIF fijo y documentar el conjunto permitido de parámetros derivados del snapshot.
3. Decidir si el log opcional del experimento debe aceptar datos de documentos locales o escribir solo mensajes de esquema fijo.

No apliqué exclusiones, supresiones, cambios de umbral ni cambios de configuración para hacerlos desaparecer.

## Lo que NO pude verificar

- No pude verificar todavía la cifra final de alertas abiertas/cerradas en GitHub: el análisis CodeQL del PR #3178 seguía `in_progress`.
- No pude verificar todavía el resultado remoto de `vitest` del PR #3178: también seguía `in_progress`.
- No ejecuté la suite completa ni E2E; las pruebas locales fueron las dos suites directamente afectadas y el dry-run del scraper.
- No hice una publicación ni una captura del sitio, porque los archivos modificados están fuera del artefacto `dist/` y el cambio no afecta la UI servida.
