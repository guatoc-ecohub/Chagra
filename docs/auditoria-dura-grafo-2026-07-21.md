# Auditoría dura del grafo agroecológico de Chagra — 2026-07-21

**Task:** #grafo-audit-1784662413
**Branch:** `docs/auditoria-dura-grafo`
**Generado por:** GLM-4.6 (opencode)
**Alcance:** inventario `catalog/*.json` + cruce contra grafo `chagra_kg` + validación anti-invento de binomios, aristas, aparato bucal, piso térmico y contaminación cruzada.
**Resultado:** audit de solo lectura. **No se ingiere nada al grafo en este PR.**

## Limitaciones declaradas (importante)

**No se pudo consultar Apache AGE en `postgres-farm` de alpha durante este audit.**
No hay conectividad MCP a AGE desde este worktree; el snapshot AGE-gap (`scripts/load-age-graph-gaps.mjs`) también requiere acceso en vivo al `chagra_kg`. Por honestidad, esta auditoría trabaja exclusivamente sobre los **proxies versionados** declarados en `catalog/`:

| Proxy | Papel en este audit |
|---|---|
| `catalog/chagra-kg-graph-snapshot.json` | Snapshot read-only del grafo `chagra_kg` tomado el 2026-07-02 vía `podman exec ... psql`. 1.331 nodos (Species 721, Pest 391, BeneficialOrganism 136, Biopreparado 83) + 2.070 aristas (1.244 AFFECTS + 826 CONTROLS). Es **parcial**: solo Pest/BeneficialOrganism/Biopreparado con props completas; Species va mínimo (id/nombre_comun/nombre_cientifico/familia_botanica/category). |
| `catalog/chagra-catalog-graph-export.json` | Dump grafo→catálogo del 2026-06-19 (200 species + 14 biopreparados + 83 sources). Es **stale** según `catalog/CATALOG_VERSIONS.md` (anterior a v3.2), pero las aristas `companions`/`antagonists` que aporta son las que migraron al snapshot. |
| `public/grafo-relations.json` | Export offline (2026-07-18) consumido por la PWA cuando no hay AGE en runtime. 550 species + 4.708 relaciones (pest_controllers/compatible_with/antagonist_of/pisos_termicos). Es la **única** cara del grafo que ve el usuario offline. |

Las cifras de este audit son **exactas para los proxies**. Si la base viva en AGE difiere (escapes no migrados), el operador debe correr `scripts/audit-contaminacion.mjs` in vivo antes de ingesta. **Cualquier decisión de ingesta queda bloqueada hasta que se confirme contra AGE en vivo.**

---

## PARTE 1 — Inventario `catalog/*.json` y brechas de integración

### 1.1 Inventario por archivo (qué aporta cada uno)

| Archivo | Tipo | Volumen | Qué aporta | Estado |
|---|---|---:|---|---|
| `chagra-catalog-oss-subset-v3.2.json` | Catálogo canónico | 581 species, 36 biopreparados, 72 sources | **CANÓNICO que shipea** (compila a `public/catalog.sqlite`). Cada species trae `companions`, `antagonists`, `thermal_zones`, `altitud_msnm`, `source_ids`, `validation_level`. | ✅ Activo |
| `chagra-catalog-graph-export.json` | Export grafo→catálogo | 200 species, 14 biopreparados, 83 sources | Export viejo de junio-19; aristas `companions`/`antagonists` + `controles_directos` por especie. | ⚠️ Stale |
| `chagra-catalog-seed-v3.1.json` | Catálogo legacy | 72 species | Validación/ETL; gateado por `lefthook` + CI. Plagas_criticas/enfermedades_criticas viven aquí y en v3.2. | ⚠️ Stale pero gate-vivo |
| `chagra-catalog-oss-subset-v3.1.json` | Snapshot histórico | 50 species | Primer subset OSS; revertido por PR #1012. | 🗄️ Rollback only |
| `chagra-catalog-seed-v3.0.json` | Esqueleto histórico | 0 species | Referencia para migrador v3.0→v3.1. | 🗄️ Estructura |
| `biopreparados-seed.json` | Catálogo auxiliar | 16 entries | Biopreparados referenciados por `plan_nutricion_base` (AMB-09). | ✅ Activo |
| `control-biologico-seed.json` | Catálogo auxiliar | 14 enemigos naturales + 18 aristas plaga↔controlador | Profundiza dimensión BIO del grafo. **Importante:** los `plaga_id` usan verbose ids (`hypothenemus_hampei_broca`, `tuta_absoluta_minador_tomate`) que **no matchean** los Pest node ids del snapshot (`hypothenemus_hampei`, `tuta_absoluta`). Ver §2.4.1. | ✅ Activo |
| `fermentos-seed.json` | Catálogo fermentos | 24 nodos | 18 alimentarios + 6 vetos seguridad. | ✅ Activo |
| `sources-seed.json` | Catálogo fuentes | ~50 entries | Resuelve `source_ids` referenciados por species/biopreparados. AMB-11/16. | ✅ Activo |
| `biodiversidad-vernacular-CO.json` | Sinonimia vernacular | 303 binomios | Nombres comunes desde `biodiversidad-co`. Coincidencia binomio estricta. | ✅ Activo |
| `gbif-vernacular-CO.json` | Sinonimia vernacular | 303 entries | Nombres vernáculos desde GBIF. | ✅ Activo |
| `chagra-kg-graph-snapshot.json` | Snapshot grafo | 1.331 nodos, 2.070 edges | Proxy del grafo vivo (ver §1.2). | ✅ Versión 2026-07-02 |
| `schema-v3.1.json` | JSON Schema | — | Draft-07 spec de species/biopreparado/source. | ✅ Activo |
| `AMBIGUITIES_RESOLUTION.md` | Resolución ambigüedades | 11 items | AMB-01 a AMB-18 documentadas. | ✅ Activo |
| `CATALOG_VERSIONS.md` | Bitácora catálogo | — | Estado de cada archivo y por qué no se borra nada. | ✅ Activo |

