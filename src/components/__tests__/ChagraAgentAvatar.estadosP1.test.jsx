import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ChagraAgentAvatar from '../ChagraAgentAvatar.jsx';

const ELENCO = [
  'angelita',
  'jaguar',
  'oso-baston',
  'zariguya',
  'luciernaga',
  'chivito-punk',
  'guacamaya',
];

const ESTADOS_RICOS = ['preocupada', 'no-se', 'senala', 'husmea', 'caminando'];

function elegir(especie) {
  localStorage.setItem('compai:companero', especie);
  localStorage.setItem('chagra:agent-avatar-type', especie);
}

function rig(container) {
  return container.querySelector('[data-agt-estado][data-pose]');
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('ChagraAgentAvatar — P1 estados ricos por especie', () => {
  for (const especie of ELENCO) {
    it(`${especie} conserva estado, pose y visema en su rig`, () => {
      elegir(especie);
      const { container } = render(
        <ChagraAgentAvatar estado="respondiendo" visema="V3" reaccionaPresencia={false} />,
      );
      const nodo = rig(container);
      expect(nodo).toBeInTheDocument();
      expect(nodo).toHaveAttribute('data-agt-estado', 'respondiendo');
      expect(nodo).toHaveAttribute('data-pose');
      expect(nodo).toHaveAttribute('data-visema', 'V3');
    });
  }

  it('un estado que antes se degradaba permanece visible en los siete rigs', () => {
    for (const especie of ELENCO) {
      elegir(especie);
      const { container, unmount } = render(
        <ChagraAgentAvatar estado="preocupada" reaccionaPresencia={false} />,
      );
      expect(rig(container)).toHaveAttribute('data-agt-estado', 'preocupada');
      unmount();
    }
  });

  it('entrega los cinco estados ricos críticos a los siete adaptadores', () => {
    for (const especie of ELENCO) {
      elegir(especie);
      for (const estado of ESTADOS_RICOS) {
        const { container, unmount } = render(
          <ChagraAgentAvatar estado={estado} reaccionaPresencia={false} />,
        );
        expect(rig(container)).toHaveAttribute('data-agt-estado', estado);
        unmount();
      }
    }
  });
});
