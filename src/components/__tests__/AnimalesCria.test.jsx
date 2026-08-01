import React from 'react';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, afterEach } from 'vitest';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AnimalesScreen from '../AnimalesScreen';
import ConejosScreen from '../ConejosScreen';
import CaprinosScreen from '../CaprinosScreen';
import { CREDITOS_FOTOS_ANIMALES, FOTO_BASE_ANIMALES } from '../../data/animalesFinca';

/**
 * Módulo ANIMALES (cría campesina) — cobertura de las dos verticales nuevas
 * (conejos y cabras/ovejas) y del hub photo-forward.
 *
 * Verifica lo que importa de negocio:
 *   - El hub muestra las 6 verticales y navega a la ruta correcta de cada una.
 *   - Cada ficha nueva trae las 5 secciones didácticas (alojamiento,
 *     alimentación, sanidad, reproducción, aprovechamiento).
 *   - Las GUARDAS de seguridad groundeadas están presentes (leucaena tóxica a
 *     conejos; tope 30% en rumiantes; fitoterapia en gestación) — no se
 *     inventan dosis.
 *   - El ciclo cerrado enlaza al mundo del abono ('estiercol') — no queda
 *     huérfano el guano.
 *   - Toda foto declarada en créditos existe bajo /animales y con atribución.
 */

afterEach(() => cleanup());

describe('AnimalesScreen — hub photo-forward de la cría', () => {
  test('lista las 6 verticales (incluye conejos y cabras/ovejas)', () => {
    render(<AnimalesScreen onBack={vi.fn()} onHome={vi.fn()} onNavigate={vi.fn()} />);
    const grid = screen.getByTestId('animales-verticales');
    for (const id of ['gallinas', 'cerdos', 'conejos', 'caprinos', 'vacas', 'abejas']) {
      expect(within(grid).getByTestId(`vertical-${id}`)).toBeInTheDocument();
    }
  });

  test('cada tarjeta navega a su ruta real', () => {
    const onNavigate = vi.fn();
    render(<AnimalesScreen onBack={vi.fn()} onHome={vi.fn()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('vertical-conejos'));
    expect(onNavigate).toHaveBeenCalledWith('animales_conejos');
    fireEvent.click(screen.getByTestId('vertical-caprinos'));
    expect(onNavigate).toHaveBeenCalledWith('animales_caprinos');
    fireEvent.click(screen.getByTestId('vertical-cerdos'));
    expect(onNavigate).toHaveBeenCalledWith('seguimiento_cerdos');
  });

  test('el ciclo cerrado enlaza al mundo del abono', () => {
    const onNavigate = vi.fn();
    render(<AnimalesScreen onBack={vi.fn()} onHome={vi.fn()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('animales-ir-abono'));
    expect(onNavigate).toHaveBeenCalledWith('estiercol');
  });
});

describe('ConejosScreen — ficha de cría cunícola', () => {
  test('trae las 5 secciones didácticas', () => {
    render(<ConejosScreen onBack={vi.fn()} onHome={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Alojamiento/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Alimentación/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sanidad y señales/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Reproducción/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Aprovechamiento/i })).toBeInTheDocument();
  });

  test('incluye la guarda de la leucaena (tóxica para conejos)', () => {
    render(<ConejosScreen onBack={vi.fn()} onHome={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getAllByText(/leucaena/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/PROHIBIDA/)).toBeInTheDocument();
  });

  test('el ciclo cerrado (conejaza) salta al mundo del abono', () => {
    const onNavigate = vi.fn();
    render(<ConejosScreen onBack={vi.fn()} onHome={vi.fn()} onNavigate={onNavigate} />);
    expect(screen.getAllByText(/Conejaza/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId('ir-a-abono'));
    expect(onNavigate).toHaveBeenCalledWith('estiercol');
  });
});

describe('CaprinosScreen — ficha de cabras y ovejas', () => {
  test('trae las 5 secciones didácticas', () => {
    render(<CaprinosScreen onBack={vi.fn()} onHome={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Alojamiento/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Alimentación/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sanidad y señales/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Reproducción/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Aprovechamiento/i })).toBeInTheDocument();
  });

  test('muestra razas criollas colombianas (Santandereana, Mora, Pelibuey)', () => {
    render(<CaprinosScreen onBack={vi.fn()} onHome={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByText(/Santandereana/)).toBeInTheDocument();
    expect(screen.getByText(/Mora Colombiana/)).toBeInTheDocument();
    expect(screen.getAllByText(/Pelibuey/).length).toBeGreaterThan(0);
  });

  test('incluye guardas de seguridad (leucaena 30% y fitoterapia en gestación)', () => {
    render(<CaprinosScreen onBack={vi.fn()} onHome={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByText(/30%/)).toBeInTheDocument();
    // Plantas abortivas prohibidas en hembras preñadas.
    expect(screen.getByText(/abortar/i)).toBeInTheDocument();
  });

  test('el ciclo cerrado (majada) salta al mundo del abono', () => {
    const onNavigate = vi.fn();
    render(<CaprinosScreen onBack={vi.fn()} onHome={vi.fn()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('ir-a-abono'));
    expect(onNavigate).toHaveBeenCalledWith('estiercol');
  });
});

describe('Fotos del módulo — atribución CC completa', () => {
  test('cada crédito tiene autor, licencia y URL de fuente', () => {
    expect(FOTO_BASE_ANIMALES).toBe('/animales');
    expect(CREDITOS_FOTOS_ANIMALES.length).toBeGreaterThanOrEqual(6);
    for (const c of CREDITOS_FOTOS_ANIMALES) {
      expect(c.slug, 'slug').toBeTruthy();
      expect(c.autor, `autor de ${c.slug}`).toBeTruthy();
      expect(c.lic, `licencia de ${c.slug}`).toBeTruthy();
      expect(c.url, `fuente de ${c.slug}`).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });

  test('cada foto declarada existe en public/animales', () => {
    const __dir = path.dirname(fileURLToPath(import.meta.url));
    const dir = path.resolve(__dir, '../../../public/animales');
    for (const c of CREDITOS_FOTOS_ANIMALES) {
      const f = path.join(dir, `${c.slug}.jpg`);
      expect(fs.existsSync(f), `falta la foto ${c.slug}.jpg`).toBe(true);
    }
  });
});
