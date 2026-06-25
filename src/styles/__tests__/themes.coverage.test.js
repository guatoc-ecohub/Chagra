/**
 * themes.css / index.css — contrato de cobertura de los temas nature/minimalista.
 *
 * Contexto (2026-06-03→04, reporte operador demo Bogotá): los temas nature y
 * minimalista se veían "repeye" (ilegibles) en la PWA logueada. La arquitectura
 * pasó a INDIRECCIÓN POR CSS-VAR (PR #1308): las escalas slate/emerald/amber/
 * surface se resuelven contra `--c-*` (index.css `:root` = biopunk exacto;
 * `[data-theme]` redefine ~30 vars). Eso cubre cientos de clases de golpe.
 *
 * PERO `white` NO está en ese mapa de vars → `text-white` (≈300 usos),
 * `bg-white/<α>` y `border-white/*` seguían literales (#fff) en temas claros:
 * texto/scrims BLANCOS sobre crema = ilegibles (la raíz del "repeye" medido con
 * sonda de contraste 2026-06-04: ratio ~1.0). Tampoco el ámbar-texto claro ni
 * los números del impacto en nature pasaban AA sobre crema.
 *
 * Este test es el CONTRATO (no valida render — eso lo hace la suite visual
 * Playwright): verifica que (a) la indirección por CSS-var existe y es coherente
 * y (b) themes.css remapea las clases NO-var-aware que causaban el "repeye".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const themesCss = readFileSync(join(__dirname, '..', 'themes.css'), 'utf8');
const indexCss = readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8');

/** ¿themes.css remapea `escapedSelector` para AMBOS temas claros? */
function coveredForBothThemes(escapedSelector) {
  const nature = themesCss.includes(`[data-theme="nature"] ${escapedSelector}`);
  const minimal = themesCss.includes(`[data-theme="minimalista"] ${escapedSelector}`);
  return nature && minimal;
}

