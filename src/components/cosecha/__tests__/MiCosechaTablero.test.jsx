/**
 * MiCosechaTablero — tablero visual de "Mi cosecha".
 *
 * Cubre: estado vacío (CTA → vista 'cosechar'), tablero con datos (héroe,
 * tarjetas, gráficas con etiqueta accesible, tabla gemela), separación
 * kg vs unidades, y los helpers puros de presentación.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import useCosechaStore from '../../../store/useCosechaStore';
import MiCosechaTablero, {
  buildMonthColumns,
  monthDelta,
  monthLabel,
  yearTotal,
  formatKg,
} from '../MiCosechaTablero';

const bucketVacio = { totalCount: 0, harvestCount: 0, firstMs: null, lastMs: null };

const summaryConDatos = {
  totalKg: 47.5,
  totalHarvests: 6,
  cropCount: 3,
  byCrop: [
    { crop: 'Fresa', cropKey: 'fresa', totalKg: 30, totalCount: 0, harvestCount: 3, firstMs: 1, lastMs: 2 },
    { crop: 'Mora', cropKey: 'mora', totalKg: 17.5, totalCount: 0, harvestCount: 2, firstMs: 1, lastMs: 2 },
    { crop: 'Lechuga', cropKey: 'lechuga', totalKg: 0, totalCount: 12, harvestCount: 1, firstMs: 1, lastMs: 2 },
  ],
  byLote: [
    {
      loteId: 'l1', name: 'Era 1', totalKg: 30, totalCount: 0, harvestCount: 3,
      plantCount: 10, areaM2: 100, kgPerPlant: 3, kgPerHa: 3000, kgPerM2: 0.3,
      firstMs: 1, lastMs: 2,
    },
  ],
  yieldPerPlant: [
    { crop: 'Fresa', totalKg: 30, plantCount: 10, kgPerPlant: 3 },
    { crop: 'Mora', totalKg: 17.5, plantCount: 0, kgPerPlant: null },
  ],
  trend: {
    series: [
      { period: '2026-05', totalKg: 12.5, ...bucketVacio, harvestCount: 2 },
      { period: '2026-06', totalKg: 15, ...bucketVacio, harvestCount: 2 },
      { period: '2026-07', totalKg: 20, ...bucketVacio, harvestCount: 2 },
    ],
    slope: 3.75,
    direction: 'subiendo',
  },
  topCrop: { crop: 'Fresa', cropKey: 'fresa', totalKg: 30, totalCount: 0, harvestCount: 3 },
  dateRange: { firstMs: Date.parse('2026-05-03'), lastMs: Date.parse('2026-07-04') },
};

const summaryVacio = {
  totalKg: 0,
  totalHarvests: 0,
  cropCount: 0,
  byCrop: [],
  byLote: [],
  yieldPerPlant: [],
  trend: { series: [], slope: 0, direction: 'estable' },
  topCrop: null,
  dateRange: { firstMs: null, lastMs: null },
};

/** Monta el tablero con el store ya cargado (sin tocar IndexedDB). */
const renderConSummary = (summary) => {
  useCosechaStore.setState({
    summary,
    isLoading: false,
    error: null,
    loadHarvests: vi.fn().mockResolvedValue(summary),
  });
  return render(<MiCosechaTablero />);
};

beforeEach(() => {
  useCosechaStore.getState().reset();
});

afterEach(() => {
  cleanup();
});

describe('estado vacío', () => {
  it('muestra la invitación y navega a registrar al tocar', () => {
    renderConSummary(summaryVacio);
    expect(screen.getByText('Aún no has registrado cosecha')).toBeDefined();

    const navSpy = vi.fn();
    window.addEventListener('chagra:nav', navSpy);
    fireEvent.click(screen.getByRole('button', { name: /registrar tu primera cosecha/i }));
    window.removeEventListener('chagra:nav', navSpy);

    expect(navSpy).toHaveBeenCalledTimes(1);
    expect(navSpy.mock.calls[0][0].detail).toBe('cosechar');
  });

  it('usa onRegistrar cuando el integrador lo pasa', () => {
    useCosechaStore.setState({
      summary: summaryVacio,
      isLoading: false,
      loadHarvests: vi.fn().mockResolvedValue(summaryVacio),
    });
    const onRegistrar = vi.fn();
    render(<MiCosechaTablero onRegistrar={onRegistrar} />);
    fireEvent.click(screen.getByRole('button', { name: /registrar tu primera cosecha/i }));
    expect(onRegistrar).toHaveBeenCalledTimes(1);
  });
});