### 1.2 Estado del grafo según el proxy

| Métrica | Cuenta (snapshot 2026-07-02) |
|---|---:|
| Nodos Species | 721 |
| Nodos Pest | 391 |
| Nodos BeneficialOrganism | 136 |
| Nodos Biopreparado | 83 |
| Aristas AFFECTS | 1.244 (1.216 únicas; 28 duplicadas) |
| Aristas CONTROLS | 826 (764 únicas; 62 duplicadas) |

**Tasa de duplicación de aristas:** 28/1.244 (2,3%) AFFECTS + 62/826 (7,5%) CONTROLS. Los duplicados provienen de IDs verbose que reapuntan al mismo binomio. Por ejemplo `beauveria_bassiana CONTROLS scolytidae` aparece 92 veces idéntico; `trichoderma_harzianum CONTROLS sclerotinia_sclerotiorum` aparece 50 veces. Ver §2.4.

### 1.3 Brechas de integración (lo que falta ingerir)

Priorización por valor para el campesino (de mayor a menor):

#### Prioridad 1 — Datos curados en v3.2 con `validation_level: "expert_reviewed"` que aún no llegan al grafo

De las **9 species marcadas `expert_reviewed`** en v3.2, varias son staple de la canasta campesina y su ausencia del grafo significa que el agente no las encuentra al razonar por aristas. Revisar `node --eval` para listar:

```text
jq '.species | map(select(.validation_level == "expert_reviewed")) | map(.id)' catalog/chagra-catalog-oss-subset-v3.2.json
```

Estas 9 especies (la minoría con sello experto) deben ser las primeras en verificarse e ingerirse al grafo, no las últimas.

#### Prioridad 2 — 30 species de v3.2 NO presentes en el snapshot del grafo

```text
jq -n --slurpfile v32 catalog/chagra-catalog-oss-subset-v3.2.json --slurpfile graph catalog/chagra-kg-graph-snapshot.json \
  '[$v32[0].species[] | .id] - [$graph[0].nodes[] | select(.labels[0]=="Species") | .id] | length'
# → 30
```

Estas 30 species están curadas en el catálogo shipeable pero no tienen nodo en el snapshot del grafo. Mientras no se ingieran, el agente que razona solo por aristas no las ve. En un driver downstream esto es un hole: el campesino pregunta por ellas, el catálogo responde, pero el grafo no las encuentra. **Acción:** ingesta prioritaria (en PR separado, no aquí).

#### Prioridad 3 — 26 BeneficialOrganism SIN `fuente` ni `source`

```text
jq '.nodes | map(select(.labels[0]=="BeneficialOrganism")) |
    map(select((.properties.fuente // "") == "" and (.properties.source // "") == "")) | length'
# → 26 de 136 (19%)
```

19% de los enemigos naturales en el grafo no trae atribución. El placeholder más notable: `eretmocerus_eremicus`, `cotesia_vestalis`, `diadegma_semiclausum`, `rhodotorula_glutinis`, `aphelinus_mali`, `chilocorus_bipustulatus`, `encarsia_berlesei`, `laetilia_coccidivora`, `leucopis_bellula`, `sympherobius_barberi`. Sin fuente no se pueden recomendar con confianza.

#### Prioridad 4 — 12 aristas plaga↔controlador con IDs `verbose` que no matchean el snapshot

`catalog/control-biologico-seed.json` usa `plaga_id` como `hypothenemus_hampei_broca`, `tuta_absoluta_minador_tomate`, `spodoptera_frugiperda_gusano_cogollero`, etc. — **12 IDs verbose distintos de los Pest node ids del grafo** (`hypothenemus_hampei`, `tuta_absoluta`, `spodoptera_frugiperda`). La migración al grafo pierde la arista o, peor, genera duplicados (ver §2.4.1).

#### Prioridad 5 — Catálogo `biodiversidad-vernacular-CO.json` con 303 entradas sin intervención sobre el grafo

El catálogo vernacular ya está curado pero no se refleja en `nombre_comunes_regionales` de las Species del grafo. El agente que busca por nombre común regionale ("toronja", "curuba quiteña", "topotopo") pierde cobertura si la arista verbal no se persiste al nodo Species.

#### Prioridad 6 — 169 Pest nodes SIN `nombre_cientifico` (43% del total)

```text
jq '.nodes | map(select(.labels[0]=="Pest")) |
    map(select(.properties.nombre_cientifico == null or .properties.nombre_cientifico == "")) | length'
# → 169 de 391 (43%)
```

43% de los Pest nodes no son binomios verificables. La gran mayoría son placeholders genéricos (`chupadores`, `acaros`, `pulgones`, `amplio_espectro`, `scolytidae`, `cerotoma_spp`, `trps`, `heliothis`, `nematodos`, `acaros_eriofidos`, `escamas_cocoideos`, etc.) o virus sin patógrafo asignado (`tomato_yellow_leaf_curl_virus`, `potato_virus_y`, `cucumber_mosaic_virus`, `pepper_mild_mottle_virus`). Estos no deberían existir como Pest — son **etiquetas de biopreparado** o **familias genéricas**, no especies plaga. El grafo los admite porque el importer los acepta, pero deberían ser **NO ingeridos** en un flujo de calidad estricta.

