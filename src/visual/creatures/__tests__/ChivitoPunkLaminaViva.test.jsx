/**
 * ChivitoPunkLaminaViva.test.jsx — el chivito punk como LÁMINA aprobada
 * recortada en capas con la vida de Angelita/el jaguar/la luciérnaga
 * (`feat/chivito-punk-lamina-viva`). jsdom no trae Canvas2D real, así que
 * estas pruebas cubren el CONTRATO observable (root accesible, degradación
 * a la lámina plana, props que viajan) — la calidad del recorte vive en
 * `chivitoLamina/__tests__/capas.test.js` y en el gate 2.5D DOM.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChivitoPunkLaminaViva from '../ChivitoPunkLaminaViva.jsx';

afterEach(cleanup);

describe('ChivitoPunkLaminaViva — contrato base', () => {
  it('root accesible: role=img, data-creature=chivito-punk', () => {
    const { container } = render(<ChivitoPunkLaminaViva />);
    const raiz = container.querySelector('[data-creature="chivito-punk"]');
    expect(raiz).toBeInTheDocument();
    expect(raiz).toHaveAttribute('role', 'img');
  });

  it('sin canvas real (jsdom), degrada a la lámina PLANA — nunca un hueco', () => {
    const { container } = render(<ChivitoPunkLaminaViva />);
    const img = container.querySelector('img[src*="chivito-punk.png"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });

  it('data-agt-estado refleja el prop estado', () => {
    const { container } = render(<ChivitoPunkLaminaViva estado="listening" />);
    expect(container.querySelector('[data-creature="chivito-punk"]')).toHaveAttribute('data-agt-estado', 'listening');
  });

  it('estado por defecto es "idle"', () => {
    const { container } = render(<ChivitoPunkLaminaViva />);
    expect(container.querySelector('[data-creature="chivito-punk"]')).toHaveAttribute('data-agt-estado', 'idle');
  });

  it('visema viaja como data-visema; sin visema, el atributo no está', () => {
    const { container: conVisema } = render(<ChivitoPunkLaminaViva visema="V2" />);
    expect(conVisema.querySelector('[data-creature="chivito-punk"]')).toHaveAttribute('data-visema', 'V2');

    const { container: sinVisema } = render(<ChivitoPunkLaminaViva visema={null} />);
    expect(sinVisema.querySelector('[data-creature="chivito-punk"]')).not.toHaveAttribute('data-visema');
  });

  it('title custom se usa como aria-label', () => {
    const { container } = render(<ChivitoPunkLaminaViva title="Chivito del páramo" />);
    expect(container.querySelector('[data-creature="chivito-punk"]')).toHaveAttribute('aria-label', 'Chivito del páramo');
  });

  it('sin onClick ni onDoubleClick no envuelve en button', () => {
    const { container } = render(<ChivitoPunkLaminaViva />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('con onDoubleClick envuelve en button real y dispara el handler', () => {
    let llamadas = 0;
    render(<ChivitoPunkLaminaViva onDoubleClick={() => { llamadas += 1; }} />);
    const btn = screen.getByRole('button');
    fireEvent.doubleClick(btn);
    expect(llamadas).toBe(1);
  });

  it('respeta el tamaño via prop size', () => {
    const { container } = render(<ChivitoPunkLaminaViva size={96} />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="chivito-punk"]'));
    expect(raiz.style.width).toBe('96px');
    expect(raiz.style.height).toBe('96px');
  });

  it('animated=false no rompe el render (fotograma quieto)', () => {
    const { container } = render(<ChivitoPunkLaminaViva animated={false} />);
    expect(container.querySelector('[data-creature="chivito-punk"]')).toBeInTheDocument();
  });

  it('style custom (glow del adaptador) se aplica a la raíz', () => {
    const { container } = render(<ChivitoPunkLaminaViva style={{ filter: 'drop-shadow(0 0 10px rgba(140,70,232,0.65))' }} />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="chivito-punk"]'));
    expect(raiz.style.filter).toContain('drop-shadow');
  });
});

describe('ChivitoPunkLaminaViva — la VIDA (hooks de Angelita cableados)', () => {
  it('el ritmo propio viaja como vars CSS (parpadeo por instancia, anti-metrónomo)', () => {
    const { container } = render(<ChivitoPunkLaminaViva />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="chivito-punk"]'));
    expect(raiz.style.getPropertyValue('--rh-blink-dur')).toMatch(/s$/);
    expect(raiz.style.getPropertyValue('--rh-blink-delay')).toMatch(/s$/);
  });

  it('el visema fija el nivel de apertura del pico (--clv-jaw) para el lip-sync', () => {
    const { container: cerrado } = render(<ChivitoPunkLaminaViva />);
    const raizCerrado = /** @type {HTMLElement} */ (cerrado.querySelector('[data-creature="chivito-punk"]'));
    expect(raizCerrado.style.getPropertyValue('--clv-jaw')).toBe('0');

    const { container: hablando } = render(<ChivitoPunkLaminaViva visema="V3" />);
    // V3 (boca abierta amplia) → pico totalmente abajo.
    const raizHablando = /** @type {HTMLElement} */ (hablando.querySelector('[data-creature="chivito-punk"]'));
    expect(raizHablando.style.getPropertyValue('--clv-jaw')).toBe('1');
  });

  it('tier viaja como data-tier (gama baja apaga lo continuo)', () => {
    const { container } = render(<ChivitoPunkLaminaViva tier="bajo" />);
    expect(container.querySelector('[data-creature="chivito-punk"]')).toHaveAttribute('data-tier', 'bajo');
  });

  it('acepta el estado "caminando" (roaming) sin romper el contrato', () => {
    const { container } = render(<ChivitoPunkLaminaViva estado="caminando" />);
    expect(container.querySelector('[data-creature="chivito-punk"]')).toHaveAttribute('data-agt-estado', 'caminando');
  });

  it('el repertorio punk existe en vidaEstados (rockea/apunta/reposo) — el idle-cerebro tiene de dónde elegir', async () => {
    const { VIDA_REPERTORIO } = await import('../vidaEstados.js');
    const rep = VIDA_REPERTORIO['chivito-punk'];
    expect(rep).toBeDefined();
    expect(Object.keys(rep.momentos)).toEqual(expect.arrayContaining(['rockea', 'apunta', 'reposo']));
    // REGLA DURA de vidaEstados: dur = múltiplo exacto del loop CSS dominante.
    expect(rep.momentos.rockea.dur % 650).toBe(0); // clv-rockea-cabeza 0.65s
    expect(rep.momentos.apunta.dur % 800).toBe(0); // clv-apunta-mano 0.8s
  });
});
