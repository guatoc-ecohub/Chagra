/**
 * Legibilidad del velo climático NOCTURNO sobre el tema OSCURO (biopunk base).
 *
 * Contexto (2026-07-06): los topes duros del tinte (0.26/0.20) se calcularon
 * para temas CLAROS. Sobre el tema oscuro la misma alpha comprime el doble el
 * contraste del texto claro (medido: slate-400/raised 5.7:1 → 3.4:1 con niebla
 * nocturna al tope). El fix baja los topes a 0.10/0.08 en biopunk de noche y
 * apaga el tinte navy residual de noche despejada (biopunk exento por diseño).
 *
 * Este test parsea clima-atmosfera.css REAL (no un mock) y reproduce la
 * mecánica exacta del velo: si alguien sube los topes nocturnos o re-vela
 * biopunk de noche, falla con el par y el ratio medidos.
 */
// @ts-nocheck -- test de Node (vitest) que parsea el CSS real con built-ins node:* (fs/url/path); el jsconfig apunta al navegador y no tipa Node, irreducible aquí.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, '..', 'clima-atmosfera.css'), 'utf8');

/* ── helpers WCAG ────────────────────────────────────────────────────────── */
function luminance([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}
/* blending alpha-compuesto del velo: c' = c + (velo - c) * a */
const blend = (c, veil, a) => c.map((v, i) => v + (veil[i] - v) * a);

/* ── parseo del CSS real ─────────────────────────────────────────────────── */
/** Devuelve el cuerpo del primer bloque cuyo selector matchea `selectorRe`. */
function blockBody(selectorRe) {
  const re = new RegExp(selectorRe.source + String.raw`[^{]*\{([^}]*)\}`, 'm');
  const m = css.match(re);
  return m ? m[1] : null;
}
function decl(body, prop) {
  const m = body && body.match(new RegExp(String.raw`${prop}\s*:\s*([^;]+);`));
  return m ? m[1].trim() : null;
}
const num = (s) => (s == null ? null : parseFloat(s));
const rgb = (s) => (s == null ? null : s.split(/\s+/).map(Number));

const noche = blockBody(/html:not\(\[data-theme\]\)\[data-luz="noche"\]/);
const root = blockBody(/^:root/m);

// Velos de clima que caen sobre biopunk de noche (reglas :not([data-theme])
// posteriores al bloque noche → ganan el tinte a igual especificidad).
const bpNublado = blockBody(/html:not\(\[data-theme\]\)\[data-clima="nublado"\]/);
const bpLluvia = blockBody(/html:not\(\[data-theme\]\)\[data-clima="lluvia"\]/);
const bpNiebla = blockBody(/html:not\(\[data-theme\]\)\[data-clima="niebla"\]/);

/* ── tokens biopunk (index.css :root — chrome oscuro, valores Tailwind) ──── */
const SLATE_100 = [241, 245, 249];
const SLATE_300 = [203, 213, 225];
const SLATE_400 = [148, 163, 184];
const WHITE = [255, 255, 255];
const SURFACE = [2, 6, 23]; // slate-950
const CARD = [15, 23, 42]; // slate-900
const RAISED = [30, 41, 59]; // slate-800
const EMERALD_700 = [4, 120, 87]; // botón sólido

/* Pares del chrome oscuro que SON AA de base y deben SEGUIR siéndolo velados. */
const PAIRS = [
  ['slate-100 / surface', SLATE_100, SURFACE],
  ['slate-100 / card', SLATE_100, CARD],
  ['slate-300 / card', SLATE_300, CARD],
  ['slate-300 / raised', SLATE_300, RAISED],
  ['slate-400 / card', SLATE_400, CARD],
  ['slate-400 / raised', SLATE_400, RAISED],
  ['blanco / botón emerald-700', WHITE, EMERALD_700],
];

/* Peor caso del multiplicador: ENSO niña (tinte ×1.25) × cal sensores 1.5. */
const ENSO_NINA = 1.25;
const CAL_MAX = 1.5;

describe('clima-atmosfera — velo nocturno sobre el tema oscuro (biopunk)', () => {
  it('el bloque noche de biopunk existe y apaga velo navy Y tinte residual', () => {
    expect(noche).toBeTruthy();
    expect(num(decl(noche, '--w-night-a'))).toBe(0);
    expect(num(decl(noche, '--w-tint-a'))).toBe(0);
  });

  it('biopunk de noche baja los topes del tinte (cap ≤ 0.10 / ≤ 0.08)', () => {
    const capTop = num(decl(noche, '--w-tint-cap-top'));
    const capBot = num(decl(noche, '--w-tint-cap-bot'));
    expect(capTop).not.toBeNull();
    expect(capBot).not.toBeNull();
    expect(capTop).toBeLessThanOrEqual(0.1);
    expect(capBot).toBeLessThanOrEqual(0.08);
    expect(capBot).toBeLessThanOrEqual(capTop);
  });

  it('el compuesto del velo usa los topes por var (no min() hardcodeado)', () => {
    expect(css).toMatch(/min\(var\(--w-tint-cap-top[^)]*\)/);
    expect(css).toMatch(/min\(var\(--w-tint-cap-bot[^)]*\)/);
    // y :root conserva el tope de diseño para los temas claros
    expect(num(decl(root, '--w-tint-cap-top'))).toBeCloseTo(0.26, 5);
    expect(num(decl(root, '--w-tint-cap-bot'))).toBeCloseTo(0.2, 5);
  });

  it('peor caso nocturno (clima × niña × cal 1.5): los pares AA del chrome oscuro siguen AA', () => {
    const capTop = num(decl(noche, '--w-tint-cap-top'));
    // Velos de clima que aplican a biopunk de noche, con los valores REALES
    // parseados del CSS (rgb del bloque específico o del genérico si hereda).
    const generic = {
      nublado: blockBody(/html\[data-clima="nublado"\]/),
      lluvia: blockBody(/html\[data-clima="lluvia"\]/),
      niebla: blockBody(/html\[data-clima="niebla"\]/),
    };
    const climas = [
      ['nublado', bpNublado, generic.nublado],
      ['lluvia', bpLluvia, generic.lluvia],
      ['niebla', bpNiebla, generic.niebla],
    ];
    const fails = [];
    for (const [nombre, bp, gen] of climas) {
      const tintRgb = rgb(decl(bp, '--w-tint-rgb')) || rgb(decl(gen, '--w-tint-rgb'));
      const tintA = num(decl(bp, '--w-tint-a')) ?? num(decl(gen, '--w-tint-a'));
      expect(tintRgb, `--w-tint-rgb de ${nombre}`).toBeTruthy();
      expect(tintA, `--w-tint-a de ${nombre}`).not.toBeNull();
      // alpha efectiva arriba de la pantalla = min(cap, a × enso × cal)
      const a = Math.min(capTop, tintA * ENSO_NINA * CAL_MAX);
      for (const [par, fg, bg] of PAIRS) {
        const base = contrast(fg, bg);
        if (base < 4.5) continue; // pares no-AA de base no son contrato de este velo
        const velado = contrast(blend(fg, tintRgb, a), blend(bg, tintRgb, a));
        if (velado < 4.5) {
          fails.push(`${nombre} · ${par}: ${base.toFixed(2)} → ${velado.toFixed(2)} (< 4.5)`);
        }
      }
    }
    expect(fails, `pares que pierden AA de noche:\n  ${fails.join('\n  ')}`).toEqual([]);
  });

  it('los temas claros siguen exentos del velo nocturno (siempre claros)', () => {
    for (const tema of ['nature', 'minimalista', 'verde-vivo']) {
      const body = blockBody(
        new RegExp(String.raw`html\[data-theme="${tema}"\]\[data-luz="noche"\]`)
      );
      expect(body, `exención nocturna de ${tema}`).toBeTruthy();
      expect(decl(body, '--w-night-a')).toMatch(/^0\s*!important/);
      expect(decl(body, '--w-tint-a')).toMatch(/^0\s*!important/);
    }
  });
});
