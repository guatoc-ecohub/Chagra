import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChagraAgentAvatarLuciernaga from '../../../components/ChagraAgentAvatarLuciernaga.jsx';

afterEach(cleanup);

const ESTADOS = [
  ['acompana', 'vuela'], ['escuchando', 'reposo'], ['pensando', 'vuela'],
  ['respondiendo', 'vuela'], ['contenta', 'celebra'], ['preocupada', 'vuela'],
  ['no-se', 'vuela'], ['senala', 'señala'], ['invita', 'vuela'],
  ['husmea', 'vuela'], ['caminando', 'vuela'],
];

describe('ChagraAgentAvatarLuciernaga — contrato Compai', () => {
  it.each(ESTADOS)('estado %s conserva la pose física %s', (estado, pose) => {
    const { container } = render(
      <ChagraAgentAvatarLuciernaga estado={estado} reaccionaPresencia={false} />,
    );
    const raiz = container.querySelector('svg[data-creature="luciernaga"]');
    expect(raiz).toHaveAttribute('data-agt-estado', estado);
    expect(raiz).toHaveAttribute('data-pose', pose);
  });

  it('caminando usa vuelo y conserva la firma luminosa del escarabajo', () => {
    const { container } = render(
      <ChagraAgentAvatarLuciernaga estado="caminando" reaccionaPresencia={false} />,
    );
    const raiz = container.querySelector('svg[data-creature="luciernaga"]');
    expect(raiz).toHaveAttribute('data-creature', 'luciernaga');
    expect(raiz).toHaveAttribute('data-pose', 'vuela');
    expect(raiz.querySelector('.luci-linterna-core')).toBeInTheDocument();
    expect(raiz.querySelector('.luci-ala')).toBeInTheDocument();
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
    const raiz = container.querySelector('svg[data-creature="luciernaga"]');
    expect(raiz).toHaveAttribute('data-visema', 'V3');
    expect(raiz).toHaveAttribute('data-clima', 'lluvia');
    expect(raiz).toHaveAttribute('data-tier', 'medio');
  });
});
