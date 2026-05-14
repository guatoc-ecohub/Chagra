# Request #329

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/329
- Title: [chore][catalog] Batch 10: Plantas medicinales tradicionales muiscas + andinas — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 10: Plantas medicinales tradicionales muiscas + andinas. Driver Cruz Verde delimitación MinAmbiente.

Lista priorizada (verificar no-duplicación):

Tier B medicinales tradicionales (etnobotánica documentada):
  1. ortiga mayor (Urtica dioica L.)
  2. ruda (Ruta graveolens L.)
  3. valeriana criolla (Valeriana pavonii Poepp. & Endl. — endémica Andes)
  4. canelón (Drimys granadensis L.f.)
  5. lavanda (Lavandula angustifolia Mill.)
  6. sábila (Aloe vera (L.) Burm.f.)
  7. romero blanco (Diplostephium rosmarinifolium (Benth.) Wedd.)
  8. ajenjo (Artemisia absinthium L.)
  9. paico (Dysphania ambrosioides (L.) Mosyakin & Clemants)
 10. tomillo silvestre (Thymus serpyllum L.)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Plantas Útiles Colombia (Pérez Arbeláez 1947)
  - Etnobotánica muisca Ardila 2015
  - Catálogo Plantas Colombia
  - Jardín Botánico de Bogotá
  - GBIF para distribución
  Tomar nota etnobotánica tradicional en valor_pedagogico.

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P1.

Contexto: Batch 10 de 31. Cadencia 1-2 batches/día con pausa validación
Lili cada 5 batches. Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar con GBIF)
  - geolocalización ANONIMIZADA para nativos amenazados Cruz Verde-Sumapaz
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Resolución 1912/2017 MinAmbiente + Libro Rojo
  - valor_pedagogico Colombia-context

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