describe('tablero con datos', () => {
  it('pinta héroe, tarjetas y cultivo estrella', () => {
    renderConSummary(summaryConDatos);
    expect(screen.getAllByText('47,5').length).toBeGreaterThan(0); // héroe es-CO
    expect(screen.getByText('Cultivo estrella')).toBeDefined();
    expect(screen.getAllByText('Fresa').length).toBeGreaterThan(0);
    expect(screen.getByText(/\+5 vs mes pasado/)).toBeDefined(); // 20 - 15
    expect(screen.getByText(/Tendencia subiendo · 6 cosechas/)).toBeDefined();
  });

  it('la gráfica mensual lleva etiqueta accesible con los valores', () => {
    renderConSummary(summaryConDatos);
    const grafica = screen.getByRole('img', { name: /Cosecha por mes/ });
    expect(grafica.getAttribute('aria-label')).toContain('julio de 2026: 20 kg');
  });

  it('separa cultivos en kg de los medidos por unidades', () => {
    renderConSummary(summaryConDatos);
    expect(screen.getByText(/Lo que da cada cultivo/)).toBeDefined();
    expect(screen.getByText('Cosechas por unidades')).toBeDefined();
    expect(screen.getAllByText('12 und').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lechuga').length).toBeGreaterThan(0);
  });

  it('la tabla gemela trae mes, cultivo y lote', () => {
    renderConSummary(summaryConDatos);
    expect(screen.getByText('Ver los números en tabla')).toBeDefined();
    expect(screen.getByText('Cosecha por mes (kg)')).toBeDefined();
    expect(screen.getByText('Rendimiento por lote')).toBeDefined();
    expect(screen.getAllByText('Era 1').length).toBeGreaterThan(0);
  });

  it('muestra rendimiento kg/planta solo con plantas contadas', () => {
    renderConSummary(summaryConDatos);
    expect(screen.getByText(/3 kg\/planta · 10 plantas/)).toBeDefined();
    expect(screen.queryByText(/kg\/planta · 0 plantas/)).toBeNull();
  });
});

describe('helpers de presentación', () => {
  it('buildMonthColumns rellena meses vacíos y recorta a 12', () => {
    const cols = buildMonthColumns([
      { period: '2026-01', totalKg: 5, ...bucketVacio, harvestCount: 1 },
      { period: '2026-04', totalKg: 8, ...bucketVacio, harvestCount: 1 },
    ]);
    expect(cols.map((c) => c.period)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04']);
    expect(cols[1].totalKg).toBe(0);

    const largo = buildMonthColumns([
      { period: '2024-01', totalKg: 1, ...bucketVacio, harvestCount: 1 },
      { period: '2026-06', totalKg: 2, ...bucketVacio, harvestCount: 1 },
    ]);
    expect(largo).toHaveLength(12);
    expect(largo[largo.length - 1].period).toBe('2026-06');
  });

  it('monthDelta compara el último mes contra el anterior', () => {
    const cols = buildMonthColumns(summaryConDatos.trend.series);
    expect(monthDelta(cols, true)).toMatchObject({ period: '2026-07', diff: 5 });
    expect(monthDelta([cols[0]], true)).toBeNull();
  });

  it('monthLabel marca el año al inicio y en cada cambio de año', () => {
    expect(monthLabel('2026-01', null)).toBe('ene 26');
    expect(monthLabel('2026-02', '2026-01')).toBe('feb');
    expect(monthLabel('2027-01', '2026-12')).toBe('ene 27');
  });

  it('yearTotal suma solo el año pedido y formatKg usa coma decimal', () => {
    expect(yearTotal(summaryConDatos.trend.series, true, 2026)).toBe(47.5);
    expect(yearTotal(summaryConDatos.trend.series, true, 2025)).toBe(0);
    expect(formatKg(1234.56)).toBe('1.234,6');
  });
});
