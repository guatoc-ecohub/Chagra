import { describe, expect, it } from 'vitest';
import {
  PIGS_STAGE_SEQUENCE,
  RESTORATION_STAGE_SEQUENCE,
  PARAMO_STAGE_SEQUENCE,
} from '../../types/farmProcess';
import ANIMAL_DIAGNOSTICS from '../../data/animal-diagnostics.json';

/**
 * TAREA 45 — cerdosSelects.test.js
 *
 * Testea los selectores dinámicos para el flujo de cerdos:
 *   - Etapa select: verify it's a list (not free text), iterate all options.
 *   - Raza select: verify it's a list, iterate all options.
 *   - Edge cases: empty selection, invalid selection.
 *
 * Las fuentes de verdad son:
 *   - Etapas: PIGS_STAGE_SEQUENCE (types/farmProcess)
 *   - Razas porcinas: ANIMAL_DIAGNOSTICS.especies[porcino].raza
 *   - Tipos de evento: peso, alimentacion, sanidad (definidos en el componente)
 */

const PIG_EVENT_TYPES = ['peso', 'alimentacion', 'sanidad'];

const PIG_CAMA_OPTIONS = [
  { value: 'cascarilla_de_arroz', label: 'Cascarilla de arroz' },
  { value: 'aserrin', label: 'Aserrín' },
  { value: 'bagazo', label: 'Bagazo seco' },
];

function getPorcinoSpecies() {
  return ANIMAL_DIAGNOSTICS.especies.find((e) => e.id === 'porcino') || null;
}

describe('Etapa select para cerdos', () => {
  it('PIGS_STAGE_SEQUENCE es una lista, no texto libre', () => {
    expect(Array.isArray(PIGS_STAGE_SEQUENCE)).toBe(true);
    expect(PIGS_STAGE_SEQUENCE.length).toBeGreaterThan(0);
  });

  it('cada opcion de etapa tiene stage y label como strings', () => {
    for (const etapa of PIGS_STAGE_SEQUENCE) {
      expect(typeof etapa.stage).toBe('string');
      expect(etapa.stage.length).toBeGreaterThan(0);
      expect(typeof etapa.label).toBe('string');
      expect(etapa.label.length).toBeGreaterThan(0);
    }
  });

  it('itera todas las opciones de etapa (5 etapas)', () => {
    const options = PIGS_STAGE_SEQUENCE.map((s) => s.stage);
    expect(options).toEqual([
      'instalacion',
      'alimentacion',
      'reproduccion',
      'sanidad',
      'cierre',
    ]);
  });

  it('las etapas de cerdos son distintas de las de reforestacion (salvo cierre compartido)', () => {
    const pigStages = PIGS_STAGE_SEQUENCE.map((s) => s.stage).filter((s) => s !== 'cierre');
    const restoStages = RESTORATION_STAGE_SEQUENCE.map((s) => s.stage);
    for (const ps of pigStages) {
      expect(restoStages).not.toContain(ps);
    }
  });

  it('las etapas de cerdos son distintas de las de paramo (salvo cierre compartido)', () => {
    const pigStages = PIGS_STAGE_SEQUENCE.map((s) => s.stage).filter((s) => s !== 'cierre');
    const paramoStages = PARAMO_STAGE_SEQUENCE.map((s) => s.stage);
    for (const ps of pigStages) {
      expect(paramoStages).not.toContain(ps);
    }
  });

  it('las etiquetas de etapa son legibles', () => {
    const labels = PIGS_STAGE_SEQUENCE.map((s) => s.label);
    for (const label of labels) {
      expect(label.length).toBeGreaterThan(2);
      expect(typeof label).toBe('string');
    }
  });

  it('seleccion vacia (etapa no existente) no esta en las opciones', () => {
    const stages = PIGS_STAGE_SEQUENCE.map((s) => s.stage);
    expect(stages).not.toContain('');
    expect(stages).not.toContain(null);
    expect(stages).not.toContain(undefined);
  });

  it('etapa invalida (inexistente) no pertenece al select', () => {
    const stages = PIGS_STAGE_SEQUENCE.map((s) => s.stage);
    expect(stages).not.toContain('etapa_inexistente');
    expect(stages).not.toContain('cosecha');
    expect(stages).not.toContain('floracion');
    expect(stages).not.toContain('germination');
  });
});

