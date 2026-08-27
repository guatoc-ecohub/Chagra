import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import AngelitaAvisoGlobal from '../AngelitaAvisoGlobal.jsx';
import useAngelitaStore from '../../../store/useAngelitaStore';

afterEach(cleanup);

beforeEach(() => {
  useAngelitaStore.setState({
    mensaje: 'Revise la helada de esta noche.',
    tipo: 'alerta',
  });
});

describe('AngelitaAvisoGlobal — SSOT del aviso', () => {
  it('pinta una sola burbuja con el mensaje del store', () => {
    const { container } = render(<AngelitaAvisoGlobal />);

    expect(container.querySelectorAll('.angelita-burbuja')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Revise la helada de esta noche.');
  });
});