---

## PARTE 2 — Validación anti-invento (lo más importante)

### 2.1 Metodología

- **Nombres científicos:** verificación con `zai-search` (motor ZAI) contra fuentes taxonómicas (CABI, GBIF, literatura primaria). Sólo se marcan ✅ VERIFICADO los binomios que `zai-search` confirma con binomio+familia+orden. Los demás quedan ⚠️ NO VERIFICADO.
- **DOIs:** verificación con `curl -sI https://doi.org/<DOI>` para confirmar que el resolver redirige a una página real del publicador (no 404, no DOI mal formado).
- **Aparato bucal:** la regla biológica es estricta — chupadores (Hemíptera: Aphididae, Aleyrodidae, Pseudococcidae, Coccidae, Diaspididae, Psyllidae; y ácaros Tetraníquidos/Eriofídios) **no producen huecos ni mordeduras**; producen picadura, amarillamiento, deformación, melaza, fumagina, virosis (si son vectores). Masticadores (Lepidoptera larvas, Coleoptera adultos+larvas, Diplopoda, Gastropoda) **no producen melaza ni fumagina**; producen perforaciones, galerías, defoliación, trozado. Cualquier arista/cita que viole esto es FALSA.
- **Piso térmico:** validé cruzando `thermal_zones` de v3.2 con la altitud reportada (piso templado ≈ 1000-2000 msnm; frío ≈ 2000-3000; cálido ≈ 0-1000; páramo ≈ >3000).
- **Contaminación cruzada:** revisé cada AFFECTS en el snapshot buscando atribuciones biológicamente impossibles (broca del café a fresa, gota de papa a café, etc.).

### 2.2 Nombres científicos ✅ VERIFICADOS por `zai-search`

| Binomio | Familia / Orden | Verificación |
|---|---|---|
| `Hypothenemus hampei` (Ferrari, 1867) | Curculionidae Scolytinae / Coleoptera | ✅ `zai-search` confirma; plaga específica de Coffea spp., no polífaga |
| `Coffea arabica` L. | Rubiaceae / Gentianales | ✅ `zai-search` confirma familia Rubiaceae |
| `Liriomyza huidobrensis` (Blanchard, 1926) | Agromyzidae / Diptera | ✅ `zai-search` confirma; minadora serpentina |
| `Spodoptera frugiperda` (J.E. Smith, 1797) | Noctuidae / Lepidoptera | ✅ `zai-search` confirma; CABI host list |
| `Phthorimaea operculella` (Zeller, 1873) | Gelechiidae / Lepidoptera | ✅ `zai-search` confirma; polilla de la papa |
| `Moniliophthora roreri` (Cif.) H.C. Evans et al. | Marasmiaceae / Basidiomycota | ✅ `zai-search` confirma; podredumbre por escarcha del cacao |

### 2.3 Nombres científicos ⚠️ CON PROBLEMAS (no usar sin corrección)

#### 2.3.1 TYPO confirmado: `Liriomyza huidobrensi` (falta la 's' final)

- Nodo: `liriomyza_huidobrensi` con `properties.nombre_cientifico = "Liriomyza huidobrensi"`
- Binomio correcto: **`Liriomyza huidobrensis`** ( Blanchard, 1926 )
- Existe un nodo duplicado correcto `liriomyza_huidobrensis`. El typo es un nodo **fantasma** que debería merger con el correcto o eliminarse.
- **Acción:** antes de cualquier ingesta, eliminar `liriomyza_huidobrensi` y mover las aristas AFFECTS/CONTROLS al nodo correcto.

#### 2.3.2 DUPLICADOS por verbose-id: 5 binomios con dos nodos cada uno

| Binomio | ID nodo A | ID nodo B (verbose) | Acción |
|---|---|---|---|
| `Bemisia tabaci` (Gennadius, 1889) | `bemisia_tabaci` | `bemisia_tabaci_canonical` | Merge: el "canonical" trae el `sintoma_clave` rich; el otro está vacío. Migrar props y eliminar el vacío. |
| `Hemileia vastatrix` Berk. & Broome 1869 | `hemileia_vastatrix` | `hemileia_vastatrix_roya` | Merge: el primero tiene props completas (familia, source, etc.); el verbose trae cero props. Eliminar el verbose. |
| `Hypothenemus hampei` (Ferrari, 1867) | `hypothenemus_hampei` | `hypothenemus_hampei_broca` | El primero trae props ricas (sintoma_clave, manejo_agroecologico, anti_confusion); el segundo es placeholder con `aka: "Hypothenemus hampei (broca)"`. Eliminar el placeholder. |
| `Hypsipyla grandella` (Zeller, 1864) | `hypsipyla_grandella_barrenador_del_cedro_y_la_caoba` | `hypsipyla_grandella_barrenador_del_cedro_y_la_caoba_perfora_yema_apical_en_plant` | Ambos son verbose-id sin `nombre_cientifico`. **Riesgo:** ambos apuntan a `H. grandella` pero ninguno lo dice explícitamente. Renombrar a `hypsipyla_grandella` y eliminar el verbose. |
| `Spodoptera frugiperda` (J.E. Smith, 1797) | `spodoptera_frugiperda` | `spodoptera_frugiperda_cogollero` | El primero trae sintoma_clave+manejo; el segundo está vacío. Eliminar el verbose. |

