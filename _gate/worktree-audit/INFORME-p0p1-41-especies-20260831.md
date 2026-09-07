# Informe P0/P1, auditoría de 41 especies

Fecha: 2026-08-31  
Rama: `codex/fix-p0p1-41especies`  
Base: `origin/dev` (`6c662b714`)

## Entregado

- P0: se añadió `eruca_vesicaria`, nombre científico `Eruca vesicaria (L.) Cav.`, al seed v3.2. Incluye taxonomía, entorno, MIP, apoyos de biopreparado y referencias públicas. El rendimiento queda explícitamente como `SlotPendiente`.
- P0: se añadió la carga idempotente `scripts/load-age-eruca-vesicaria-2026-08-31.mjs` y se aplicó al grafo AGE `chagra_kg`.
- P1a: `formatToolEvidence` marca `RENDIMIENTO = SlotPendiente`; `guardMissingYield` reemplaza una cifra no respaldada durante una consulta de rendimiento. Una cifra documentada en la evidencia sí pasa.
- P1b: el grafo marca `solanum_lycopersicum`, `solanum_lycopersicum_san_marzano` y `solanum_lycopersicum_cerasiforme` con `invernadero = true` y una nota que encuadra 2200 msnm sin extender ni borrar el rango de campo abierto.

## Fuentes incorporadas

- POWO, *Eruca vesicaria (L.) Cav.*: https://powo.science.kew.org/taxon/urn%3Alsid%3Aipni.org%3Anames%3A1137625-2
- UC IPM, *Pest Management Guidelines: Cole Crops*: https://ipm.ucanr.edu/pdf/pmg/pmgcolecrops.pdf
- University of Minnesota Extension, *Crop and field planning tools for vegetable farmers*: https://extension.umn.edu/vegetable-growing-guides-farmers/crop-and-field-planning-tools-vegetable-farmers
- AGROSAVIA, *Cultivando la inocuidad de mis frutas y hortalizas*, DOI `10.21930/agrosavia.nbook.7403084`: https://editorial.agrosavia.co/index.php/publicaciones/catalog/book/98
- Jardín Botánico de Bogotá, recurso experimental de Eruca vesicaria: https://catalogador.jbb.gov.co/app/resource?r=001_bio-em_sc_2021038_2

## Gates ejecutados

Catálogo:

```text
node scripts/validate-catalog.mjs catalog/chagra-catalog-seed-v3.2.json catalog/schema-v3.1.json --seed-mode --lenient-schema
✓ Catálogo válido
  73 especies, 36 biopreparados, 79 sources
```

El validador reporta 58 warnings de esquema heredados por `_url_pendiente`; no son introducidos por esta especie. Las comprobaciones AMB-05 y AMB-10 a AMB-32 pasan. AMB-18 también pasa después de normalizar el JSON.

Caso P1a:

```text
npx vitest run src/services/__tests__/outputGuards.missingYield.test.js src/services/__tests__/agentPromptBase.test.js
Test Files  2 passed (2)
Tests       65 passed (65)
```

Lint de los archivos modificados: sin salida de error.

## Consulta AGE de aceptación

La consulta confirmó:

```text
eruca_vesicaria | Eruca vesicaria (L.) Cav. | 1910 | 2600 | null | SlotPendiente
```

Además confirmó 13 relaciones salientes, incluyendo 7 `REFERENCED_BY`, `HAS_FAMILY`, dos `GROWS_IN`, `HAS_ROLE` y dos `USED_AS_BIOPREPARADO`; tres plagas afectan la especie: `albugo_candida`, `palomilla_de_las_cruciferas_plutella_xylostella` y `afidos_myzus_persicae_aphis_gossypii`.

Para tomate, la consulta devolvió `invernadero = true` y la nota de 2200 msnm en las tres entradas indicadas.

## No verificado / límites

- No se ejecutó validación visual o FPS: esta tarea modifica catálogo, grafo y guardas textuales, no una escena 3D.
- La suite completa del repositorio conserva 7 fallos preexistentes en `src/services/__tests__/chipIntentRouter.test.js`, relacionados con dos intents adicionales (`asociaciones` y `fuente_doi`) y sus planes. No se tocó ese alcance.
- El reporte opcional `node scripts/validate-catalog-consistency.mjs --report-only` conserva 43 incidencias preexistentes en el catálogo completo (1 nombre científico y 42 referencias base ausentes); la nueva rúcula no aparece entre ellas.
- No se inventó una cifra de rendimiento para rúcula. El dato de 25-45 días es tiempo orientativo a primera cosecha en fuentes de extensión, no rendimiento.
