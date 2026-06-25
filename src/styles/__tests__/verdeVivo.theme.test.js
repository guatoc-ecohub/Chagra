/**
 * Verde Vivo — contrato del 4º tema (la piel de la finca viva).
 *
 * Verifica que:
 *   (a) index.css define el bloque [data-theme="verde-vivo"] con TODO el mapa
 *       --c-* (ninguna var cae al default biopunk → "Frankenstein") + FX OFF +
 *       scrim claro (es un tema de piel CLARA, como nature/minimalista).
 *   (b) el texto principal pasa AA (≥4.5) sobre fondo y card.
 *   (c) finca-viva-hero.css retiñe la ESCENA por tema (los 4 temas tienen su
 *       piel de cielo/sol) y deriva la paleta del hero de los tokens --c-*.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexCss = readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8');
const heroCss = readFileSync(
  join(__dirname, '..', '..', 'components', 'dashboard', 'finca-viva-hero.css'),
  'utf8',
);

function themeBlock(selector) {
  const m = indexCss.match(
    new RegExp(`\\[data-theme="${selector}"\\]\\s*\\{([\\s\\S]*?)\\}`),
  );
  return m ? m[1] : null;
}
function readScalar(block, varName) {
  const m = block.match(new RegExp(`${varName}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}
function readRgb(block, varName) {
  const m = block.match(
    new RegExp(`${varName}\\s*:\\s*([0-9]+)\\s+([0-9]+)\\s+([0-9]+)`),
  );
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function contrastRatio(a, b) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum = ([r, g, b2]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b2);
  const l1 = lum(a);
  const l2 = lum(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

describe('Verde Vivo — tokens del 4º tema (index.css)', () => {
  it('define el bloque [data-theme="verde-vivo"]', () => {
    expect(themeBlock('verde-vivo'), 'falta bloque verde-vivo').toBeTruthy();
  });

  it('redefine el mapa --c-* completo (ninguna var hereda biopunk)', () => {
    const baseVars = [...new Set(
      [...indexCss.matchAll(/(--c-[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
    )];
    const block = themeBlock('verde-vivo');
    for (const v of baseVars) {
      expect(block.includes(`${v}:`), `verde-vivo no redefine ${v}`).toBe(true);
    }
  });

  it('es un tema de piel CLARA: fondo y card claros (promedio > 200)', () => {
    const block = themeBlock('verde-vivo');
    for (const v of ['--c-slate-950', '--c-slate-900']) {
      const [r, g, b] = readRgb(block, v);
      expect((r + g + b) / 3, `verde-vivo ${v} debe ser claro`).toBeGreaterThan(200);
    }
  });

  it('apaga los FX neón (partículas/glow/patrón = 0) y usa scrim claro', () => {
    const block = themeBlock('verde-vivo');
    expect(readScalar(block, '--fx-particles')).toBe('0');
    expect(readScalar(block, '--fx-bg-pattern')).toBe('0');
    expect(readScalar(block, '--fx-glow-opacity')).toBe('0');
    const scrim = readRgb(block, '--scrim-bg');
    expect((scrim[0] + scrim[1] + scrim[2]) / 3, 'scrim claro').toBeGreaterThan(200);
  });

  it('texto principal ≥4.5 (AA) sobre fondo y card', () => {
    const block = themeBlock('verde-vivo');
    const text = readRgb(block, '--c-slate-100');
    const bg = readRgb(block, '--c-slate-950');
    const card = readRgb(block, '--c-slate-900');
    expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(text, card)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Verde Vivo — la escena/hero toma la piel del tema (finca-viva-hero.css)', () => {
  it('la paleta del hero deriva de los tokens --c-* del tema (no hex fijo)', () => {
    // El verde, la tinta y el sello del hero salen de la indirección --c-*.
    expect(heroCss).toMatch(/--fvh-verde-1:\s*rgb\(var\(--c-emerald-400/);
    expect(heroCss).toMatch(/--fvh-tinta:\s*rgb\(var\(--c-slate-100/);
    expect(heroCss).toMatch(/--fvh-sello:\s*rgb\(var\(--c-emerald-500/);
  });

  it('cada tema retiñe la ESCENA (cielo/sol) — los 4 temas tienen piel', () => {
    // Default (.fvh sin data-theme) + un bloque por cada tema claro.
    for (const sel of ['verde-vivo', 'nature', 'minimalista']) {
      expect(
        heroCss.includes(`[data-theme="${sel}"] .fvh`),
        `falta la piel de escena del tema ${sel}`,
      ).toBe(true);
    }
  });

  it('el plinto del ícono de marca es claro en los temas de piel clara', () => {
    expect(heroCss).toMatch(
      /\[data-theme="verde-vivo"\] \.fvh-brand-a[\s\S]{0,200}--c-surface-card/,
    );
  });
});
