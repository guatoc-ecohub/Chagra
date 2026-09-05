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
import { JAGUAR_TRAZADO_SVG, TARJETA_MAX_PX } from '../jaguarTrazado/pielTrazado.js';
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
});

describe('JaguarTrazado — ROSETAS DE TARJETA (defecto TIGRE a 64 px, medido 2026-09-04/05)', () => {
  it('a tamaño de tarjeta (≤ TARJETA_MAX_PX) la raíz lleva data-tarjeta; a 560 px no', () => {
    expect(TARJETA_MAX_PX).toBe(96);
    const { container: chica } = render(<JaguarTrazado size={64} />);
    expect(chica.querySelector('[data-creature="jaguar"]')).toHaveAttribute('data-tarjeta');
    const { container: fab } = render(<JaguarTrazado size={82} />);
    expect(fab.querySelector('[data-creature="jaguar"]')).toHaveAttribute('data-tarjeta');
    const { container: grande } = render(<JaguarTrazado size={560} />);
    expect(grande.querySelector('[data-creature="jaguar"]')).not.toHaveAttribute('data-tarjeta');
  });

  it('la capa jt-tarjeta trae SEIS rosetas discretas con punto adentro y el fondo del propio calco fuera de foco', () => {
    const { container } = render(<JaguarTrazado size={64} />);
    const capas = container.querySelectorAll('.jt-tarjeta');
    expect(capas).toHaveLength(1);
    const rosetas = capas[0].querySelectorAll('.jt-roseta');
    expect(rosetas).toHaveLength(6);
    rosetas.forEach((r) => {
      // anillo de manchas (≥ 5 elipses + la interior) y el punto de adentro
      expect(r.querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(6);
      expect(r.querySelector('circle')).toBeTruthy();
    });
    // el fondo es el MISMO calco del tronco (ningún parche nuevo), fuera de foco
    const fondo = capas[0].querySelector('use[filter="url(#jtTarjetaFondo)"]');
    expect(fondo).toBeTruthy();
    expect(fondo).toHaveAttribute('href', '#jtCalco-troncoCuerpo');
  });

  it('la capa viaja OCULTA por su propia regla <style> (hosts sin React ni CSS incluidos) y solo data-tarjeta la enciende', () => {
    expect(JAGUAR_TRAZADO_SVG).toContain('<style>.jt-tarjeta{display:none}[data-tarjeta] .jt-tarjeta{display:inline}</style>');
  });

  it('el avatar 2D del agente a 64 px (tarjeta del selector) enciende data-tarjeta sobre la MISMA piel trazada', () => {
    const { container } = render(<ChagraAgentAvatarJaguar state="idle" size={64} reaccionaPresencia={false} />);
    const raiz = container.querySelector('div[data-creature="jaguar"]');
    expect(raiz).toHaveClass('jaguarTrazado');
    expect(raiz).toHaveAttribute('data-tarjeta');
    expect(raiz.querySelector('.jt-tarjeta .jt-roseta')).toBeTruthy();
  });
});
