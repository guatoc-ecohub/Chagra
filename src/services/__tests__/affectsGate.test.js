/**
 * affectsGate.test.js — AFFECTS-GATE contra la contaminación cruzada de cultivo.
 *
 * Reproduce el BUG de la auditoría: en una conversación de CACAO el agente
 * mostró la BROCA (Hypothenemus hampei, plaga de CAFÉ) con el sello "Dato
 * verificado". Verificado ≠ relevante: la broca solo afecta a Coffea (arista
 * AFFECTS del grafo). El gate debe detectar el cross-crop y evitar que ese turno
 * salga como "Catálogo verificado".
 */
import { describe, test, expect } from 'vitest';
import {
  extractAffectsFromEvidence,
  resolvePestAffects,
  scanTextForPestAffects,
  detectCrossCropContamination,
  gateSourceMetadataByAffects,
} from '../affectsGate';
import { computeSourceMetadata } from '../conversationMemory';

// Fixture recortado del export offline real del grafo (public/grafo-relations.json).
// `_pest_index` (plaga canónica → cultivos afectados) es la arista AFFECTS.
const pestIndex = {
  'Broca del café': ['coffea_arabica'],
  'hypothenemus_hampei_broca': ['coffea_arabica'],
  'moniliasis del cacao': ['theobroma_cacao'],
  'escoba de bruja cacao': ['theobroma_cacao'],
};
const pestSynonyms = {
  'broca': 'Broca del café',
  'broca del café': 'Broca del café',
  'broca del cafe': 'Broca del café',
  'hypothenemus_hampei_broca': 'Broca del café',
  'monilia': 'moniliasis del cacao',
  'moniliasis del cacao': 'moniliasis del cacao',
};
const maps = { pestIndex, pestSynonyms };

const CACAO = 'theobroma_cacao';
const CAFE = 'coffea_arabica';

// Evidencia real de get_pest_controllers para la BROCA: la arista AFFECTS viaja
// en matches[].target_species (los cultivos que la plaga afecta).
const brocaControllersEvidence = {
  tool: 'get_pest_controllers',
  args: { pest: 'broca' },
  result: {
    matches_count: 1,
    matches: [
      {
        pest_id: 'hypothenemus_hampei_broca',
        plaga: 'Broca del café',
        target_species: [{ id: 'coffea_arabica', nombre: 'Café' }],
        biopreparados: [{ id: 'beauveria', nombre: 'Hongo entomopatógeno (beauveria)' }],
      },
    ],
  },
};

describe('extractAffectsFromEvidence', () => {
  test('saca la arista AFFECTS de get_pest_controllers (broca → café)', () => {
    expect(extractAffectsFromEvidence(brocaControllersEvidence)).toEqual([
      { pest: 'hypothenemus_hampei_broca', affects: ['coffea_arabica'] },
    ]);
  });

  test('ignora tools que no son get_pest_controllers', () => {
    expect(extractAffectsFromEvidence({ tool: 'get_species', result: { found: true } })).toEqual([]);
  });

  test('soporta tool_chain (array de evidencias)', () => {
    const chain = [{ tool: 'get_species', result: { found: true } }, brocaControllersEvidence];
    expect(extractAffectsFromEvidence(chain)).toEqual([
      { pest: 'hypothenemus_hampei_broca', affects: ['coffea_arabica'] },
    ]);
  });

  test('null / basura → []', () => {
    expect(extractAffectsFromEvidence(null)).toEqual([]);
    expect(extractAffectsFromEvidence({})).toEqual([]);
  });
});

describe('resolvePestAffects', () => {
  test('resuelve el término coloquial "broca" a su arista AFFECTS (café)', () => {
    expect(resolvePestAffects('broca', maps)).toEqual({ pest: 'Broca del café', affects: ['coffea_arabica'] });
  });
  test('resuelve por etiqueta canónica directa', () => {
    expect(resolvePestAffects('moniliasis del cacao', maps)).toEqual({
      pest: 'moniliasis del cacao',
      affects: ['theobroma_cacao'],
    });
  });
  test('término desconocido → null', () => {
    expect(resolvePestAffects('dragón morado', maps)).toBeNull();
  });
});

describe('scanTextForPestAffects', () => {
  test('detecta la broca citada en el cuerpo de una respuesta de cacao', () => {
    const respuesta =
      'Para tu cacao, cuidado con la broca (Hypothenemus hampei), que perfora el grano.';
    const found = scanTextForPestAffects(respuesta, maps);
    expect(found).toContainEqual({ pest: 'Broca del café', affects: ['coffea_arabica'] });
  });

  test('no caza ruido en un texto sin plagas del grafo', () => {
    expect(scanTextForPestAffects('El cacao necesita sombra y suelo bien drenado.', maps)).toEqual([]);
  });
});

