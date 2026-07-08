/**
 * MiCosechaScreen — tablero visual de "Mi cosecha".
 *
 * Contrato cubierto:
 *   - Estado vacío acogedor: invita a registrar (CTA → 'cosechar' y voz).
 *   - Con datos: héroe de temporada, KPIs, barras por cultivo (kg y conteo
 *     SEPARADOS — nunca mezcla escalas), tendencia mensual SVG y lotes.
 *   - Accesibilidad: cada gráfica trae su tabla alterna con los números.
 *   - Data-driven honesto: el summary se construye con harvestSummary REAL
 *     desde logs fixture (mismo shape que producción), no un mock inventado.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import MiCosechaScreen from '../MiCosechaScreen';
import useCosechaStore from '../../../store/useCosechaStore';
import { harvestSummary } from '../../../services/cosechaService';

afterEach(() => cleanup());

// El summary lo calcula el service REAL sobre logs fixture; el store se
// pre-carga y loadHarvests se anula para no tocar IndexedDB en este test
// (la integración store↔IndexedDB ya la cubre useCosechaStore.test.js).
const preload = (summary) => {
  useCosechaStore.setState({
    summary,
    isLoading: false,
    error: null,
    loadHarvests: vi.fn(async () => summary),
  });
};

const AHORA = new Date();
const Y = AHORA.getUTCFullYear();
const ts = (month, day = 10) => Math.floor(Date.UTC(Y, month - 1, day) / 1000);

const harvest = ({ id, assetId = null, name, value, unit, tsSec }) => ({
  id,
  type: 'log--harvest',
  asset_id: assetId,
  name,
  timestamp: tsSec,
  status: 'done',
  quantity: { value, unit, measure: 'weight' },
});

const LOGS = [
  harvest({ id: 'h1', assetId: 'p1', name: 'Cosecha de Fresa', value: 4, unit: 'kg', tsSec: ts(1) }),
  harvest({ id: 'h2', assetId: 'p1', name: 'Cosecha de Fresa', value: 8, unit: 'kg', tsSec: ts(2) }),
  harvest({ id: 'h3', assetId: 'p2', name: 'Cosecha de Mora', value: 1, unit: 'arroba', tsSec: ts(2) }),
  harvest({ id: 'h4', assetId: 'p3', name: 'Cosecha de Plátano', value: 30, unit: 'unidades', tsSec: ts(2) }),
];

const PLANTS = [
  { id: 'p1', attributes: { name: 'Fresa' }, relationships: { parent: { data: [{ id: 'lote1' }] } } },
  { id: 'p2', attributes: { name: 'Mora' }, relationships: { parent: { data: [{ id: 'lote1' }] } } },
];
const LANDS = [{ id: 'lote1', attributes: { name: 'Era 1' } }];

const summaryConDatos = () =>
  harvestSummary(LOGS, { plants: PLANTS, lands: LANDS, areaOf: () => 5000, now: AHORA });

beforeEach(() => {
  useCosechaStore.getState().reset();
});

describe('MiCosechaScreen — estado vacío', () => {
  it('acoge e invita a registrar la primera cosecha', () => {
    const onNavigate = vi.fn();
    preload(harvestSummary([], {}));
    render(<MiCosechaScreen onBack={vi.fn()} onNavigate={onNavigate} />);

    expect(screen.getByTestId('mi-cosecha-vacio')).toBeInTheDocument();
    expect(screen.getByText(/Aún no ha registrado cosecha/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Anotar mi primera cosecha/i }));
    expect(onNavigate).toHaveBeenCalledWith('cosechar');
    fireEvent.click(screen.getByRole('button', { name: /por voz/i }));
    expect(onNavigate).toHaveBeenCalledWith('registro_voz');
  });

  it('no pinta gráficas ni números fabricados sin datos', () => {
    preload(harvestSummary([], {}));
    render(<MiCosechaScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.queryByText(/Producción por cultivo/i)).toBeNull();
    expect(screen.queryByText(/Mes a mes/i)).toBeNull();
  });
});

describe('MiCosechaScreen — tablero con datos', () => {
  it('héroe de temporada + KPIs con los números del service', () => {
    preload(summaryConDatos());
    render(<MiCosechaScreen onBack={vi.fn()} onNavigate={vi.fn()} />);

    // 4 + 8 + 12.5 (arroba) = 24.5 kg, todo del año en curso.
    expect(screen.getByText(new RegExp(`Cosechado en lo que va de ${Y}`))).toBeInTheDocument();
    expect(screen.getAllByText('24,5').length).toBeGreaterThan(0); // es-CO usa coma
    expect(screen.getByText('Cosechas anotadas')).toBeInTheDocument();
    expect(screen.getByText('Cultivo estrella')).toBeInTheDocument();
    expect(screen.getAllByText(/Fresa/).length).toBeGreaterThan(0);
  });

  it('barras por cultivo en kg y conteos por unidades SEPARADOS', () => {
    preload(summaryConDatos());
    render(<MiCosechaScreen onBack={vi.fn()} onNavigate={vi.fn()} />);

    expect(screen.getByText('Producción por cultivo')).toBeInTheDocument();
    // Fresa 12 kg y Mora 12,5 kg como barras; Plátano 30 und en la lista de conteo.
    // (getAll: el valor también vive en la tabla alterna — por diseño.)
    expect(screen.getAllByText('12,5 kg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('12 kg').length).toBeGreaterThan(0);
    const conteos = screen.getByRole('list', { name: /unidades/i });
    expect(conteos).toHaveTextContent('Plátano');
    expect(conteos).toHaveTextContent('30 und');
  });

  it('tendencia mensual: SVG accesible + comparación de los dos últimos meses', () => {
    preload(summaryConDatos());
    render(<MiCosechaScreen onBack={vi.fn()} onNavigate={vi.fn()} />);

    expect(screen.getByText('Mes a mes')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Cosecha por mes/i })).toBeInTheDocument();
    // ene: 4 kg → feb: 20,5 kg (8 + 12,5), ambos meses nombrados (comparación honesta).
    expect(screen.getAllByText(new RegExp(`ene ${String(Y).slice(2)}`)).length).toBeGreaterThan(0);
  });

  it('cada gráfica trae su tabla alterna con los números', () => {
    preload(summaryConDatos());
    render(<MiCosechaScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    const tablas = screen.getAllByText('Ver los números en tabla');
    expect(tablas.length).toBe(2); // cultivos + meses
    fireEvent.click(tablas[0]);
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0);
    // La tabla de cultivos también lista el que se cuenta por unidades.
    expect(screen.getAllByText(/30 und/).length).toBeGreaterThan(0);
  });

  it('rendimiento por lote con kg/planta y kg/ha del service', () => {
    preload(summaryConDatos());
    render(<MiCosechaScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByText('Rendimiento por lote')).toBeInTheDocument();
    expect(screen.getByText('Era 1')).toBeInTheDocument();
    // 24,5 kg / 2 plantas = 12,3 kg/planta; 24,5 kg / 0,5 ha = 49 kg/ha.
    expect(screen.getByText(/kg\/planta/)).toBeInTheDocument();
    expect(screen.getByText(/49 kg\/ha/)).toBeInTheDocument();
  });

  it('CTA del pie invita a seguir anotando', () => {
    const onNavigate = vi.fn();
    preload(summaryConDatos());
    render(<MiCosechaScreen onBack={vi.fn()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Anotar otra cosecha/i }));
    expect(onNavigate).toHaveBeenCalledWith('cosechar');
  });

  it('botón Volver del shell llama onBack', () => {
    const onBack = vi.fn();
    preload(summaryConDatos());
    render(<MiCosechaScreen onBack={onBack} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Volver$/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