describe('temas claros — indirección CSS-var (index.css)', () => {
  it('define el mapa --c-* completo en :root (biopunk base)', () => {
    // Las escalas que el chrome de la app usa deben existir como vars.
    const requiredVars = [
      '--c-slate-950', '--c-slate-900', '--c-slate-100', '--c-slate-50',
      '--c-emerald-400', '--c-emerald-700', '--c-amber-400', '--c-amber-700',
      '--c-surface', '--c-surface-card', '--c-surface-raised', '--c-surface-border',
      '--c-muzo', '--c-morpho', '--c-orchid', '--c-frog',
    ];
    for (const v of requiredVars) {
      expect(indexCss, `falta var ${v} en :root`).toMatch(new RegExp(`${v}\\s*:`));
    }
  });

  it('redefine el mapa --c-* en AMBOS temas claros (ninguna var cae al default)', () => {
    // Cada tema claro debe redefinir las MISMAS vars que :root, o una clase
    // heredaría el valor oscuro de biopunk → "Frankenstein".
    const baseVars = [...indexCss.matchAll(/(--c-[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
    const uniqueBase = [...new Set(baseVars)];
    expect(uniqueBase.length, 'pocas vars --c-* en :root').toBeGreaterThan(25);

    for (const theme of ['minimalista', 'nature', 'verde-vivo']) {
      const blockMatch = indexCss.match(
        new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\}`)
      );
      expect(blockMatch, `falta el bloque [data-theme="${theme}"]`).toBeTruthy();
      const block = blockMatch[1];
      for (const v of uniqueBase) {
        expect(block.includes(`${v}:`), `${theme} no redefine ${v}`).toBe(true);
      }
    }
  });

  it('los fondos base de los temas claros son CLAROS (no el slate-950 oscuro)', () => {
    // --c-slate-950 (fondo base) debe ser papel/crema en claro, no 2 6 23.
    const grab = (theme, varName) => {
      const block = indexCss.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\}`))[1];
      const m = block.match(new RegExp(`${varName}:\\s*([0-9]+)\\s+([0-9]+)\\s+([0-9]+)`));
      return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
    };
    for (const theme of ['minimalista', 'nature', 'verde-vivo']) {
      const [r, g, b] = grab(theme, '--c-slate-950');
      const avg = (r + g + b) / 3;
      expect(avg, `${theme} --c-slate-950 debe ser claro`).toBeGreaterThan(200);
    }
  });
});

/* ===========================================================================
 * CONTRATO DE EFECTOS (FX) + SCRIM + CONTRASTE AA (spec 2026-06-05)
 * ---------------------------------------------------------------------------
 * Lo que IMPIDE que los "cruces" vuelvan: si un tema claro deja un --fx-* en 1
 * (o sin definir → hereda el 1 de :root = bio-punk), el confeti/glow/patrón
 * neón sangra sobre la crema. Estos asserts congelan: (a) los tokens FX y scrim
 * existen en :root, (b) se redefinen en cada tema, (c) los claros los apagan,
 * (d) el texto principal de cada tema cumple AA (≥4.5) sobre su fondo.
 * =========================================================================== */

/** Extrae el bloque CSS de un selector de tema (o :root). */
function themeBlock(selector) {
  const re =
    selector === ':root'
      ? /:root\s*\{([\s\S]*?)\n\}/ // primer :root (mapa --c-* + --fx-*)
      : new RegExp(`\\[data-theme="${selector}"\\]\\s*\\{([\\s\\S]*?)\\}`);
  const m = indexCss.match(re);
  return m ? m[1] : null;
}

/** Lee el valor escalar de una var (--fx-particles: 0 → "0"). */
function readScalar(block, varName) {
  const m = block.match(new RegExp(`${varName}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}

/** Lee el triple RGB de una var (--scrim-bg: 2 6 23 → [2,6,23]). */
function readRgb(block, varName) {
  const m = block.match(
    new RegExp(`${varName}\\s*:\\s*([0-9]+)\\s+([0-9]+)\\s+([0-9]+)`)
  );
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Contraste WCAG entre dos RGB. */
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

const FX_VARS = ['--fx-particles', '--fx-glow-opacity', '--fx-bg-pattern'];
const SCRIM_VARS = ['--scrim-bg', '--scrim-opacity'];

describe('contrato de efectos (FX) gateados por tema (index.css)', () => {
  it('define los --fx-* y --scrim-* en :root (estado base bio-punk)', () => {
    const root = themeBlock(':root');
    expect(root, 'no se halló el bloque :root').toBeTruthy();
    for (const v of [...FX_VARS, ...SCRIM_VARS]) {
      expect(root.includes(`${v}:`), `falta ${v} en :root`).toBe(true);
    }
  });

  it('redefine TODOS los --fx-*/--scrim-* en cada tema (sin tokens huérfanos)', () => {
    // Si un tema NO redefine un --fx-*, hereda el 1 de :root → FX bio-punk
    // sangrando sobre el tema claro. El contrato exige redefinición explícita.
    for (const theme of ['minimalista', 'nature', 'verde-vivo']) {
      const block = themeBlock(theme);
      expect(block, `falta bloque [data-theme="${theme}"]`).toBeTruthy();
      for (const v of [...FX_VARS, ...SCRIM_VARS]) {
        expect(block.includes(`${v}:`), `${theme} no redefine ${v}`).toBe(true);
      }
    }
  });

  it('los temas CLAROS apagan partículas, patrón y glow (--fx-*: 0)', () => {
    for (const theme of ['minimalista', 'nature', 'verde-vivo']) {
      const block = themeBlock(theme);
      expect(readScalar(block, '--fx-particles'), `${theme} --fx-particles`).toBe('0');
      expect(readScalar(block, '--fx-bg-pattern'), `${theme} --fx-bg-pattern`).toBe('0');
      expect(readScalar(block, '--fx-glow-opacity'), `${theme} --fx-glow-opacity`).toBe('0');
    }
  });

  it('el scrim de los temas claros es CLARO (velo crema, no navy que lava)', () => {
    // En claros el --scrim-bg debe ser claro (promedio > 200) → un velo sutil
    // sobre la imagen, nunca el navy 2 6 23 que oscurecía la foto.
    for (const theme of ['minimalista', 'nature', 'verde-vivo']) {
      const block = themeBlock(theme);
      const rgb = readRgb(block, '--scrim-bg');
      expect(rgb, `${theme} --scrim-bg ausente`).toBeTruthy();
      const avg = (rgb[0] + rgb[1] + rgb[2]) / 3;
      expect(avg, `${theme} --scrim-bg debe ser claro`).toBeGreaterThan(200);
    }
  });
});

describe('contraste AA del texto principal de cada tema (sonda numérica)', () => {
  // El texto principal (--c-slate-100) sobre el fondo base (--c-slate-950) y
  // sobre la card (--c-slate-900) debe pasar AA (≥4.5) en CADA tema.
  const cases = [
    { theme: ':root', name: 'bio-punk' },
    { theme: 'minimalista', name: 'minimalista' },
    { theme: 'nature', name: 'nature' },
    { theme: 'verde-vivo', name: 'verde-vivo' },
  ];
  for (const { theme, name } of cases) {
    it(`${name}: texto principal ≥4.5 sobre fondo y card`, () => {
      const block = themeBlock(theme);
      const text = readRgb(block, '--c-slate-100');
      const bg = readRgb(block, '--c-slate-950');
      const card = readRgb(block, '--c-slate-900');
      expect(text, `${name} --c-slate-100`).toBeTruthy();
      expect(bg, `${name} --c-slate-950`).toBeTruthy();
      expect(card, `${name} --c-slate-900`).toBeTruthy();
      expect(contrastRatio(text, bg), `${name} texto/fondo`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(text, card), `${name} texto/card`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('themes.css — remapeo de clases NO-var-aware (la raíz del repeye)', () => {
  it('vira el TEXTO blanco a tinta del tema (text-white = ilegible sobre crema)', () => {
    expect(coveredForBothThemes('.text-white')).toBe(true);
    // El override debe apuntar a una tinta del tema (slate-100 = tinta en claro).
    expect(themesCss).toMatch(/\.text-white\b[\s\S]{0,120}color:\s*rgb\(var\(--c-slate-100\)/);
  });

  it('preserva el blanco SOBRE botones/acentos sólidos (ícono enviar verde)', () => {
    // Excepción de mayor especificidad: bg-emerald-500.text-white sigue blanco.
    expect(themesCss).toContain('.bg-emerald-500.text-white');
    expect(themesCss).toMatch(/color:\s*#fff\s*!important/);
  });

  it('vira bordes y scrims "glass" blancos al token del tema', () => {
    expect(themesCss).toContain('[data-theme="minimalista"] .border-white');
    expect(themesCss).toContain('[data-theme="nature"] .border-white');
    // bg-white/<α> (compositor + chips glass) remapeado a surface del tema.
    expect(themesCss).toMatch(/\[data-theme="(minimalista|nature)"\] \[class\*="bg-white\\\//);
  });

  it('vira el TEXTO ámbar claro a ocre oscuro AA en temas claros', () => {
    for (const sel of ['.text-amber-300', '.text-amber-400']) {
      expect(coveredForBothThemes(sel), `falta override ámbar ${sel}`).toBe(true);
    }
    // El override usa el ocre oscuro EXPLÍCITO rgb(160,76,20) (AA ≥4.5 sobre el
    // crema de nature). El token --c-amber-700 (176,90,32) daba 4.02 < AA, por eso
    // NO se usa la var sino el rgb literal — el assert sigue ese hecho del CSS.
    expect(themesCss).toMatch(/color:\s*rgb\(160,\s*76,\s*20\)/);
  });

  it('neutraliza las tarjetas tonales del impacto hero (bloques oscuros)', () => {
    for (const sel of ['.bg-cyan-950\\/40', '.bg-violet-950\\/40']) {
      expect(coveredForBothThemes(sel), `falta override tonal ${sel}`).toBe(true);
    }
    // Y vira los números coloridos al acento del tema.
    for (const sel of ['.text-cyan-300', '.text-violet-300', '.text-lime-300']) {
      expect(coveredForBothThemes(sel), `falta override de número ${sel}`).toBe(true);
    }
    // Nature usa un verde PROFUNDO para esos números (la salvia clara no
    // contrasta sobre crema): el bloque nature de text-cyan-300 usa --c-emerald-700.
    const natureImpact = themesCss.match(
      /\[data-theme="nature"\] \.text-cyan-300[\s\S]*?\{([\s\S]*?)\}/
    );
    expect(natureImpact, 'falta bloque nature .text-cyan-300').toBeTruthy();
    expect(natureImpact[1]).toContain('--c-emerald-700');
  });

  it('suaviza el halo verde del colibrí en temas claros', () => {
    expect(coveredForBothThemes('.chagra-hero-halo')).toBe(true);
    expect(coveredForBothThemes('.chagra-hero-halo-inner')).toBe(true);
  });

  it('reconstruye el lienzo bio-punk "cosecha mística" en CSS (sin data-theme)', () => {
    expect(themesCss).toContain('html:not([data-theme]) body.app-bg-biodiversidad:not([data-custom-bg])');
    expect(themesCss).toMatch(/--bp-teal-rgb:\s*25,\s*201,\s*154/);
  });
});
