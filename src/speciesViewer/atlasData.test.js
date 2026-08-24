import { describe, expect, it } from 'vitest';
import { ATLAS_STAGES, getAtlasRecord, getMarkers, getStageData } from './atlasData.js';

describe('atlasData', () => {
  it('expone tres estados y contenido para las especies con lámina curada', () => {
    expect(ATLAS_STAGES.map((stage) => stage.id)).toEqual(['semilla', 'brote', 'planta']);
    for (const id of ['solanum_lycopersicum', 'zea_mays', 'persea_americana']) {
      const record = getAtlasRecord(id);
      expect(record).not.toBeNull();
      for (const stage of ATLAS_STAGES) {
        expect(getStageData(record, stage.id)?.text).toBeTruthy();
        expect(getMarkers(record, stage.id).length).toBeGreaterThan(0);
      }
    }
  });

  it('no fabrica una lámina para una especie sin contenido propio', () => {
    expect(getAtlasRecord('espeletia_grandiflora')).toBeNull();
    expect(getMarkers(null, 'planta')).toEqual([]);
  });
});
