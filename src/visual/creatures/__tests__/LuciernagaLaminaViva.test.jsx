/**
 * LuciernagaLaminaViva.test.jsx — la luciérnaga como LÁMINA aprobada
 * recortada en capas con la vida de Angelita/el jaguar
 * (`feat/luciernaga-lamina-viva`). jsdom no trae Canvas2D real, así que
 * estas pruebas cubren el CONTRATO observable (root accesible, degradación
 * a la lámina plana, props que viajan) — la calidad del recorte vive en
 * `luciernagaLamina/__tests__/capas.test.js` y en el gate 2.5D DOM.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LuciernagaLaminaViva from '../LuciernagaLaminaViva.jsx';

afterEach(cleanup);

describe('LuciernagaLaminaViva — contrato base', () => {
  it('root accesible: role=img, data-creature=luciernaga', () => {
    const { container } = render(<LuciernagaLaminaViva />);
    const raiz = container.querySelector('[data-creature="luciernaga"]');
    expect(raiz).toBeInTheDocument();
    expect(raiz).toHaveAttribute('role', 'img');
  });

  it('sin canvas real (jsdom), degrada a la lámina PLANA — nunca un hueco', () => {
    const { container } = render(<LuciernagaLaminaViva />);
    const img = container.querySelector('img[src*="luciernaga.png"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });

  it('data-agt-estado refleja el prop estado', () => {
    const { container } = render(<LuciernagaLaminaViva estado="listening" />);
    expect(container.querySelector('[data-creature="luciernaga"]')).toHaveAttribute('data-agt-estado', 'listening');
  });

  it('estado por defecto es "idle"', () => {
    const { container } = render(<LuciernagaLaminaViva />);
    expect(container.querySelector('[data-creature="luciernaga"]')).toHaveAttribute('data-agt-estado', 'idle');
  });

  it('visema viaja como data-visema; sin visema, el atributo no está', () => {
    const { container: conVisema } = render(<LuciernagaLaminaViva visema="V2" />);
    expect(conVisema.querySelector('[data-creature="luciernaga"]')).toHaveAttribute('data-visema', 'V2');

    const { container: sinVisema } = render(<LuciernagaLaminaViva visema={null} />);
    expect(sinVisema.querySelector('[data-creature="luciernaga"]')).not.toHaveAttribute('data-visema');
  });

  it('title custom se usa como aria-label', () => {
    const { container } = render(<LuciernagaLaminaViva title="Luciérnaga del valle" />);
    expect(container.querySelector('[data-creature="luciernaga"]')).toHaveAttribute('aria-label', 'Luciérnaga del valle');
  });

  it('sin onClick ni onDoubleClick no envuelve en button', () => {
    const { container } = render(<LuciernagaLaminaViva />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('con onDoubleClick envuelve en button real y dispara el handler', () => {
    let llamadas = 0;
    render(<LuciernagaLaminaViva onDoubleClick={() => { llamadas += 1; }} />);
    const btn = screen.getByRole('button');
    fireEvent.doubleClick(btn);
    expect(llamadas).toBe(1);
  });

  it('respeta el tamaño via prop size', () => {
    const { container } = render(<LuciernagaLaminaViva size={96} />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="luciernaga"]'));
    expect(raiz.style.width).toBe('96px');
    expect(raiz.style.height).toBe('96px');
  });

  it('animated=false no rompe el render (fotograma quieto)', () => {
    const { container } = render(<LuciernagaLaminaViva animated={false} />);
    expect(container.querySelector('[data-creature="luciernaga"]')).toBeInTheDocument();
  });

  it('style custom (glow del adaptador) se aplica a la raíz', () => {
    const { container } = render(<LuciernagaLaminaViva style={{ filter: 'drop-shadow(0 0 10px rgba(199,255,78,0.65))' }} />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="luciernaga"]'));
    expect(raiz.style.filter).toContain('drop-shadow');
  });
});

describe('LuciernagaLaminaViva — la VIDA (hooks de Angelita cableados)', () => {
  it('el ritmo propio viaja como vars CSS (parpadeo por instancia, anti-metrónomo)', () => {
    const { container } = render(<LuciernagaLaminaViva />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="luciernaga"]'));
    expect(raiz.style.getPropertyValue('--rh-blink-dur')).toMatch(/s$/);
    expect(raiz.style.getPropertyValue('--rh-blink-delay')).toMatch(/s$/);
  });

  it('el visema fija el nivel de apertura del mentón (--llv-jaw) para el lip-sync', () => {
    const { container: cerrada } = render(<LuciernagaLaminaViva />);
    const raizCerrada = /** @type {HTMLElement} */ (cerrada.querySelector('[data-creature="luciernaga"]'));
    expect(raizCerrada.style.getPropertyValue('--llv-jaw')).toBe('0');

    const { container: hablando } = render(<LuciernagaLaminaViva visema="V3" />);
    // V3 (boca abierta amplia) → mentón totalmente abajo.
    const raizHablando = /** @type {HTMLElement} */ (hablando.querySelector('[data-creature="luciernaga"]'));
    expect(raizHablando.style.getPropertyValue('--llv-jaw')).toBe('1');
  });

  it('eco (la linterna como bioindicador — la firma de Luciernaga.jsx) viaja como data-eco', () => {
    const { container } = render(<LuciernagaLaminaViva eco="degradado" />);
    expect(container.querySelector('[data-creature="luciernaga"]')).toHaveAttribute('data-eco', 'degradado');

    const { container: sinEco } = render(<LuciernagaLaminaViva />);
    expect(sinEco.querySelector('[data-creature="luciernaga"]')).not.toHaveAttribute('data-eco');
  });

  it('tier viaja como data-tier (gama baja apaga lo continuo; la linterna sigue)', () => {
    const { container } = render(<LuciernagaLaminaViva tier="bajo" />);
    expect(container.querySelector('[data-creature="luciernaga"]')).toHaveAttribute('data-tier', 'bajo');
  });

  it('acepta el estado "caminando" (roaming) sin romper el contrato', () => {
    const { container } = render(<LuciernagaLaminaViva estado="caminando" />);
    expect(container.querySelector('[data-creature="luciernaga"]')).toHaveAttribute('data-agt-estado', 'caminando');
  });
});