describe('detectCrossCropContamination', () => {
  test('BUG: broca (café) en foco de CACAO → cross-crop', () => {
    const res = detectCrossCropContamination({
      cropInFocusIds: [CACAO],
      pestAffectsList: [{ pest: 'Broca del café', affects: [CAFE] }],
    });
    expect(res.crossCrop).toBe(true);
    expect(res.offending.map((o) => o.pest)).toContain('Broca del café');
    expect(res.relevant).toEqual([]);
  });

  test('broca en foco de CAFÉ → NO es cross-crop (la broca sí afecta al café)', () => {
    const res = detectCrossCropContamination({
      cropInFocusIds: [CAFE],
      pestAffectsList: [{ pest: 'Broca del café', affects: [CAFE] }],
    });
    expect(res.crossCrop).toBe(false);
    expect(res.relevant.map((o) => o.pest)).toContain('Broca del café');
  });

  test('mezcla: monilia (cacao) + broca (café) en foco de CACAO → NO cross-crop (hay una relevante)', () => {
    const res = detectCrossCropContamination({
      cropInFocusIds: [CACAO],
      pestAffectsList: [
        { pest: 'moniliasis del cacao', affects: [CACAO] },
        { pest: 'Broca del café', affects: [CAFE] },
      ],
    });
    expect(res.crossCrop).toBe(false);
  });

  test('sin cultivo en foco → nunca decide (fail-safe)', () => {
    const res = detectCrossCropContamination({
      cropInFocusIds: [],
      pestAffectsList: [{ pest: 'Broca del café', affects: [CAFE] }],
    });
    expect(res.crossCrop).toBe(false);
  });

  test('arista AFFECTS desconocida → el gate no opina (fail-safe, sello intacto)', () => {
    const res = detectCrossCropContamination({
      cropInFocusIds: [CACAO],
      pestAffectsList: [{ pest: 'plaga misteriosa', affects: [] }],
    });
    expect(res.crossCrop).toBe(false);
    expect(res.offending).toEqual([]);
  });
});

describe('gateSourceMetadataByAffects', () => {
  test('degrada el sello (grounded→false) y marca cross_crop cuando es cross-crop', () => {
    const base = { tool_used: 'get_pest_controllers', grounded: true };
    const gated = gateSourceMetadataByAffects(
      base,
      { crossCrop: true, offending: [{ pest: 'Broca del café' }] },
      { cropInFocusIds: [CACAO] },
    );
    expect(gated.grounded).toBe(false);
    expect(gated.cross_crop).toBe(true);
    expect(gated.cross_crop_organisms).toEqual(['Broca del café']);
    expect(gated.cross_crop_focus).toEqual([CACAO]);
    // No muta la entrada.
    expect(base.grounded).toBe(true);
    expect(base.cross_crop).toBeUndefined();
  });

  test('turno legítimo (no cross-crop) → metadata intacta', () => {
    const base = { tool_used: 'get_pest_controllers', grounded: true };
    const gated = gateSourceMetadataByAffects(base, { crossCrop: false, offending: [] });
    expect(gated).toEqual(base);
  });
});

describe('REPRODUCCIÓN end-to-end: broca-en-cacao NO sale como "Catálogo verificado"', () => {
  test('sin gate el turno saldría verificado; con el gate se degrada a "de otro cultivo"', () => {
    // 1) Sin el gate, la evidencia de la broca haría el turno "grounded" (verde).
    const md = computeSourceMetadata(brocaControllersEvidence);
    expect(md).toEqual({ tool_used: 'get_pest_controllers', grounded: true });

    // 2) El gate arma la lista AFFECTS desde la MISMA evidencia + el cuerpo del
    //    turno, con el cultivo en foco = CACAO.
    const respuesta = 'Para tu cacao, la broca se controla con Beauveria bassiana.';
    const pestAffectsList = [
      ...extractAffectsFromEvidence(brocaControllersEvidence),
      ...scanTextForPestAffects(respuesta, maps),
    ];
    const gateResult = detectCrossCropContamination({ cropInFocusIds: [CACAO], pestAffectsList });
    expect(gateResult.crossCrop).toBe(true);

    // 3) El sello se degrada: NO grounded → el ChatBubble no pinta el verde.
    const gated = gateSourceMetadataByAffects(md, gateResult, { cropInFocusIds: [CACAO] });
    expect(gated.grounded).toBe(false);
    expect(gated.cross_crop).toBe(true);
  });
});
