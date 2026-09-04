# Auditoría del auditor de integraciones, 2026-09-04

## Base y método

- Base verificada: `3decfc4b3` (`origin/rescate/dev-pre-reescritura-20260904`).
- Control de base: `catalog/chagra-catalog-seed-v3.2.json` existe.
- Mediciones repetidas antes y después: deterministas en dos corridas por estado.
- Salida cruda final, sin editar: [`_gate/auditor-final-crudo.txt`](./auditor-final-crudo.txt).

La cifra de 205 indicada en el encargo no se reprodujo en esta base: dos corridas iniciales de `node scripts/audit-integraciones.mjs` devolvieron 175. Esa es la medición que corresponde citar para este worktree.

## Clasificación medida

| Cubeta | Conteo inicial | Criterio y resultado |
| --- | ---: | --- |
| Falso positivo del instrumento | 0 | `src/hooks/useT.js` no tiene importador que resuelva a ese módulo. El comando de control usaba el prefijo `hooks/useT` y también contó `useTheme` y `useTtsAmplitude`. El parser de imports del motor, `scripts/lib/alcance-simbolica.mjs:193-195`, resuelve los especificadores con `resolverSpec` en `:99-102`; por ello lo clasifica correctamente como `HUERFANO`. |
| Deuda real | 167 | 23 módulos `SOLO_TEST` y 144 `HUERFANO`. Cada ID quedó declarado explícitamente en dos grupos de `ops/integraciones-no-consumidas.json`, con `reason` y `date`. |
| No es capacidad | 8 | Las ocho declaraciones bajo `src/types/*.d.ts` no entran al grafo emitible. `extname()` las veía como `.ts`; se excluyen ahora en `scripts/lib/alcance-simbolica.mjs` y en el barrido auxiliar de `scripts/audit-integraciones.mjs`. |

## Arreglo y controles

`esModuloAuditable()` excluye `*.d.ts` antes de construir `TODOS`, el universo que alimenta los resultados de alcance. El barrido `allSrcFiles` aplica la misma exclusión para que la herramienta no vuelva a tratarlas como fuente auditable.

La regresión usa un fixture hermético:

- `src/types/solo-tipos.d.ts` no aparece en la auditoría. Si se revierte la exclusión, el test falla.
- `src/hooks/useConectado.js`, importado por una cadena estática alcanzable desde `App.jsx`, no aparece como huérfano. Si se rompe la propagación de imports estáticos, el test falla.

Verificación: `npx vitest run scripts/__tests__/audit-integraciones.test.mjs` dio 23/23.

## Conteos

| Corrida | Universo de `src/` | Sin declarar | Exit |
| --- | ---: | ---: | ---: |
| Antes | 1602 | 175 = 167 deuda real + 8 `.d.ts` | 1 |
| Después | 1594 | 0 | 0 |

Persisten 13 avisos de entradas históricas de allowlist que ya no coinciden con hallazgos. El propio auditor los informa como curaduría pendiente y no se modificaron en este card.

## No verificado

No se clasificaron endpoints de un repositorio privado vecino. En este worktree no está disponible y el script los salta, que es el comportamiento documentado para CI público. No se copiaron ni declararon detalles de ese árbol en el repositorio público.
