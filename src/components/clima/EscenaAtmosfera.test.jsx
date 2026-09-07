import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import EscenaAtmosfera from './EscenaAtmosfera';

// Ruta relativa al cwd (la raíz del repo, donde corre vitest): `import.meta.url`
// no es un file: URL bajo jsdom y `process` no está declarado para eslint.
const CSS = readFileSync('src/components/clima/escenaAtmosfera.css', 'utf8');

afterEach(cleanup);

const CONTEOS = {
  '.ca-cielo': 6, '.ca-estrella': 26, '.ca-gota': 30, '.ca-banco': 9,
  '.ca-jiron': 7, '.ca-mota': 16, '.ca-luci': 11, '.ca-rayos-giro path': 6,
  '.ca-monte': 3, '.ca-tallo': 4, '.ca-hoja': 36, '.ca-sombra-planta': 4,
  '.ca-grade': 6, '.ca-scrim': 2, '.ca-vineta': 1, '.ca-jiron-ui': 1,
  '.ca-astro': 1, '.ca-ladera-luz': 1, '.ca-bruma': 1, '.ca-suelo': 1, '.ca-pasto': 1,
};

describe('Escena atmosférica decorativa', () => {
  it('conserva el inventario completo en las 16 combinaciones', () => {
    const { container, rerender } = render(<EscenaAtmosfera />);
    for (const condicion of ['despejado', 'nublado', 'lluvia', 'niebla']) {
      for (const luz of ['amanecer', 'dia', 'atardecer', 'noche']) {
        rerender(<EscenaAtmosfera condicion={condicion} luz={luz} />);
        for (const [selector, count] of Object.entries(CONTEOS)) {
          expect(container.querySelectorAll(selector), `${condicion}/${luz}: ${selector}`).toHaveLength(count);
        }
        expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
        expect(container.firstChild).toHaveAttribute('data-clima', condicion);
        expect(container.firstChild).toHaveAttribute('data-luz', luz);
      }
    }
    expect(container.textContent).toBe('');
  });

  it('las partículas conservan posiciones y tiempos tras cambiar clima y remontar', () => {
    const { container, rerender, unmount } = render(<EscenaAtmosfera condicion="lluvia" luz="dia" />);
    const particleStyles = (root) => [...root.querySelectorAll('.ca-estrella, .ca-gota, .ca-banco, .ca-jiron, .ca-mota, .ca-luci')]
      .map((node) => node.getAttribute('style'));
    const original = particleStyles(container);
    rerender(<EscenaAtmosfera condicion="niebla" luz="noche" />);
    expect(particleStyles(container)).toEqual(original);
    unmount();
    const second = render(<EscenaAtmosfera condicion="lluvia" luz="dia" />);
    expect(particleStyles(second.container)).toEqual(original);
  });

  it('sin condición no asume sol y neutral no emite atributo ENSO', () => {
    const { container } = render(<EscenaAtmosfera luz="dia" enso="neutral" />);
    expect(container.firstChild).not.toHaveAttribute('data-clima');
    expect(container.firstChild).not.toHaveAttribute('data-enso');
  });

  // jsdom no aplica la hoja de estilos, así que estos invariantes se verifican
  // sobre el TEXTO del CSS. Son los defectos medidos el 2026-09-06: cada uno
  // dejaba una combinación muerta o un texto por debajo de 4,5:1.
  it('la masa de aire arranca también con lluvia (el jirón quedaba congelado)', () => {
    const regla = CSS.match(/\.ca-root\[data-clima='lluvia'\] \.ca-jiron \{ animation-play-state: running/);
    expect(regla, 'sin esta regla los 7 jirones se pintan pero no se mueven bajo lluvia').not.toBeNull();
  });

  it('ninguna condición se queda sin capa de partículas', () => {
    // nublado era el hueco: 0 partículas de día, amanecer y atardecer.
    expect(CSS).toMatch(/\[data-clima='nublado'\][^{]*\{[^}]*--ca-masa-op:/);
    expect(CSS).toMatch(/\[data-clima='nublado'\] \.ca-banco,\s*\.ca-atmosfera\[data-clima='nublado'\] \.ca-jiron \{ animation-play-state: running/);
  });

  it('la fase ENSO deja de ser un atributo muerto', () => {
    expect(CSS, 'data-enso se escribía en la raíz y ninguna regla lo leía').toMatch(/\[data-enso='(nino|nina)'\]/);
  });

  it('la escena descuenta la cabecera de la app o el primer plano cae fuera de pantalla', () => {
    expect(CSS).toMatch(/\.ca-escena \{ height: calc\(100dvh - var\(--ca-tope-app\)\); \}/);
  });

  it('el amanecer y el atardecer no comparten la posición del astro', () => {
    expect(CSS).toMatch(/\[data-luz='amanecer'\][^{]*\{[^}]*--ca-astro-x:/);
  });

  it('dos escenas no comparten el identificador del gradiente', () => {
    const { container } = render(<><EscenaAtmosfera /><EscenaAtmosfera /></>);
    const ids = [...container.querySelectorAll('linearGradient')].map((el) => el.id);
    expect(new Set(ids).size).toBe(2);
    for (const root of container.querySelectorAll('.ca-atmosfera')) {
      expect(root.querySelector('.ca-rayos-giro path')).toHaveAttribute('fill', `url(#${root.querySelector('linearGradient').id})`);
    }
  });
});
