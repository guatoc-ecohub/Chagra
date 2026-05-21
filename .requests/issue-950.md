# Request #950

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/950
- Title: species-stubs: lote 1/7 (invasoras y especies en transicion — Resolucion 684/2018 + Cruz Verde)
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Completar 10 species stubs en catalog/chagra-catalog-seed-v3.1.json siguiendo
estrictamente el schema en catalog/schema-v3.1.json. Estas species YA EXISTEN
en el archivo como stubs (tienen id + nombre_cientifico + nombre_comun pero
NO tienen `temperatura_c` ni el resto de campos del bloque ecofisiológico).
La tarea es completar los campos faltantes, NO duplicar la entrada.

Foco estratégico Batch 1/7: Invasoras y especies en transición (Resolución 684/2018 MADS + Cruz Verde gestión)

Lista de species a completar:

  1. Retamo espinoso (Ulex europaeus L.) — id: ulex_europaeus
  2. Helecho marranero (Pteridium aquilinum (L.) Kuhn) — id: pteridium_aquilinum
  3. Ojo de poeta (Thunbergia alata Bojer ex Sims) — id: thunbergia_alata
  4. Kikuyo (Cenchrus clandestinus (Hochst. ex Chiov.) Morrone) — id: cenchrus_clandestinus
  5. Kikuyo manejado (Cenchrus clandestinus (Hochst. ex Chiov.) Morrone) — id: cenchrus_clandestinus_manejado
  6. Guaco trepador (Mikania micrantha Kunth) — id: mikania_micrantha
  7. Leucaena (Leucaena leucocephala (Lam.) de Wit) — id: leucaena_leucocephala
  8. Kudzu tropical (Pueraria phaseoloides (Roxb.) Benth.) — id: pueraria_phaseoloides
  9. Cabuya (Agave americana L.) — id: agave_americana
  10. Llantén mayor (Plantago major L.) — id: plantago_major

Para cada species completar (in-place) el bloque schema v3.1-conforme con
TODOS los campos obligatorios del schema (verificar contra catalog/schema-v3.1.json):

- thermal_zones: array de [paramo, frio, templado, calido]
- altitud_msnm: { min_absoluto, optimo_min, optimo_max, max_absoluto }
- temperatura_c: { min, optimo_min, optimo_max, max }
- radiacion: { rango } (ej. "sol_pleno", "media_sombra")
- agua: { rango } (ej. "moderado", "alto")
- drenaje_requerido: ["bueno", "moderado", "tolerante_inundacion"]
- propagation: array de métodos
- roles_in_guild: array (ej. "fijador_n", "atractor_polinizador", "cobertura_suelo")
- cultivable: bool
- conservation_status: { iucn, libro_rojo_colombia, cites }
- especies_nativas_sustitutas: array opcional
- source_ids: array de fuentes (mínimo 2 obligatorias, ver Tier abajo)
- valor_pedagogico: string explicativo Colombia-context >= 200 chars con
  4 elementos (geografia Colombia + manejo + cultural + fuente)
- category, familia_botanica: revisar coherencia con el id

FUENTES OBLIGATORIAS (registrar en source_ids):

  Tier A (canónica, contar):
    - IAvH (Instituto Humboldt)
    - Catálogo de Plantas y Líquenes de Colombia (Bernal et al. 2015+)
    - Plants of the World Online Kew
    - GBIF (https://gbif.org)
    - Tropicos (Missouri Botanical Garden)
    - Agrosavia fichas técnicas
    - Peer-reviewed con DOI (Caldasia, Acta Biológica Colombiana, BMC Plant Biology)

  Tier B (aceptable con cross-check):
    - Plantas Útiles de Colombia (Pérez Arbeláez)
    - Rebozo de la Cordillera (Mayer)
    - Cultivos Andinos Subexplotados (NRC 1989)
    - Restrepo Rivera 2005 (texto agroecológico colombiano)
    - Jardín Botánico de Bogotá colección viva

  NO aceptable:
    - Wikipedia (usar para cross-check pero NUNCA citar como source)
    - Blogs personales sin referencias
    - Vendor catalogs (semillas comerciales sin academia)

  Mínimo: 2 source_ids por species. Si tienes solo 1 Tier A verificable,
  omitir la species — mejor 8 species rigurosas que 10 con ruido.

CRITERIOS DE ACEPTACIÓN:

  1. JSON resultante parsea sin errores (validar con `python3 -m json.tool`).
  2. Cada species tiene >= 10 campos completos del schema (no contar source_ids).
  3. Cero data inventada. Si falta info en fuentes, omitir el campo no
     inventarlo (preferir null vs string fabricado).
  4. Validator strict pasa: `node scripts/validate-catalog.mjs` sin errores
     AMB-05/10/13/14/15/16/17/18.
  5. source_ids DEBEN EXISTIR en catalog/sources-seed.json (si falta una
     fuente nueva, anadir entry simultanea en sources-seed.json con
     autor/anio/titulo/institucion/tier).
  6. valor_pedagogico >= 200 chars con 4 elementos: distribucion geografica
     Colombia + manejo agronomico + contexto cultural muisca/andino/campesino
     + citacion implicita/explicita a la fuente Tier A/B.
  7. thermal_zones=paramo SOLO si altitud_min >= 2800m.
  8. Invasoras: conservation_status=invasor + category=especies_invasoras +
     citacion Resolución 684/2018 MADS o IAvH invasoras.
  9. CADA species debe tener al menos 1 source Tier A.

CRITERIOS REFORZADOS (auditoria 2026-05-14):
  - 91% del catalogo previo fue flagged por valor_pedagogico <200 chars o
    platitudes ("planta hermosa y util"). CERO TOLERANCIA en este batch.
  - Self-check pre-PR mental para cada species (ver template completo en
    Chagra-strategy/templates/species-batch-prompt.md).

RESTRICCIONES:
  - NO modificar species existentes diferentes a las 10 listadas.
  - NO cambiar el schema v3.1.
  - NO usar Wikipedia como única fuente.
  - Para Frailejones, Polylepis y especies endémicas Cruz Verde-Sumapaz:
    geolocalización anonimizada (solo thermal_zone + rango altitud,
    sin coords).

Prioridad: P1 (alta). Driver estratégico: completar el catálogo a 488/488
species con ficha completa (hoy 422/488, 66 stubs). Estos 7 batches cubren
los 66 stubs distribuidos por tema agroecológico.

Contexto pipeline (Chagra-strategy/ops/AI_PIPELINE_SOP.md):
1. Esta issue dispara el workflow `claude-code-request` (~1 min) que crea
   un PR draft con stub `.requests/issue-N.md`.
2. Aplicar label `ready-to-generate` al PR draft para disparar opencode.
3. Esperar generate (~3-7 min).
4. Revisar diff del PR: JSON parseable, fuentes Tier A, geolocalización
   endémicas, validator strict pasando.
5. Validación humana (Lili + agrónomo) antes de merge.


---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