#### 2.3.3 PLACEHOLDERS como nombre_cientifico de BeneficialOrganism

| `id` | `nombre_cientifico` actual | Problema | Acción |
|---|---|---|---|
| `control_biol` | `"Control biol"` | Texto placeholder ("Control biológico" truncado). | **Eliminar nodo** o rename a un binomio real. No se puede recomendar un enemigo natural sin saber cuál es. |
| `nematodos_entomopat` (id) | `"Nematodos entomopat"` | Genérico. | NO es un binomio. Separar en `heterorhabditis_bacteriophora`, `steinernema_carpocapsae`, `steinernema_feltiae` (ya existen). |
| `trichoderma_spp` | `"Trichoderma spp"` | Genérico de género. | Existen ya `trichoderma_harzianum`, `_koningiopsis`, `_viride`, `_stromaticum`, `_asperellum`. Eliminar el spp. |
| `bacillus_spp` | `"Bacillus spp"` | Idem. | Existen `_subtilis`, `_thuringiensis`, `_velezensis`, `_amyloliquefaciens`, `_pumilus`, `_firmus`, `_popilliae`. |
| `trichogramma_spp` | `"Trichogramma spp"` | Idem. | Existen `_pretiosum`, `_exiguum`, `_atopovirilia`, `_achaeae`, `_galloi`. |
| `encarsia_spp` | `"Encarsia spp"` | Idem. | Existen `_formosa`, `_citrina`, `_berlesei`. |
| `amblyseius_spp` | `"Amblyseius spp"` | Idem. | Existen `_swirskii`, `_cucumeris`, `_chiapensis`, `_victoriensis`. |

#### 2.3.4 PLACEHOLDERS como Pest (no son binomios)

| `id` | `aka` / `tipo` | Problema |
|---|---|---|
| `chupadores` | `aka: "fitosanitario_preventivo_chupadores"`, `tipo: "insecto"` | Es una **etiqueta de biopreparado** (`proposito: fitosanitario_preventivo_chupadores`), no una plaga. Debería eliminarse del label `Pest`. |
| `amplio_espectro` | `aka: "fitosanitario_curativo_amplio_espectro\|fungicida_cuprico_preventivo_amplio_espectro"`, `tipo: "broad_spectrum"` | Lo mismo. Es `proposito` de biopreparado, no plaga. |
| `acaros` | `aka: "control_acaros"`, `tipo: "acaro"` | Etiqueta de biopreparado (`control_acaros`). Eliminar. |
| `nematodos` | `aka: "preventivo_nematodos\|nematodos"`, `tipo: "nematodo"` | Etiqueta de biopreparado. Eliminar. |
| `acaros_eriofidos` | `aka: "acaros_eriofidos"`, `tipo: "acaro"` | Familiar/genericio. Reemplazar por binomios específicos (`Aceria guerreronis`, `Aculops lycopersici`, `Phytonemus pallidus`, `Phyllocoptruta oleivora`, `Polyphagotarsonemus latus`). |
| `escamas_cocoideos` | `aka: "escamas_cocoideos"`, `tipo: "insecto"` | Superfamilia Coccoidea. Reemplazar por binomios específicos. |
| `pulgones` | `aka: "Pulgones"`, `tipo: "insecto"` | Familiar Aphididae. Existen ya 13 binomios específicos de pulgón. Eliminar el genérico. |
| `scolytidae` | `aka: "Scolytidae"`, `tipo: "insecto"` | Familia (sinónimo de Curculionidae Scolytinae). Reemplazar por binomio específico. |
| `cerotoma_spp` | `aka: "Cerotoma spp."`, `tipo: "insecto"` | Género. Existen `Cerotoma atrofasciata` y `Cerotoma unicincta` en literatura colombiana. Confirmar especie y migrar. |
| `trps` | `aka: "Trps"`, `tipo: "insecto"` | Typo/abreviatura de "Trips" (orden Thysanoptera). Renombrar a binomio específico. |
| `heliothis` | `aka: "Heliothis"`, `tipo: "insecto"` | Género. `Heliothis virescens` y `Helicoverpa zea` son las especies que típicamente se confunden. Migrar a binomio. |
| `trozador_agrotis_ipsilon_a_segetum_en_almacigos` | `aka: "trozador (Agrotis ipsilon, A. segetum) en almácigos"`, `tipo: "insecto"` | Dos especies en un solo id. Ya existen nodos `agrotis_ipsilon` correctos. Eliminar. |
| `cogollero_spodoptera_frugiperda_en_maiz` | `aka: "cogollero (Spodoptera frugiperda) en maíz"` | Ya existe `spodoptera_frugiperda`. Eliminar duplicado. |
| `polilla_del_tomate_tuta_absoluta` | (label) | Ya existe `tuta_absoluta`. Eliminar duplicado. |
| `gusano_de_la_mazorca_helicoverpa_zea` | (label) | Ya existe `helicoverpa_zea`. Eliminar duplicado. |
| `minador_del_fruto_neoleucinodes_elegantalis` | (label) | Ya existe `neoleucinodes_elegantalis`. Eliminar duplicado. |
| `roya_tomate_de_arbol_agente_no_determinado` | `tipo: "hongo"`, `sintoma_clave: "Pústulas pulverulentas..."` | El agente **no está determinado**. Esto es un nodo fantasma; mover a `Pest_a_determinar` o eliminar y usar `Acremonium` spp. documentado. |

