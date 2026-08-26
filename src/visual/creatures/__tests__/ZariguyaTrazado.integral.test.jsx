/**
 * ZariguyaTrazado.integral.test.jsx — la SKIN definitiva de la zarigüeya del
 * compai (ZariguyaTrazado, la lámina AUTO-TRAZADA a tinta sobre huesos;
 * decisión operador 2026-08-25) repunteada en las superficies DATA-DRIVEN:
 *   · el registro CREATURES.zariguya (selector/roster/cédula vía useAvatarCreature)
 *   · el avatar 2D del agente (ChagraAgentAvatarZariguya → FAB/chat/header)
 *
 * Reemplaza al SET GEMINI (rechazado, y con el bug de saltar a un primer-plano
 * de SOLO la cabeza en algunos estados). El trazado renderiza SIEMPRE el mismo
 * cuerpo entero (un solo <div data-creature="zariguya"> con clip-regiones): el
 * test de "cuerpo entero" abajo fija esa regresión — jamás un nodo raíz
 * distinto (close-up) según el estado.
 *
 * jsdom no trae SVG-render real: se cubre el CONTRATO observable (root
 * accesible, estado/marcha/visema que viajan, botón accesible, presencia
 * aditiva), no la calidad del trazo. La verificación visual del skin, el
 * cuerpo-entero-sin-salto y el teletransporte místico (valle) van por
 * GPU-capture aparte.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ZariguyaTrazado from '../ZariguyaTrazado.jsx';
import { CREATURES } from '../index.js';
import { resolveAvatarCreature } from '../../../hooks/useAvatarCreature.js';
import ChagraAgentAvatarZariguya from '../../../components/ChagraAgentAvatarZariguya.jsx';

afterEach(cleanup);

describe('Repoint de la zarigüeya → ZariguyaTrazado (registro data-driven)', () => {
  it('CREATURES.zariguya usa ZariguyaTrazado (ya no la lámina/Gemini)', () => {
    expect(CREATURES.zariguya.Component).toBe(ZariguyaTrazado);
    expect(CREATURES.zariguya.cientifico).toBe('Didelphis marsupialis');
  });

  it('useAvatarCreature (cédula/roster/selector) resuelve zariguya → ZariguyaTrazado', () => {
    expect(resolveAvatarCreature('zariguya').Component).toBe(ZariguyaTrazado);
  });
});

describe('ZariguyaTrazado — contrato de skin', () => {
  it('root accesible: div role=img, data-creature=zariguya', () => {
    const { container } = render(<ZariguyaTrazado />);
    const raiz = container.querySelector('div[data-creature="zariguya"]');
    expect(raiz).toBeInTheDocument();
    expect(raiz).toHaveAttribute('role', 'img');
  });

  it('estado por defecto idle; data-agt-estado refleja el prop', () => {
    const { container } = render(<ZariguyaTrazado />);
    expect(container.querySelector('[data-creature="zariguya"]')).toHaveAttribute('data-agt-estado', 'idle');
  });

  it("estado 'caminando' viaja (activa la marcha en zariguyaHuesos.css)", () => {
    const { container } = render(<ZariguyaTrazado estado="caminando" />);
    expect(container.querySelector('[data-creature="zariguya"]')).toHaveAttribute('data-agt-estado', 'caminando');
  });

  it('FASE 1 no renderiza raster de pose ni atributos de swap', () => {
    const { container } = render(<ZariguyaTrazado estado="thinking" />);
    const raiz = container.querySelector('[data-creature="zariguya"]');
    expect(raiz).not.toHaveAttribute('data-pose');
    expect(raiz.querySelectorAll('[data-pose]')).toHaveLength(0);
    expect(raiz.querySelectorAll('.zt-pose')).toHaveLength(0);
    // El único raster permitido en FASE 1 es el calco base de la piel trazada.
    expect(raiz.querySelectorAll('#ztCalco image')).toHaveLength(1);
    expect(raiz.querySelectorAll('image')).toHaveLength(1);
  });

  it('visema viaja como data-visema; sin visema, ausente', () => {
    const { container: con } = render(<ZariguyaTrazado visema="V2" />);
    expect(con.querySelector('[data-creature="zariguya"]')).toHaveAttribute('data-visema', 'V2');
    const { container: sin } = render(<ZariguyaTrazado />);
    expect(sin.querySelector('[data-creature="zariguya"]')).not.toHaveAttribute('data-visema');
  });

  it('onClick envuelve en button accesible', () => {
    let n = 0;
    render(<ZariguyaTrazado onClick={() => { n += 1; }} title="Zarigüeya (chucha)" />);
    fireEvent.click(screen.getByRole('button', { name: 'Zarigüeya (chucha)' }));
    expect(n).toBe(1);
  });

  it('CUERPO ENTERO en TODOS los estados: un solo root data-creature=zariguya, jamás un close-up de cabeza', () => {
    // Regresión del bug Gemini (hover → primer-plano de solo la cabeza). El
    // trazado es UN dibujo articulado por clip-regiones: el nodo raíz (y el
    // markup del cuerpo) es el mismo en cada estado, nunca cambia a un nodo
    // distinto de "solo cabeza".
    for (const estado of ['idle', 'thinking', 'speaking', 'listening', 'caminando']) {
      const { container, unmount } = render(<ZariguyaTrazado estado={estado} />);
      const raices = container.querySelectorAll('[data-creature="zariguya"]');
      expect(raices.length).toBe(1); // un solo cuerpo, no un swap a close-up
      expect(raices[0].tagName.toLowerCase()).toBe('div');
      expect(raices[0]).toHaveAttribute('role', 'img');
      unmount();
    }
  });
});

describe('ChagraAgentAvatarZariguya — el agente 2D usa la skin trazada', () => {
  it('renderiza ZariguyaTrazado (div data-creature=zariguya, role=img)', () => {
    const { container } = render(<ChagraAgentAvatarZariguya state="idle" />);
    const raiz = container.querySelector('div[data-creature="zariguya"]');
    expect(raiz).toBeInTheDocument();
    expect(raiz).toHaveAttribute('role', 'img');
  });

  it("state='speaking' pasa visema (lip-sync) a la skin", () => {
    const { container } = render(<ChagraAgentAvatarZariguya state="speaking" />);
    expect(container.querySelector('[data-creature="zariguya"]')).toHaveAttribute('data-visema', 'V2');
  });

  it('reaccionaPresencia es ADITIVA: sin handlers no fuerza un button', () => {
    const { container } = render(<ChagraAgentAvatarZariguya state="idle" reaccionaPresencia />);
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('div[data-creature="zariguya"]')).toBeInTheDocument();
  });

  it('con handlers, la presencia viaja por el botón (hover directo) sin romperlo', () => {
    render(<ChagraAgentAvatarZariguya state="idle" reaccionaPresencia onClick={() => {}} ariaLabel="Zarigüeya" />);
    const boton = screen.getByRole('button', { name: 'Zarigüeya' });
    fireEvent.pointerEnter(boton);
    expect(boton).toBeInTheDocument();
  });
});
