/**
 * toxicologiaInsumos.test.js — Verifica la derivación de la ficha toxicológica
 * de insumos a partir de datos REALES del catálogo (anti-alucinación).
 *
 * Reglas que estos tests blindan:
 *   - Caso crítico cobre (caldo bordelés) → toxicidad ALTA + EPI + restricción ICA.
 *   - Caso crítico azufre (sulfocálcico) → toxicidad ALTA + EPI (careta/gafas).
 *   - Insumo SIN precaucion_seguridad → 'sin_dato' (NUNCA "no es tóxico").
 *   - Bajo riesgo explícito → 'bajo'.
 *   - El EPI solo se devuelve si el texto lo nombra (no se inventa).
 */

import { describe, it, expect } from 'vitest';
import {
  detectarEPI,
  nivelToxicidad,
  restriccionLegal,
  fichaToxicologica,
  fichasToxicologicas,
} from '../toxicologiaInsumos';

const CALDO_BORDELES = {
  id: 'caldo_bordeles',
  nombre: 'Caldo bordelés',
  tipo: 'mineral',
  precaucion_seguridad:
    'TOXICOLOGIA COBRE: metal pesado, fitotoxico en exceso y acumulable en el suelo. '
    + 'EPI: guantes, careta y gafas. Neutralizar SIEMPRE con cal. Uso RESTRINGIDO en '
    + 'certificacion organica (Resolucion ICA 698/2011).',
  dosis_aplicacion: 'Caldo madre al 1% para 10 L: 100 g de sulfato de cobre + 100 g de cal.',
  fuente: 'Restrepo Rivera, J.; Agrosavia/ICA; Resolucion ICA 698/2011.',
  source_ids: ['agrosavia-manual-biopreparados-2015'],
  confianza: 'alta',
};

const CALDO_SULFOCALCICO = {
  id: 'caldo_sulfocalcico',
  nombre: 'Caldo sulfocálcico',
  precaucion_seguridad:
    'TOXICOLOGIA AZUFRE: irritante de vias respiratorias, ojos y piel; desprende vapores '
    + 'durante la coccion. EPI: guantes, careta y gafas; cocinar al aire libre. Corrosivo para metales.',
  confianza: 'alta',
};

const BOCASHI = {
  id: 'bocashi',
  nombre: 'Bocashi',
  precaucion_seguridad: 'Bajo riesgo. Aplicar maduro y frio. Polvo fino: usar tapabocas.',
};

const SIN_DATO = { id: 'lixiviado_frutas', nombre: 'Lixiviado de frutas' };

describe('nivelToxicidad', () => {
  it('marca caldo bordelés (cobre, metal pesado) como ALTO', () => {
    expect(nivelToxicidad(CALDO_BORDELES)).toBe('alto');
  });
  it('marca caldo sulfocálcico (azufre, EPI) como ALTO', () => {
    expect(nivelToxicidad(CALDO_SULFOCALCICO)).toBe('alto');
  });
  it('marca bocashi (bajo riesgo explícito) como BAJO', () => {
    expect(nivelToxicidad(BOCASHI)).toBe('bajo');
  });
  it('marca insumo SIN advertencia como sin_dato (nunca "no tóxico")', () => {
    expect(nivelToxicidad(SIN_DATO)).toBe('sin_dato');
  });
});

describe('detectarEPI', () => {
  it('extrae guantes, careta y gafas del texto real', () => {
    const epi = detectarEPI(CALDO_BORDELES.precaucion_seguridad).map((e) => e.id);
    expect(epi).toContain('guantes');
    expect(epi).toContain('careta');
    expect(epi).toContain('gafas');
  });
  it('detecta tapabocas como careta', () => {
    expect(detectarEPI(BOCASHI.precaucion_seguridad).map((e) => e.id)).toContain('careta');
  });
  it('no inventa EPI cuando el texto no lo menciona', () => {
    expect(detectarEPI('')).toEqual([]);
    expect(detectarEPI(undefined)).toEqual([]);
  });
});

describe('restriccionLegal', () => {
  it('cita Resolución ICA 698/2011 para el caldo bordelés', () => {
    expect(restriccionLegal(CALDO_BORDELES)).toMatch(/698\/2011/);
  });
  it('no inventa restricción cuando no la hay', () => {
    expect(restriccionLegal(BOCASHI)).toBeNull();
  });
});

describe('fichaToxicologica', () => {
  it('no inventa dosis ni precaución para insumos sin dato', () => {
    const f = fichaToxicologica(SIN_DATO);
    expect(f.nivel).toBe('sin_dato');
    expect(f.precaucion).toBeNull();
    expect(f.dosis).toBeNull();
    expect(f.epi).toEqual([]);
  });
  it('preserva dosis y fuente reales del catálogo', () => {
    const f = fichaToxicologica(CALDO_BORDELES);
    expect(f.dosis).toContain('sulfato de cobre');
    expect(f.fuente).toMatch(/Restrepo/);
    expect(f.confianza).toBe('alta');
  });
});

describe('fichasToxicologicas', () => {
  it('ordena por severidad (alto primero, sin_dato al final)', () => {
    const out = fichasToxicologicas([SIN_DATO, BOCASHI, CALDO_BORDELES]);
    expect(out[0].nivel).toBe('alto');
    expect(out[out.length - 1].nivel).toBe('sin_dato');
  });
  it('tolera lista vacía o nula', () => {
    expect(fichasToxicologicas([])).toEqual([]);
    expect(fichasToxicologicas(null)).toEqual([]);
  });
});
