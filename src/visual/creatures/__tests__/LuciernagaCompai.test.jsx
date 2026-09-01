import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChagraAgentAvatarLuciernaga from '../../../components/ChagraAgentAvatarLuciernaga.jsx';

afterEach(cleanup);

const ESTADOS = [
  ['acompana', 'normal'], ['escuchando', 'normal'], ['pensando', 'fuerte'],
  ['respondiendo', 'fuerte'], ['contenta', 'normal'], ['preocupada', 'normal'],
  ['no-se', 'normal'], ['senala', 'normal'], ['invita', 'normal'],
  ['husmea', 'normal'], ['caminando', 'normal'],
];

describe('ChagraAgentAvatarLuciernaga — contrato Compai', () => {
  it.each(ESTADOS)('estado %s conserva la linterna %s', (estado, linterna) => {
    const { container } = render(
      <ChagraAgentAvatarLuciernaga estado={estado} reaccionaPresencia={false} />,
    );
    const raiz = container.querySelector('[data-creature="luciernaga"]');
    expect(raiz).toHaveAttribute('data-agt-estado', estado);
    expect(raiz).toHaveAttribute('data-linterna', linterna);
    expect(raiz.querySelector('svg')).toBeInTheDocument();
  });

  it('caminando usa vuelo y conserva la firma luminosa del escarabajo', () => {
    const { container } = render(
      <ChagraAgentAvatarLuciernaga estado="caminando" reaccionaPresencia={false} />,
    );
    const raiz = container.querySelector('[data-creature="luciernaga"]');
    expect(raiz).toHaveAttribute('data-creature', 'luciernaga');
    expect(raiz).toHaveAttribute('data-linterna', 'normal');
    expect(raiz.querySelectorAll('path').length).toBeGreaterThan(100);
  });

  it('forwardea visema y clima al rig sin perder la paleta', () => {
    const { container } = render(
      <ChagraAgentAvatarLuciernaga
        estado="respondiendo"
        visema="V3"
        clima="lluvia"
        tier="medio"
        reaccionaPresencia={false}
      />,
    );
    const raiz = container.querySelector('[data-creature="luciernaga"]');
    expect(raiz).toHaveAttribute('data-visema', 'V3');
    expect(raiz).toHaveAttribute('data-clima', 'lluvia');
    expect(raiz).toHaveAttribute('data-tier', 'medio');
  });
});