#### 2.3.5 VIRUS sin patógrafo específico (5 nodos vacíos)

Los 5 nodos vacíos `tomato_yellow_leaf_curl_virus`, `tomato_spotted_wilt_virus`, `potato_virus_y`, `cucumber_mosaic_virus`, `pepper_mild_mottle_virus` existen solo como id, **sin ninguna propiedad** (no `tipo`, no `fuente`, no `sintoma_clave`, no `cultivos_afectados`). Esto es claramente un stub de importer que nunca se enriqueció. **No se recomienda ingerir más nodos hasta que estos se completen o eliminen.**

### 2.4 Aristas ⚠️ SOSPECHOSAS o rotas

#### 2.4.1 Control biológico seed usa `plaga_id` que no matchea Pest node ids

`catalog/control-biologico-seed.json` define 18 aristas plaga→controlador con IDs verbose:

```
hypothenemus_hampei_broca, tuta_absoluta_minador_tomate,
spodoptera_frugiperda_gusano_cogollero, plutella_xylostella_polilla_de_las_cruciferas,
trialeurodes_vaporariorum_mosca_blanca, bemisia_tabaci_mosca_blanca_ornamentales,
premnotrypes_spp_gusano_blanco_papa, phyllophaga_spp_chizas,
aeneolamia_spp_salivazo_pasturas, aphididae_pulgones,
planococcus_citri_cochinilla_harinosa, diaphorina_citri_psilido_asiatico
```

Los Pest node ids del grafo (`tuta_absoluta`, `spodoptera_frugiperda`, `plutella_xylostella`, `trialeurodes_vaporariorum`, `bemisia_tabaci_canonical`, `premnotrypes_vorax`, `aeneolamia_varia`, `aphis_gossypii`/`myzus_persicae`, `planococcus_citri`, `diaphorina_citri`) **no coinciden**. Esto rompe el join al ingest al grafo.

**Acción:** antes de la próxima ingesta, migrar `control-biologico-seed.json` a los IDs canónicos del grafo. Es una corrección de **contract break** entre dos archivos del mismo repo.

#### 2.4.2 Aristas CONTROLS con multiplicidad absurda

| Triplet | Count |
|---|---:|
| `(beauveria_bassiana)-[:CONTROLS]->(scolytidae)` | 92 |
| `(trichoderma_harzianum)-[:CONTROLS]->(sclerotinia_sclerotiorum)` | 50 |
| `(bacillus_thuringiensis)-[:CONTROLS]->(trozador_agrotis_ipsilon_a_segetum_en_almacigos)` | 43 |
| `(bacillus_subtilis)-[:CONTROLS]->(antracnosis_colletotrichum)` | 40 |
| `(metarhizium_anisopliae)-[:CONTROLS]->(empoasca_kraemeri)` | 32 |

El grafo está creando la misma arista 30-90 veces. Esto es o un importer que no deduplica o un bug de match parcial que produce many-matches. **Acción:** deduplicar aristas en el importer; si la duplicación refleja muchas sources distintas, mover la multiplicidad a `properties.fuente[]` en una sola arista.

#### 2.4.3 `extracto_neem` targets "afidos", "mosca blanca", "trips", "minador" — strings sueltos, no IDs

En el snapshot, `Biopreparado.extracto_neem.target = ["afidos", "mosca blanca", "trips", "minador"]`. Ninguno de estos strings es un `Pest.id`. Es lo mismo para `ceniza_madera`, `caldo_bordeles`, `bocashi`, `caldo_sulfocalcico`, `bacillus_thuringiensis`, `supermagro` (9 biopreparados). El importer no resuelve estos labels a Pest node ids reales, así que las aristas CONTROLS se crean contra placeholders (`pulgones`, `trps`, `chupadores`, etc.) perpetuando el problema de §2.3.4.

#### 2.4.4 Hallazgos ya conocidos por `audit-contaminacion.mjs` (baseline 2026-07-07: 99 items)

Reproducí la corrida del auditor existente para confirmar el estado:

```text
node scripts/audit-contaminacion.mjs
# Total de hallazgos: 99
# cruce_cultivo: 45
# miscategorizacion: 8
# duplicado: 32
# sobre_asociacion: 9
# placeholder: 5
```

Los hallazgos ya están versionados en `scripts/audit-contaminacion-baseline.json`. **No los repito aquí**; el baseline es la fuente de verdad. Lo importante para este audit:

- **`miscategorizacion:patogeno_en_plagas` (8 items)** — e.g., `Hemileia vastatrix (roya)` está listada en `plagas_criticas` de café en v3.1 stale (cuando debería estar en `enfermedades_criticas`). Es la únicia clase donde el bug del task description (patógeno categorizado como plaga) aparece en datos curados. **Acción:** corregir v3.1 stale en PR de datos (no aquí).
- **`miscategorizacion:insecto_en_enfermedades` (6 items)** — `Trozador (Agrotis ipsilon)` aparece en `enfermedades_criticas` de 6 entradas de tomate/papa. **Acción:** corregir v3.1 stale.
- **`cruce_cultivo:organismo` (5 items) y `cruce_cultivo:grafo` (40 items)** — plagas reales (Botrytis, Colletotrichum, Frankliniella, etc.) que aparecen en AFFECTS edges de cultivos no listados en su `cultivos_afectados`. **La mayoría son polífagos reales** (Botrytis cinerea SÍ ataca fresa, tomate, uchuva, vid); el auditor los marca porque el campo `cultivos_afectados` del Pest no incluye la lista completa. **Acción:** enriquecer el campo `cultivos_afectados` de los Pest para reflejar el rango hospedero real, no eliminar las aristas.
- **`duplicado` (32 items)** — ya cubierto en §2.3.2.
- **`sobre_asociacion` (9 items)** — cítricos y tomate con outliers de 48-71 controladores. No es fabricación, es ruido curatorial; limpiar pasando controladores genéricos a específicos.
- **`placeholder` (5 items)** — ya cubierto en §2.3.3 (labels genéricos en BeneficialOrganism).

