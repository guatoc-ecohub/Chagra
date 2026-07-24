# Test de inteligencia — set v2 (3x dificultad) + pares golden DPO

Construido 2026-07-24 como ampliación del set v1 (`eval/intel-grounding.json` 32,
`eval/intel-relaciones.json` 10, `eval/intel-taxonomia.json` 13, `eval/rag-golden-ampliado.json`
117 — rama `eval/test-inteligencia`, ya mergeada a `dev`). v1 medía trampas obvias y relaciones
1-hop; v2 apunta a trampas sutiles, multi-hop de 2-3 saltos, y un eje nuevo (piso térmico) que v1
no cubría.

**No se tocó el harness ni se corrió ningún modelo.** Esto es solo diseño + verificación contra
el grafo. Ver `test-inteligencia-chagra.mjs` para cómo v1 consume estos archivos; v2 sigue el
mismo formato JSON (`{"_doc": "...", "queries": [...]}`) para que el harness lo levante sin cambios,
con campos adicionales (`chain`, `note`, `trap`, `expected_pisos`, etc.) que documentan la
verificación pero no son requeridos por el runner.

## Fuente de verdad y método de verificación

Toda respuesta golden se sacó y verificó contra el grafo AGE `chagra_kg` en `postgres-farm`
(host `alpha`), **no de memoria paramétrica**. Verificado en vivo 2026-07-24:

- **743 Species, 415 Pest**, 130 Family, 160 Variety, 34 ConfusionWarning, 325 RegionalLabel,
  136 BeneficialOrganism, 83 Biopreparado, 23 Tecnica, 4 PisoTermico.
- Aristas relevantes: **1299 AFFECTS** (Pest→Species), 1093 GROWS_IN (Species→PisoTermico),
  873 CONTROLS (Biopreparado|BeneficialOrganism|Species|Tecnica→Pest), 1035 COMPATIBLE_WITH
  (Species→Species), 719 HAS_FAMILY, 158 IS_VARIETY_OF, 92 POLINIZA, 78 FIXES_NITROGEN,
  4 CONFUSED_WITH, 23 DISAMBIGUATES.

Procedimiento: se volcó el grafo completo (los labels/relaciones de arriba) a CSV/JSONL vía
`psql` dentro del container `postgres-farm` (`LOAD 'age'; SET search_path=ag_catalog,public;
SELECT * FROM cypher('chagra_kg', $$ ... $$) AS (...)`), se trajo con `podman cp` + `scp`, y
se analizó localmente con Python para armar diccionarios de lookup (`Species→piso`,
`Pest→controladores`, `Species→pests`, `Variety→species_id`, etc.). Cada pregunta de v2 se
construyó **a partir de una entrada real** de esos diccionarios — no se inventó ningún golden
y después se buscó soporte; el flujo fue: consultar el grafo → encontrar el patrón interesante
→ redactar la pregunta. Un subconjunto de aristas "negativas" (para las trampas de
`pest_cross_crop`) se verificó explícitamente comprobando que la arista NO existe (`sp in
pest_to_species.get(pest, set())` → `False`), no solo asumiendo la ausencia.

Gotcha del grafo (ya documentado en memoria del operador): `toString()` sobre un nodo revienta;
todas las consultas pidieron propiedades explícitas (`n.id`, `n.nombre_comun`, ...) en vez del
nodo completo. Las plagas de una especie son aristas **entrantes**: `(Pest)-[:AFFECTS]->(Species)`,
no al revés — confirmado con `label(a), a.id, label(b), b.id` en una arista de muestra antes de
asumir la dirección.

## Los 4 archivos

### `eval/intel-grounding-v2.json` — 40 preguntas

