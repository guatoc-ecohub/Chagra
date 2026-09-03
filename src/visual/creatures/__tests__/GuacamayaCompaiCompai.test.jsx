import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChagraAgentAvatarGuacamaya from '../../../components/ChagraAgentAvatarGuacamaya.jsx';

afterEach(cleanup);

const ESTADOS = [
  ['acompana', 'vuela', 'idle'], ['escuchando', 'reposo', 'idle'],
  ['pensando', 'vuela', 'idle'], ['respondiendo', 'vuela', 'hablar'],
  ['contenta', 'celebra', 'sana'], ['preocupada', 'vuela', 'amenaza'],
  ['no-se', 'vuela', 'idle'], ['senala', 'señala', 'senalar'],
  ['invita', 'vuela', 'pacto'], ['husmea', 'vuela', 'dispersar'],
  ['caminando', 'vuela', 'idle'],
];

describe('ChagraAgentAvatarGuacamaya — contrato Compai', () => {
  it.each(ESTADOS)('estado %s conserva pose %s y rig %s', (estado, pose, rigEstado) => {
    const { container } = render(
      <ChagraAgentAvatarGuacamaya estado={estado} reaccionaPresencia={false} />,
    );
    const raiz = container.querySelector('svg[data-creature="guacamaya"]');
    expect(raiz).toHaveAttribute('data-agt-estado', estado);
    expect(raiz).toHaveAttribute('data-pose', pose);
    expect(raiz).toHaveAttribute('data-estado', rigEstado);
  });

  it('caminando significa vuelo y conserva el rig F24 completo', () => {
    const { container } = render(
      <ChagraAgentAvatarGuacamaya estado="caminando" reaccionaPresencia={false} />,
    );
    const raiz = container.querySelector('svg[data-creature="guacamaya"]');
    expect(raiz.querySelector('g.guaca-rig')).toBeInTheDocument();
    expect(raiz).toHaveAttribute('data-pose', 'vuela');
    expect(raiz).toHaveAttribute('data-creature', 'guacamaya');
  });

  it('forwardea visema, clima y tier al rig sin cambiar el slug', () => {
    const { container } = render(
      <ChagraAgentAvatarGuacamaya
        estado="respondiendo"
        visema="V3"
        clima="noche"
        tier="medio"
        reaccionaPresencia={false}
      />,
    );
    const raiz = container.querySelector('svg[data-creature="guacamaya"]');
    expect(raiz).toHaveAttribute('data-visema', 'V3');
    expect(raiz).toHaveAttribute('data-clima', 'noche');
    expect(raiz).toHaveAttribute('data-tier', 'medio');
  });
});
