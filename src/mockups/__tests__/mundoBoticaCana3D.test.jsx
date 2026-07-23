import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';

/*
 * El Canvas se mockea abajo (como en sus mundos hermanos) para poder leer el
 * árbol de la escena con testing-library, sin WebGL real. Eso significa que
 * `<instancedMesh>` (el cañal de `Canal`, 2 draw calls instanciados) monta
 * como un elemento DOM plano, no como un `THREE.InstancedMesh` real — y su
 * `useEffect` de siembra llama `setMatrixAt`/`setColorAt`/`instanceMatrix`
 * sobre esa ref. Sin este parche, CUALQUIER render de este mundo revienta en
 * ese efecto (nada que ver con `paso`/`etiquetas`: es el cañal, no tocado por
 * este cableado). Se rellenan como no-op solo para que el efecto no truene;
 * no se afirma nada sobre el cañal en estos tests.
 */
beforeAll(() => {
  const proto = window.HTMLUnknownElement?.prototype;
  if (proto && !proto.setMatrixAt) {
    proto.setMatrixAt = () => {};
    proto.setColorAt = () => {};
    Object.defineProperty(proto, 'instanceMatrix', {
      configurable: true,
      get() { return { needsUpdate: false }; },
      set() {},
    });
    Object.defineProperty(proto, 'instanceColor', {
      configurable: true,
      get() { return null; },
      set() {},
    });
  }
});

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, onCreated, ...props }) => {
    React.useEffect(() => onCreated?.(), [onCreated]);
    return <div data-testid="canvas" {...props}>{children}</div>;
  },
  useFrame: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  AdaptiveDpr: () => null,
  OrbitControls: () => null,
  Html: ({ children }) => <div data-testid="html-billboard">{children}</div>,
}));

vi.mock('../../visual/mundo3d/ParticulasAmbientales.jsx', () => ({
  ParticulasAmbientales: () => null,
}));

import MundoBoticaCana3D from '../MundoBoticaCana3D.jsx';

afterEach(cleanup);

describe('MundoBoticaCana3D', () => {
  test('presenta la botica y el trapiche, y monta su propio Canvas', () => {
    render(<MundoBoticaCana3D />);
    expect(screen.getByRole('heading', { name: 'La botica y el trapiche' })).toBeInTheDocument();
    expect(screen.getByLabelText('La botica campesina y el trapiche panelero en 3D')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Recorrido de la caña a la panela' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  // Cableado de `paso`: antes `etiquetas` era un booleano todo-o-nada que no
  // movía la cámara ni distinguía un paso de otro dentro del Canvas.
  describe('cablea el recorrido de la caña a la panela al Canvas', () => {
    test('en vista calma (sin tocar nada) no hay etiquetas 3D y la cámara mira al punto de reposo', () => {
      const { container } = render(<MundoBoticaCana3D />);
      expect(container.querySelector('group[name="etiqueta-paso-1"]')).toBeNull();
      const foco = container.querySelector('group[name="foco-paso"]');
      expect(foco).toBeTruthy();
      // #2698 reencuadró la vista calma hacia el trapiche para que el molino
      // y el buey queden dentro del encuadre vertical.
      expect(foco.getAttribute('position')).toBe('0.9,1,1.8');
      expect(screen.getByRole('status')).toHaveTextContent(/Toque el botón/i);
    });

    test('tocar "2. El molino" activa el recorrido, resalta esa etiqueta y usa su propio ojo de cámara', () => {
      const { container } = render(<MundoBoticaCana3D />);
      fireEvent.click(screen.getByRole('button', { name: '2. El molino' }));

      // La cámara (el foco) se mueve al punto del paso 2, no al de reposo.
      const foco = container.querySelector('group[name="foco-paso"]');
      expect(foco.getAttribute('position')).toBe('6.2,2.5,1.6');
      const ojo = container.querySelector('group[name="ojo-paso"]');
      expect(ojo.getAttribute('position')).toBe('8,4.8,8.1');

      // Solo la etiqueta del paso 2 lleva la clase de "activo".
      const etiqueta2 = container.querySelector('div[data-testid="html-billboard"] .bocana-chip--activo');
      expect(etiqueta2).toBeTruthy();
      expect(etiqueta2).toHaveTextContent('El molino');

      // El botón queda marcado y el texto cambia al del recorrido.
      expect(screen.getByRole('button', { name: '2. El molino' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('status')).toHaveTextContent(/Siga los números/i);
    });

    test('el paso de la caña acerca el ojo al cañal desde fuera de la enramada', () => {
      const { container } = render(<MundoBoticaCana3D />);
      fireEvent.click(screen.getByRole('button', { name: '1. La caña' }));

      const foco = container.querySelector('group[name="foco-paso"]');
      const ojo = container.querySelector('group[name="ojo-paso"]');
      expect(foco.getAttribute('position')).toBe('9.5,3.6,-4.5');
      expect(ojo.getAttribute('position')).toBe('10.4,5.2,3.3');
    });

    test('tocar el mismo paso otra vez vuelve a la vista calma (apaga el recorrido)', () => {
      const { container } = render(<MundoBoticaCana3D />);
      const boton = screen.getByRole('button', { name: '4. La paila' });
      fireEvent.click(boton);
      expect(boton).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(boton);
      expect(boton).toHaveAttribute('aria-pressed', 'false');
      expect(container.querySelector('group[name="etiqueta-paso-4"]')).toBeNull();
      expect(container.querySelector('group[name="ojo-paso"]')).toBeNull();
      const foco = container.querySelector('group[name="foco-paso"]');
      expect(foco.getAttribute('position')).toBe('0.5,1,1.5');
    });
  });
});
