# INFORME · BUG-10 — conteo manual falla por `'unidades'` vs enum `'unidad'`

**Fecha:** 2026-09-05 · **Carril:** opencode/deepseek-v4-flash · **PR:** https://github.com/guatoc-ecohub/Chagra/pull/3168 (draft, base `dev`)

## El defecto (confirmado en código sobre origin/dev)

`InventoryDashboard.jsx:41` fabricaba `const unit = item.attributes?.inventory_unit || 'unidades';`
para materiales sin `inventory_unit` (los del formulario simple de Activos). Ese valor viajaba como
`currentUnit` al `RecountDrawer` (`InventoryPage.handleRecount`), cuyo `<select>` solo ofrece
miembros de `VALID_UNITS` (`inventoryEvents.js:35`, autoridad = **`'unidad'`** singular). El submit
mandaba `payload.unit = 'unidades'` y `createInventoryEvent` lo rechazaba con
`Invalid payload.unit: ... got "unidades"` → `inventory_events` quedaba en 0. Se veía "bolsa" en el
select (orden alfabético) mientras el estado real era el valor inválido.

## El arreglo

Una línea en `InventoryDashboard.jsx:41`: fallback `'unidad'` (miembro del enum). Aditivo y mínimo,
sin refactor alrededor.

## Barrido `unidad`/`unidades` en `src/` — decisión caso por caso

### Archivos TOCADOS (2)

| Archivo | Cambio |
| --- | --- |
| `src/components/InventoryDashboard.jsx` | fallback `'unidades'` → `'unidad'` (línea 41). Única aparición donde el plural alimenta un payload validado contra `VALID_UNITS` (default del conteo manual). |
| `src/components/__tests__/InventoryDashboard.recount.test.jsx` | test de regresión BUG-10 (material sin `inventory_unit` → el conteo recibe `'unidad'` y es miembro de `VALID_UNITS`). |

### Archivos REVISADOS y NO tocados (con razón)

| Archivo | Aparición | Por qué no se toca |
| --- | --- | --- |
| `src/components/InventoryDashboard.jsx:442` | fallback `'unidades'` en modal Abastecer | texto de interfaz puro, nunca validado por el enum; plural correcto en la frase visible. |
| `src/components/InventoryAuditDashboard.jsx:65` | fallback `'unid'` | solo display (tabla + confirm); su write es `log--observation` vía `savePayload`, sin validación de `VALID_UNITS`. |
| `src/config/materials.js:81` | `UNIT_OPTIONS { value: 'unidades' }` | vocabulario distinto (`ml/l/g/kg/unidades/bultos`) que alimenta cantidades de `log--input` y conversiones de stock, NO eventos de inventario. Alinearlo arrastraría también `'l'` vs `'litro'` y `'bultos'`; fuera del scope de una línea. |
| `src/components/AssetsDashboard.jsx:1034` | `<option value="unidades">unds</option>` (cosecha) | dominio cosecha de plantas, no eventos de inventario. |
| `src/components/cosecha/MiCosechaScreen.jsx:133` | display `'kg'`/`'unidades'` | texto de interfaz del dominio cosecha. |
| `src/services/cosechaService.js` | `normalizeUnit` (comentario + reglas) | ya normaliza plural→singular antes de usarlas; no es enum de eventos. |
| `src/services/agentIntentParser.js:22` | default `'unidades'` | parser de voz para cosecha/riego; mismo dominio cosecha. |
| `src/services/voiceFieldExtractor.js:251,271` | `measures.unidad = 'unidades'` | extracción por voz; mismo dominio cosecha. |
| Resto del árbol (mockups, `visual/`, `data/`, comentarios, unidades de viewBox SVG, marketplace) | ocurrencias de la palabra | no son valores del enum de inventario. |

No se hizo reemplazo global a ciegas.

## Verificación

Test de regresión: falla ANTES del arreglo (`expected 'unidad'`, received `'unidades'`) y pasa
DESPUÉS. Suites relacionadas en verde: `InventoryDashboard.recount`, `InventoryPage.recount`,
`inventoryEvents.test`, `inventoryService.test`, `inventoryService.fixture.test`,
`planGeneratorService.test`, `App.auditoria-inventario-route.test.jsx` → **7 archivos, 89 tests OK**.
ESLint `--max-warnings=0` en los dos archivos: limpio.

## Outputs verificables (Regla 6)

`git log --oneline origin/dev..HEAD`:
```
9b648df7e fix(inventario): el conteo manual usa 'unidad' del enum, no 'unidades' (BUG-10)
```

`git diff --stat origin/dev..HEAD`:
```
 src/components/InventoryDashboard.jsx              |  2 +-
 .../__tests__/InventoryDashboard.recount.test.jsx  | 33 +++++++++++++++++++++-
 2 files changed, 33 insertions(+), 2 deletions(-)
```

`git diff --diff-filter=D --name-only origin/dev..HEAD` → vacío (sin deletes).

`git status --short` → vacío. PR: https://github.com/guatoc-ecohub/Chagra/pull/3168 (draft, base dev, MERGEABLE).

## Lo que NO pude / queda abierto

- Materiales con `inventory_unit` persistido con valores fuera del enum por datos previos
  (p. ej. `'unidades'` o `'l'` escritos por `addInputLog`) seguirían fallando el conteo. No hay
  evidencia en la auditoría de ese dato histórico; el fix ataca el productor observado. Un
  sanitizado de `currentUnit` contra `VALID_UNITS` en `RecountDrawer.jsx:21` cerraría esa clase y
  eliminaría el síntoma del select que "miente" (muestra `bolsa` con estado inválido). Queda fuera
  del cambio mínimo; anotado para pasada futura.
- La divergencia de vocabularios (`UNIT_OPTIONS` `l/unidades/bultos` vs `VALID_UNITS`
  `litro/unidad/...`) es un gap sistémico de diseño que excede BUG-10.
- No se ejecutó el gate visual (no aplica: cambio de dato, no visual).
