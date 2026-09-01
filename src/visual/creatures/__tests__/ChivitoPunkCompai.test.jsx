import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChagraAgentAvatarChivitoPunk from '../../../components/ChagraAgentAvatarChivitoPunk.jsx';

afterEach(cleanup);

const ESTADOS = [
  ['acompana', 'vuela'], ['escuchando', 'reposo'], ['pensando', 'vuela'],
  ['respondiendo', 'vuela'], ['contenta', 'celebra'], ['preocupada', 'vuela'],
  ['no-se', 'vuela'], ['senala', 'señala'], ['invita', 'vuela'],
  ['husmea', 'vuela'], ['caminando', 'vuela'],
];

describe('ChagraAgentAvatarChivitoPunk — contrato Compai', () => {
  it.each(ESTADOS)('estado %s conserva la pose física %s', (estado, pose) => {
    const { container } = render(
      <ChagraAgentAvatarChivitoPunk estado={estado} reaccionaPresencia={false} />,
    );
    const raiz = container.querySelector('svg[data-creature="chivito-punk"]');
    expect(raiz).toHaveAttribute('data-agt-estado', estado);
    expect(raiz).toHaveAttribute('data-pose', pose);
    expect(raiz).not.toHaveAttribute('data-creature', 'chivito');
  });

  it('caminando resuelve vuelo y conserva el rig F24 inlineado', () => {
    const { container } = render(
      <ChagraAgentAvatarChivitoPunk estado="caminando" reaccionaPresencia={false} />,
    );
    const raiz = container.querySelector('svg[data-creature="chivito-punk"]');
    expect(raiz).toHaveAttribute('data-pose', 'vuela');
    expect(raiz.querySelector('[id*="chivitoWrap"]')).toBeInTheDocument();
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
    const raiz = container.querySelector('svg[data-creature="chivito-punk"]');
    expect(raiz).toHaveAttribute('data-visema', 'V4');
    expect(raiz).toHaveAttribute('data-clima', 'niebla');
    expect(raiz).toHaveAttribute('data-tier', 'bajo');
  });
});
