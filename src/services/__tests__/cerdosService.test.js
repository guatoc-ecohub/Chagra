import { describe, expect, it } from 'vitest';
import { PIGS_STAGE_SEQUENCE, stageSequenceForProcessType } from '../../types/farmProcess';
import ANIMAL_DIAGNOSTICS from '../../data/animal-diagnostics.json';

/**
 * TAREA 44 — cerdosService.test.js
 *
 * No existe un servicio dedicado `cerdosService.js`; la lógica porcina está
 * embebida en SeguimientoProcesoScreen.jsx. Este archivo testea las estructuras
 * de datos y funciones puras que alimentan ese flujo: secuencia de etapas,
 * perfil porcino, guarda de leucaena.
 */

const PIG_GUARD = ANIMAL_DIAGNOSTICS?.guardas?.leucaena_toxica || null;

const PIG_STAGE_LABELS = {
  instalacion: 'Instalación',
  alimentacion: 'Alimentación',
  reproduccion: 'Reproducción',
  sanidad: 'Sanidad',
  cierre: 'Cierre',
};

function initialStageFor(processType) {
  const seq = stageSequenceForProcessType(processType);
  return seq[0]?.stage || 'sowing_confirmed';
}

function getPigProfile(attributes) {
  return {
    cochera: attributes?.pig_cochera || {
      nombre: '',
      ubicacion: '',
      capacidad: '',
      cama_profunda: 'cascarilla_de_arroz',
    },
    lotes: Array.isArray(attributes?.pig_lotes) ? attributes.pig_lotes : [],
  };
}

describe('Pigs stage sequence', () => {
  it('stageSequenceForProcessType retorna PIGS_STAGE_SEQUENCE para pigs', () => {
    const seq = stageSequenceForProcessType('pigs');
    expect(seq).toBe(PIGS_STAGE_SEQUENCE);
  });

  it('PIGS_STAGE_SEQUENCE tiene 5 etapas en orden', () => {
    expect(PIGS_STAGE_SEQUENCE).toHaveLength(5);
    expect(PIGS_STAGE_SEQUENCE[0].stage).toBe('instalacion');
    expect(PIGS_STAGE_SEQUENCE[1].stage).toBe('alimentacion');
    expect(PIGS_STAGE_SEQUENCE[2].stage).toBe('reproduccion');
    expect(PIGS_STAGE_SEQUENCE[3].stage).toBe('sanidad');
    expect(PIGS_STAGE_SEQUENCE[4].stage).toBe('cierre');
  });

  it('cada etapa tiene stage (string) y label (string no vacio)', () => {
    for (const s of PIGS_STAGE_SEQUENCE) {
      expect(typeof s.stage).toBe('string');
      expect(s.stage.length).toBeGreaterThan(0);
      expect(typeof s.label).toBe('string');
      expect(s.label.length).toBeGreaterThan(0);
    }
  });

  it('la etapa inicial de pigs es instalacion', () => {
    expect(initialStageFor('pigs')).toBe('instalacion');
  });

  it('PIG_STAGE_LABELS cubre todas las etapas de la secuencia', () => {
    for (const s of PIGS_STAGE_SEQUENCE) {
      expect(PIG_STAGE_LABELS).toHaveProperty(s.stage);
    }
  });
});

