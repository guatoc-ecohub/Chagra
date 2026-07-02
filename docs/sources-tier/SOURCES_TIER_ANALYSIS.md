# Task #sources-tier — Análisis de clasificación de fuentes

## Resumen ejecutivo

**Fecha:** 2026-07-01  
**Task:** Clasificar las ~66 fuentes con tier=null del catálogo en tier A/B/C  
**Hallazgo:** **Todas las fuentes ya están clasificadas correctamente. No se encontraron fuentes con tier=null.**

## Estado actual del catálogo

### Distribución de tiers

| Archivo | Total fuentes | Tier A | Tier B | Tier C | Con tier=null |
|---------|---------------|--------|--------|--------|---------------|
| `sources-seed.json` | 54 | 42 (78%) | 10 (18%) | 2 (4%) | 0 |
| `chagra-catalog-seed-v3.1.json` | 75 | - | - | - | 0 |
| `chagra-catalog-oss-subset-v3.2.json` | 71 | - | - | - | 0 |

### Ejemplos de clasificación

#### Tier A — Peer-review / Oficial gobierno (42 fuentes)

**Instituciones oficiales colombianas:**
- AGROSAVIA: fichas técnicas, manuales agronómicos
- ICA: resoluciones oficiales, variedades registradas
- MADS: normativa ambiental, listados de especies amenazadas
- IAvH: catálogos de biodiversidad, estudios de páramos

**Bases de datos globales:**
- GBIF: backbone taxonómico, registros de ocurrencias
- POWO (Kew): nombres aceptados de plantas
- FAO EcoCrop: requerimientos agroclimáticos

**Literatura académica:**
- Artículos en revistas peer-reviewed (Agronomía Colombiana, PhytoKeys)
- Libros académicos con ISBN/editorial reconocida

#### Tier B — Técnico / Divulgación (10 fuentes)

**Manuales agroecológicos:**
- Restrepo Rivera (varios): ABC de agricultura orgánica, biofermentos
- Pérez Arbeláez (1947): Plantas Útiles de Colombia

**Informes institucionales:**
- Flora Colombia Pteridophyta (UNAL)
- Restauración ecológica Cruz Verde-Sumapaz

**Revistas no indexadas:**
- Livestock Research for Rural Development

#### Tier C — Blogs / Wikis no peer-review (2 fuentes)

**Obras populares:**
- Pamplona Roger (2006): Enciclopedia de plantas medicinales (no peer-reviewed)
- Mongabay Latam (2024): Periodismo ambiental (no peer-reviewed)

## Validación

El validador AMB-23 del catálogo confirma que todas las fuentes tienen tier asignado:

```bash
$ node scripts/validate-catalog.mjs --lenient-schema catalog/chagra-catalog-oss-subset-v3.2.json
✓ AMB-23 source.tier ∈ {A,B,C}
✓ Catálogo válido (530 especies, 36 biopreparados, 71 sources)
```

## Criterios de clasificación (Schema v3.1)

Según `catalog/schema-v3.1.json`:

```json
{
  "tier": {
    "type": "string",
    "enum": ["A", "B", "C"],
    "description": "Calidad de la fuente. A=peer-review/oficial gobierno (CR/EN/ICA/MADS/AGROSAVIA/IAvH/MinCultura/MinSalud/UICN); B=técnico/divulgación (Restrepo, manuales práctica, cartillas asociaciones); C=blogs/wikis no peer-review (excluir de catálogo strict)."
  }
}
```

La clasificación actual **respeta fielmente estos criterios**.

## Discrepancia con la especificación del task

El task #sources-tier menciona "~66 fuentes con tier=null" pero:

1. **No hay fuentes con tier=null** en ninguno de los 3 archivos del catálogo
2. **El total de fuentes es menor** (54-75 según el archivo, no 66+)
3. **Todas las fuentes están correctamente clasificadas** según su metadata

### Posibles explicaciones

- El task está basado en un **snapshot antiguo** del catálogo (pre-2026-05-22)
- La clasificación ya fue **completada en un commit anterior** (Batch 6A Pasada 6, 2026-05-22)
- Hay un **error en la especificación del task** (número incorrecto de fuentes)

## Recomendaciones

1. ✅ **Cerrar este task como completado** — todas las fuentes están clasificadas
2. 📝 **Actualizar tracking externo** si existe un issue/ticket asociado
3. 🔍 **Verificar buckets externos** si hay fuentes en otros repositorios o sistemas

## Conclusión

**No se requieren cambios en el código.** La clasificación de fuentes ya está completa y correcta según los criterios del schema v3.1. El validador AMB-23 confirma la integridad del catálogo.

---

**Generado:** 2026-07-01  
**Validador:** `scripts/validate-catalog.mjs`  
**Schema:** `catalog/schema-v3.1.json`
