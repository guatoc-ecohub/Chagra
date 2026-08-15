/**
 * JaguarLaminaViva.test.jsx — el jaguar como LÁMINA real recortada sobre el
 * esqueleto del rig (`feat/jaguar-lamina-sobre-esqueleto`). jsdom no trae
 * Canvas2D real, así que estas pruebas cubren el CONTRATO observable (root
 * accesible, degradación a la lámina plana, props que viajan) — no la
 * calidad del recorte (ver `jaguarLamina/__tests__/capas.test.js` y el
 * reporte de la tarea para la verificación offline con `sharp`).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import JaguarLaminaViva from '../JaguarLaminaViva.jsx';

afterEach(cleanup);

describe('JaguarLaminaViva — contrato base', () => {
  it('root accesible: role=img, data-creature=jaguar', () => {
    const { container } = render(<JaguarLaminaViva />);
    const raiz = container.querySelector('[data-creature="jaguar"]');
    expect(raiz).toBeInTheDocument();
    expect(raiz).toHaveAttribute('role', 'img');
  });

  it('sin canvas real (jsdom), degrada a la lámina PLANA — nunca un hueco', () => {
    const { container } = render(<JaguarLaminaViva />);
    const img = container.querySelector('img[src*="jaguar-natural.png"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });

  it('data-agt-estado refleja el prop estado', () => {
    const { container } = render(<JaguarLaminaViva estado="listening" />);
    expect(container.querySelector('[data-creature="jaguar"]')).toHaveAttribute('data-agt-estado', 'listening');
  });

  it('estado por defecto es "idle"', () => {
    const { container } = render(<JaguarLaminaViva />);
    expect(container.querySelector('[data-creature="jaguar"]')).toHaveAttribute('data-agt-estado', 'idle');
  });

  it('visema viaja como data-visema; sin visema, el atributo no está', () => {
    const { container: conVisema } = render(<JaguarLaminaViva visema="V2" />);
    expect(conVisema.querySelector('[data-creature="jaguar"]')).toHaveAttribute('data-visema', 'V2');

    const { container: sinVisema } = render(<JaguarLaminaViva visema={null} />);
    expect(sinVisema.querySelector('[data-creature="jaguar"]')).not.toHaveAttribute('data-visema');
  });

  it('title custom se usa como aria-label', () => {
    const { container } = render(<JaguarLaminaViva title="Jaguar del valle" />);
    expect(container.querySelector('[data-creature="jaguar"]')).toHaveAttribute('aria-label', 'Jaguar del valle');
  });

  it('sin onClick ni onDoubleClick no envuelve en button', () => {
    const { container } = render(<JaguarLaminaViva />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('con onDoubleClick envuelve en button real y dispara el handler', () => {
    let llamadas = 0;
    render(<JaguarLaminaViva onDoubleClick={() => { llamadas += 1; }} />);
    const btn = screen.getByRole('button');
    fireEvent.doubleClick(btn);
    expect(llamadas).toBe(1);
  });

  it('respeta el tamaño via prop size (stage escala con el aspecto real de la lámina)', () => {
    const { container } = render(<JaguarLaminaViva size={96} />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="jaguar"]'));
    expect(raiz.style.width).toBe('96px');
    expect(raiz.style.height).toBe('96px');
  });

  it('animated=false no rompe el render (fotograma quieto)', () => {
    const { container } = render(<JaguarLaminaViva animated={false} />);
    expect(container.querySelector('[data-creature="jaguar"]')).toBeInTheDocument();
  });

  it('style custom (glow del adaptador) se aplica a la raíz', () => {
    const { container } = render(<JaguarLaminaViva style={{ filter: 'drop-shadow(0 0 10px rgba(168,85,247,0.65))' }} />);
    const raiz = /** @type {HTMLElement} */ (container.querySelector('[data-creature="jaguar"]'));
    expect(raiz.style.filter).toContain('drop-shadow');
  });
});