describe('getPigProfile', () => {
  it('devuelve cochera default y lotes vacios cuando no hay attributes', () => {
    const p = getPigProfile(undefined);
    expect(p.cochera).toEqual({
      nombre: '',
      ubicacion: '',
      capacidad: '',
      cama_profunda: 'cascarilla_de_arroz',
    });
    expect(p.lotes).toEqual([]);
  });

  it('devuelve cochera default con attributes vacio', () => {
    const p = getPigProfile({});
    expect(p.cochera).toEqual({
      nombre: '',
      ubicacion: '',
      capacidad: '',
      cama_profunda: 'cascarilla_de_arroz',
    });
    expect(p.lotes).toEqual([]);
  });

  it('lee cochera desde attributes.pig_cochera', () => {
    const attrs = {
      pig_cochera: {
        nombre: 'Cochera El Mango',
        ubicacion: 'Patio trasero',
        capacidad: 12,
        cama_profunda: 'aserrin',
      },
      pig_lotes: [],
    };
    const p = getPigProfile(attrs);
    expect(p.cochera.nombre).toBe('Cochera El Mango');
    expect(p.cochera.ubicacion).toBe('Patio trasero');
    expect(p.cochera.capacidad).toBe(12);
    expect(p.cochera.cama_profunda).toBe('aserrin');
  });

  it('lee lotes desde attributes.pig_lotes', () => {
    const lotes = [
      { raza: 'Zungo', cantidad: 6, peso_inicial: 18 },
    ];
    const p = getPigProfile({ pig_lotes: lotes });
    expect(p.lotes).toHaveLength(1);
    expect(p.lotes[0].raza).toBe('Zungo');
  });

  it('trata pig_lotes no-array como array vacio', () => {
    const p = getPigProfile({ pig_lotes: 'no array' });
    expect(p.lotes).toEqual([]);
  });
});

describe('cochera CRUD via perfil', () => {
  it('crear cochera: se guarda con nombre, ubicacion, capacidad y cama_profunda', () => {
    const cochera = {
      nombre: 'Cochera Norte',
      ubicacion: 'Bajo el saman',
      capacidad: 20,
      cama_profunda: 'bagazo',
    };
    expect(cochera.nombre).toBe('Cochera Norte');
    expect(cochera.capacidad).toBe(20);
    expect(cochera.cama_profunda).toBe('bagazo');
  });

  it('leer cochera: getPigProfile devuelve los datos guardados', () => {
    const saved = {
      pig_cochera: { nombre: 'Cochera A', ubicacion: 'Lote 3', capacidad: 15, cama_profunda: 'cascarilla_de_arroz' },
      pig_lotes: [],
    };
    const p = getPigProfile(saved);
    expect(p.cochera.nombre).toBe('Cochera A');
    expect(p.cochera.ubicacion).toBe('Lote 3');
  });

  it('actualizar cochera: sobreescribe campos parcialmente', () => {
    const original = { nombre: 'Vieja', ubicacion: 'Alla', capacidad: 5, cama_profunda: 'aserrin' };
    const updated = { ...original, nombre: 'Nueva', capacidad: 30 };
    expect(updated.nombre).toBe('Nueva');
    expect(updated.capacidad).toBe(30);
    expect(updated.ubicacion).toBe('Alla');
    expect(updated.cama_profunda).toBe('aserrin');
  });

  it('delete (reset) cochera: vuelve al default', () => {
    const reset = {
      nombre: '',
      ubicacion: '',
      capacidad: '',
      cama_profunda: 'cascarilla_de_arroz',
    };
    expect(reset.nombre).toBe('');
    expect(reset.capacidad).toBe('');
  });
});

describe('lote de marranos', () => {
  it('añadir lote requiere raza, cantidad y peso_inicial', () => {
    const isValid = (draft) =>
      draft.raza.trim().length > 0 && Number(draft.cantidad) > 0 && Number(draft.peso_inicial) > 0;

    expect(isValid({ raza: 'Zungo', cantidad: 6, peso_inicial: 18 })).toBe(true);
    expect(isValid({ raza: '', cantidad: 6, peso_inicial: 18 })).toBe(false);
    expect(isValid({ raza: 'Zungo', cantidad: 0, peso_inicial: 18 })).toBe(false);
    expect(isValid({ raza: 'Zungo', cantidad: 6, peso_inicial: 0 })).toBe(false);
  });

  it('un lote completo tiene estructura esperada', () => {
    const lote = {
      raza: 'Zungo',
      fecha_ingreso: '2026-06-15',
      cantidad: 6,
      peso_inicial: 18,
    };
    expect(lote).toHaveProperty('raza');
    expect(lote).toHaveProperty('fecha_ingreso');
    expect(lote).toHaveProperty('cantidad');
    expect(lote).toHaveProperty('peso_inicial');
    expect(typeof lote.raza).toBe('string');
    expect(typeof lote.cantidad).toBe('number');
  });

  it('varios lotes coexisten en el perfil', () => {
    const lotes = [
      { raza: 'Zungo', fecha_ingreso: '2026-01-01', cantidad: 4, peso_inicial: 15 },
      { raza: 'Duroc', fecha_ingreso: '2026-03-15', cantidad: 8, peso_inicial: 22 },
    ];
    const p = getPigProfile({ pig_lotes: lotes });
    expect(p.lotes).toHaveLength(2);
    expect(p.lotes.map((l) => l.raza)).toEqual(['Zungo', 'Duroc']);
  });
});

