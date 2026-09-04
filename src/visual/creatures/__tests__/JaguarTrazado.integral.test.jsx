/**
 * JaguarTrazado.integral.test.jsx — la SKIN definitiva del jaguar del compai
 * (JaguarTrazado, la lámina AUTO-TRAZADA a tinta; decisión operador 2026-08-24)
 * repunteada en las superficies DATA-DRIVEN:
 *   · el registro CREATURES.jaguar (selector/roster/cédula vía useAvatarCreature)
 *   · el avatar 2D del agente (ChagraAgentAvatarJaguar → FAB/chat/header)
 *
 * jsdom no trae Canvas/SVG-render real: se cubre el CONTRATO observable (root
 * accesible, estado/marcha/visema que viajan, el botón accesible, la presencia
 * additiva), no la calidad del trazo. La verificación visual del skin y del
 * teletransporte místico (valle/kart) va por GPU-capture aparte.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import JaguarTrazado from '../JaguarTrazado.jsx';
import { CREATURES } from '../index.js';
import { resolveAvatarCreature } from '../../../hooks/useAvatarCreature.js';
import ChagraAgentAvatarJaguar from '../../../components/ChagraAgentAvatarJaguar.jsx';

afterEach(cleanup);

describe('Repoint del jaguar → JaguarTrazado (registro data-driven)', () => {
  it('CREATURES.jaguar usa JaguarTrazado (ya no la lámina raster)', () => {
    expect(CREATURES.jaguar.Component).toBe(JaguarTrazado);
    expect(CREATURES.jaguar.cientifico).toBe('Panthera onca');
  });

  it('useAvatarCreature (cédula/roster/selector) resuelve jaguar → JaguarTrazado', () => {
    expect(resolveAvatarCreature('jaguar').Component).toBe(JaguarTrazado);
  });
});

describe('JaguarTrazado — contrato de skin', () => {
  it('root accesible: div role=img, data-creature=jaguar', () => {
    const { container } = render(<JaguarTrazado />);
    const raiz = container.querySelector('div[data-creature="jaguar"]');
    expect(raiz).toBeInTheDocument();
    expect(raiz).toHaveAttribute('role', 'img');
  });

  it('estado por defecto idle; data-agt-estado refleja el prop', () => {
    const { container } = render(<JaguarTrazado />);
    expect(container.querySelector('[data-creature="jaguar"]')).toHaveAttribute('data-agt-estado', 'idle');
  });

  it("estado 'caminando' viaja (activa la marcha de perfil en jaguarHuesos.css)", () => {
    const { container } = render(<JaguarTrazado estado="caminando" />);
    expect(container.querySelector('[data-creature="jaguar"]')).toHaveAttribute('data-agt-estado', 'caminando');
  });

  it('visema viaja como data-visema; sin visema, ausente', () => {
    const { container: con } = render(<JaguarTrazado visema="V2" />);
    expect(con.querySelector('[data-creature="jaguar"]')).toHaveAttribute('data-visema', 'V2');
    const { container: sin } = render(<JaguarTrazado />);
    expect(sin.querySelector('[data-creature="jaguar"]')).not.toHaveAttribute('data-visema');
  });

  it('onClick envuelve en button accesible', () => {
    let n = 0;
    render(<JaguarTrazado onClick={() => { n += 1; }} title="Jaguar" />);
    fireEvent.click(screen.getByRole('button', { name: 'Jaguar' }));
    expect(n).toBe(1);
  });
});

describe('ChagraAgentAvatarJaguar — el agente 2D usa la skin trazada', () => {
  it('renderiza JaguarTrazado (div data-creature=jaguar, role=img)', () => {
    const { container } = render(<ChagraAgentAvatarJaguar state="idle" />);
    const raiz = container.querySelector('div[data-creature="jaguar"]');
    expect(raiz).toBeInTheDocument();
    expect(raiz).toHaveAttribute('role', 'img');
  });

  it("state='speaking' pasa visema (lip-sync) a la skin", () => {
    const { container } = render(<ChagraAgentAvatarJaguar state="speaking" />);
    expect(container.querySelector('[data-creature="jaguar"]')).toHaveAttribute('data-visema', 'V2');
  });

  it('reaccionaPresencia es ADITIVA: sin handlers no fuerza un button', () => {
    const { container } = render(<ChagraAgentAvatarJaguar state="idle" reaccionaPresencia />);
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('div[data-creature="jaguar"]')).toBeInTheDocument();
  });

  it.each([
    ['acompana', 'anda'], ['escuchando', 'reposo'], ['pensando', 'anda'],
    ['respondiendo', 'anda'], ['contenta', 'celebra'], ['preocupada', 'anda'],
    ['no-se', 'anda'], ['senala', 'señala'], ['invita', 'anda'], ['husmea', 'anda'],
  ])('estado rico %s conserva la pose del registro %s', (estado, pose) => {
    const { container } = render(<ChagraAgentAvatarJaguar estado={estado} reaccionaPresencia={false} />);
    const raiz = container.querySelector('div[data-creature="jaguar"]');
    expect(raiz).toHaveAttribute('data-agt-estado', estado);
    expect(raiz).toHaveAttribute('data-pose', pose);
  });

  it('caminando conserva dos frames del gait cuadrúpedo en el mismo rig', () => {
    const { container } = render(
      <ChagraAgentAvatarJaguar estado="caminando" reaccionaPresencia={false} />,
    );
    const raiz = container.querySelector('div[data-creature="jaguar"]');
    expect(raiz).toHaveAttribute('data-pose', 'camina');
    expect(raiz.querySelector('.jh-pataDelCerca')).toBeInTheDocument();
    expect(raiz.querySelector('.jh-pataDelLejos')).toBeInTheDocument();
    expect(raiz.querySelector('.jh-pataTrasCerca')).toBeInTheDocument();
    expect(raiz.querySelector('.jh-pataTrasLejos')).toBeInTheDocument();
  });

  it('a 64 px usa la piel compacta de rosetas; a 65 px conserva el trazado completo', () => {
    const { container: compacto } = render(<ChagraAgentAvatarJaguar size={64} reaccionaPresencia={false} />);
    expect(compacto.querySelector('.jaguarHuesos')).toBeInTheDocument();
    expect(compacto.querySelector('.jaguarTrazado')).not.toBeInTheDocument();
    expect(compacto.querySelector('[data-creature="jaguar"]')).toHaveAttribute('data-rosetas-compactas');

    const { container: completo } = render(<ChagraAgentAvatarJaguar size={65} reaccionaPresencia={false} />);
    expect(completo.querySelector('.jaguarTrazado')).toBeInTheDocument();
    expect(completo.querySelector('[data-creature="jaguar"]')).not.toHaveAttribute('data-rosetas-compactas');
  });
});
