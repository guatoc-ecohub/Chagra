/**
 * vitalidadEspirituService — el panel de vitalidad del espíritu se arma SOLO
 * con datos reales de la finca; lo que falta queda 'pendiente' ("dato en
 * camino"), NUNCA un número inventado. Contrato anti-alucinación del panel
 * del home menú vivo (mockup #/mockups/avatar-biopunk).
 */
import { describe, it, expect } from 'vitest';
import {
  buildVitalidadEspiritu,
  contarEspecies,
  contarAnillosFrailejon,
  ejeClima,
  ejeSuelo,
  ejeBiodiversidad,
  ejeEnergia,
  PRECIP_ESCALA_MM,
  ENERGIA_META_MES,
} from '../vitalidadEspirituService';
import { buildFincaScene } from '../fincaSceneService';

const NOW = new Date('2026-07-09T10:00:00-05:00');

/** FarmProcess reales (shape anidado de producción). */
const procesos = () => [
  {
    process_id: 'p-cafe',
    attributes: {
      process_type: 'sowing',
      status: 'active',
      current_stage: 'flowering',
      subject_slug: 'coffea_arabica',
      subject_label: 'Café',
      created_at: new Date('2025-11-10').getTime(),
    },
  },
  {
    process_id: 'p-maiz',
    attributes: {
      process_type: 'sowing',
      status: 'active',
      current_stage: 'harvest',
      subject_slug: 'zea_mays',
      subject_label: 'Maíz',
      created_at: new Date('2026-07-02').getTime(), // este mes → energía
    },
  },
  {
    process_id: 'p-frijol-cerrado',
    attributes: {
      process_type: 'sowing',
      status: 'completed',
      current_stage: 'closed',
      subject_slug: 'phaseolus_vulgaris',
      subject_label: 'Frijol',
      created_at: new Date('2026-01-15').getTime(),
    },
  },
];

const plantas = () => [
  { id: 'a1', attributes: { name: 'Fresa #01', status: 'active' } },
  { id: 'a2', attributes: { name: 'Fresa #02', status: 'active' } },
  { id: 'a3', attributes: { name: 'Uchuva #01', status: 'active' } },
];

const resumenCosecha = () => ({
  totalHarvests: 5,
  dateRange: { firstMs: new Date('2025-10-05').getTime(), lastMs: new Date('2026-07-03').getTime() },
  trend: { series: [
    { period: '2026-06', harvestCount: 2 },
    { period: '2026-07', harvestCount: 3 },
  ] },
});

const snapshotClima = () => ({
  openmeteo: {
    available: true,
    forecast_7d: [
      { date: '2026-07-09', precip_mm: 5 },
      { date: '2026-07-10', precip_mm: 12 },
    ],
  },
});

describe('contarEspecies (procesos + plantas-asset reales)', () => {
  it('cuenta especies distintas: slug del proceso + nombre de planta sin "#N"', () => {
    // vivas: café + maíz (activos) + fresa + uchuva (assets) = 4 (frijol cerrado NO)
    expect(contarEspecies(procesos(), plantas(), { soloVivas: true })).toBe(4);
    // registradas: + frijol (completed cuenta, no cancelado) = 5
    expect(contarEspecies(procesos(), plantas(), { soloVivas: false })).toBe(5);
  });

  it('ignora cancelados y no duplica instancias "#N" de la misma especie', () => {
    const cancelado = [{ attributes: { status: 'cancelled', subject_slug: 'x', created_at: 1 } }];
    expect(contarEspecies(cancelado, [], {})).toBe(0);
    expect(contarEspecies([], [
      { attributes: { name: 'Fresa #01' } },
      { attributes: { name: 'Fresa #07' } },
    ])).toBe(1);
  });
});

describe('ejeClima — la señal de clima GUARDADA (nunca inventada)', () => {
  it('con snapshot: lluvia de hoy en mm reales, escala documentada', () => {
    const eje = ejeClima({ climaSnapshot: snapshotClima(), condicion: 'nublado', now: NOW });
    expect(eje.estado).toBe('ok');
    expect(eje.valor).toBe(Math.round((5 / PRECIP_ESCALA_MM) * 100));
    expect(eje.texto).toBe('5 mm hoy · nublado');
  });

  it('sin snapshot pero con condición derivada → muestra la condición sin barra', () => {
    const eje = ejeClima({ climaSnapshot: null, condicion: 'despejado', now: NOW });
    expect(eje.estado).toBe('ok');
    expect(eje.valor).toBeNull();
    expect(eje.texto).toBe('despejado');
  });

  it('sin ninguna señal → pendiente (dato en camino)', () => {
    const eje = ejeClima({ climaSnapshot: null, condicion: null, now: NOW });
    expect(eje.estado).toBe('pendiente');
    expect(eje.valor).toBeNull();
  });
});

describe('ejeSuelo — SOLO con diagnóstico real (DR-SUELOS-1)', () => {
  it('sin diagnóstico o con sin_datos → pendiente', () => {
    expect(ejeSuelo(null).estado).toBe('pendiente');
    expect(ejeSuelo({ sin_datos: true, problemas: [] }).estado).toBe('pendiente');
  });

  it('con diagnóstico: 100 − 18 por problema, acotado', () => {
    const eje = ejeSuelo({ sin_datos: false, problemas: ['acidez', 'compactacion'] });
    expect(eje.estado).toBe('ok');
    expect(eje.valor).toBe(100 - 2 * 18);
    expect(eje.texto).toContain('2 señales');
  });
});

