/**
 * ZariguyaLaminaViva.test.jsx — la zarigüeya como LÁMINA aprobada recortada
 * sobre un rig vivo (`feat/zariguya-lamina-viva`). jsdom no trae Canvas2D
 * real: estas pruebas cubren el CONTRATO observable (root accesible,
 * degradación a lámina plana, props que viajan) — la calidad del recorte la
 * verifica `zariguyaLamina/__tests__/capas.test.js` + la recomposición
 * offline con sharp (0.000% de píxeles perdidos, ver el reporte).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ZariguyaLaminaViva from '../ZariguyaLaminaViva.jsx';

afterEach(cleanup);

describe('ZariguyaLaminaViva — contrato base', () => {
  it('root accesible: role=img, data-creature=zariguya', () => {
    const { container } = render(<ZariguyaLaminaViva />);
    const raiz = container.querySelector('[data-creature="zariguya"]');
    expect(raiz).toBeInTheDocument();
    expect(raiz).toHaveAttribute('role', 'img');
  });

  it('sin canvas real (jsdom), degrada a la lámina PLANA — nunca un hueco', () => {
    const { container } = render(<ZariguyaLaminaViva />);
    const img = container.querySelector('img[src*="zariguya.png"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });

  it('data-agt-estado refleja el prop estado', () => {
    const { container } = render(<ZariguyaLaminaViva estado="listening" />);
    expect(container.querySelector('[data-creature="zariguya"]')).toHaveAttribute('data-agt-estado', 'listening');
  });

  it('estado por defecto es "idle"', () => {
    const { container } = render(<ZariguyaLaminaViva />);
    expect(container.querySelector('[data-creature="zariguya"]')).toHaveAttribute('data-agt-estado', 'idle');
  });

  it('visema viaja como data-visema; sin visema, el atributo no está', () => {
    const { container: conVisema } = render(<ZariguyaLaminaViva visema="V2" />);
    expect(conVisema.querySelector('[data-creature="zariguya"]')).toHaveAttribute('data-visema', 'V2');

    const { container: sinVisema } = render(<ZariguyaLaminaViva visema={null} />);
    expect(sinVisema.querySelector('[data-creature="zariguya"]')).not.toHaveAttribute('data-visema');
  });

  it('title custom se usa como aria-label', () => {
    const { container } = render(<ZariguyaLaminaViva title="La chucha del valle" />);
    expect(container.querySelector('[data-creature="zariguya"]')).toHaveAttribute('aria-label', 'La chucha del valle');
  });

  it('sin onClick ni onDoubleClick no envuelve en button', () => {
    const { container } = render(<ZariguyaLaminaViva />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('con onDoubleClick envuelve en button real y dispara el handler', () => {
    let llamadas = 0;
    render(<ZariguyaLaminaViva onDoubleClick={() => { llamadas += 1; }} />);
    const btn = screen.getByRole('button');
    fireEvent.doubleClick(btn);
    expect(llamadas).toBe(1);
  });

  it('respeta el tamaño via prop size', () => {
    const { container } = render(<ZariguyaLaminaViva size={96} />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="zariguya"]'));
    expect(raiz.style.width).toBe('96px');
    expect(raiz.style.height).toBe('96px');
  });

  it('animated=false no rompe el render (fotograma quieto)', () => {
    const { container } = render(<ZariguyaLaminaViva animated={false} />);
    expect(container.querySelector('[data-creature="zariguya"]')).toBeInTheDocument();
  });

  it('style custom (glow del adaptador) se aplica a la raíz', () => {
    const { container } = render(<ZariguyaLaminaViva style={{ filter: 'drop-shadow(0 0 10px rgba(255,158,203,0.65))' }} />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="zariguya"]'));
    expect(raiz.style.filter).toContain('drop-shadow');
  });
});

describe('ZariguyaLaminaViva — la VIDA (hooks de Angelita cableados)', () => {
  it('el ritmo propio viaja como vars CSS (parpadeo por instancia, anti-metrónomo)', () => {
    const { container } = render(<ZariguyaLaminaViva />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="zariguya"]'));
    expect(raiz.style.getPropertyValue('--rh-blink-dur')).toMatch(/s$/);
    expect(raiz.style.getPropertyValue('--rh-blink-delay')).toMatch(/s$/);
  });

  it('el visema fija la apertura EXTRA de la mandíbula (--zlv-jaw); en reposo 0 = lámina exacta', () => {
    const { container: reposo } = render(<ZariguyaLaminaViva />);
    const raizReposo = /** @type {HTMLElement} */ (reposo.querySelector('[data-creature="zariguya"]'));
    expect(raizReposo.style.getPropertyValue('--zlv-jaw')).toBe('0');

    const { container: hablando } = render(<ZariguyaLaminaViva visema="V3" />);
    const raizHablando = /** @type {HTMLElement} */ (hablando.querySelector('[data-creature="zariguya"]'));
    expect(raizHablando.style.getPropertyValue('--zlv-jaw')).toBe('1');
  });

  it('tier viaja como data-tier (gama baja apaga lo continuo)', () => {
    const { container } = render(<ZariguyaLaminaViva tier="bajo" />);
    expect(container.querySelector('[data-creature="zariguya"]')).toHaveAttribute('data-tier', 'bajo');
  });

  it('acepta el estado "caminando" (roaming del host) sin romper el contrato', () => {
    const { container } = render(<ZariguyaLaminaViva estado="caminando" />);
    expect(container.querySelector('[data-creature="zariguya"]')).toHaveAttribute('data-agt-estado', 'caminando');
  });
});
