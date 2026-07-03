/**
 * Tokens globales de diseño (styles/tokens.css) — contrato de la capa NO-COLOR.
 *
 * Verifica que:
 *   (a) tokens.css define en :root las escalas de radio, elevación, tipografía,
 *       espaciado, movimiento y tacto (nombres estables: los consumidores usan
 *       var(--token, fallback)).
 *   (b) main.jsx importa tokens.css ANTES de index.css (capa base).
 *   (c) los consumidores unificados apuntan a los tokens con fallback
 *       byte-idéntico al valor previo (riesgo visual cero):
 *       juego-pulido (--jp-sombra-* → --sombra-*), screen-shell-f2 y
 *       registro-shell (radios/duración/tacto).
 *   (d) la escalera de elevación global conserva la receta theme-aware
 *       (--scrim-bg) que ya estaba validada en el juego.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (...p) => readFileSync(join(__dirname, ...p), 'utf8');

const tokensCss = read('..', 'tokens.css');
const mainJsx = read('..', '..', 'main.jsx');
const juegoCss = read('..', 'juego-pulido.css');
const shellCss = read('..', '..', 'components', 'common', 'screen-shell-f2.css');
const registroCss = read('..', '..', 'components', 'registro', 'registro-shell.css');

describe('tokens.css — capa global no-color', () => {
  it('define la escala de radios', () => {
    for (const [name, value] of [
      ['--r-xs', '8px'],
      ['--r-sm', '12px'],
      ['--r-md', '16px'],
      ['--r-lg', '20px'],
      ['--r-xl', '24px'],
      ['--r-pill', '999px'],
    ]) {
      expect(tokensCss).toMatch(new RegExp(`${name}:\\s*${value};`));
    }
  });

  it('define la escalera de elevación theme-aware (sale de --scrim-bg)', () => {
    expect(tokensCss).toMatch(/--sombra-1:.*var\(--scrim-bg/);
    expect(tokensCss).toMatch(/--sombra-2:.*var\(--scrim-bg/);
    expect(tokensCss).toMatch(/--sombra-3:.*var\(--scrim-bg/);
  });

  it('define tipografía, movimiento y tacto', () => {
    expect(tokensCss).toMatch(/--fs-nota:\s*0\.78rem;/);
    expect(tokensCss).toMatch(/--fs-cuerpo-lg:\s*1\.15rem;/);
    expect(tokensCss).toMatch(/--fs-titulo:\s*1\.18rem;/);
    expect(tokensCss).toMatch(/--dur-tap:\s*0\.12s;/);
    expect(tokensCss).toMatch(/--dur-estado:\s*0\.18s;/);
    expect(tokensCss).toMatch(/--tap-min:\s*44px;/);
  });

  it('main.jsx la importa antes de index.css', () => {
    const iTokens = mainJsx.indexOf("./styles/tokens.css");
    const iIndex = mainJsx.indexOf("./index.css");
    expect(iTokens).toBeGreaterThan(-1);
    expect(iIndex).toBeGreaterThan(-1);
    expect(iTokens).toBeLessThan(iIndex);
  });
});

describe('consumidores unificados (con fallback idéntico al valor previo)', () => {
  it('juego-pulido bebe de la escalera global de sombras', () => {
    expect(juegoCss).toMatch(/--jp-sombra-1:\s*var\(--sombra-1,/);
    expect(juegoCss).toMatch(/--jp-sombra-2:\s*var\(--sombra-2,/);
    expect(juegoCss).toMatch(/--jp-sombra-3:\s*var\(--sombra-3,/);
  });

  it('screen-shell-f2 usa radios, tacto y duración por token', () => {
    expect(shellCss).toMatch(/var\(--r-pill, 999px\)/);
    expect(shellCss).toMatch(/var\(--r-sm, 12px\)/);
    expect(shellCss).toMatch(/var\(--tap-min, 44px\)/);
    expect(shellCss).toMatch(/var\(--dur-estado, 0\.18s\)/);
    expect(shellCss).toMatch(/var\(--fs-titulo, 1\.18rem\)/);
  });

  it('registro-shell usa radios, tipografía y duración por token', () => {
    expect(registroCss).toMatch(/var\(--r-md, 1rem\)/);
    expect(registroCss).toMatch(/var\(--r-pill, 999px\)/);
    expect(registroCss).toMatch(/var\(--fs-cuerpo-lg, 1\.15rem\)/);
    expect(registroCss).toMatch(/var\(--fs-nota, 0\.78rem\)/);
    expect(registroCss).toMatch(/var\(--dur-tap, 0\.12s\)/);
  });
});
