import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import Caida3DBoundary from '../Caida3DBoundary.jsx';

/**
 * Escena falsa que siempre se cae al renderizar. Nunca retorna: por eso el
 * tipo es `never` (un `() => void` no es un componente JSX válido, TS2786).
 *
 * @returns {never}
 */
function EscenaConChunkRechazado() {
  throw new Error('No se pudo cargar el chunk de la escena');
}

describe('Caida3DBoundary', () => {
  it('convierte una escena 3D rechazada en la señal de caída al gemelo 2D', async () => {
    const onCaida = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { container } = render(
      <Caida3DBoundary onCaida={onCaida}>
        <EscenaConChunkRechazado />
      </Caida3DBoundary>
    );

    await waitFor(() => expect(onCaida).toHaveBeenCalledTimes(1));
    expect(container).toBeEmptyDOMElement();
    consoleError.mockRestore();
  });
});
