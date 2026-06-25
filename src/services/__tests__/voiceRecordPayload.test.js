// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * Prueba del builder de payload FarmOS del registro por voz (#23). Verifica que
 * cada intención mapea a su entidad/log correcto, que el geofield va en el lugar
 * correcto (assets → intrinsic_geometry, logs → geometry), y que asset--plant
 * SIEMPRE lleva plant_type (regla FarmOS, evita 422).
 */
import { describe, it, expect } from 'vitest';
import { buildVoicePayload } from '../voiceRecordPayload';
import { classifyAndExtractLocal } from '../voiceFieldExtractor';

const NOW = Date.UTC(2026, 5, 25, 12, 0, 0);
const rec = (voz) => classifyAndExtractLocal(voz, { now: NOW });
const WKT = 'POINT(-74.1 4.6)';

describe('registrar_planta → asset--plant', () => {
  const { saveType, payload } = buildVoicePayload(
    rec('aquí tengo un durazno que tiene como dos metros de alto y está floriado'),
    { wkt: WKT, locationAssetId: 'land-1' },
  );

  it('usa el endpoint de asset, no un log de siembra', () => {
    expect(saveType).toBe('plant_asset');
    expect(payload.data.type).toBe('asset--plant');
  });
  it('geofield del asset va en intrinsic_geometry.value (WKT)', () => {
    expect(payload.data.attributes.intrinsic_geometry).toEqual({ value: WKT });
    expect(payload.data.attributes.geometry).toBeUndefined();
  });
  it('lleva plant_type (obligatorio FarmOS) con el nombre del catálogo', () => {
    const pt = payload.data.relationships.plant_type.data[0];
    expect(pt.type).toBe('taxonomy_term--plant_type');
    expect(pt.attributes.name).toBe('Durazno');
  });
  it('persiste el slug del catálogo y la altura en meta', () => {
    expect(payload.data.attributes._speciesSlug).toBe('prunus_persica');
    expect(payload.data.attributes._chagra_plant_meta.altura_m).toBe(2);
  });
});

describe('registrar_siembra → log--seeding (con planta inline)', () => {
  const { saveType, payload } = buildVoicePayload(
    rec('sembré veinte maticas de cebolla larga'),
    {},
  );
  it('es un log--seeding con quantity count', () => {
    expect(saveType).toBe('seeding');
    expect(payload.data.type).toBe('log--seeding');
    expect(payload.data.relationships.quantity.data[0].attributes.value.decimal).toBe('20');
  });
  it('crea la planta inline con su plant_type', () => {
    const inline = payload.data.relationships.asset.data[0];
    expect(inline.type).toBe('asset--plant');
    expect(inline.relationships.plant_type.data[0].attributes.name).toMatch(/Cebolla Larga/);
  });
});

describe('registrar_cosecha → log--harvest (arrobas → kg)', () => {
  const { saveType, payload } = buildVoicePayload(
    rec('acabo de coger como tres arrobas de mora en el lote de abajo'),
    {},
  );
  it('convierte arrobas a kg en quantity weight', () => {
    expect(saveType).toBe('harvest');
    expect(payload.data.type).toBe('log--harvest');
    const q = payload.data.relationships.quantity.data[0].attributes;
    expect(q.measure).toBe('weight');
    expect(q.value.decimal).toBe('37.5');
  });
});

describe('reportar_plaga → log--observation con geometry', () => {
  const { saveType, payload } = buildVoicePayload(
    rec('encontré un nido de hormiga arriera al lado del nacedero'),
    { wkt: WKT },
  );
  it('geofield del log va en attributes.geometry (WKT), no intrinsic', () => {
    expect(saveType).toBe('observation');
    expect(payload.data.type).toBe('log--observation');
    expect(payload.data.attributes.geometry).toBe(WKT);
    expect(payload.data.attributes.intrinsic_geometry).toBeUndefined();
  });
  it('el nombre incluye la plaga reportada', () => {
    expect(payload.data.attributes.name).toMatch(/arriera/i);
  });
});

describe('registrar_insumo → log--input con material', () => {
  const { saveType, payload } = buildVoicePayload(
    rec('le eché caldo bordelés a los tomates esta mañana'),
    { locationAssetId: 'land-2' },
  );
  it('crea log--input con category material y location', () => {
    expect(saveType).toBe('input');
    expect(payload.data.type).toBe('log--input');
    expect(payload.data.relationships.category.data[0].type).toBe('taxonomy_term--material');
    expect(payload.data.relationships.location.data[0].id).toBe('land-2');
  });
});

describe('registrar_mantenimiento → log--task', () => {
  const { saveType, payload } = buildVoicePayload(rec('hoy podé los duraznos y limpié de maleza'), {});
  it('crea un log--task con las labores en el nombre', () => {
    expect(saveType).toBe('task');
    expect(payload.data.type).toBe('log--task');
    expect(payload.data.attributes.name).toMatch(/poda/i);
  });
});
