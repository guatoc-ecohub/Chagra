import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  Html: ({ children }) => <div data-testid="html-billboard">{children}</div>,
  OrbitControls: () => null,
}));

vi.mock('../../visual/mundo3d/ParticulasAmbientales.jsx', () => ({
  ParticulasAmbientales: () => null,
}));

vi.mock('../../visual/mundo3d/deviceTier.js', () => ({
  decidirTier: () => ({ tier: 'alto', reducedMotion: false }),
  perfilDeTier: () => ({ dpr: 1, antialias: false }),
}));

import MundoGallinero3D from '../MundoGallinero3D.jsx';

afterEach(cleanup);

describe('MundoGallinero3D', () => {
  test('presenta el ciclo completo y monta su propio Canvas', () => {
    render(<MundoGallinero3D onBack={() => {}} />);
    expect(screen.getByRole('heading', { name: 'El gallinero que camina' })).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-lista', 'true');
    expect(screen.getByRole('list', { name: 'Ciclo del pastoreo rotativo' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Ciclo del pastoreo rotativo' })).getAllByRole('button')).toHaveLength(4);
    expect(screen.getByText(/evita el sobrepastoreo/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('html-billboard')).toHaveLength(8);
    expect(screen.getAllByLabelText('Gallina criolla')).toHaveLength(8);
  });

  test('explica la regeneracion y permite volver al host', () => {
    const onBack = vi.fn();
    render(<MundoGallinero3D onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /3. Descanso/i }));
    expect(screen.getByRole('status')).toHaveTextContent('absorbe el abono y se regenera');
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
