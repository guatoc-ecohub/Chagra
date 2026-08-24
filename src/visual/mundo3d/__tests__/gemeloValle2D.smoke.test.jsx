/*
 * Smoke test del GEMELO 2D del valle (spec 20): la lámina rubber-hose andina
 * que reemplaza al fallback plano en gama baja / reduced-motion / sin WebGL.
 * Verifica el contrato (mismos hotspots navegables que el 3D, alerta, clima,
 * reduced motion) y el adaptador al framework de mundos.
 */
import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';

import GemeloValle2D, { GemeloValleEscena } from '../GemeloValle2D.jsx';
import Mundo2D from '../Mundo2D.jsx';
import { MUNDOS_VALLE, COSA_DEL_DIA } from '../../../mockups/valle/valleData';

afterEach(() => cleanup());

describe('GemeloValle2D — el gemelo 2D de primera clase del valle', () => {
  test('renderiza los MISMOS mundos navegables que la escena 3D', () => {
    const { container, getByRole } = render(
      <GemeloValle2D clima="soleado" onEntrar={() => {}} onAlerta={() => {}} />,
    );
    // un botón por mundo del valle, con su título real del manifiesto
    MUNDOS_VALLE.forEach((m) => {
      expect(
        getByRole('button', { name: new RegExp(`Viajar al mundo ${m.titulo}`) }),
      ).toBeInTheDocument();
    });
    // la lámina SVG existe y es accesible
    expect(container.querySelector('.gemelo-valle__svg')).toBeInTheDocument();
  });

  test('tocar un lugar dispara onEntrar con el id del mundo', () => {
    const onEntrar = vi.fn();
    const { getByRole } = render(<GemeloValle2D clima="soleado" onEntrar={onEntrar} onAlerta={vi.fn()} />);
    const cafe = MUNDOS_VALLE.find((m) => m.id === 'cafe');
    fireEvent.click(getByRole('button', { name: new RegExp(`Viajar al mundo ${cafe.titulo}`) }));
    expect(onEntrar).toHaveBeenCalledWith('cafe');
  });

  test('la cosa del día se ancla a su mundo y dispara onAlerta', () => {
    const onAlerta = vi.fn();
    const { getByRole } = render(<GemeloValle2D clima="soleado" onAlerta={onAlerta} onEntrar={vi.fn()} />);
    const alerta = getByRole('button', { name: new RegExp(`Alerta del día: ${COSA_DEL_DIA.titulo}`) });
    fireEvent.click(alerta);
    expect(onAlerta).toHaveBeenCalledTimes(1);
  });

  test('el clima tiñe la lámina (data-clima) y la noche trae estrellas', () => {
    const { container, rerender } = render(<GemeloValle2D clima="noche" onEntrar={vi.fn()} onAlerta={vi.fn()} />);
    const raiz = container.querySelector('.gemelo-valle');
    expect(raiz).toHaveAttribute('data-clima', 'noche');
    expect(container.querySelectorAll('.gv-titila').length).toBeGreaterThan(5);
    rerender(<GemeloValle2D clima="lluvia" onEntrar={vi.fn()} onAlerta={vi.fn()} />);
    expect(container.querySelector('.gv-lluvia')).toBeInTheDocument();
    rerender(<GemeloValle2D clima="niebla" onEntrar={vi.fn()} onAlerta={vi.fn()} />);
    expect(container.querySelector('.gv-niebla')).toBeInTheDocument();
  });

  test('reducedMotion congela la lámina a un fotograma digno (data-quieto)', () => {
    const { container } = render(<GemeloValle2D clima="noche" reducedMotion onEntrar={vi.fn()} onAlerta={vi.fn()} />);
    expect(container.querySelector('.gemelo-valle')).toHaveAttribute('data-quieto', 'si');
    // sin movimiento no hay luciérnagas (decoración solo-animada)
    expect(container.querySelector('.gv-luciernaga')).not.toBeInTheDocument();
  });

  test('focoId acerca la cámara-lámina hacia el lugar (entrar al mundo)', () => {
    const { container } = render(<GemeloValle2D clima="soleado" focoId="suelo" onEntrar={vi.fn()} onAlerta={vi.fn()} />);
    expect(container.querySelector('.gemelo-valle')).toHaveAttribute('data-entrando', 'si');
    const cam = container.querySelector('.gemelo-valle__cam');
    expect(cam.getAttribute('style')).toContain('scale(1.45)');
  });

  test('adaptador GemeloValleEscena habla el contrato del framework (onHotspot)', () => {
    const onHotspot = vi.fn();
    const { getByRole } = render(
      <GemeloValleEscena
        params={{ clima: 'dorada' }}
        entrada={{ alertaView: 'hoy_finca' }}
        onHotspot={onHotspot}
      />,
    );
    const suelo = MUNDOS_VALLE.find((m) => m.id === 'suelo');
    fireEvent.click(getByRole('button', { name: new RegExp(`Viajar al mundo ${suelo.titulo}`) }));
    expect(onHotspot).toHaveBeenCalledWith('mundo', { mundoId: 'suelo' });
    fireEvent.click(getByRole('button', { name: /Alerta del día/ }));
    expect(onHotspot).toHaveBeenCalledWith('hoy_finca');
  });

  test('cada hotspot y alerta queda dentro del lienzo, incluso con coordenadas extremas', () => {
    const mundos = [
      {
        id: 'abono_fuera', pos: [-30, 0, 12], escala: 1, tipo: 'compost', titulo: 'Abono', emoji: 'A', lema: '', tinte: ['#59401f', '#a8854c'],
      },
      {
        id: 'disenio_fuera', pos: [30, 0, -12], escala: 1, tipo: 'bosque', titulo: 'Diseño', emoji: 'D', lema: '', tinte: ['#456353', '#b8c6b6'],
      },
    ];
    const { container } = render(
      <GemeloValle2D
        mundos={[...MUNDOS_VALLE, ...mundos]}
        alerta={{ ...COSA_DEL_DIA, anclaMundo: 'abono_fuera', titulo: 'Alerta', detalle: '' }}
        onEntrar={vi.fn()}
        onAlerta={vi.fn()}
      />,
    );

    const botones = container.querySelectorAll('.gv-poi, .gv-alerta');
    expect(botones).toHaveLength(MUNDOS_VALLE.length + mundos.length + 1);
    botones.forEach((boton) => {
      const el = /** @type {HTMLElement} */ (boton);
      expect(parseFloat(el.style.left)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(el.style.left)).toBeLessThanOrEqual(100);
      expect(parseFloat(el.style.top)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(el.style.top)).toBeLessThanOrEqual(100);
    });
  });

  test('Mundo2D monta el gemelo del valle y conserva el contrato de hotspots', () => {
    const onHotspot = vi.fn();
    const { container, getByRole } = render(
      <Mundo2D escena="valle2d" entrada={{ alertaView: 'hoy_finca' }} onHotspot={onHotspot} />,
    );
    expect(container.querySelector('.gemelo-valle')).toBeInTheDocument();
    const suelo = MUNDOS_VALLE.find((m) => m.id === 'suelo');
    fireEvent.click(getByRole('button', { name: new RegExp(`Viajar al mundo ${suelo.titulo}`) }));
    expect(onHotspot).toHaveBeenCalledWith('mundo', { mundoId: 'suelo' });
  });

  describe('responsividad a orientación (portrait/landscape)', () => {
    test('el lienzo mantiene aspect-ratio correcto y se escala en cualquier contenedor', () => {
      const { container } = render(<GemeloValle2D clima="soleado" onEntrar={vi.fn()} onAlerta={vi.fn()} />);
      const lienzo = container.querySelector('.gemelo-valle__lienzo');
      expect(lienzo).toBeInTheDocument();

      // Verificar que el SVG existe y tiene el viewBox correcto (480×360 = landscape base)
      const svg = container.querySelector('.gemelo-valle__svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 480 360');
      expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
    });

    test('todos los hotspots quedan dentro del lienzo sin importar el tamaño del contenedor', () => {
      // Simular diferentes tamaños de contenedor (portrait y landscape)
      const containerSizes = [
        { width: 390, height: 844 },  // iPhone portrait
        { width: 844, height: 390 },  // iPhone landscape
        { width: 428, height: 926 },  // iPhone Pro Max portrait
        { width: 926, height: 428 },  // iPhone Pro Max landscape
      ];

      containerSizes.forEach(({ width, height }) => {
        const { container: testContainer } = render(
          <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
            <GemeloValle2D clima="soleado" onEntrar={vi.fn()} onAlerta={vi.fn()} />
          </div>
        );

        const botones = testContainer.querySelectorAll('.gv-poi');
        expect(botones.length).toBeGreaterThan(0);

        botones.forEach((boton) => {
          const el = /** @type {HTMLElement} */ (boton);
          const left = parseFloat(el.style.left);
          const top = parseFloat(el.style.top);

          // Los valores deben estar entre 8 y 92 (por el clampPct)
          expect(left).toBeGreaterThanOrEqual(8);
          expect(left).toBeLessThanOrEqual(92);
          expect(top).toBeGreaterThanOrEqual(8);
          expect(top).toBeLessThanOrEqual(92);
        });
      });
    });

    test('el SVG se renderiza correctamente y mantiene viewBox', () => {
      const { container } = render(<GemeloValle2D clima="soleado" onEntrar={vi.fn()} onAlerta={vi.fn()} />);
      const svg = container.querySelector('.gemelo-valle__svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 480 360');
      expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
    });
  });
});
