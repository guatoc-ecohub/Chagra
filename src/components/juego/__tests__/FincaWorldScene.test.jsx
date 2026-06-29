import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FincaWorldScene from '../FincaWorldScene';

// Stage mínimo (nivel 2) para el backdrop — la escena rica no depende de él para
// las plantas, pero el componente lo usa para cielo/tierra.
const STAGE = {
  level: 2,
  cielo: ['#90cce0', '#d4ecd6'],
  tierra: ['#9a8456', '#7a9655'],
  arboles: 4,
  vida: 3,
  nombreNino: 'Bosque joven',
  mensaje: 'Tu finca está creciendo.',
};

/** Lote helper con tipo+fase explícitos (lo que produce buildFincaScene). */
function lote({ id, tipo, fase, growth = 0.6, nombre = 'Cultivo', subjectSlug = 's' }) {
  return {
    id, tipo, fase, growth, nombre, subjectSlug, activo: true, animal: false,
    sprite: fase, etiquetaEtapa: '',
  };
}

describe('FincaWorldScene — MODO MUNDO (juego por nivel, compat)', () => {
  it('sin lotes → modo mundo (data-modo="mundo"), dibuja el mundo por nivel', () => {
    render(<FincaWorldScene stage={STAGE} criaturas={[]} />);
    const scene = screen.getByTestId('finca-world-scene');
    expect(scene.getAttribute('data-modo')).toBe('mundo');
    expect(scene.getAttribute('data-level')).toBe('2');
  });

  it('finca vacía sin lotes → aria-label de espera (invita a sembrar)', () => {
    render(<FincaWorldScene stage={STAGE} criaturas={[]} vacia />);
    const scene = screen.getByTestId('finca-world-scene');
    expect(scene.getAttribute('aria-label')).toMatch(/esperando que siembres/i);
  });
});