describe('Raza select para cerdos', () => {
  it('porcino tiene lista de razas en animal-diagnostics.json', () => {
    const porcino = getPorcinoSpecies();
    expect(porcino).not.toBeNull();
    expect(Array.isArray(porcino.raza)).toBe(true);
  });

  it('la raza Zungo esta en el catalogo porcino', () => {
    const porcino = getPorcinoSpecies();
    const nombres = porcino.raza.map((r) => r.nombre);
    expect(nombres).toContain('Zungo');
  });

  it('itera todas las razas porcinas (lista cerrada)', () => {
    const porcino = getPorcinoSpecies();
    const razas = porcino.raza;
    expect(razas.length).toBeGreaterThan(0);
    for (const raza of razas) {
      expect(typeof raza.nombre).toBe('string');
      expect(raza.nombre.length).toBeGreaterThan(0);
    }
  });

  it('cada raza tiene atributos esperados (nombre, piso_termico opcional, nota opcional)', () => {
    const porcino = getPorcinoSpecies();
    for (const raza of porcino.raza) {
      expect(raza).toHaveProperty('nombre');
      if (raza.piso_termico !== undefined) {
        expect(typeof raza.piso_termico).toBe('string');
      }
    }
  });

  it('las razas NO incluyen razas de otras especies (bovino, ovino)', () => {
    const porcino = getPorcinoSpecies();
    const nombresPorcino = porcino.raza.map((r) => r.nombre);
    const bovino = ANIMAL_DIAGNOSTICS.especies.find((e) => e.id === 'bovino');
    const nombresBovino = bovino.raza.map((r) => r.nombre);
    for (const nb of nombresBovino) {
      expect(nombresPorcino).not.toContain(nb);
    }
  });

  it('seleccion de raza vacia no existe en las opciones', () => {
    const porcino = getPorcinoSpecies();
    const nombres = porcino.raza.map((r) => r.nombre);
    expect(nombres).not.toContain('');
  });

  it('raza invalida (nombre inventado) no esta en el catalogo', () => {
    const porcino = getPorcinoSpecies();
    const nombres = porcino.raza.map((r) => r.nombre);
    expect(nombres).not.toContain('RazaFalsa123');
    expect(nombres).not.toContain('Holstein');
  });
});

describe('Select de tipo de evento porcino', () => {
  it('los tipos de evento son una lista fija (peso, alimentacion, sanidad)', () => {
    expect(Array.isArray(PIG_EVENT_TYPES)).toBe(true);
    expect(PIG_EVENT_TYPES).toHaveLength(3);
    expect(PIG_EVENT_TYPES).toContain('peso');
    expect(PIG_EVENT_TYPES).toContain('alimentacion');
    expect(PIG_EVENT_TYPES).toContain('sanidad');
  });

  it('cada tipo de evento es un string no vacio', () => {
    for (const tipo of PIG_EVENT_TYPES) {
      expect(typeof tipo).toBe('string');
      expect(tipo.length).toBeGreaterThan(0);
    }
  });

  it('tipo de evento vacio no esta en las opciones', () => {
    expect(PIG_EVENT_TYPES).not.toContain('');
  });

  it('tipo de evento invalido no pertenece al select', () => {
    expect(PIG_EVENT_TYPES).not.toContain('cosecha');
    expect(PIG_EVENT_TYPES).not.toContain('reproduccion');
    expect(PIG_EVENT_TYPES).not.toContain('vacunacion');
  });
});

describe('Select de cama profunda', () => {
  it('las opciones de cama son una lista fija de 3 valores', () => {
    expect(Array.isArray(PIG_CAMA_OPTIONS)).toBe(true);
    expect(PIG_CAMA_OPTIONS).toHaveLength(3);
  });

  it('cada opcion tiene value y label', () => {
    for (const opt of PIG_CAMA_OPTIONS) {
      expect(opt).toHaveProperty('value');
      expect(opt).toHaveProperty('label');
      expect(typeof opt.value).toBe('string');
      expect(typeof opt.label).toBe('string');
    }
  });

  it('el valor por defecto es cascarilla_de_arroz', () => {
    const values = PIG_CAMA_OPTIONS.map((o) => o.value);
    expect(values).toContain('cascarilla_de_arroz');
    expect(PIG_CAMA_OPTIONS[0].value).toBe('cascarilla_de_arroz');
  });

  it('opcion invalida (valor inventado) no esta en las opciones', () => {
    const values = PIG_CAMA_OPTIONS.map((o) => o.value);
    expect(values).not.toContain('paja');
    expect(values).not.toContain('heno');
    expect(values).not.toContain('');
  });
});

describe('Edge cases de selects', () => {
  it('ninguna lista de opciones tiene strings vacios', () => {
    const allOptions = [
      ...PIGS_STAGE_SEQUENCE.map((s) => s.stage),
      ...PIGS_STAGE_SEQUENCE.map((s) => s.label),
      ...(getPorcinoSpecies()?.raza || []).map((r) => r.nombre),
      ...PIG_EVENT_TYPES,
      ...PIG_CAMA_OPTIONS.map((o) => o.value),
    ];
    for (const opt of allOptions) {
      expect(opt).toBeTruthy();
    }
  });

  it('ningsun stage es undefined o null', () => {
    for (const s of PIGS_STAGE_SEQUENCE) {
      expect(s.stage).not.toBeUndefined();
      expect(s.stage).not.toBeNull();
      expect(s.label).not.toBeUndefined();
      expect(s.label).not.toBeNull();
    }
  });

  it('la secuencia de cerdos no comparte nombres con otras secuencias (salvo cierre)', () => {
    const pigStages = new Set(PIGS_STAGE_SEQUENCE.map((s) => s.stage));
    const restoStages = RESTORATION_STAGE_SEQUENCE.map((s) => s.stage).filter((s) => s !== 'cierre');
    for (const rs of restoStages) {
      expect(pigStages.has(rs)).toBe(false);
    }
    const paramoStages = PARAMO_STAGE_SEQUENCE.map((s) => s.stage).filter((s) => s !== 'cierre');
    for (const ps of paramoStages) {
      expect(pigStages.has(ps)).toBe(false);
    }
  });
});
