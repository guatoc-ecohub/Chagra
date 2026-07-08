/**
 * RestauracionScreen — mundo "Restauración y bosque de alimentos"
 * (photo-forward, 5 estaciones). COMPLEMENTA el mundo de diseño con el enfoque
 * food-forest.
 *
 * Contrato cubierto:
 *   - Las 5 estaciones son navegables y cada una muestra su contenido.
 *   - Los 7 estratos están presentes y en orden.
 *   - La sucesión distingue pioneras (fijadoras) de bosque de clímax.
 *   - La restauración de suelo trae el método SIN cifras inventadas (guard).
 *   - GROUNDING: TODA especie referida es un id real de grafo-relations.json y
 *     el flag `nativo` coincide con establishment_means === 'nativo' (anti
 *     fabricación de especies — memoria feedback-restauracion-grounding).
 *   - Puentes: onBack; enlaces a asociaciones, salud_suelo, compost,
 *     reforestación, biodiversidad y agente.
 *   - Créditos de fotos con atribución (cumplimiento CC).
 */
// @types/node no está instalado en el repo (gap conocido y ya tolerado en
// MundosDeMiFinca.reachability.test.jsx / dataJsonValidity.test.js): tsc no
// resuelve los specifiers "node:*". Runtime (vitest/node) sí los resuelve.
// @ts-expect-error TS2591 — ver comentario arriba.
import fs from 'node:fs';
// @ts-expect-error TS2591 — ver comentario arriba.
import path from 'node:path';
// @ts-expect-error TS2591 — ver comentario arriba.
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import RestauracionScreen from './RestauracionScreen';
import {
  CREDITOS_FOTOS_RESTAURACION,
  ESTRATOS,
  SUCESION_ETAPAS,
  ESPECIES_RESTAURACION,
} from '../../data/restauracionFinca';

afterEach(() => cleanup());

const irAEstacion = (id) => fireEvent.click(screen.getByTestId(`estacion-tab-${id}`));

describe('RestauracionScreen — navegación y portada', () => {
  it('arranca en "el bosque de alimentos" y muestra las 5 pestañas', () => {
    render(<RestauracionScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByTestId('restauracion-screen')).toBeTruthy();
    expect(screen.getByTestId('estacion-bosque')).toBeTruthy();
    for (const id of ['bosque', 'estratos', 'sucesion', 'suelo', 'especies']) {
      expect(screen.getByTestId(`estacion-tab-${id}`)).toBeTruthy();
    }
  });

  it('el botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<RestauracionScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('enlaza a "buenas vecinas" del mundo de diseño (complementa, no duplica)', () => {
    const onNavigate = vi.fn();
    render(<RestauracionScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('rest-ir-asociaciones'));
    expect(onNavigate).toHaveBeenCalledWith('asociaciones');
  });
});

describe('RestauracionScreen — los 7 estratos', () => {
  it('muestra los 7 estratos en orden', () => {
    render(<RestauracionScreen onBack={() => {}} />);
    irAEstacion('estratos');
    expect(ESTRATOS).toHaveLength(7);
    for (const e of ESTRATOS) {
      expect(screen.getByTestId(`estrato-${e.id}`)).toBeTruthy();
    }
  });

  it('las distancias de siembra no se inventan: se marcan como dato en camino', () => {
    render(<RestauracionScreen onBack={() => {}} />);
    irAEstacion('estratos');
    expect(screen.getByTestId('slot-grounded-pendiente')).toBeTruthy();
  });
});

describe('RestauracionScreen — sucesión ecológica', () => {
  it('distingue pioneras de bosque de clímax', () => {
    render(<RestauracionScreen onBack={() => {}} />);
    irAEstacion('sucesion');
    expect(screen.getByTestId('sucesion-pioneras')).toBeTruthy();
    expect(screen.getByTestId('sucesion-climax')).toBeTruthy();
    // El aliso (nativo, fija N con Frankia) es la pionera andina groundeada.
    expect(screen.getByText(/Alnus acuminata/i)).toBeTruthy();
  });
});

