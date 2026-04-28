# Schema v3 — Ambigüedades identificadas y resolución

Basado en análisis del seed v3.0 de Claude. Decisiones aplicables desde v0.7.0. Fuente canónica: **ADR-013**.

| AMB | Problema | Decisión | Enforcement |
|-----|----------|----------|-------------|
| **01** | `gremio` singular vs `roles_in_guild` array | Deprecar `gremio`; `roles_in_guild[0]` = primario. Tabla `species_roles(species_id, role, priority)` en SQLite | Migración automática en build v0.7.0 |
| **02** | `category` vs `roles_in_guild` | `category` = identidad (monoval cerrado); `roles_in_guild` = capacidades (array abierto) | Doc en schema; validator verifica coherencia con AMB-16 |
| **03** | `thermal_zones` (arr) vs `thermal_zone` (enum sing) | Campo `thermal_zones: string[]`; enum `thermal_zone` con valores para el array | schema JSON |
| **04** | `radiacion`/`agua` (es) vs `light_requirement`/`water_requirement` (en) | Español: `radiacion`, `agua`. Enums `radiacion_requirement`, `agua_requirement` | schema JSON |
| **05** | `estrato` en anuales | Opcional; enum amplía con `rastrero`. Obligatorio si perenne/árbol | validator (ADR-012) |
| **06** | `altitud_msnm` orden | `min_absoluto ≤ optimo_min ≤ optimo_max ≤ max_absoluto` | validator JSON Schema if/then |
| **07** | `heladas_tolerancia_h` unidad | Objeto `heladas_tolerancia: { umbral_c, horas_acumuladas, tipo: "radiacion\|adveccion" }` | schema JSON |
| **08** | `production` sin enum | Enum `harvest_type: fruto\|grano\|tuberculo\|hoja\|flor\|raiz\|tallo\|biomasa\|semilla\|latex\|corteza\|rizoma` | schema JSON |
| **09** | Rangos NPK string vs objeto | Objetos `{ min, max }`; unidad implícita en nombre de campo (`*_ppm`, `*_c`, `*_pct`) | schema JSON |
| **10** | Simetría companions/antagonists | Script `validate-catalog.ts` falla CI si asimétrico | CI (ADR-012) |
| **11** | `saber_origen.validacion_cientifica` string libre | Catálogo `sources.yml` con ids; campo `source_ids: string[]` | validator |
| **12** | `biopreparados_por_etapa` strings libres | Catálogo `biopreparados.yml` con ids; referencia `{ biopreparado_id, dosis, momento }` | validator |
| **13** | Referencias cruzadas sin validación | Validator verifica todo id referenciado existe | CI (ADR-012) |
| **14** | `prompt_sugerido_ia_externa_*` múltiples | Agrupar en `prompts_ia_externa: { diagnostico_fitosanitario, cromatografia, plan_siembra, diagnostico_nutricional, restauracion }` | schema JSON |
| **15** | `manejo_por_escala` keys vs `scale_viability` | Validator exige `keys(manejo_por_escala) ⊆ scale_viability` | CI |
| **16** | `category: especies_invasoras` vs `conservation_status: invasor` | Triple enforcement: `category == especies_invasoras ⇔ conservation_status == invasor ⇔ cultivable == false` | validator |

## Bloqueadoras antes de curación a escala

Sólo se escala curación de catálogo (>30 especies adicionales) **después** de que estas 5 estén enforcadas en CI:

- AMB-01 (separación `gremio`/`roles_in_guild`)
- AMB-08 (rangos como objetos)
- AMB-10 (simetría validator)
- AMB-11 (sources canónicas)
- AMB-13 (referencias cruzadas)

Sin estas cerradas, cada PR agrega inconsistencias que luego son costosas de corregir.

## Próximos pasos

1. Implementar `schema/*.schema.json` completos con if/then para AMB-06, AMB-15, AMB-16.
2. Escribir `scripts/validate-catalog.ts`.
3. Migrar las 80 spp actuales al schema v3 resuelto (ver `scripts/migrate-species-defaults-to-v3.ts`).
4. Incorporar las especies curadas del seed v3.0 de Claude (papa criolla, aliso, ortiga, 3 páramo, 4 invasoras, 1 gremio-receta, 4 lab tests).
5. Publicar guía para curadores externos en `CONTRIBUTING.md`.
