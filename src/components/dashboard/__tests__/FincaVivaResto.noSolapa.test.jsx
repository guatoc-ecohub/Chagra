// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * Bug 2 (operador 2026-06-25, home F2 "finca-viva"): la hoja deslizable
 * "El resto de su finca" tapaba los 2 portales de abajo (Jugar y Agente).
 *
 * Causa raíz: `.fvh` (el hero) es un flex-item del scroller de DashboardLive
 * (App.jsx lo envuelve en `h-[100dvh] flex-col` con la flag F2). En móvil el
 * contenido del hero —escena 360px + compositor + saludo + los 4 portales—
 * supera el viewport; con `flex-shrink:1` (default) el algoritmo flex encogía
 * `.fvh` hasta su `min-height:100dvh` y `overflow:hidden` RECORTABA la fila
 * inferior de portales. La hoja `.fvh-resto` (margin-top:-22px) caía sobre esa
 * zona recortada y los tapaba.
 *
 * Fix: `.fvh { flex-shrink: 0 }` (el hero crece hasta su contenido → los 4
 * portales SIEMPRE completos) + `.fvh-fill { min-height }` (colchón bajo los
 * portales para que la "subida" de la hoja se solape sobre vacío, no sobre las
 * tarjetas).
 *
 * jsdom no calcula layout, así que cubrimos el bug en DOS planos:
 *   (1) CSS-source: el fix (flex-shrink:0 + colchón) está presente en el CSS.
 *   (2) DOM: con la flag F2 ON, DashboardLive renderiza los 4 portales y la hoja
 *       "resto" como superficies SEPARADAS (la hoja no contiene los portales) y
 *       en el orden correcto (portales antes que la hoja).
 */
import React from 'react';
import { describe, it, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ── (1) CSS-source: el fix está presente ────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const heroCss = readFileSync(join(__dirname, '..', 'finca-viva-hero.css'), 'utf8');

function ruleBody(css, selector) {
  // Bloque de la PRIMERA regla cuyo encabezado es EXACTAMENTE `selector`.
  const re = new RegExp(`(^|})\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'm');
  const m = css.match(re);
  return m ? m[2] : null;
}

describe('Bug 2 · CSS — la hoja "resto" no recorta los portales del hero', () => {
  it('.fvh no se comprime por debajo de su contenido (flex-shrink:0)', () => {
    const body = ruleBody(heroCss, '.fvh');
    expect(body).toBeTruthy();
    expect(body).toMatch(/flex-shrink:\s*0/);
  });

  it('.fvh-fill garantiza un colchón bajo los portales (min-height)', () => {
    const body = ruleBody(heroCss, '.fvh-fill');
    expect(body).toBeTruthy();
    expect(body).toMatch(/min-height:\s*\d+px/);
  });
});

// ── (2) DOM: los 4 portales y la hoja "resto" son superficies separadas ──────
vi.mock('../../../config/fincaVivaHomeFlag', () => ({
  fincaVivaHomePerfilActivo: () => true,
}));
vi.mock('../../../config/extensionistaAccess', () => ({
  esExtensionistaActual: () => false,
  esExtensionistaRealActual: () => false,
}));
vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => false,
}));
vi.mock('../../../db/farmProcessCache', () => ({
  listFarmProcesses: vi.fn(async () => []),
}));
vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({
    plants: [{ id: 'p1' }], lands: [], materials: [], isHydrated: true, iotAlerts: [],
  }),
}));
vi.mock('../../../services/userProfileService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getProfile: () => ({ rol: 'campesino' }),
    hasManualModuleVisibility: () => false,
  };
});

// Hijos pesados de la hoja "resto" → stubs livianos (probamos la SEPARACIÓN de
// superficies, no su contenido). El hero (FincaVivaHero) NO se mockea: queremos
// los 4 portales reales.
vi.mock('../FincaCards', () => ({
  PlantasCard: () => <div />, ZonasCard: () => <div />, InsumosCard: () => <div />,
  BitacoraCard: () => <div />, HoyCard: () => <div />, PlagasCard: () => <div />,
  BiodiversidadCard: () => <div />, AsociacionesCard: () => <div />, InformesCard: () => <div />,
  FermentosCard: () => <div />, AnimalesCard: () => <div />, SeguimientoCards: () => <div />,
}));
vi.mock('../CaseStudyTopWidget', () => ({ default: () => <div /> }));
vi.mock('../../CaseStudyTopWidget', () => ({ default: () => <div /> }));
vi.mock('../ClimaStrip', () => ({ default: () => <div /> }));
vi.mock('../HoyEnFincaStrip', () => ({ default: () => <div /> }));
vi.mock('../AIStatusFooter', () => ({ default: () => <div /> }));
vi.mock('../AnalisisProactivoIA', () => ({ default: () => <div /> }));
vi.mock('../SelectedBackgroundReveal', () => ({ default: () => <div /> }));
vi.mock('../MiFincaVivaHomeCard', () => ({ default: () => <div /> }));
vi.mock('../FincaRedInstitucional', () => ({ default: () => <div /> }));

globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};

import DashboardLive from '../DashboardLive';

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('Bug 2 · DOM — hero F2: 4 portales visibles + hoja "resto" separada', () => {
  test('renderiza los 4 portales del hero (ninguno queda sin montar)', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const nav = await screen.findByTestId('finca-viva-portales');
    const portales = within(nav).getAllByRole('button');
    expect(portales).toHaveLength(4);
    const labels = portales.map((b) => b.getAttribute('aria-label')?.split(':')[0]);
    // Copy campesino vigente (#1883/#1884): "Mi finca" (gestión), "Aprender",
    // "Jugar", "Pregúntele a Chagra" (agente). Antes eran Gestionar/Agente.
    expect(labels).toEqual(['Mi finca', 'Aprender', 'Jugar', 'Pregúntele a Chagra']);
  });

  test('la hoja "resto" NO contiene los portales (superficies separadas)', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const nav = await screen.findByTestId('finca-viva-portales');
    // La hoja "resto" se reorganizó en bloques (#1883/#1884); su contenedor es
    // .fvh-resto (data-testid estable), ya no el título "El resto de su finca".
    const hoja = screen.getByTestId('fvh-resto');
    expect(hoja).toBeTruthy();
    // La hoja "resto" es un contenedor distinto: NO envuelve la grilla de portales
    // (si la envolviera, los taparía/empujaría dentro de su superficie).
    expect(hoja.contains(nav)).toBe(false);
  });

  test('en orden de documento, los portales van ANTES de la hoja "resto"', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const nav = await screen.findByTestId('finca-viva-portales');
    const tit = screen.getByTestId('fvh-resto');
    await waitFor(() => expect(nav).toBeInTheDocument());
    // compareDocumentPosition: nav precede a tit → DOCUMENT_POSITION_FOLLOWING.
    const rel = nav.compareDocumentPosition(tit);
    expect(rel & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
