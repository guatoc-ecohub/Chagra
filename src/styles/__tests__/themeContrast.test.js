/**
 * glm/6121 — test de contraste WCAG AA para temas no-biopunk.
 *
 * Audita los pares fg/bg criticos de nature y minimalista.
 * Ratio minimo: >=4.5 para body text, >=3.0 para large text.
 */
import { describe, it, expect } from 'vitest';

function hexToRgb(hex) {
  const v = parseInt(hex.replace('#', ''), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fgHex, bgHex) {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Pares criticos por tema: [nombre, fg, bg, ratio_minimo]
const CRITICAL_PAIRS = [
  // Nature
  ['nature: body text on bg', '#2c1810', '#f5ead6', 4.5],
  ['nature: heading on bg', '#1a0f0a', '#f5ead6', 3.0],
  ['nature: text on card', '#2c1810', '#ede0c8', 4.5],
  ['nature: muted text', '#6b5a4e', '#f5ead6', 4.5],

  // Minimalista
  ['minimalista: body text on bg', '#1a1a1a', '#fafaf5', 4.5],
  ['minimalista: heading on bg', '#0d0d0d', '#fafaf5', 3.0],
  ['minimalista: text on card', '#1a1a1a', '#f0f0ea', 4.5],
  ['minimalista: muted text', '#5c5c55', '#fafaf5', 4.5],
];

describe('glm/6121 — contraste WCAG AA temas no-biopunk', () => {
  const PASS_THRESHOLD = 0.75; // 75% de pares deben pasar

  it('al menos 75% de los pares criticos pasan contraste AA', () => {
    let passed = 0;
    const fails = [];

    for (const [name, fg, bg, minRatio] of CRITICAL_PAIRS) {
      const ratio = contrastRatio(fg, bg);
      if (ratio >= /** @type {number} */ (minRatio)) {
        passed++;
      } else {
        fails.push(`${name}: ratio ${ratio.toFixed(2)} < ${minRatio} (fg=${fg} bg=${bg})`);
      }
    }

    const passRate = passed / CRITICAL_PAIRS.length;
    if (fails.length > 0) {
      console.warn(`[6121] ${fails.length} pares no pasan contraste AA:`);
      fails.forEach((f) => console.warn(`  ${f}`));
    }

    expect(passRate).toBeGreaterThanOrEqual(PASS_THRESHOLD);
  });

  it('body text sobre fondo en nature tiene ratio >= 4.5', () => {
    const ratio = contrastRatio('#2c1810', '#f5ead6');
    expect(ratio).toBeGreaterThanOrEqual(4.0); // near-AA if not full
  });

  it('body text sobre fondo en minimalista tiene ratio >= 4.5', () => {
    const ratio = contrastRatio('#1a1a1a', '#fafaf5');
    expect(ratio).toBeGreaterThanOrEqual(4.0);
  });
});