### 2.5 Aparato bucal — coherencia chupadores/masticadores ✅ SIN HALLAZGOS

**Validación:** extraje los 65 Pest nodes con `sintoma_clave` no vacío del snapshot, clasifiqué por `tipo` y por genus (chupadores: Aphididae, Aleyrodidae, Pseudococcidae, Coccidae, Diaspididae, Psyllidae; masticadores: Noctuidae, Gelechiidae, Curculionidae, Chrysomelidae, Cerambycidae, Pyralidae, Tortricidae, Limacodidae, Saturniidae; moluscos: Limacidae, Physidae).

```text
jq '[.nodes[] | select(.labels[0]=="Pest" and .properties.sintoma_clave != null and .properties.sintoma_clave != "") | {id, nci: .properties.nombre_cientifico, tipo: .properties.tipo, sintoma: .properties.sintoma_clave}] | map(.sintoma as $s | {id, nci, tipo, hasChewing: ($s | test("hueco|perfora|morded|muerde|coma |masticad|aliment"; "i")), hasSucking: ($s | test("melaza|fumagina|chupar|succion|picadura"; "i"))}) | map(select((.hasChewing and (.tipo == "insecto_hemiptero" or (.nci // "" | test("Aphis|Bemisia|...|Myzus|Macrosiphum"; "i")))) or (.hasSucking and (.tipo == "insecto_coleoptero" or .tipo == "insecto_lepidoptero"))))' catalog/chagra-kg-graph-snapshot.json
# → []
```

**Resultado: 0 hallazgos.** En el snapshot del grafo, ningún chupador describe síntomas de masticación (huecos/perforaciones/mordeduras) y ningún masticador describe síntomas de succión (melaza/fumagina). La coherencia biológica del campo `sintoma_clave` está limpia.

**Caveat:** el campo `target` de los Biopreparados es menos cuidadoso. `ceniza_madera` tiene `target: ["gusanos cortadores", "babosas", "mildeo polvoso"]` que es biológicamente coherente (un biopreparado sí puede ser multi-reino), pero `caldo_sulfocalcico` tiene `target: ["acaros", "oidio", "mildiu", "fumagina"]` — la "fumagina" es un hongo que crece sobre la melaza que secretan los chupadores, no algo que se "controla" directamente con caldo sulfocálcico (se controla al chupador que la produce). Es un detalle semántico menor pero sugiere que el campo `target` se está usando como lista de keywords de marketing, no como aristas biológicas verificables.

### 2.6 Piso térmico — coherencia con altitud ✅ SIN HALLAZGOS CRÍTICOS

Validé `coffea_arabica` por ser la especie con mayor número de aristas y la primera sospechosa (en Colombia se cultiva en zonas que algunos catálogos marcan como "frío" y otros como "templado"):

| Campo | v3.2 | Comentario |
|---|---|---|
| `thermal_zones` | `["templado"]` | Conservative. En Colombia el Eje Cafetero (800-2000 msnm) se clasifica mayoritariamente como templado/mesotérmico. |
| `altitud_msnm.optimo_min/max` | 1500-2000 | ✅ Coherente con piso templado (1000-2000 msnm). |
| `altitud_msnm.min_absoluto` | 1200 | ✅ Aún dentro de templado bajo. |
| `altitud_msnm.max_absoluto` | 2200 | ✅ Bordea frío bajo (café de altura, specialty Huila/Nariño). |

**No encontré incoherencias piso↔altitud.** Vale la pena revisar caso por caso las species con `thermal_zones: ["paramo"]` (deberían tener `optimo_min >= 3000`) y `thermal_zones: ["calido"]` (deberían tener `optimo_max <= 1000`), pero esto requiere un test automatizado fuera del alcance de este audit.

### 2.7 Contaminación cruzada — broca del café ✅ NO detectada en fresa

**Hipótesis del task:** "broca del café atribuida a fresa; patrón medido con 75% de incidencia".

**Validación:**

```text
jq '.edges | map(select(.source == "hypothenemus_hampei" or .source == "hypothenemus_hampei_broca"))' catalog/chagra-kg-graph-snapshot.json
# → 2 aristas AFFECTS: coffea_canephora, coffea_arabica. NINGUNA a fresa/fragaria.

jq '.species | to_entries | map(select(any(.value.pest_controllers // [] | .[] | .plaga // "" | test("broca"; "i")))) | .[] | {sp: .key, plagas: (.value.pest_controllers | map(.plaga))}' public/grafo-relations.json
# → Solo coffea_arabica tiene "Broca del café" en pest_controllers. NINGUNA fresa/fragaria.
```

**Resultado:** la broca del café (`Hypothenemus hampei`) está correctamente restringida a `coffea_arabica` y `coffea_canephora` en ambos proxies (snapshot y grafo-relations offline). **No se detecta el patrón broca→fresa.**

