/**
 * scripts/__tests__/build-oss-subset.test.mjs
 *
 * Cobertura unitaria del set OSS_SUBSET_IDS exportado por `build-oss-subset.mjs`.
 * El script en sí escribe a disco — esos tests viven indirectamente en el
 * pipeline (validate-catalog corre tras el swap). Acá verificamos solo la
 * integridad del set (50 IDs, sin duplicados, snake_case válido).
 */
import { describe, it, expect } from 'vitest';

import { OSS_SUBSET_IDS } from '../build-oss-subset.mjs';

describe('OSS_SUBSET_IDS — integridad del set de 50 IDs', () => {
  it('tiene exactamente 50 IDs únicos', () => {
    expect(OSS_SUBSET_IDS.size).toBe(50);
  });

  it('todos los IDs siguen patrón snake_case (lowercase + underscores)', () => {
    const re = /^[a-z][a-z0-9_]*$/;
    for (const id of OSS_SUBSET_IDS) {
      expect(re.test(id), `ID "${id}" no matches snake_case`).toBe(true);
    }
  });

  it('incluye los anchors editoriales canónicos del subset', () => {
    // Sentinels que NO deben perderse si alguien edita la lista por accidente.
    // Si necesitás sustituir uno, actualizá este test también.
    const ANCHORS = [
      'coffea_arabica', // café (anchor demo principal)
      'musa_paradisiaca', // plátano
      'manihot_esculenta', // yuca
      'theobroma_cacao', // cacao
      'inga_edulis', // guamo (companion café)
      'alnus_acuminata', // aliso (companion café altoandino)
      'ulex_europaeus', // retamo espinoso (invasora prioritaria)
      'eichhornia_crassipes', // buchón (invasora acuática)
      'chenopodium_quinoa', // quinoa (demo)
      'aloe_vera', // sábila (medicinal canónica)
    ];
    for (const id of ANCHORS) {
      expect(OSS_SUBSET_IDS.has(id), `Anchor "${id}" falta en OSS_SUBSET_IDS`).toBe(true);
    }
  });

  it('NO incluye IDs que telegrafían curaduría editorial Pro', () => {
    // Los siguientes son ejemplos representativos de lo que NO debe estar en
    // el subset OSS. La lista NO es exhaustiva — su rol es defensivo contra
    // expansiones accidentales que filtren diferencial editorial.
    const PRO_ONLY = [
      'espeletia_grandiflora', // frailejón emblema Sumapaz (endémico crítico)
      'aragoa_abietina', // endémica Chingaza
      'diplostephium_rosmarinifolium', // endémica páramo
      'arracacia_xanthorrhiza_agrosavia_la22', // cultivar AGROSAVIA específico
      'solanum_phureja_yema_huevo', // variedad ICA papa criolla curada
    ];
    for (const id of PRO_ONLY) {
      expect(OSS_SUBSET_IDS.has(id), `ID Pro "${id}" no debería estar en subset OSS`).toBe(false);
    }
  });
});
