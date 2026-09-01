import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChagraAgentAvatarChivitoPunk from '../../../components/ChagraAgentAvatarChivitoPunk.jsx';

afterEach(cleanup);

const ESTADOS = [
  ['acompana', 'normal'], ['escuchando', 'normal'], ['pensando', 'normal'],
  ['respondiendo', 'actuando'], ['contenta', 'normal'], ['preocupada', 'normal'],
  ['no-se', 'normal'], ['senala', 'normal'], ['invita', 'actuando'],
  ['husmea', 'normal'], ['caminando', 'normal'],
];

describe('ChagraAgentAvatarChivitoPunk — contrato Compai', () => {
  it.each(ESTADOS)('estado %s conserva la piel %s', (estado, modo) => {
    const { container } = render(
      <ChagraAgentAvatarChivitoPunk estado={estado} reaccionaPresencia={false} />,
    );
    const raiz = container.querySelector('[data-creature="chivito-punk"]');
    expect(raiz).toHaveAttribute('data-agt-estado', estado);
    expect(raiz).toHaveAttribute('data-modo', modo);
    expect(raiz.querySelector('svg')).toBeInTheDocument();
  });

  it('caminando resuelve vuelo y conserva el rig F24 inlineado', () => {
    const { container } = render(
      <ChagraAgentAvatarChivitoPunk estado="caminando" reaccionaPresencia={false} />,
    );
    const raiz = container.querySelector('[data-creature="chivito-punk"]');
    expect(raiz).toHaveAttribute('data-modo', 'normal');
    expect(raiz.querySelector('svg')).toBeInTheDocument();
  });

  it('forwardea visema, clima y tier al rig canónico', () => {
    const { container } = render(
      <ChagraAgentAvatarChivitoPunk
        estado="respondiendo"
        visema="V4"
        clima="niebla"
        tier="bajo"
        reaccionaPresencia={false}
      />,
    );
    const raiz = container.querySelector('[data-creature="chivito-punk"]');
    expect(raiz).toHaveAttribute('data-visema', 'V4');
    expect(raiz).toHaveAttribute('data-clima', 'niebla');
    expect(raiz).toHaveAttribute('data-tier', 'bajo');
  });
});
