import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import CompaiLamina from '../CompaiLamina.jsx';
import { LAMINA_ANATOMIA } from '../laminaAnatomia.js';

afterEach(cleanup);

describe('CompaiLamina — contrato del cuerpo (paridad con los SVG a mano que reemplaza)', () => {
  it('render por defecto: role=img, data-creature, data-lamina-viva — nunca un hueco', () => {
    const { container } = render(<CompaiLamina tipo="angelita" />);
    const cuerpo = container.querySelector('[data-creature="angelita"]');
    expect(cuerpo).toBeTruthy();
    expect(cuerpo.getAttribute('role')).toBe('img');
    expect(cuerpo.getAttribute('data-lamina-viva')).toBe('1');
  });

  it('mientras hornea (o sin soporte de canvas), muestra la lámina PLANA real — jamás arte inventado', () => {
    const { container } = render(<CompaiLamina tipo="jaguar" />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/compai/laminas/jaguar.png');
  });

  it('tipo sin lámina medida (p.ej. guacamaya) no renderiza nada — nunca inventa arte de respaldo', () => {
    expect(LAMINA_ANATOMIA.guacamaya).toBeUndefined();
    const { container } = render(<CompaiLamina tipo="guacamaya" />);
    expect(container.firstChild).toBeNull();
  });

  it('title custom se refleja en aria-label', () => {
    const { container } = render(<CompaiLamina tipo="oso-baston" title="Chagra IA" />);
    const cuerpo = container.querySelector('[data-creature="oso-baston"]');
    expect(cuerpo.getAttribute('aria-label')).toBe('Chagra IA');
  });

  it('data-agt-estado traduce el vocabulario ancho y el rico a la misma familia', () => {
    const { container: c1 } = render(<CompaiLamina tipo="zariguya" estado="listening" />);
    expect(c1.querySelector('[data-creature="zariguya"]').getAttribute('data-agt-estado')).toBe('atenta');
    cleanup();
    const { container: c2 } = render(<CompaiLamina tipo="zariguya" estado="escuchando" />);
    expect(c2.querySelector('[data-creature="zariguya"]').getAttribute('data-agt-estado')).toBe('atenta');
  });

  it('animated=false no revienta (fotograma quieto y digno)', () => {
    expect(() => render(<CompaiLamina tipo="luciernaga" animated={false} />)).not.toThrow();
  });

  it('direccion="izquierda" espeja el conjunto completo', () => {
    const { container } = render(<CompaiLamina tipo="chivito-punk" direccion="izquierda" />);
    /** @type {HTMLElement} */
    const cuerpo = container.querySelector('[data-creature="chivito-punk"]');
    expect(cuerpo.style.transform).toContain('scaleX(-1)');
  });

  it('cada uno de los 6 tipos con lámina real monta sin romper', () => {
    for (const tipo of Object.keys(LAMINA_ANATOMIA)) {
      const { container, unmount } = render(<CompaiLamina tipo={tipo} />);
      expect(container.querySelector(`[data-creature="${tipo}"]`)).toBeTruthy();
      unmount();
    }
  });
});