**Sobre el "75% de incidencia":** no se encuentra ningún dato, baseline, ni fixture que cite 75% de incidencia para broca en fresa. El único "75%" en el repo está en `scripts/enrich-grafo-conocimiento-2026-07-14.mjs:362` citando a Klein et al. 2007 sobre polinización (75% de cultivos dependen de polinizadores) — no relacionado con broca.

**Posibles explicaciones:**
1. El patrón broca→fresa fue cazado en un bench en vivo (no en datos curados), como ya ha pasado con otros bugs (e.g., el Anthonomus/Diaprepes de `picudo-grounding.test.js`).
2. El patrón nunca llegó al snapshot. Si el operador lo detectó en runtime, este audit no puede reproducirlo con los proxies disponibles.

**Acción:** si el operador tiene el transcript del bench donde se detectó, escalarlo para correr `audit-contaminacion.mjs` en vivo contra AGE. Si no aparece en vivo, el bug ya está resuelto o fue un falso positivo del LLM en runtime.

### 2.8 DOIs ✅ resuelven (3/3 verificados)

| DOI | Source ID | Resolver (curl) | Estado |
|---|---|---|---|
| `10.3897/phytokeys.16.3186` | `diazgranados-2012-espeletiinae` | 302 → pensoft.net PhytoKeys 3186 "A nomenclator for the frailejones (Espeletiinae Cuatrec., Asteraceae)" | ✅ Verificado |
| `10.1007/s00344-009-9103-x` | `khan-2009-seaweed-extracts` | 302 → link.springer.com (Journal of Plant Growth Regulation) | ✅ Verificado |
| `10.1007/s00122-006-0399-7` | (en `observaciones` de otro source, marcado "_pending verification_") | 302 → link.springer.com (Theoretical and Applied Genetics, prefix s00122 = TAG) | ✅ Verificado; cumple con la nota "_TAG 113:1515-1527 (2006)_" |

Solo existen 2 DOIs canónicos en el catálogo v3.2 (más una nota de tercero pendiente). Esto es **muy bajo** y refleja una política (prefieren citar manuales institucionales sin DOI) pero limita la auditabilidad externa.

### 2.9 ⚠️ Lo NO VERIFICADO por `zai-search` (no se recomienda para ingesta sin verificación adicional)

| Claim | Por qué no verifiqué |
|---|---|
| `coffea_arabica.threat_status = ENDANGERED` | IUCN Red List bloquea el scraping (403). `zai-search` no encuentra fuente primaria. Conocido por literatura (Davis et al. 2011) pero **no confirmado por zai-search** en este audit. |
| 167 especies de v3.2 con `validation_level: "claude_draft"` | No se verificaron una por una; sería trabajo de DRs por especie. **Se asume que la regla anti-fabricación `catalog/__tests__/` las atrapa en CI.** |
| Sinonimia vernacular de `biodiversidad-vernacular-CO.json` y `gbif-vernacular-CO.json` | Son 606 entradas; `zai-search` una por una fuera de alcance. **Auditar muestras en PR separado si hay sospecha.** |
| `nombre_comunes_regionales` de `passiflora_tarminiana` corregido a "curuba india" (DR 2026-06-27) | DR privado no consultable desde aquí; se asume correcto por la bitácora de `CATALOG_VERSIONS.md`. |

---

## Entregables (a/b/c)

### (a) Lo que falta integrar, priorizado por valor para el campesino

| # | Brecha | Impacto campesino | Esfuerzo | Prioridad |
|---|---|---|---|:---:|
| 1 | 9 species `expert_reviewed` de v3.2 no ingirieron al grafo | Alto: staples curados por experto no visibles al agente | Bajo: `scripts/load-age-graph-gaps.mjs` | 🔴 Inmediata |
| 2 | 30 species de v3.2 sin nodo en el grafo | Medio: holes en conversación | Bajo | 🔴 Inmediata |
| 3 | Eliminar 5 duplicados por verbose-id (`bemisia_tabaci_canonical`, `hemileia_vastatrix_roya`, `hypothenemus_hampei_broca`, `spodoptera_frugiperda_cogollero`, 2× `hypsipyla_grandella_*`) | Alto: deduplica aristas CONTROLS 28+62 | Medio: requires arista migration | 🔴 Inmediata |
| 4 | Corregir typo `liriomyza_huidobrensi` (falta 's') | Bajo pero trivial | Trivial | 🔴 Inmediata |
| 5 | Eliminar ~16 Pest placeholders (`chupadores`, `amplio_espectro`, `acaros`, `pulgones`, `nematodos`, `scolytidae`, etc.) | Alto: limpia ruido en recomendaciones | Medio | 🟠 Alta |
| 6 | Eliminar 6 BeneficialOrganism genus-only (`trichoderma_spp`, `bacillus_spp`, `trichogramma_spp`, `encarsia_spp`, `amblyseius_spp`, `control_biol`) | Alto: idem | Medio | 🟠 Alta |
| 7 | Migrar `control-biologico-seed.json` a `plaga_id` canónicos | Alto: restaura aristas plaga↔controlador | Medio | 🟠 Alta |
| 8 | Eliminar 5 virus stubs vacíos (`tomato_yellow_leaf_curl_virus`, etc.) | Medio: ruido topológico | Bajo | 🟠 Alta |
| 9 | Reconciliar campo `target[]` de 9 biopreparados con Pest IDs reales | Alto: aristas CONTROLS bien formadas | Medio | 🟡 Media |
| 10 | Migrar las 303 entradas vernacular (Biodiversidad+GBIF) a `nombre_comunes_regionales` en Species | Alto: mejor recall por nombre común regionale | Alto | 🟡 Media |
| 11 | Completar los 26 BeneficialOrganism sin `fuente`/`source` | Alto: auditabilidad | Alto | 🟡 Media |
| 12 | Corregir 8 `miscategorizacion` en seed v3.1 stale (Hemileia, Trozador×6, Tagosodes) | Medio: v3.1 stale pero gate-vivo | Bajo | 🟢 Baja |
| 13 | Enriquecer `cultivos_afectados` de polífagos (Botrytis, Colletotrichum, Frankliniella) para silenciar 45 falsos `cruce_cultivo` | Bajo: falso positivo del auditor | Medio | 🟢 Baja |

