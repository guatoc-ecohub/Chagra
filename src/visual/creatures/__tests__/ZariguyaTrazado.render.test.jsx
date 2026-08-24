/**
 * ZariguyaTrazado.render.test.jsx — la LÁMINA TRAZADA-RIGGEADA de la zarigüeya
 * (auto-trazada con vtracer, articulada por clip-regiones sobre el esqueleto
 * de huesos). Es el render CANÓNICO del avatar de la zarigüeya desde
 * 2026-08-23 — cruzó a la PWA con el mismo patrón que el oso del bastón y el
 * jaguar (adaptador puro).
 *
 * Contrato que este test blinda (para que el port no se rompa en silencio):
 *   1. Paridad de API con el resto del elenco: acepta el vocabulario de estado
 *      (idle/thinking/speaking/listening) por `estado`, `size`, `animated`,
 *      `visema`, `className`, `style`, `title`, `tier` — sin traducción a
 *      pose/husmea (eso es del vector viejo `Zariguya.jsx`).
 *   2. Es la lámina TRAZADA (no el vector): el markup lleva la clase
 *      `zariguyaTrazado` y adentro viaja el calco (la silueta clip-path).
 *   3. Accesibilidad: role="img" + aria-label = title, data-creature="zariguya".
 *   4. `animated=false` deja el fotograma quieto (data-quieto); `tier="bajo"`
 *      apaga la vida sin romper el dibujo.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import ZariguyaTrazado from '../ZariguyaTrazado.jsx';

afterEach(cleanup);

describe('ZariguyaTrazado — la lámina trazada-riggeada (render canónico)', () => {
  it('render por defecto = host accesible, marcado como TRAZADO', () => {
    const { container } = render(<ZariguyaTrazado />);
    const host = container.querySelector('[data-creature="zariguya"]');
    expect(host).toBeTruthy();
    expect(host.getAttribute('role')).toBe('img');
    // es la lámina trazada, no el vector rubber-hose
    expect(host.className).toContain('zariguyaTrazado');
    // y adentro viaja el CALCO (la silueta vectorizada), no paths dibujados a mano
    expect(host.querySelector('svg')).toBeTruthy();
    expect(host.querySelector('#ztSilueta, [id="ztSilueta"]')).toBeTruthy();
  });

  it('el estado del agente viaja crudo a data-agt-estado (paridad de API)', () => {
    for (const estado of ['idle', 'thinking', 'speaking', 'listening']) {
      const { container } = render(<ZariguyaTrazado estado={estado} />);
      expect(
        container.querySelector('[data-creature="zariguya"]').getAttribute('data-agt-estado'),
      ).toBe(estado);
      cleanup();
    }
  });

  it('el visema del lip-sync llega a la cara (data-visema)', () => {
    const { container } = render(<ZariguyaTrazado visema="V3" />);
    expect(
      container.querySelector('[data-creature="zariguya"]').getAttribute('data-visema'),
    ).toBe('V3');
  });

  it('sin visema no marca data-visema', () => {
    const { container } = render(<ZariguyaTrazado />);
    expect(
      container.querySelector('[data-creature="zariguya"]').getAttribute('data-visema'),
    ).toBeNull();
  });

  it('el title es el rótulo accesible', () => {
    const { container } = render(<ZariguyaTrazado title="Chagra IA" />);
    expect(
      container.querySelector('[data-creature="zariguya"]').getAttribute('aria-label'),
    ).toBe('Chagra IA');
  });

  it('animated=false deja el fotograma quieto (data-quieto), sin romper la silueta', () => {
    const { container } = render(<ZariguyaTrazado animated={false} />);
    const host = container.querySelector('[data-creature="zariguya"]');
    expect(host.hasAttribute('data-quieto')).toBe(true);
    expect(host.getAttribute('data-modo')).toBe('normal');
    expect(host.querySelector('svg')).toBeTruthy();
  });

  it('tier="bajo" apaga la vida continua sin romper el dibujo', () => {
    const { container } = render(<ZariguyaTrazado tier="bajo" />);
    const host = container.querySelector('[data-creature="zariguya"]');
    expect(host.getAttribute('data-tier')).toBe('bajo');
    expect(host.querySelector('svg')).toBeTruthy();
  });

  it('onClick envuelve en un botón real (teclado + lector de pantalla)', () => {
    const { container } = render(<ZariguyaTrazado onClick={() => {}} title="Elegir zarigüeya" />);
    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-label')).toBe('Elegir zarigüeya');
    expect(btn.querySelector('[data-creature="zariguya"]')).toBeTruthy();
  });
});
