/**
 * biopreparados-seed.test.js — invariantes de DOSIS+INTERVALO derivables para el
 * catálogo auxiliar de biopreparados (catalog/biopreparados-seed.json).
 *
 * Principio (task #biodosis-fuego, 2026-07-02): cada biopreparado con
 * información de dosis en `proceso_resumen` DEBE llevar su campo `dosis`
 * derivado de esa prosa. `compost_maduro` se exceptúa: `proceso_resumen` sólo
 * documenta el proceso de compostaje, no la dosis de campo, por lo que
 * `dosis` se mantiene ausente (regla anti-invención de toxicidad/dosis sin
 * base textual). Mismo principio para `frecuencia` y `metodo`.
 *
 * Adicionalmente verifica que toda entrada tenga `safety_class` (invariante
 * del PR #1944) y que `reentry_interval_dias` sea null salvo base textual
 * explícita en `proceso_resumen` (que sólo la tienen caldo_sulfocalcico=15 y
 * caldo_bordeles=21).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(
  readFileSync(join(__dirname, '..', 'biopreparados-seed.json'), 'utf8'),
);

const biopreparados = seed.biopreparados;

// Biopreparados cuyo proceso_resumen contiene una dosis de aplicación
// explícita (valor numérico o dilución). La extracción de la dosis del
// texto es responsabilidad de la curación; este test sólo verifica que
// el campo `dosis` esté presente y no vacío.
const CON_DOSIS_DERIVABLE = [
  'bocashi',
  'biol',
  'purin_ortiga',
  'caldo_sulfocalcico',
  'caldo_bordeles',
  'te_compost',
  'humus_liquido',
  'lixiviado_frutas',
  'supermagro',
  'trichoderma_harzianum_suelo',
  'bacillus_subtilis_foliar',
  'cal_dolomita',
  'roca_fosforica',
  'ceniza_madera',
  'biofertilizante_algas',
];

// Biopreparados cuyo proceso_resumen SÓLO describe el proceso de producción
// (compostaje) sin dar una dosis de aplicación de campo. `dosis` se mantiene
// ausente para no inventar.
const SIN_DOSIS_DERIVABLE = ['compost_maduro'];

describe('biopreparados-seed — estructura', () => {
  it('tiene 16 entradas', () => {
    expect(biopreparados).toHaveLength(16);
  });

  it('todos los biopreparados tienen id, nombre, tipo y safety_class', () => {
    for (const b of biopreparados) {
      expect(b.id, 'id').toBeTruthy();
      expect(b.nombre, `${b.id}.nombre`).toBeTruthy();
      expect(b.tipo, `${b.id}.tipo`).toBeTruthy();
      expect(b.safety_class, `${b.id}.safety_class`).toBeTruthy();
      expect(['bajo', 'medio', 'alto', 'revisar']).toContain(b.safety_class);
    }
  });
});

describe('biopreparados-seed — dosis derivada de proceso_resumen', () => {
  it.each(CON_DOSIS_DERIVABLE.map((id) => [id]))(
    '%s tiene campo dosis no vacío derivado de proceso_resumen',
    (id) => {
      const b = biopreparados.find((x) => x.id === id);
      expect(b, `entry ${id} existe`).toBeTruthy();
      expect(typeof b.dosis, `${id}.dosis es string`).toBe('string');
      expect(b.dosis.trim().length, `${id}.dosis no vacío`).toBeGreaterThan(0);
    },
  );

  it.each(SIN_DOSIS_DERIVABLE.map((id) => [id]))(
    '%s NO tiene dosis (proceso_resumen no lo respalda)',
    (id) => {
      const b = biopreparados.find((x) => x.id === id);
      expect(b, `entry ${id} existe`).toBeTruthy();
      // Ausente o null — pero nunca un string inventado.
      expect(b.dosis ?? null, `${id}.dosis debe ser null/ausente`).toBeNull();
    },
  );
});

describe('biopreparados-seed — frecuencia sólo cuando proceso_resumen la documenta', () => {
  // Biopreparados cuyo proceso_resumen menciona cadencia explícita
  // (cada N días/semanas/meses).
  const CON_FRECUENCIA_DERIVABLE = [
    'bocashi', // "cada 1,5 a 3 meses"
    'biol', // "cada 10 a 15 dias"
    'purin_ortiga', // "cada 10 a 15 dias"
    'caldo_sulfocalcico', // "cada 10 a 15 dias"
    'caldo_bordeles', // "cada 8 a 15 dias"
    'te_compost', // "cada 10 a 15 dias"
    'humus_liquido', // "cada 7 a 15 dias"
    'supermagro', // "cada 8 a 15 dias"
    'bacillus_subtilis_foliar', // "cada 7-10 días"
    'cal_dolomita', // "según análisis; 1 aplicación por ciclo"
    'ceniza_madera', // "cada 8 a 15 dias"
  ];

  it.each(CON_FRECUENCIA_DERIVABLE.map((id) => [id]))(
    '%s tiene frecuencia derivada de proceso_resumen',
    (id) => {
      const b = biopreparados.find((x) => x.id === id);
      expect(b, `entry ${id} existe`).toBeTruthy();
      expect(typeof b.frecuencia, `${id}.frecuencia es string`).toBe('string');
      expect(b.frecuencia.trim().length, `${id}.frecuencia no vacío`).toBeGreaterThan(0);
    },
  );
});

describe('biopreparados-seed — uso/metodo/fuente/confianza cuando dosis está presente', () => {
  it.each(CON_DOSIS_DERIVABLE.map((id) => [id]))(
    '%s tiene uso/metodo/fuente/confianza no vacíos',
    (id) => {
      const b = biopreparados.find((x) => x.id === id);
      expect(b, `entry ${id} existe`).toBeTruthy();
      for (const f of ['uso', 'metodo', 'fuente', 'confianza']) {
        expect(b[f], `${id}.${f} presente`).toBeTruthy();
      }
      expect(['alta', 'media', 'baja']).toContain(b.confianza);
    },
  );

  it.each(SIN_DOSIS_DERIVABLE.map((id) => [id]))(
    '%s (sin dosis) tiene uso/metodo/fuente/confianza cuando aplica',
    (id) => {
      const b = biopreparados.find((x) => x.id === id);
      expect(b, `entry ${id} existe`).toBeTruthy();
      // Aunque sin dosis, estos siguen teniendo uso/metodo/fuente/confianza.
      for (const f of ['uso', 'metodo', 'fuente', 'confianza']) {
        expect(b[f], `${id}.${f} presente`).toBeTruthy();
      }
    },
  );
});

describe('biopreparados-seed — anti-invención de toxicidad', () => {
  // reentry_interval_dias debe ser null salvo base textual explícita en
  // proceso_resumen/uso. Solo caldo_sulfocalcico (15) y caldo_bordeles (21)
  // documentan carencia explícita.
  it('solo caldo_sulfocalcico y caldo_bordeles tienen reentry_interval_dias no null', () => {
    const conIntervalo = biopreparados.filter(
      (b) => b.reentry_interval_dias !== null && b.reentry_interval_dias !== undefined,
    );
    const ids = conIntervalo.map((b) => b.id).sort();
    expect(ids).toEqual(['caldo_bordeles', 'caldo_sulfocalcico']);
  });

  it('caldo_sulfocalcico tiene reentry_interval_dias=15', () => {
    const b = biopreparados.find((x) => x.id === 'caldo_sulfocalcico');
    expect(b.reentry_interval_dias).toBe(15);
  });

  it('caldo_bordeles tiene reentry_interval_dias=21', () => {
    const b = biopreparados.find((x) => x.id === 'caldo_bordeles');
    expect(b.reentry_interval_dias).toBe(21);
  });

  // safety_class "revisar" se mantiene para entradas sin base textual de
  // seguridad — no se infiere "bajo" por ingrediente.
  it('entradas sin base de seguridad permanecen en revisar', () => {
    const revisar = biopreparados.filter((b) => b.safety_class === 'revisar');
    const idsEsperados = [
      'lixiviado_frutas',
      'trichoderma_harzianum_suelo',
      'bacillus_subtilis_foliar',
      'cal_dolomita',
      'roca_fosforica',
      'compost_maduro',
      'biofertilizante_algas',
    ].sort();
    expect(revisar.map((b) => b.id).sort()).toEqual(idsEsperados);
  });
});
