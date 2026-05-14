# Request #319

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/319
- Title: [chore][catalog] Batch 6: Atractores polinizadores nativos + medicinales (Tier B) — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 6: atractores polinizadores nativos + medicinales tradicionales
en jardín andino / borde páramo. Complementa biodiversidad funcional.

Lista priorizada (verificar no-duplicación):

Tier B (mezcla nativas + naturalizadas tradicionales):
  1. salvia hortelana (Salvia officinalis L.)
  2. romero (Salvia rosmarinus Spenn., antes Rosmarinus officinalis L.)
  3. tomillo (Thymus vulgaris L.)
  4. cilantro cimarrón (Eryngium foetidum L.) — nativo Americas
  5. flor de calabazo / auyama (Cucurbita maxima Duchesne flor comestible)
  6. yerbabuena (Mentha spicata L.)
  7. manzanilla (Matricaria chamomilla L.)
  8. caléndula (Calendula officinalis L.)
  9. diente de león (Taraxacum officinale F.H.Wigg. var. comestibles)
 10. ajenjo / hierba mora medicinal (Artemisia absinthium L.)

ATENCIÓN: para CADA species evaluar si:
  - Es nativa, naturalizada (>200 años uso), o introducida moderna
  - Tiene potencial invasor en páramo
  - Si está en catálogo IAvH de invasoras Colombia → marcar
    `invasive_risk: alto` y category `especies_invasoras`

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Catálogo Plantas y Líquenes de Colombia (Bernal et al. 2015+)
  - Plantas Útiles Colombia (Pérez Arbeláez 1947)
  - Jardín Botánico de Bogotá — invasoras Colombia
  - Plants of the World Online Kew
  - GBIF

Para CADA species:
  - roles_in_guild: la mayoría son atractor_polinizador o medicinal
  - valor_pedagogico: contexto colombiano tradicional / muisca cuando aplique
  - thermal_zones precisos (la mayoría frío/templado)

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P1 (no-Cruz Verde priority pero complementario).

Contexto: Batch 6 de 31. Si alguna species candidata aparece en lista
oficial IAvH de invasoras Colombia, marcar invasive_risk y category
especies_invasoras (no la elimines del batch — es importante registrarla).

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
