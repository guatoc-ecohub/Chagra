# Curador de catálogo - huecos

Total de especies analizadas: 593
Fuentes leídas: /tmp/codex-idea7/catalog/chagra-catalog-seed-v3.1.json, /tmp/codex-idea7/catalog/chagra-catalog-oss-subset-v3.2.json
Fusion de registros: por id, con prioridad al archivo leido al final.
Especie base inspeccionada, claves observadas: id, nombre_comun, nombre_cientifico, familia_botanica, category, thermal_zones, roles_in_guild, cultivable, conservation_status, altitud_msnm, temperatura_c, radiacion, agua, drenaje_requerido, propagation, source_ids, valor_pedagogico, companions, antagonists, tracking_mode, id, nombre_comun, nombre_cientifico, familia_botanica, category, thermal_zones, roles_in_guild, cultivable, conservation_status, altitud_msnm, temperatura_c, radiacion, agua, drenaje_requerido, propagation, source_ids, valor_pedagogico, feeding_plan_template, antagonists, companions

| Categoria | Conteo | Primeras 30 especies |
|---|---:|---|
| SIN piso termico / rango altitudinal | 0 | — |
| SIN foto / imagen | 593 | acacia_mangium - Acacia mangium<br>acacia_melanoxylon - Acacia negra<br>acanthus_mollis - Acanto andino<br>acca_sellowiana - Feijoa / Guayabo del país<br>achillea_millefolium - Milenrama<br>acrocomia_aculeata - Corozo<br>actinidia_deliciosa - Kiwi<br>agave_americana - Cabuya<br>agave_cocui - Cocuy<br>agave_tequilana - Agave azul tequilero<br>agrostis_foliata - Pasto agrostis foliado<br>aiphanes_aculeata - Corozo<br>albizia_guachapele - Guachapele<br>allium_ampeloprasum - Cebolla puerro<br>allium_cepa - Cebolla cabezona<br>allium_fistulosum - Cebollín / Cebolla larga<br>allium_sativum - Ajo<br>allium_schoenoprasum - Cebollino<br>alnus_acuminata - Aliso andino<br>alocasia_macrorrhizos - Bore<br>aloe_arborescens - Sábila medicinal<br>aloe_vera - Sábila<br>aloysia_citrodora - Cedrón<br>amaranthus_caudatus - Amaranto<br>amaranthus_caudatus_kiwicha - Kiwicha<br>amaranthus_dubius - Bledo<br>anacardium_excelsum - Caracolí<br>anacardium_occidentale - Marañón / Merey<br>ananas_comosus - Piña<br>ananas_comosus_md_gold - Piña MD-2 / Sweet Gold |
| SIN controlador biologico asociado | 556 | acacia_mangium - Acacia mangium<br>acacia_melanoxylon - Acacia negra<br>acanthus_mollis - Acanto andino<br>acca_sellowiana - Feijoa / Guayabo del país<br>achillea_millefolium - Milenrama<br>acrocomia_aculeata - Corozo<br>actinidia_deliciosa - Kiwi<br>agave_americana - Cabuya<br>agave_cocui - Cocuy<br>agave_tequilana - Agave azul tequilero<br>agrostis_foliata - Pasto agrostis foliado<br>aiphanes_aculeata - Corozo<br>albizia_guachapele - Guachapele<br>allium_ampeloprasum - Cebolla puerro<br>allium_cepa - Cebolla cabezona<br>allium_fistulosum - Cebollín / Cebolla larga<br>allium_sativum - Ajo<br>alnus_acuminata - Aliso andino<br>alocasia_macrorrhizos - Bore<br>aloe_arborescens - Sábila medicinal<br>aloe_vera - Sábila<br>aloysia_citrodora - Cedrón<br>amaranthus_caudatus - Amaranto<br>amaranthus_caudatus_kiwicha - Kiwicha<br>amaranthus_dubius - Bledo<br>anacardium_excelsum - Caracolí<br>anacardium_occidentale - Marañón / Merey<br>ananas_comosus - Piña<br>ananas_comosus_md_gold - Piña MD-2 / Sweet Gold<br>andropogon_gayanus - Carimagua |

## Metodo
- Piso termico / rango altitudinal: hueco cuando falta `altitud_msnm` valida o falta `thermal_zones`.
- Foto / imagen: hueco cuando no existe ningun campo de foto o imagen reconocido en el registro.
- Control biologico: hueco cuando no hay evidencia textual de asociacion de control o biocontrol en el registro.

## Claves observadas
- seed-v3.1: id, nombre_comun, nombre_cientifico, familia_botanica, category, thermal_zones, roles_in_guild, cultivable, conservation_status, altitud_msnm, temperatura_c, radiacion, agua, drenaje_requerido, propagation, source_ids, valor_pedagogico, companions, antagonists, tracking_mode
- subset-v3.2: id, nombre_comun, nombre_cientifico, familia_botanica, category, thermal_zones, roles_in_guild, cultivable, conservation_status, altitud_msnm, temperatura_c, radiacion, agua, drenaje_requerido, propagation, source_ids, valor_pedagogico, feeding_plan_template, antagonists, companions, tracking_mode, cultivar, nombre_comunes_regionales, validation_level
