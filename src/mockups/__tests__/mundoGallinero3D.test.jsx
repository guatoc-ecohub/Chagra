import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

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
}));

vi.mock('../../visual/mundo3d/ParticulasAmbientales.jsx', () => ({
  ParticulasAmbientales: () => null,
}));

import MundoGallinero3D from '../MundoGallinero3D.jsx';

afterEach(cleanup);

describe('MundoGallinero3D', () => {
  test('presenta el ciclo completo y monta su propio Canvas', () => {
    render(<MundoGallinero3D />);
    expect(screen.getByRole('heading', { name: 'El gallinero que camina' })).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-lista', 'true');
    expect(screen.getByRole('list', { name: 'Ciclo del pastoreo rotativo' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.getByText(/evita el sobrepastoreo/i)).toBeInTheDocument();
  });

  test('explica la regeneracion y permite volver al host', () => {
    const onBack = vi.fn();
    render(<MundoGallinero3D onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /3. Descanso/i }));
    expect(screen.getByRole('status')).toHaveTextContent('absorbe el abono y se regenera');
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  // Cableado de `paso` a la escena 3D: antes de este arreglo los 4 botones
  // solo cambiaban un párrafo de texto y nada dentro del <Canvas> se movía.
  describe('cablea el paso al Canvas (no solo el párrafo)', () => {
    test('la parcela de pastoreo empieza activa (más alta y más clara) y el tractor y las gallinas viven ahí', () => {
      const { container } = render(<MundoGallinero3D />);
      const parcelaPastoreo = container.querySelector('mesh[name="parcela-pastoreo"]');
      const parcelaTraslado = container.querySelector('mesh[name="parcela-traslado"]');
      expect(parcelaPastoreo).toBeTruthy();
      // La parcela activa se levanta (0.05) y las inactivas quedan más bajas (0.01):
      // la diferencia de estado es real, no solo un hex fijo.
      expect(parcelaPastoreo.getAttribute('position')).toBe('-4.2,0.05,-1.8');
      expect(parcelaTraslado.getAttribute('position')).toBe('0,0.01,-1.8');

      // El tractor arranca en la parcela activa (pastoreo), no en una posición
      // fija arbitraria.
      const tractor = container.querySelector('group[name="tractor-gallinas"]');
      expect(tractor.getAttribute('position')).toBe('-4.2,0.25,-1.8');

      // Las 8 gallinas se reparten alrededor de esa MISMA parcela, no
      // amontonadas en un rincón fijo del mundo.
      const gallina0 = container.querySelector('group[name="gallina-0"]');
      expect(gallina0.getAttribute('position')).toBe('-5.2,0.2,-2.2');
    });

    test('tocar "2. Traslado" mueve el tractor y las gallinas a la nueva parcela, y la activa cambia', () => {
      const { container } = render(<MundoGallinero3D />);
      fireEvent.click(screen.getByRole('button', { name: /2. Traslado/i }));

      const parcelaPastoreo = container.querySelector('mesh[name="parcela-pastoreo"]');
      const parcelaTraslado = container.querySelector('mesh[name="parcela-traslado"]');
      // La activa ahora es traslado (levantada); pastoreo vuelve a su altura de reposo.
      expect(parcelaTraslado.getAttribute('position')).toBe('0,0.05,-1.8');
      expect(parcelaPastoreo.getAttribute('position')).toBe('-4.2,0.01,-1.8');

      const tractor = container.querySelector('group[name="tractor-gallinas"]');
      expect(tractor.getAttribute('position')).toBe('0,0.25,-1.8');

      const gallina0 = container.querySelector('group[name="gallina-0"]');
      expect(gallina0.getAttribute('position')).toBe('-1,0.2,-2.2');
    });

    test('tocar "4. Huerto aliado" lleva el tractor y las gallinas a esa parcela (distinta de las otras tres)', () => {
      const { container } = render(<MundoGallinero3D />);
      fireEvent.click(screen.getByRole('button', { name: /4. Huerto aliado/i }));

      const tractor = container.querySelector('group[name="tractor-gallinas"]');
      expect(tractor.getAttribute('position')).toBe('4.2,0.25,2.6');

      const gallina0 = container.querySelector('group[name="gallina-0"]');
      expect(gallina0.getAttribute('position')).toBe('3.2,0.2,2.2');
    });
  });
});