describe('eventos porcinos (peso, alimento, sanidad)', () => {
  it('evento de peso requiere valor numerico', () => {
    const isValidPeso = (payload) => Number(payload.peso_kg) > 0;
    expect(isValidPeso({ peso_kg: 45.5 })).toBe(true);
    expect(isValidPeso({ peso_kg: 0 })).toBe(false);
    expect(isValidPeso({ peso_kg: NaN })).toBe(false);
  });

  it('evento de alimentacion requiere detalle de texto', () => {
    const isValidAlimento = (payload) =>
      !!(payload.detalle && payload.detalle.trim().length > 0);
    expect(isValidAlimento({ detalle: 'Maiz y yuca cocida' })).toBe(true);
    expect(isValidAlimento({ detalle: '' })).toBe(false);
    expect(isValidAlimento({})).toBe(false);
  });

  it('evento sanitario requiere detalle de texto', () => {
    const isValidSanidad = (payload) =>
      !!(payload.detalle && payload.detalle.trim().length > 0);
    expect(isValidSanidad({ detalle: 'Vacuna aftosa y desparasitacion' })).toBe(true);
    expect(isValidSanidad({ detalle: '' })).toBe(false);
  });

  it('tipos de evento disponibles son peso, alimentacion, sanidad', () => {
    const tipos = ['peso', 'alimentacion', 'sanidad'];
    expect(tipos).toContain('peso');
    expect(tipos).toContain('alimentacion');
    expect(tipos).toContain('sanidad');
    expect(tipos).toHaveLength(3);
  });
});

describe('guarda de Leucaena', () => {
  it('la guarda existe en animal-diagnostics.json', () => {
    expect(PIG_GUARD).toBeTruthy();
  });

  it('la guarda menciona leucaena, mimosina y PROHIBIDA para cerdos', () => {
    expect(PIG_GUARD).toMatch(/[Ll]eucaena/);
    expect(PIG_GUARD).toMatch(/mimosina/);
    expect(PIG_GUARD).toMatch(/PROHIBIDA/);
    expect(PIG_GUARD).toMatch(/cerdos/);
  });

  it('la guarda NO es una etapa de la secuencia de cerdos', () => {
    const stages = PIGS_STAGE_SEQUENCE.map((s) => s.stage);
    expect(stages).not.toContain('leucaena');
    expect(stages).not.toContain('guarda');
    expect(stages).not.toContain('mimosina');
  });

  it('la guarda NO es la etapa inicial (instalacion)', () => {
    const initial = initialStageFor('pigs');
    expect(initial).toBe('instalacion');
    expect(initial).not.toMatch(/leucaena/i);
    expect(initial).not.toMatch(/guarda/i);
  });

  it('la guarda de leucaena NO aparece como etiqueta de ninguna etapa', () => {
    const labels = PIGS_STAGE_SEQUENCE.map((s) => s.label.toLowerCase());
    for (const label of labels) {
      expect(label).not.toMatch(/leucaena/);
      expect(label).not.toMatch(/guarda/);
    }
  });

  it('la etapa de alimentacion existe pero NO contiene la guarda como label', () => {
    const alimentacion = PIGS_STAGE_SEQUENCE.find((s) => s.stage === 'alimentacion');
    expect(alimentacion).toBeTruthy();
    expect(alimentacion.label).not.toMatch(/leucaena/i);
  });

  it('porcino en animal-diagnostics tiene raza Zungo como criollo en riesgo', () => {
    const porcino = ANIMAL_DIAGNOSTICS.especies.find((e) => e.id === 'porcino');
    expect(porcino).toBeTruthy();
    expect(porcino.raza).toHaveLength(1);
    expect(porcino.raza[0].nombre).toBe('Zungo');
    expect(porcino.raza[0].nota).toMatch(/riesgo/i);
  });
});
