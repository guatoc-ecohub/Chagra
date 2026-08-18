/**
 * OsoBastonLaminaViva.test.jsx — el oso del bastón como LÁMINA real
 * recortada sobre el rig con la vida de Angelita (`feat/oso-lamina-viva`).
 * jsdom no trae Canvas2D real, así que estas pruebas cubren el CONTRATO
 * observable (root accesible, degradación a la lámina plana, props que
 * viajan) — no la calidad del recorte (ver `osoLamina/__tests__/capas.test.js`
 * y el reporte de la rama para la verificación offline con `sharp`).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OsoBastonLaminaViva from '../OsoBastonLaminaViva.jsx';

afterEach(cleanup);

describe('OsoBastonLaminaViva — contrato base', () => {
  it('root accesible: role=img, data-creature=oso-baston', () => {
    const { container } = render(<OsoBastonLaminaViva />);
    const raiz = container.querySelector('[data-creature="oso-baston"]');
    expect(raiz).toBeInTheDocument();
    expect(raiz).toHaveAttribute('role', 'img');
  });

  it('sin canvas real (jsdom), degrada a la lámina PLANA — nunca un hueco', () => {
    const { container } = render(<OsoBastonLaminaViva />);
    const img = container.querySelector('img[src*="oso.png"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });

  it('data-agt-estado refleja el prop estado', () => {
    const { container } = render(<OsoBastonLaminaViva estado="listening" />);
    expect(container.querySelector('[data-creature="oso-baston"]')).toHaveAttribute('data-agt-estado', 'listening');
  });

  it('estado por defecto es "idle"', () => {
    const { container } = render(<OsoBastonLaminaViva />);
    expect(container.querySelector('[data-creature="oso-baston"]')).toHaveAttribute('data-agt-estado', 'idle');
  });

  it('visema viaja como data-visema; sin visema, el atributo no está', () => {
    const { container: conVisema } = render(<OsoBastonLaminaViva visema="V2" />);
    expect(conVisema.querySelector('[data-creature="oso-baston"]')).toHaveAttribute('data-visema', 'V2');

    const { container: sinVisema } = render(<OsoBastonLaminaViva visema={null} />);
    expect(sinVisema.querySelector('[data-creature="oso-baston"]')).not.toHaveAttribute('data-visema');
  });

  it('title custom se usa como aria-label', () => {
    const { container } = render(<OsoBastonLaminaViva title="Oso caminante" />);
    expect(container.querySelector('[data-creature="oso-baston"]')).toHaveAttribute('aria-label', 'Oso caminante');
  });

  it('sin onClick ni onDoubleClick no envuelve en button', () => {
    const { container } = render(<OsoBastonLaminaViva />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('con onDoubleClick envuelve en button real y dispara el handler', () => {
    let llamadas = 0;
    render(<OsoBastonLaminaViva onDoubleClick={() => { llamadas += 1; }} />);
    const btn = screen.getByRole('button');
    fireEvent.doubleClick(btn);
    expect(llamadas).toBe(1);
  });

  it('respeta el tamaño via prop size (stage escala con el aspecto real de la lámina)', () => {
    const { container } = render(<OsoBastonLaminaViva size={96} />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="oso-baston"]'));
    expect(raiz.style.width).toBe('96px');
    expect(raiz.style.height).toBe('96px');
  });

  it('animated=false no rompe el render (fotograma quieto)', () => {
    const { container } = render(<OsoBastonLaminaViva animated={false} />);
    expect(container.querySelector('[data-creature="oso-baston"]')).toBeInTheDocument();
  });

  it('style custom (glow del adaptador) se aplica a la raíz', () => {
    const { container } = render(<OsoBastonLaminaViva style={{ filter: 'drop-shadow(0 0 10px rgba(67,194,79,0.65))' }} />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="oso-baston"]'));
    expect(raiz.style.filter).toContain('drop-shadow');
  });
});

describe('OsoBastonLaminaViva — la VIDA (hooks de Angelita cableados)', () => {
  it('el ritmo propio viaja como vars CSS (parpadeo por instancia, anti-metrónomo)', () => {
    const { container } = render(<OsoBastonLaminaViva />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="oso-baston"]'));
    expect(raiz.style.getPropertyValue('--rh-blink-dur')).toMatch(/s$/);
    expect(raiz.style.getPropertyValue('--rh-blink-delay')).toMatch(/s$/);
  });

  it('el visema fija el nivel de apertura de la mandíbula (--olv-jaw) para el lip-sync', () => {
    const { container: cerrada } = render(<OsoBastonLaminaViva />);
    const raizCerrada = /** @type {HTMLElement} */ (cerrada.querySelector('[data-creature="oso-baston"]'));
    expect(raizCerrada.style.getPropertyValue('--olv-jaw')).toBe('0');

    const { container: hablando } = render(<OsoBastonLaminaViva visema="V3" />);
    // V3 (boca abierta amplia) → mandíbula totalmente abajo.
    const raizHablando = /** @type {HTMLElement} */ (hablando.querySelector('[data-creature="oso-baston"]'));
    expect(raizHablando.style.getPropertyValue('--olv-jaw')).toBe('1');
  });

  it('el giro de la boca sintética sigue la diagonal real de la sonrisa (--olv-boca-giro)', () => {
    const { container } = render(<OsoBastonLaminaViva />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="oso-baston"]'));
    expect(raiz.style.getPropertyValue('--olv-boca-giro')).toMatch(/deg$/);
  });

  it('tier viaja como data-tier (gama baja apaga lo continuo)', () => {
    const { container } = render(<OsoBastonLaminaViva tier="bajo" />);
    expect(container.querySelector('[data-creature="oso-baston"]')).toHaveAttribute('data-tier', 'bajo');
  });

  it('acepta el estado "caminando" (el bob de paso del overlay) sin romper el contrato', () => {
    const { container } = render(<OsoBastonLaminaViva estado="caminando" />);
    expect(container.querySelector('[data-creature="oso-baston"]')).toHaveAttribute('data-agt-estado', 'caminando');
  });
});
