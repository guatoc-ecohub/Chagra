/**
 * CultivosInsigniaScreen — «Los cultivos insignia». Contrato:
 *   1. Carga los datos del grafo (public/cultivos-insignia.json) vía fetch.
 *   2. Muestra las 4 preguntas del cultivo: dónde va (piso), qué le pide al
 *      suelo (N-P-K), con qué se lleva (asocios/milpa) y qué lo ataca (plagas).
 *   3. Cambiar de cultivo en el roster cambia la ficha.
 *   4. Grounding-honesto: sin dato en el grafo, la sección no se pinta.
 *   5. Créditos de fotos (cumplimiento de licencia CC).
 */
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';

import CultivosInsigniaScreen from '../CultivosInsigniaScreen';

const FIXTURE = {
  _meta: { fuente: 'Grafo chagra_kg', cultivos: 2 },
  cultivos: [
    {
      id: 'zea_mays',
      nombre: 'Maíz criollo',
      cientifico: 'Zea mays L.',
      familia: 'Poaceae',
      habito: 'alto',
      emoji: '🌽',
      fotoSlug: 'maiz',
      pisos: [
        { id: 'templado', altMin: 1000, altMax: 2000, temp: '18-24' },
        { id: 'frio', altMin: 2000, altMax: 3000, temp: '12-18' },
      ],
      npk: {
        N: { nivel: 'alta', nota: 'alta demanda de nitrógeno', fuente: 'Agrosavia' },
        P: { nivel: 'media', nota: 'crítico al inicio', fuente: 'Agrosavia' },
        K: { nivel: 'alta', nota: 'clave en el llenado', fuente: 'Agrosavia' },
      },
      asocia: [{ id: 'phaseolus_vulgaris', nombre: 'Fríjol' }, { id: 'cucurbita_moschata', nombre: 'Ahuyama' }],
      asocia_total: 2,
      incompat: [{ id: 'foeniculum_vulgare', nombre: 'Hinojo' }],
      plagas: [
        {
          id: 'spodoptera_frugiperda',
          nombre: 'Gusano cogollero',
          tipo: 'insecto_lepidoptero',
          controles: [{ nombre: 'Bacillus thuringiensis (BT)', tipo: 'Biopreparado' }],
        },
      ],
    },
    {
      id: 'coffea_arabica',
      nombre: 'Café',
      cientifico: 'Coffea arabica L.',
      familia: 'Rubiaceae',
      habito: 'medio',
      emoji: '☕',
      fotoSlug: 'cafe',
      pisos: [{ id: 'templado', altMin: 1000, altMax: 2000, temp: '18-24' }],
      npk: { N: { nivel: 'alta', nota: null, fuente: 'Cenicafé' } },
      asocia: [],
      asocia_total: 0,
      incompat: [],
      plagas: [],
    },
  ],
};

const META = {
  maiz: { file: 'File:Cornfield.jpg', license: 'CC BY-SA 3.0', artist: 'Lotus Head', source: 'https://commons.wikimedia.org/wiki/File:Cornfield.jpg' },
  cafe: { file: 'File:Coffee.jpg', license: 'Public domain', artist: 'Köhler', source: 'https://commons.wikimedia.org/wiki/File:Coffee.jpg' },
};

beforeEach(() => {
  global.fetch = vi.fn((url) => {
    if (String(url).includes('_meta.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(META) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(FIXTURE) });
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CultivosInsigniaScreen — las 4 preguntas del cultivo', () => {
  test('carga y muestra la ficha del primer cultivo con sus 4 dimensiones', async () => {
    render(<CultivosInsigniaScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('ficha-zea_mays')).toBeInTheDocument());

    const ficha = screen.getByTestId('ficha-zea_mays');
    // ¿Dónde va? — pisos térmicos
    expect(within(ficha).getByText('¿Dónde va?')).toBeInTheDocument();
    expect(within(ficha).getByText('Clima medio')).toBeInTheDocument();
    expect(within(ficha).getByText('Tierra fría')).toBeInTheDocument();
    // ¿Qué le pide al suelo? — N-P-K
    expect(within(ficha).getByText('¿Qué le pide al suelo?')).toBeInTheDocument();
    expect(within(ficha).getByText('Nitrógeno')).toBeInTheDocument();
    expect(within(ficha).getByText('Fósforo')).toBeInTheDocument();
    expect(within(ficha).getByText('Potasio')).toBeInTheDocument();
    // ¿Con qué se lleva? — asocios + milpa + incompatibles
    expect(within(ficha).getByText('¿Con qué se lleva?')).toBeInTheDocument();
    expect(within(ficha).getByText('Fríjol')).toBeInTheDocument();
    expect(within(ficha).getAllByText(/Tres Hermanas/).length).toBeGreaterThan(0);
    expect(within(ficha).getByText('Hinojo')).toBeInTheDocument();
    // ¿Qué lo ataca? — plaga + control
    expect(within(ficha).getByText('¿Qué lo ataca?')).toBeInTheDocument();
    expect(within(ficha).getByText('Gusano cogollero')).toBeInTheDocument();
    expect(within(ficha).getByText(/Bacillus thuringiensis/)).toBeInTheDocument();
  });

  test('el «por qué» de un nutriente revela la nota y la fuente del grafo', async () => {
    render(<CultivosInsigniaScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('ficha-zea_mays')).toBeInTheDocument());
    const botones = screen.getAllByText('¿por qué?');
    fireEvent.click(botones[0]);
    expect(screen.getByText(/Alta demanda de nitrógeno/)).toBeInTheDocument();
    expect(screen.getByText(/Fuente: Agrosavia/)).toBeInTheDocument();
  });

  test('cambiar de cultivo en el roster cambia la ficha', async () => {
    render(<CultivosInsigniaScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('ficha-zea_mays')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('crop-tile-coffea_arabica'));
    expect(screen.getByTestId('ficha-coffea_arabica')).toBeInTheDocument();
    // El café del fixture no tiene asocios ni plagas → esas secciones no se pintan.
    const ficha = screen.getByTestId('ficha-coffea_arabica');
    expect(within(ficha).queryByText('¿Con qué se lleva?')).toBeNull();
    expect(within(ficha).queryByText('¿Qué lo ataca?')).toBeNull();
    // Pero sí su piso y su nitrógeno.
    expect(within(ficha).getByText('¿Dónde va?')).toBeInTheDocument();
    expect(within(ficha).getByText('Nitrógeno')).toBeInTheDocument();
  });

  test('muestra los créditos de las fotos (licencia abierta)', async () => {
    render(<CultivosInsigniaScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('ficha-zea_mays')).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Créditos de las fotos/));
    expect(screen.getByText(/Lotus Head/)).toBeInTheDocument();
    expect(screen.getByText(/CC BY-SA 3.0/)).toBeInTheDocument();
  });

  test('estado de error si el JSON no carga', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 }));
    render(<CultivosInsigniaScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/No se pudieron cargar los cultivos/)).toBeInTheDocument());
  });
});
