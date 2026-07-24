import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useFrame } from '@react-three/fiber';

const threeMock = vi.hoisted(() => {
  const vector = (x, y, z) => ({
    x,
    y,
    z,
    clone() {
      return vector(this.x, this.y, this.z);
    },
    lerpVectors(desde, hacia, t) {
      this.x = desde.x + (hacia.x - desde.x) * t;
      this.y = desde.y + (hacia.y - desde.y) * t;
      this.z = desde.z + (hacia.z - desde.z) * t;
      return this;
    },
  });
  return {
    camera: { position: vector(11, 8.5, 12) },
    vector,
  };
});

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, onCreated, ...props }) => {
    React.useEffect(() => onCreated?.(), [onCreated]);
    return <div data-testid="canvas" {...props}>{children}</div>;
  },
  useFrame: vi.fn(),
  useThree: () => ({ camera: threeMock.camera }),
}));

vi.mock('@react-three/drei', () => ({
  AdaptiveDpr: () => null,
  OrbitControls: React.forwardRef(function OrbitControls(_, ref) {
    React.useImperativeHandle(ref, () => ({
      target: threeMock.vector(0, 0.5, 0),
      update: vi.fn(),
    }));
    return null;
  }),
}));

vi.mock('../../visual/mundo3d/ParticulasAmbientales.jsx', () => ({
  ParticulasAmbientales: () => null,
}));

import MundoGallinero3D from '../MundoGallinero3D.jsx';

afterEach(cleanup);

beforeEach(() => {
  threeMock.camera.position = threeMock.vector(11, 8.5, 12);
  vi.mocked(useFrame).mockClear();
});

describe('MundoGallinero3D', () => {
  test('presenta el ciclo completo y monta su propio Canvas', () => {
    render(<MundoGallinero3D onBack={() => {}} />);
    expect(screen.getByRole('heading', { name: 'El gallinero que camina' })).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-lista', 'true');
    expect(screen.getByRole('list', { name: 'Ciclo del pastoreo rotativo' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Ciclo del pastoreo rotativo' }).getElementsByTagName('button')).toHaveLength(4);
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

  test('lleva la camara a la parcela elegida en el ciclo', () => {
    render(<MundoGallinero3D onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /3. Descanso/i }));

    const [callback] = vi.mocked(useFrame).mock.calls.at(-1);
    callback({ clock: { elapsedTime: 0 } }, 1.1);

    expect(screen.getByTestId('canvas')).toHaveAttribute('data-paso', 'descanso');
    expect(threeMock.camera.position).toMatchObject({ x: 10.2, y: 5.1, z: 5.8 });
  });
});