Anti-alucinación con trampas **sutiles** (v1 ya cubría trampas obvias tipo "papa lunar del
Guaviare"). 3 subtipos nuevos, todos con especies/nombres NUEVOS respecto a v1 (no reciclados):

- **`ooc_invented_subtle` (15)** — variedad o especie plausible pero inventada, verificada
  contra los 743 Species y las 160 Variety reales (ej. variedades reales de café en el catálogo
  son Castillo General/Cenicafé 1/Colombia/Caturra/Borbón/Típica/Tabi/Castillo/Borbón R.M. —
  "Bourbon Esmeralda del Huila" no existe en ninguna).
- **`false_premise_numeric` (10)** — dato numérico verosímil pero FALSO, contrastado contra
  propiedades reales del nodo Species (`suelo_ph_optimo`, `altitud_min/max`, `temp_min/max`).
  Ej.: el café arábigo tiene `suelo_ph_optimo = "5.0-5.5"` en el grafo — preguntar por un pH
  alcalino "7.8-8.2" es una trampa verificable, no una opinión.
- **`pest_cross_crop` (8)** — plaga REAL del catálogo aplicada a un cultivo que no ataca,
  verificado comprobando que la arista `(Pest)-[:AFFECTS]->(Species)` no existe para ese par
  específico (ej. la broca del café solo tiene AFFECTS→coffea_arabica, nunca →musa_paradisiaca).
- **`in_corpus` (7)** — control anti-mudez: especies reales y bien pobladas, el agente DEBE
  responder, no abstenerse por exceso de cautela.

### `eval/intel-relaciones-v2.json` — 30 preguntas

Multi-hop de 2-3 saltos (v1 era 1-hop: companion directo o pest_control directo). Cada entrada
trae `"chain"` con los nodos/aristas exactos recorridos. 4 subtipos:

- **`piso_pest_control` (15, 3-hop)** — `Species-[GROWS_IN]->PisoTermico` +
  `Pest-[AFFECTS]->Species` + `Controlador-[CONTROLS]->Pest`, un piso térmico distinto (frío/
  templado/cálido/páramo) por pregunta, cubriendo café, papa (tuberosum y phureja), maíz,
  fríjol, tomate, aguacate, yuca, cebolla y plátano.
- **`companion_and_fixer` (8, 2-hop intersección)** — especie que a la vez fija nitrógeno
  (`FIXES_NITROGEN`) Y es compañera verificada (`COMPATIBLE_WITH`) de un cultivo dado. No es
  "cualquier leguminosa": se comprobó la intersección real por cultivo (ej. el aliso andino es
  compañero fijador tanto de café como de papa criolla; el maní forrajero lo es del aguacate).
- **`variety_resistance_control` (4, 3-hop)** — variedad `IS_VARIETY_OF` una especie, con
  resistencia registrada (campo `resistencias` del nodo Variety, JSON con
  `plaga_enfermedad`/`binomio`/`nivel`) a una plaga puntual, más el `CONTROLS` de esa plaga por
  si la resistencia varietal no basta.
- **`pollinator` (3, 2-hop)** — `Animal-[POLINIZA]->Species`, eligiendo casos donde el
  polinizador NO es la abeja europea genérica (abeja angelita nativa en gulupa/guayaba,
  murciélago nectarívoro en marañón) — para no dejar que el agente asuma *Apis mellifera* por
  defecto.

### `eval/intel-taxonomia-v2.json` — 30 preguntas

v1 medía género+epíteto de 13 especies conocidas. v2 amplía a 5 subtipos:

- **`variety_to_species` (8)** — variedad real → especie correcta, incluida la trampa inversa
  "Conilon" (variedad real de *Coffea canephora*/robusta) para ver si el agente asume arábiga
  por defecto.
- **`regional_folk_name` (10)** — tomado **directamente** de los 34 nodos `ConfusionWarning` +
  325 `RegionalLabel` del grafo (fuente `DR-LANG-2`), no redactado por mí: "cura"→aguacate (no
  sacerdote), "yuca brava"→tóxica sin detoxificar, "guineo"→ambiguo genuino según región (la
  respuesta correcta es reconocer la ambigüedad, no forzar una sola especie).
- **`confused_with_pair` (4)** — las 4 aristas `CONFUSED_WITH` que existen en el grafo completo
  (arracacha/apio, cilantro/cilantro cimarrón, maracuyá/gulupa, malanga/taro).
- **`same_genus_diff_species` (4)** — más allá de papa criolla/v1: café robusta vs arábiga,
  plátano (**híbrido** *Musa × paradisiaca*, nótese el ×) vs banano Cavendish (triploide puro
  *Musa* AAA), ñame blanco vs ñame blanco africano, mashua vs capuchina.
- **`same_family_diff_genus` (4)** — verificado con `HAS_FAMILY`: arracacha/zanahoria
  (Apiaceae), mora/fresa (Rosaceae), tomate/uchuva/lulo (Solanaceae, con la trampa de que la
  uchuva SÍ cambia de género a *Physalis*), café/cacao (familias distintas pese a ser ambos
  cultivos de sombrío — trampa de control en la dirección opuesta).

### `eval/intel-thermal-v2.json` — 20 preguntas

Eje **nuevo**, no existía en v1. Mide si el agente distingue piso térmico por especie/variedad
en vez de generalizar por género o por conocimiento de mundo genérico:

- **`data_gap` (3)** — huecos reales del grafo: *Coffea canephora* no tiene NINGUNA arista
  GROWS_IN (a diferencia de *C. arabica*); *Solanum tuberosum* y *Musa* AAA Cavendish sí tienen
  piso pero no `altitud_min/max` como propiedad — el agente debe admitir el hueco, no rellenarlo
  con conocimiento general.
- **`same_genus_diff_piso` (9)** — mismo género o incluso misma especie con piso MUY distinto
  por variedad/forma: maracuyá/gulupa (misma especie, formas por color), papa criolla/tuberosum,
  chirimoya/guanábana (Annona), rocoto/pimentón (Capsicum), banano/plátano (Musa), ñame/ibia
  (Dioscorea), coliflor/brócoli y coles de Bruselas/repollo (ambos *Brassica oleracea*),
  frambuesa/mora (Rubus).
- **`piso_range_fact` (4)** — rangos numéricos exactos de los 4 nodos `PisoTermico` (fuente
  IDEAM/IGAC): cálido 0-1000msnm >24°C, templado 1000-2000msnm 18-24°C, frío 2000-3000msnm
  12-18°C, páramo 3000-9999msnm <12°C.
- **`wide_piso_range` (4)** — especies de amplitud térmica inusual, registradas en los 3 pisos
  no-páramo a la vez (calabaza, limonaria, yerbabuena, eucalipto) — para no asumir un rango
  estrecho por default.

## `data/dpo/pairs-v2.jsonl` — 120 pares golden

Un par por cada una de las 120 preguntas de arriba (40+30+30+20), formato
`{"prompt": str, "chosen": str, "rejected": str, "meta": {...}}`. `meta` trae `dimension`,
`id` (referenciable a la pregunta de origen en los 4 JSON de arriba), `verified_against`, y
campos específicos por dimensión (`chain`, `trap_type`, `real_fact`, `expected_pisos`, etc.)
para trazabilidad.

- `chosen` = la respuesta correcta verificada contra el grafo (mismo hecho que el golden del
  archivo de eval correspondiente, redactado en lenguaje natural de asistente).
- `rejected` = la alucinación típica o el error común esperable — NO una respuesta absurda, sino
  el fallo plausible real: asumir que un biopreparado "universal" (neem/BT/caldo sulfocálcico)
  sirve sin verificar la plaga puntual, confirmar una premisa numérica falsa, asumir que
  *Apis mellifera* poliniza todo, asumir que "mismo género = mismo piso térmico", etc.

**Nota de formato**: el `data/dpo/pairs.jsonl` existente (118 pares, generado antes) usa un
esquema distinto — `prompt` como lista de mensajes `{role, content}` (system+user) en vez de
string plano. `pairs-v2.jsonl` sigue el esquema pedido para esta tarea (`{prompt, chosen,
rejected, meta}` con `prompt` como string). Antes de fusionar ambos en `train.jsonl`/
`heldout.jsonl` para un futuro fine-tune DPO, hace falta un paso de conversión de esquema
(envolver `prompt` en el formato de mensajes system+user) — no se hizo aquí porque la tarea
pidió explícitamente NO tocar el harness ni correr modelos.

## Cómo re-verificar cualquier golden de este set

```bash
ssh alpha "sudo -n podman exec postgres-farm psql -U farmos -d chagra_kg -t -A -c \"
LOAD 'age';
SET search_path = ag_catalog, public;
SELECT * FROM cypher('chagra_kg', \$\$ MATCH (p:Pest)-[:AFFECTS]->(s:Species) WHERE s.id = 'coffea_arabica' RETURN p.id, p.nombre_comun \$\$) AS (id agtype, com agtype);
\""
```

Cambiar el patrón `MATCH` según la dimensión: `GROWS_IN` para piso térmico, `CONTROLS` para
controladores biológicos, `IS_VARIETY_OF` + `properties(v).resistencias` para variedades,
`COMPATIBLE_WITH`/`FIXES_NITROGEN` para asociación, `POLINIZA` para polinizadores,
`HAS_FAMILY` para familia botánica.
