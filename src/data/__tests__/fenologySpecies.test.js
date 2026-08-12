import { describe, expect, it } from 'vitest';
import canonical from '../../../catalog/chagra-catalog-oss-subset-v3.2.json';
import { FENOLOGY_CATALOG, FENOLOGY_CATALOG_COUNT } from '../fenologySpecies';

describe('fenologySpecies slice', () => {
  it('contiene solo especies presentes en el catálogo canónico', () => {
    const byId = new Map(canonical.species.map((species) => [species.id, species]));
    expect(FENOLOGY_CATALOG_COUNT).toBe(23);
    for (const entry of FENOLOGY_CATALOG) {
      const source = byId.get(entry.id);
      expect(source, `falta ${entry.id} en el catálogo`).toBeTruthy();
      expect(entry.nombre_comun).toBe(source.nombre_comun);
      expect(entry.nombre_cientifico).toBe(source.nombre_cientifico);
      expect(entry.category).toBe(source.category);
      expect(entry.thermal_zones).toEqual(source.thermal_zones);
      expect(entry.altitud_msnm).toEqual(source.altitud_msnm);
    }
  });

  it('deja null donde las fuentes no documentan fenología', () => {
    const byId = new Map(FENOLOGY_CATALOG.map((entry) => [entry.id, entry]));
    expect(byId.get('passiflora_edulis_morada').phenology.lunar_preference).toEqual(['waxing_gibbous', 'full_moon']);
    expect(byId.get('spinacia_oleracea').phenology.lunar_preference).toEqual(['waxing_gibbous', 'waxing_crescent']);
    expect(byId.get('beta_vulgaris_conditiva').phenology.lunar_preference).toEqual(['waning_gibbous', 'waning_crescent']);
    expect(byId.get('passiflora_edulis_morada').phenology.harvest_days).toBeUndefined();
  });
});