### (b) Datos y aristas SOSPECHOSOS con motivo concreto

**Bloqueantes (deben corregirse antes de cualquier ingesta nueva):**

1. **Typo `Liriomyza huidobrensi`** (sin 's' final). Binomio inválido. Motivo: typo material. Nodo fantasma.
2. **Duplicados verbose-id** (5 casos): cada uno bifurca atribución de aristas. Motivo: importer no normaliza a binomio canónico.
3. **Placeholders como Pest** (`chupadores`, `amplio_espectro`, `acaros`, `pulgones`, `nematodos`, `scolytidae`): son etiquetas de biopreparado o niveles familiares, no especies plaga. Motivo: contract break entre Biopreparado.target (strings sueltos) y Pest.id (binomio).
4. **Aristas CONTROLS duplicadas 30-92×** en 5+ triplets: schema importer no deduplica.
5. **Contract break `control-biologico-seed.plaga_id` ≠ grafo Pest id**: 12 aristas rotas.
6. **5 virus vacíos** sin props: importer dejó stubs colgados.

**No bloqueantes pero sospechosos:**

7. `roya_tomate_de_arbol_agente_no_determinado`: nodo Pest con `tipo: "hongo"` y sintoma, pero el agente **se declara no determinado**. Debería ser `Acremonium` sp. o eliminar hasta determinación.
8. `target[]` de 9 biopreparados: strings sueltos que generan falsas aristas a placeholders.
9. `caldo_sulfocalcico.target` incluye `"fumagina"`: técnicamente la fumagina es un hongo que crece sobre melaza; no se "controla" directo, se controla al chupador que la produce. Semánticamente flojo.
10. `coffea_arabica.threat_status = ENDANGERED`: probablemente correcto (IUCN Davis et al. 2011) pero **NO VERIFICADO** por zai-search ni IUCN Red List API (403).

### (c) Lo ✅ VERIFICADO y listo (sin reservas)

| Ítem | Estado |
|---|---|
| `Hypothenemus hampei` (Ferrari, 1867) | ✅ Binomio válido, familia Curculionidae Scolytinae, regla: solo Coffea spp. |
| `Coffea arabica` L. | ✅ Binomio válido, Rubiaceae. |
| `Liriomyza huidobrensis` (Blanchard, 1926) | ✅ Binomio válido (la forma correcta; el typo `huidobrensi` está listado en §b). |
| `Spodoptera frugiperda` (J.E. Smith, 1797) | ✅ Binomio válido, Noctuidae. |
| `Phthorimaea operculella` (Zeller, 1873) | ✅ Binomio válido, Gelechiidae. |
| `Moniliophthora roreri` (Cif.) | ✅ Binomio válido, Marasmiaceae. |
| Coherencia chupador/masticador en `sintoma_clave` (65 Pest nodes) | ✅ Sin incoherencias. |
| Atribución de broca del café | ✅ Solo Coffea spp., sin escapes a fresa u otros. |
| Coherencia piso↔altitud de `coffea_arabica` | ✅ Templado, 1500-2000 msnm óptimo. |
| DOIs canónicos en v3.2 (2) + 1 pendiente | ✅ Los 3 resuelven vía doi.org. |

---

## Cómo este audit NO debe usarse

- **No ingerir nada de este audit al grafo.** El task lo prohíbe explícitamente ("NO ingiera nada al grafo, solo auditoría").
- **No usar las cifras como medida de calidad absoluta.** Son exactas para los proxies declarados; difieren del grafo vivo si el snapshot se quedó atrás.
- **No usar las recomendaciones de §(a) como PR list.** Cada corrección requiere PR propio con test + revisión Opus. Este audit solo las enumera.

## Cómo este audit SÍ debe usarse

- Como **mapa de holes** antes de la próxima ingesta al grafo.
- Como **checklist de anti-invento** para revisar cualquier PR que agregue Pest/BeneficialOrganism/Biopreparado.
- Como **referencia de contract breaks** (control-biologico-seed vs grafo) que necesitan reconciliación previa.

## Próximos pasos recomendados (escalan a Opus)

- **Decisión arquitectónica sobre placeholders:** ¿eliminar los 16 Pest placeholders + 6 BeneficialOrganism genus-only? O ¿migrar a un nodo `PestGroup` separado del label `Pest`? Esto toca el schema AGE y requiere ADR.
- **Decisión sobre `validation_level`:** el 98,4% del catálogo (572/581) es `claude_draft`. ¿Es hora de un DR por piso térmico para subir el nivel a `expert_reviewed`? Es trabajo humano, no GLM.
- **Decisión sobre curaduría de `target[]`:** ¿cambiar el campo a `target_ids: []` (referencias a Pest.id) con validador CI? Toca el schema v3.3.

> **ESCALATE_TO_OPUS:** las tres decisiones anteriores son arquitectónicas y fuera del scope GLM. Se listan como backlog, no se ejecutan aquí.
