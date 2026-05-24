# Subset OSS v3.2 — 105 species top-uso curadas

**Fecha**: 2026-05-24  
**Reemplaza**: chagra-catalog-oss-subset-v3.1.json (50 species, deprecado tras revert PR #1012)  
**Fuente**: chagra-catalog-seed-v3.1.json (495 species full, ahora reservado para chagra-pro)  
**Licencia**: CC-BY-NC-SA 4.0  
**Generador**: scripts/extract-oss-subset-v32.mjs (determinístico)

## Contexto

El subset v3.1 (50 species, PR #1011) cortó species críticas — aguacate, tomate, lechuga, acelga, tomate de árbol — y rompió casos de uso reales del agente en producción. Revertido en PR #1012 al corpus full 495. Este v3.2 re-cura un subset top-uso real que sí incluye esas species, manteniendo la separación OSS/Pro definida en la memoria operador project-oss-pro-boundary-decisions-2026-05-23.

## Criterio de selección

1. **Intelligence-first** — top species por uso esperado en familias agroecológicas Colombia (no se sacrifica inteligencia por tamaño).
2. **Glosario anti-confusión taxonómica** — todas las pasifloras (maracuyá, gulupa, granadilla, curuba, badea), tomates (común + árbol + cherry), tubérculos sinónimos (cubio = mashua), lauráceas (Persea americana).
3. **Cobertura multi-piso** — cálido (cocotero, mango, piña), templado (café, plátano, ajíes), frío andino (papa, oca, ulluco, frailejón), páramo (polylepis, frailejón), amazónico (arazá, copoazú, chontaduro, asaí).
4. **Asocios funcionales** — caléndula, capuchina, tagetes, ortiga, girasol.
5. **Forestales sombrío café** — guamo, chachafruto, nogal cafetero, matarratón, nacedero.
6. **Invasoras comunes** — helecho marranero, retamo, pasto fuente (para identificación + manejo).
7. **NO incluidas** — variedades curadas editoriales extensas (reservadas Pro), species etnobotánicas indígenas (proceso aparte, requiere consentimiento previo).

## Inventario por categoría

| Categoría | Count | Racional |
|---|---|---|
| frutales_perennes | 29 | Frutales mayor — base de fincas familiares cálidas/templadas/andinas + amazónicas. Aguacate, mango, plátano, naranja, cítricos, café, cacao + pasifloras (anti-confusión taxonómica) + andinos (tomate árbol, lulo, uchuva, mora, fresa, arándano) + amazónicos estratégicos (arazá, borojó, copoazú, chontaduro, asaí). |
| medicinales_alelopaticas | 17 | Medicinales y aromáticas familiares — limonaria, jengibre, cúrcuma, manzanilla, toronjil, yerbabuena, romero, tomillo, orégano, albahaca, ruda, sábila, achiote, hinojo, ortiga. Cultivo y uso documentado público. |
| tuberculos_raices | 15 | Tubérculos andinos canónicos + tropicales — papa criolla, pastusa, sabanera + oca, mashua/cubio, ulluco + arracacha + yacón + yuca + batata + remolacha + zanahoria + rábano + cebolla cabezona + ajo + cebollino. |
| hortalizas_hoja | 12 | Hortalizas hoja diarias — lechuga (3 variedades), acelga (2), kale, repollo, brócoli, cilantro, perejil, apio, cebolla larga. Críticas en uso cotidiano del agente — el revert PR #1012 fue principalmente por cortarlas. |
| hortalizas_fruto_flor | 7 | Hortalizas fruto/flor — tomate común (3 variedades cherry/San Marzano/Sungold), zapallo/auyama (2), ají dulce + panca. |
| granos_legumbres | 5 | Leguminosas — fríjol, chocho/tarwi, haba, arveja andina. Fijadoras de N + alimento. |
| atractores_polinizadores | 4 | Asocios y polinizadores — caléndula, capuchina, tagetes (chinchilla + pericón), girasol. Diseño guild agroecológico estándar. |
| cereales | 4 | Cereales y pseudocereales andinos — maíz criollo, quinua, amaranto, chía. Base nutricional altoandina. |
| especies_invasoras | 3 | Invasoras comunes — helecho marranero, retamo espinoso, pasto fuente. Identificación + manejo, no cultivo. |
| arboles_sombra | 3 | Sombrío y forestales — guamo (sombrío café canónico), chachafruto, nogal cafetero, roble andino, polylepis (páramo), encenillo (subpáramo). |
| cercas_vivas | 3 | Forestales funcionales sombrío — guadua, matarratón, nacedero. Cercas vivas + sombrío café tradicional. |
| ornamentales_nativas | 2 | Páramo emblemático — frailejón mayor. Identificación + valor cultural. |
| abonos_verdes_coberturas | 1 | Cobertura/abono verde — aliso andino (N-fixer). |

**Total**: 105 species, 36 biopreparados, 68 sources.

## Lista completa

| ID | Nombre común | Nombre científico | Categoría |
|---|---|---|---|
| `beta_vulgaris_var_cicla` | Acelga | *Beta vulgaris var. cicla L.* | hortalizas_hoja |
| `beta_vulgaris_cicla_blanca` | Acelga blanca | *Beta vulgaris var. cicla L.* | hortalizas_hoja |
| `bixa_orellana` | Achiote | *Bixa orellana L.* | medicinales_alelopaticas |
| `persea_americana` | Aguacate | *Persea americana Mill.* | frutales_perennes |
| `cucurbita_moschata` | Ahuyama Amarilla | *Cucurbita moschata Duchesne* | granos_legumbres |
| `capsicum_annuum_aji_dulce_caribe` | Ají dulce caribe | *Capsicum annuum L. cv. 'Dulce'* | hortalizas_fruto_flor |
| `capsicum_chinense_aji_panca` | Ají panca | *Capsicum chinense Jacq. cv. 'Panca'* | hortalizas_fruto_flor |
| `allium_sativum` | Ajo | *Allium sativum L.* | tuberculos_raices |
| `ocimum_basilicum` | Albahaca | *Ocimum basilicum L.* | medicinales_alelopaticas |
| `alnus_acuminata` | Aliso andino | *Alnus acuminata Kunth* | abonos_verdes_coberturas |
| `amaranthus_caudatus` | Amaranto | *Amaranthus caudatus L.* | cereales |
| `apium_graveolens` | Apio | *Apio graveolens L.* | hortalizas_hoja |
| `vaccinium_corymbosum_biloxi` | Arándano Biloxi | *Vaccinium corymbosum 'Biloxi'* | frutales_perennes |
| `eugenia_stipitata` | Arazá | *Eugenia stipitata McVaugh* | frutales_perennes |
| `arracacia_xanthorrhiza` | Arracacha / Zanahoria blanca | *Arracacia xanthorrhiza Bancr.* | tuberculos_raices |
| `pisum_sativum_andina` | Arveja andina | *Pisum sativum L. var. andina* | granos_legumbres |
| `euterpe_oleracea` | Asai | *Euterpe oleracea Mart.* | frutales_perennes |
| `passiflora_quadrangularis` | Badea | *Passiflora quadrangularis L.* | frutales_perennes |
| `ipomoea_batatas` | Batata / Camote | *Ipomoea batatas (L.) Lam.* | tuberculos_raices |
| `borojoa_patinoi` | Borojó | *Borojoa patinoi Cuatrec.* | frutales_perennes |
| `brassica_oleracea_italica` | Brócoli | *Brassica oleracea var. italica Plenck* | hortalizas_fruto_flor |
| `theobroma_cacao` | Cacao | *Theobroma cacao L.* | frutales_perennes |
| `coffea_arabica` | Café caturra / Castillo / Cenicafé 1 | *Coffea arabica L.* | medicinales_alelopaticas |
| `cucurbita_maxima` | Calabaza / Auyama | *Cucurbita maxima Duchesne* | hortalizas_fruto_flor |
| `calendula_officinalis` | Caléndula | *Calendula officinalis L.* | atractores_polinizadores |
| `tropaeolum_majus` | Capuchina / Taco de reina | *Tropaeolum majus L.* | atractores_polinizadores |
| `allium_cepa` | Cebolla cabezona | *Allium cepa L.* | tuberculos_raices |
| `allium_fistulosum` | Cebollín / Cebolla larga | *Allium fistulosum L.* | hortalizas_hoja |
| `allium_schoenoprasum` | Cebollino | *Allium schoenoprasum L.* | hortalizas_hoja |
| `erythrina_edulis` | Chachafruto / Balú | *Erythrina edulis Triana ex Micheli* | frutales_perennes |
| `salvia_hispanica` | Chía | *Salvia hispanica L.* | cereales |
| `tagetes_minuta` | Chinchilla | *Tagetes minuta L.* | medicinales_alelopaticas |
| `lupinus_mutabilis` | Chocho / Tarwi | *Lupinus mutabilis Sweet* | granos_legumbres |
| `bactris_gasipaes` | Chontaduro | *Bactris gasipaes Kunth* | frutales_perennes |
| `coriandrum_sativum` | Cilantro | *Coriandrum sativum L.* | hortalizas_hoja |
| `cocos_nucifera` | Coco | *Cocos nucifera L.* | frutales_perennes |
| `polylepis_quadrijuga` | Coloradito, queñoa de páramo Cruz Verde | *Polylepis quadrijuga Bitter* | arboles_sombra |
| `theobroma_grandiflorum` | Copoazú | *Theobroma grandiflorum (Willd. ex Spreng.) K.Schum.* | frutales_perennes |
| `curcuma_longa` | Curcuma | *Curcuma longa L.* | medicinales_alelopaticas |
| `passiflora_tripartita_mollissima` | Curuba de Castilla | *Passiflora tripartita var. mollissima (Kunth) Holm-Niels. & Jørg.* | frutales_perennes |
| `weinmannia_tomentosa` | Encenillo | *Weinmannia tomentosa L. f.* | ornamentales_nativas |
| `espeletia_grandiflora` | Frailejón mayor | *Espeletia grandiflora Humb. & Bonpl.* | ornamentales_nativas |
| `fragaria_ananassa_monterrey` | Fresa Monterrey | *Fragaria × ananassa 'Monterrey'* | frutales_perennes |
| `fragaria_vesca` | Fresa silvestre andina | *Fragaria vesca L.* | frutales_perennes |
| `phaseolus_vulgaris` | Frijol arbustivo / voluble | *Phaseolus vulgaris L.* | granos_legumbres |
| `helianthus_annuus` | Girasol | *Helianthus annuus L.* | atractores_polinizadores |
| `passiflora_ligularis` | Granadilla | *Passiflora ligularis Juss.* | frutales_perennes |
| `guadua_angustifolia` | Guadua / Bambu nativo | *Guadua angustifolia Kunth* | cercas_vivas |
| `inga_edulis` | Guamo | *Inga edulis Mart.* | frutales_perennes |
| `psidium_guajava_manzana` | Guayaba manzana | *Psidium guajava 'Manzana'* | frutales_perennes |
| `passiflora_edulis_morada` | Gulupa | *Passiflora edulis f. edulis Sims* | frutales_perennes |
| `vicia_faba` | Haba | *Vicia faba L.* | granos_legumbres |
| `pteridium_aquilinum` | Helecho marranero | *Pteridium aquilinum (L.) Kuhn* | especies_invasoras |
| `foeniculum_vulgare` | Hinojo | *Foeniculum vulgare Mill.* | medicinales_alelopaticas |
| `zingiber_officinale` | Jengibre | *Zingiber officinale Roscoe* | medicinales_alelopaticas |
| `brassica_oleracea_acephala_curly` | Kale rizado verde | *Brassica oleracea var. acephala 'Curly'* | hortalizas_hoja |
| `lactuca_sativa_capitata` | Lechuga cogollo morada | *Lactuca sativa var. capitata L.* | hortalizas_hoja |
| `lactuca_sativa_crispa_verde` | Lechuga crespa verde | *Lactuca sativa L. var. crispa L.* | hortalizas_hoja |
| `lactuca_sativa_longifolia_verde` | Lechuga romana verde | *Lactuca sativa L. var. longifolia Lam.* | hortalizas_hoja |
| `citrus_latifolia` | Limón Tahití | *Citrus × latifolia (Yu. Tanaka) Tanaka* | frutales_perennes |
| `cymbopogon_citratus` | Limonaria | *Cymbopogon citratus (DC.) Stapf* | medicinales_alelopaticas |
| `solanum_quitoense` | Lulo / Naranjilla / Chuva | *Solanum quitoense Lam.* | frutales_perennes |
| `zea_mays` | Maíz criollo | *Zea mays L.* | cereales |
| `mangifera_indica` | Mango | *Mangifera indica L.* | frutales_perennes |
| `matricaria_chamomilla` | Manzanilla | *Matricaria chamomilla L.* | atractores_polinizadores |
| `passiflora_edulis_flavicarpa` | Maracuyá | *Passiflora edulis f. flavicarpa Deg.* | frutales_perennes |
| `tropaeolum_tuberosum` | Mashua / Cubio | *Tropaeolum tuberosum Ruiz & Pav.* | tuberculos_raices |
| `gliricidia_sepium` | Matarratón | *Gliricidia sepium (Jacq.) Kunth ex Walp.* | cercas_vivas |
| `rubus_glaucus` | Mora andina / Mora de Castilla | *Rubus glaucus Benth.* | frutales_perennes |
| `vaccinium_meridionale` | Mortino / Agraz | *Vaccinium meridionale Sw.* | frutales_perennes |
| `trichanthera_gigantea` | Nacedero | *Trichanthera gigantea (Bonpl.) Nees* | cercas_vivas |
| `citrus_sinensis` | Naranja | *Citrus × sinensis (L.) Osbeck* | frutales_perennes |
| `cordia_alliodora` | Nogal cafetero | *Cordia alliodora (Ruiz & Pav.) Oken* | arboles_sombra |
| `oxalis_tuberosa` | Oca / Hibia | *Oxalis tuberosa Molina* | tuberculos_raices |
| `origanum_vulgare` | Orégano | *Origanum vulgare L.* | medicinales_alelopaticas |
| `urtica_dioica` | Ortiga | *Urtica dioica L.* | medicinales_alelopaticas |
| `solanum_phureja` | Papa criolla | *Solanum phureja Juz. & Bukasov* | tuberculos_raices |
| `solanum_tuberosum_pastusa_suprema` | Papa Pastusa Suprema | *Solanum tuberosum L. subsp. tuberosum cv. 'Pastusa Suprema'* | tuberculos_raices |
| `solanum_tuberosum_sabanera` | Papa Sabanera | *Solanum tuberosum L. subsp. andigenum var. Sabanera* | tuberculos_raices |
| `pennisetum_setaceum` | Pasto fuente | *Pennisetum setaceum (Forssk.) Chiov. [sinónimo histórico; nombre POWO actual: Cenchrus setaceus (Forssk.) Morrone]* | especies_invasoras |
| `petroselinum_crispum` | Perejil crespo | *Petroselinum crispum (Mill.) Fuss* | hortalizas_hoja |
| `tagetes_lucida` | Pericón | *Tagetes lucida Cav.* | medicinales_alelopaticas |
| `ananas_comosus` | Piña | *Ananas comosus (L.) Merr.* | frutales_perennes |
| `musa_paradisiaca` | Plátano | *Musa × paradisiaca L.* | frutales_perennes |
| `chenopodium_quinoa` | Quinua | *Chenopodium quinoa Willd.* | cereales |
| `raphanus_sativus` | Rábano | *Raphanus sativus L.* | tuberculos_raices |
| `beta_vulgaris_conditiva` | Remolacha | *Beta vulgaris L. subsp. vulgaris Conditiva Group* | tuberculos_raices |
| `brassica_oleracea_capitata_alba` | Repollo blanco | *Brassica oleracea var. capitata L.* | hortalizas_hoja |
| `ulex_europaeus` | Retamo espinoso | *Ulex europaeus L.* | especies_invasoras |
| `quercus_humboldtii` | Roble negro andino | *Quercus humboldtii Bonpl.* | arboles_sombra |
| `rosmarinus_officinalis` | Romero | *Salvia rosmarinus Spenn. (syn. Rosmarinus officinalis L.)* | medicinales_alelopaticas |
| `ruta_graveolens` | Ruda | *Ruta graveolens L.* | medicinales_alelopaticas |
| `aloe_vera` | Sábila | *Aloe vera (L.) Burm.f.* | medicinales_alelopaticas |
| `solanum_lycopersicum_sungold` | Tomate cherry amarillo / Sungold | *Solanum lycopersicum 'Sungold'* | hortalizas_fruto_flor |
| `solanum_lycopersicum_cerasiforme` | Tomate cherry estándar | *Solanum lycopersicum var. cerasiforme (Dunal) A.Gray* | hortalizas_fruto_flor |
| `solanum_betaceum` | Tomate de árbol / Tamarillo | *Solanum betaceum Cav.* | frutales_perennes |
| `solanum_lycopersicum_san_marzano` | Tomate San Marzano | *Solanum lycopersicum 'San Marzano'* | hortalizas_fruto_flor |
| `thymus_vulgaris` | Tomillo | *Thymus vulgaris L.* | medicinales_alelopaticas |
| `melissa_officinalis` | Toronjil | *Melissa officinalis L.* | medicinales_alelopaticas |
| `physalis_peruviana` | Uchuva | *Physalis peruviana L.* | frutales_perennes |
| `ullucus_tuberosus` | Ulluco / Chugua | *Ullucus tuberosus Caldas* | tuberculos_raices |
| `smallanthus_sonchifolius` | Yacon / Llacon | *Smallanthus sonchifolius (Poepp.) H.Rob.* | tuberculos_raices |
| `mentha_spicata` | Yerbabuena / Menta | *Mentha spicata L.* | medicinales_alelopaticas |
| `manihot_esculenta` | Yuca brava amazónica | *Manihot esculenta Crantz* | tuberculos_raices |
| `daucus_carota_subsp_sativus` | Zanahoria | *Daucus carota L. subsp. sativus (Hoffm.) Arcang.* | tuberculos_raices |

## Sources incluidas

Filtro: sources referenciadas por al menos una species seleccionada o por algún biopreparado. Total: 68.

## Biopreparados incluidos

Todos los 36 biopreparados del catálogo full quedan en el subset OSS — decisión operador 2026-05-23: biopreparados OSS si legal + valor público (memoria project-oss-pro-boundary-decisions-2026-05-23). Las técnicas agroecológicas tradicionales documentadas públicamente son base del producto OSS.

## Build sqlite

```
node scripts/build-catalog-sqlite.mjs
[Build Catalog] Complete.
- 105 species inserted.
- 36 biopreparados inserted.
- 68 sources inserted.
```

Tamaño `public/catalog.sqlite`: ~640 KB (vs 332 KB del subset 50, vs ~2 MB del corpus full).

## Validator

```
node scripts/validate-catalog.mjs --lenient-schema catalog/chagra-catalog-oss-subset-v3.2.json
OK Catálogo válido — 105 especies, 36 biopreparados, 68 sources
```

Todos los validators semánticos AMB-05/10/13/14/15/16/17/18/19/20/21/22/23/25/26/27 pasan en verde. Schema warnings (65) son heredados del corpus full (legacy enums, `_url_pendiente` en sources) — no introducidos por este subset.

## Rollback

Si surge regresión: `CHAGRA_SEED=chagra-catalog-oss-subset-v3.1.json node scripts/build-catalog-sqlite.mjs` vuelve al subset 50 species deprecado pero conservado.

Alternativa corpus full (Pro): `CHAGRA_SEED=chagra-catalog-seed-v3.1.json node scripts/build-catalog-sqlite.mjs`.