describe('RestauracionScreen — restaurar el suelo (método, sin cifras)', () => {
  it('muestra el método y el guard anti-cifras inventadas', () => {
    render(<RestauracionScreen onBack={() => {}} />);
    irAEstacion('suelo');
    expect(screen.getByTestId('rest-suelo-metodo')).toBeTruthy();
    const nota = screen.getByTestId('rest-suelo-nota');
    expect(nota.textContent).toMatch(/no se inventa|no encontrará/i);
  });

  it('enlaza al cuaderno del suelo y al compost', () => {
    const onNavigate = vi.fn();
    render(<RestauracionScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('suelo');
    fireEvent.click(screen.getByTestId('rest-ir-suelo'));
    expect(onNavigate).toHaveBeenCalledWith('salud_suelo');
    fireEvent.click(screen.getByTestId('rest-ir-compost'));
    expect(onNavigate).toHaveBeenCalledWith('compost');
  });
});

describe('RestauracionScreen — especies groundeadas y puentes', () => {
  it('lista especies para restaurar con su guard anti-fabricación', () => {
    render(<RestauracionScreen onBack={() => {}} />);
    irAEstacion('especies');
    expect(screen.getByTestId('rest-especies-lista')).toBeTruthy();
    const nota = screen.getByTestId('rest-nota-grounding');
    expect(nota.textContent).toMatch(/catálogo Chagra/i);
  });

  it('enlaza a reforestación y al monte de la finca (mundos hermanos)', () => {
    const onNavigate = vi.fn();
    render(<RestauracionScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('especies');
    fireEvent.click(screen.getByTestId('rest-ir-reforestacion'));
    expect(onNavigate).toHaveBeenCalledWith('seguimiento_reforestacion');
    fireEvent.click(screen.getByTestId('rest-ir-biodiversidad'));
    expect(onNavigate).toHaveBeenCalledWith('biodiversidad');
  });

  it('el agente queda presente en el pie con prompt de restauración', () => {
    const onNavigate = vi.fn();
    render(<RestauracionScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('rest-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/bosque de alimentos/i),
    }));
  });
});

describe('RestauracionScreen — créditos de fotos (cumplimiento CC)', () => {
  it('todas las fotos traen autor, licencia y fuente de Wikimedia', () => {
    expect(CREDITOS_FOTOS_RESTAURACION.length).toBeGreaterThanOrEqual(6);
    for (const cr of CREDITOS_FOTOS_RESTAURACION) {
      expect(cr.autor).toBeTruthy();
      expect(cr.licencia).toBeTruthy();
      expect(cr.fuenteUrl).toMatch(/^https?:\/\/([a-z0-9-]+\.)*wikimedia\.org\//);
    }
  });
});

// ── GROUNDING: cada especie del mundo existe en el grafo (anti-fabricación) ──
describe('RestauracionScreen — grounding contra el catálogo (grafo)', () => {
  // El grafo es el mismo que consume la app en runtime (public/grafo-relations).
  // Se lee del disco (mismo criterio que la reachability test) para no acoplar
  // el test a fetch ni a un import JSON.
  const __dir = path.dirname(fileURLToPath(import.meta.url));
  const grafoPath = path.resolve(__dir, '../../../public/grafo-relations.json');
  const grafo = JSON.parse(fs.readFileSync(grafoPath, 'utf8'));
  const species = grafo.species || {};

  const idsDelMundo = [
    ...ESTRATOS.flatMap((e) => e.especies),
    ...SUCESION_ETAPAS.flatMap((e) => e.especies),
    ...ESPECIES_RESTAURACION,
  ];

  it('cada especie referida es un id REAL del grafo (0 inventadas)', () => {
    for (const e of idsDelMundo) {
      expect(species[e.id], `especie fabricada (no está en el grafo): ${e.id}`).toBeTruthy();
    }
  });

  it('el flag `nativo` coincide con establishment_means del grafo', () => {
    for (const e of idsDelMundo) {
      const esNativoEnGrafo = species[e.id]?.establishment_means === 'nativo';
      expect(
        !!e.nativo,
        `nativo desalineado para ${e.id}: mundo=${!!e.nativo} grafo=${esNativoEnGrafo}`,
      ).toBe(esNativoEnGrafo);
    }
  });
});
