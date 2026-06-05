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

    for (const theme of ['minimalista', 'nature']) {
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
    for (const theme of ['minimalista', 'nature']) {
      const [r, g, b] = grab(theme, '--c-slate-950');
      const avg = (r + g + b) / 3;
      expect(avg, `${theme} --c-slate-950 debe ser claro`).toBeGreaterThan(200);
    }
  });
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
    expect(themesCss).toMatch(/color:\s*rgb\(var\(--c-amber-700\)/);
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