describe('FincaWorldScene — MODO ESCENA RICA (#34 fase 2)', () => {
  it('con lotes → modo rico (data-modo="rica")', () => {
    render(
      <FincaWorldScene
        stage={STAGE}
        variant={{ kind: 'finca', zonas: ['huerta', 'frutales', 'aromaticas'] }}
        lotes={[lote({ id: 'l1', tipo: 'frutal', fase: 'fruit', nombre: 'Aguacate' })]}
      />,
    );
    expect(screen.getByTestId('finca-world-scene').getAttribute('data-modo')).toBe('rica');
  });

  it('describe el estado REAL por zona en el aria-label (frutal con frutos)', () => {
    render(
      <FincaWorldScene
        stage={STAGE}
        variant={{ kind: 'finca', zonas: ['frutales', 'huerta'] }}
        lotes={[
          lote({ id: 'l1', tipo: 'frutal', fase: 'fruit', nombre: 'Aguacate' }),
          lote({ id: 'l2', tipo: 'hortaliza', fase: 'seed', nombre: 'Lechuga' }),
        ]}
      />,
    );
    const aria = screen.getByTestId('finca-world-scene').getAttribute('aria-label');
    expect(aria).toMatch(/frutales/i);
    expect(aria).toMatch(/con frutos/i);
    expect(aria).toMatch(/huerta/i);
    expect(aria).toMatch(/recién sembrada/i);
  });

  it('una zona DECLARADA sin plantas reales se dibuja "por sembrar" (no campo muerto)', () => {
    const { container } = render(
      <FincaWorldScene
        stage={STAGE}
        variant={{ kind: 'finca', zonas: ['huerta', 'frutales', 'aromaticas'] }}
        // solo hay huerta real; frutales y aromáticas quedan por sembrar.
        lotes={[lote({ id: 'l1', tipo: 'hortaliza', fase: 'leaf', nombre: 'Acelga' })]}
      />,
    );
    const aria = screen.getByTestId('finca-world-scene').getAttribute('aria-label');
    expect(aria).toMatch(/frutales por sembrar/i);
    expect(aria).toMatch(/aromáticas por sembrar/i);
    // El rótulo de zona aparece como <text> rsvg-safe.
    expect(container.querySelector('text')).not.toBeNull();
  });

  it('NUNCA dibuja una zona no declarada y sin plantas (cero fabricación)', () => {
    render(
      <FincaWorldScene
        stage={STAGE}
        variant={{ kind: 'finca', zonas: ['huerta'] }} // solo declara huerta
        lotes={[lote({ id: 'l1', tipo: 'hortaliza', fase: 'leaf' })]}
      />,
    );
    const aria = screen.getByTestId('finca-world-scene').getAttribute('aria-label');
    // No dibuja frutales ni aromáticas (no declaradas, sin plantas): la parte
    // DINÁMICA (estado real) solo menciona la huerta. La etiqueta estática base
    // ("Tu finca rural: huerta, frutales, aromáticas...") es genérica, aparte.
    const dinamico = aria.split('Tienes ')[1] || '';
    expect(dinamico).toMatch(/huerta/i);
    expect(dinamico).not.toMatch(/frutal/i);
    expect(dinamico).not.toMatch(/aromátic/i);
    expect(dinamico).not.toMatch(/por sembrar/i);
  });

  it('invernadero TÚNEL: dibuja el macrotúnel (data-invernadero="tunel")', () => {
    const { container } = render(
      <FincaWorldScene
        stage={STAGE}
        variant={{ kind: 'finca', zonas: ['huerta'], invernaderoForma: 'tunel' }}
        lotes={[lote({ id: 'l1', tipo: 'hortaliza', fase: 'leaf' })]}
      />,
    );
    const scene = screen.getByTestId('finca-world-scene');
    expect(scene.getAttribute('data-invernadero')).toBe('tunel');
    expect(container.textContent).toMatch(/túnel/i);
    expect(scene.getAttribute('aria-label')).toMatch(/invernadero de túnel/i);
  });

  it('invernadero CUADRADO: dibuja la nave grande (data-invernadero="cuadrado")', () => {
    const { container } = render(
      <FincaWorldScene
        stage={STAGE}
        variant={{ kind: 'finca', zonas: ['huerta', 'frutales'], invernaderoForma: 'cuadrado' }}
        lotes={[lote({ id: 'l1', tipo: 'frutal', fase: 'flower', nombre: 'Fresa' })]}
      />,
    );
    const scene = screen.getByTestId('finca-world-scene');
    expect(scene.getAttribute('data-invernadero')).toBe('cuadrado');
    expect(container.textContent).toMatch(/invernadero/i);
    expect(scene.getAttribute('aria-label')).toMatch(/invernadero cuadrado/i);
  });

  it('invernadero declarado SIN forma → genérico (no rompe)', () => {
    render(
      <FincaWorldScene
        stage={STAGE}
        variant={{ kind: 'invernadero', zonas: ['huerta'] }}
        lotes={[lote({ id: 'l1', tipo: 'hortaliza', fase: 'leaf' })]}
      />,
    );
    const scene = screen.getByTestId('finca-world-scene');
    // kind invernadero sin forma declarada → forma 'otro' (genérico).
    expect(scene.getAttribute('data-invernadero')).toBe('otro');
  });

  it('animales reales → corral en el aria-label', () => {
    render(
      <FincaWorldScene
        stage={STAGE}
        variant={{ kind: 'finca', zonas: ['huerta'] }}
        lotes={[lote({ id: 'l1', tipo: 'hortaliza', fase: 'leaf' })]}
        animales={[{ id: 'a1', emoji: '🐷', subjectSlug: 'pigs', nombre: 'Cerdos', animal: true }]}
      />,
    );
    const aria = screen.getByTestId('finca-world-scene').getAttribute('aria-label');
    expect(aria).toMatch(/corral/i);
  });

  it('SVG es rsvg-safe: sin foreignObject', () => {
    const { container } = render(
      <FincaWorldScene
        stage={STAGE}
        variant={{ kind: 'finca', zonas: ['huerta', 'frutales', 'aromaticas'], invernaderoForma: 'cuadrado' }}
        lotes={[
          lote({ id: 'l1', tipo: 'frutal', fase: 'flower' }),
          lote({ id: 'l2', tipo: 'hortaliza', fase: 'seed' }),
          lote({ id: 'l3', tipo: 'aromatica', fase: 'flower' }),
        ]}
      />,
    );
    expect(container.querySelector('foreignObject')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
