import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Lib3D, { CANONICAL_VALLE_URL } from '../Lib3D.jsx';

afterEach(cleanup);

describe('Lib3D', () => {
  test('monta el Valle canónico en un iframe', () => {
    render(<Lib3D />);

    expect(screen.getByTitle('Valle canónico en 3D')).toHaveAttribute('src', CANONICAL_VALLE_URL);
    expect(screen.getByTestId('lib3d-bridge')).toBeInTheDocument();
  });

  test('oculta su estado de carga cuando el iframe termina', () => {
    render(<Lib3D />);
    const frame = screen.getByTitle('Valle canónico en 3D');

    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.load(frame);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('expone el retorno al shell de la PWA', () => {
    const onBack = vi.fn();
    render(<Lib3D onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
