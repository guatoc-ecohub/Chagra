import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';

vi.mock('../useAudioMundo.js', () => ({
  default: () => {},
}));

vi.mock('../useFincaViva.js', () => ({
  default: () => ({ animales: [], cosechaReciente: [], saludFinca: 'buena' }),
}));

vi.mock('../InvitacionAudioMundo.jsx', () => ({
  default: () => null,
}));

vi.mock('../escenas/EscenaCafe.jsx', () => ({
  default: () => null,
}));

import Mundo from '../Mundo.jsx';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('<Mundo> integra PasosMundo en mundos 3D', () => {
  test('el cafe monta la tarjeta la primera vez y luego la recuerda', async () => {
    const { rerender } = render(
      <Mundo mundoId="cafe" tier="alto" onHotspot={() => {}} onSalir={() => {}} />,
    );

    expect(await screen.findByRole('dialog')).toHaveTextContent('El cafe');
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(<Mundo mundoId="cafe" tier="alto" onHotspot={() => {}} onSalir={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver pasos de El cafe' })).toBeInTheDocument();
  });
});