describe('ejeBiodiversidad — misma saturación (6) que calcularVitalidad', () => {
  it('3 especies vivas → 50', () => {
    const eje = ejeBiodiversidad({ especiesVivas: 3, vacia: false });
    expect(eje.valor).toBe(50);
    expect(eje.texto).toBe('3 especies');
  });
  it('finca vacía → pendiente', () => {
    expect(ejeBiodiversidad({ especiesVivas: 0, vacia: true }).estado).toBe('pendiente');
  });
});

describe('ejeEnergia — registros REALES del mes en curso', () => {
  it('suma cosechas del mes (serie mensual) + siembras del mes', () => {
    const eje = ejeEnergia({ processes: procesos(), harvestSummary: resumenCosecha(), now: NOW });
    // 3 cosechas de 2026-07 + 1 siembra (maíz) este mes = 4 registros
    expect(eje.estado).toBe('ok');
    expect(eje.texto).toBe('4 registros este mes');
    expect(eje.valor).toBe(Math.round((4 / ENERGIA_META_MES) * 100));
  });
  it('sin resumen NI procesos → pendiente', () => {
    expect(ejeEnergia({ processes: [], harvestSummary: null, now: NOW }).estado).toBe('pendiente');
  });
});

describe('contarAnillosFrailejon — un anillo por AÑO (mismo contrato que el reloj)', () => {
  it('desde el primer registro real (la cosecha más antigua manda aquí)', () => {
    // primer registro: 2025-10-05 (cosecha) → años 2025 y 2026 → 2 anillos,
    // exactamente los MISMOS que contaría fincaClockService (el reloj).
    const anillos = contarAnillosFrailejon({
      processes: procesos(),
      harvestSummary: resumenCosecha(),
      now: NOW,
    });
    expect(anillos.estado).toBe('ok');
    expect(anillos.valor).toBe(2);
  });

  it('sin ningún registro → pendiente (no se inventa historia)', () => {
    expect(contarAnillosFrailejon({ processes: [], harvestSummary: null, now: NOW }).estado)
      .toBe('pendiente');
  });
});

describe('buildVitalidadEspiritu — modelo completo', () => {
  it('finca sembrada: vitalidad real de buildFincaScene + slots con fuente', () => {
    const scene = buildFincaScene({ processes: procesos(), plantAssetsCount: 3 });
    const m = buildVitalidadEspiritu({
      scene,
      processes: procesos(),
      plants: plantas(),
      climaSnapshot: snapshotClima(),
      condicion: 'nublado',
      harvestSummary: resumenCosecha(),
      now: NOW,
    });

    expect(m.vitalidad.estado).toBe('ok');
    expect(m.vitalidad.valor).toBe(scene.vitalidad); // la MISMA vitalidad honesta
    expect(m.especiesVivas.valor).toBe(4);
    expect(m.ejes.map((e) => e.id)).toEqual(['clima', 'suelo', 'biodiversidad', 'energia']);
    expect(m.conteos.especies.valor).toBe(5);
    expect(m.conteos.cosechas.valor).toBe(5);
    expect(m.conteos.anillos.valor).toBe(2);
    // suelo sin diagnóstico persistido → pendiente (dato en camino)
    expect(m.ejes.find((e) => e.id === 'suelo').estado).toBe('pendiente');
    expect(m.algunPendiente).toBe(true);
    // trazabilidad: todo slot declara su fuente
    for (const slot of [m.vitalidad, m.especiesVivas, ...m.ejes,
      m.conteos.especies, m.conteos.cosechas, m.conteos.anillos]) {
      expect(slot.fuente).toBeTruthy();
    }
  });

  it('finca vacía sin señales: TODO pendiente, ningún número inventado', () => {
    const scene = buildFincaScene({ processes: [], plantAssetsCount: 0 });
    const m = buildVitalidadEspiritu({ scene, now: NOW });
    expect(m.vitalidad.estado).toBe('pendiente');
    expect(m.especiesVivas.estado).toBe('pendiente');
    for (const eje of m.ejes) {
      expect(eje.estado).toBe('pendiente');
      expect(eje.valor).toBeNull();
    }
    expect(m.conteos.especies.estado).toBe('pendiente');
    expect(m.conteos.cosechas.estado).toBe('pendiente');
    expect(m.conteos.anillos.estado).toBe('pendiente');
    expect(m.algunPendiente).toBe(true);
  });

  it('cosechas en 0 con el store CARGADO es un cero real (no pendiente)', () => {
    const scene = buildFincaScene({ processes: procesos(), plantAssetsCount: 0 });
    const m = buildVitalidadEspiritu({
      scene,
      processes: procesos(),
      harvestSummary: { totalHarvests: 0, dateRange: { firstMs: null, lastMs: null }, trend: { series: [] } },
      now: NOW,
    });
    expect(m.conteos.cosechas.estado).toBe('ok');
    expect(m.conteos.cosechas.valor).toBe(0);
  });
});
