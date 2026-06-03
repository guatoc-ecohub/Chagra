/**
 * themes.css — contrato de cobertura de los temas nature/minimalista.
 *
 * Contexto (2026-06-03, reporte operador demo Bogotá): los temas nature y
 * minimalista se veían "horribles / no presentables" en la PWA porque el
 * sistema de remap por `[data-theme]` solo cubría un subconjunto de clases
 * Tailwind. Varias superficies clave (impacto hero tonal, chips del agente,
 * compositor "glass" del home, gradientes de acento, halo del colibrí) usaban
 * clases NO cubiertas → quedaban oscuras/neón sobre el fondo crema.
 *
 * Este test es el CONTRATO: bloquea regresiones verificando que themes.css
 * contiene las reglas de override para las clases que en su día se veían mal.
 * No valida render (eso lo hace la suite visual Playwright), valida que las
 * superficies problemáticas estén REMAPEADAS para AMBOS temas claros.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, '..', 'themes.css'), 'utf8');

/** Helper: ¿themes.css contiene una regla de override para `selector` en
 *  AMBOS temas claros (nature y minimalista)? Busca el fragmento escapado tal
 *  cual aparece en el CSS (Tailwind escapa `/` y `.` con `\`). */
function coveredForBothThemes(escapedSelector) {
  const nature = css.includes(`[data-theme="nature"] ${escapedSelector}`);
  const minimal = css.includes(`[data-theme="minimalista"] ${escapedSelector}`);
  return nature && minimal;
}

describe('themes.css — cobertura nature/minimalista', () => {
  it('define las variables de tema y el rgb de fondo para halos/scrims', () => {
    expect(css).toContain('[data-theme="nature"]');
    expect(css).toContain('[data-theme="minimalista"]');
    // --t-bg-rgb es necesario para el halo-inner del avatar en claro (§15).
    expect(css).toMatch(/--t-bg-rgb:\s*246,\s*239,\s*224/); // nature
    expect(css).toMatch(/--t-bg-rgb:\s*246,\s*243,\s*236/); // minimalista
  });

  it('remapea las superficies slate con opacidad que antes quedaban oscuras', () => {
    // Estas son exactamente las que faltaban (chips del agente, sugerencias).
    for (const sel of [
      '.bg-slate-800\\/80',
      '.bg-slate-700\\/80',
      '.bg-slate-900\\/80',
      '.bg-slate-800\\/30',
      '.bg-slate-700',
    ]) {
      expect(coveredForBothThemes(sel), `falta override de ${sel}`).toBe(true);
    }
  });

  it('remapea las superficies "glass" blancas del AgentHero (compositor + chips)', () => {
    for (const sel of [
      '.bg-white\\/\\[0\\.06\\]',
      '.bg-white\\/10',
      '.bg-white\\/5',
      '.border-white\\/10',
    ]) {
      expect(coveredForBothThemes(sel), `falta override glass ${sel}`).toBe(true);
    }
  });

  it('neutraliza las tarjetas tonales del impacto hero (el bloque gris feo)', () => {
    // Fondos tonales oscuros del carrusel "Chagra · impacto".
    for (const sel of [
      '.bg-cyan-950\\/40',
      '.bg-emerald-950\\/40',
      '.bg-violet-950\\/40',
    ]) {
      expect(coveredForBothThemes(sel), `falta override tonal ${sel}`).toBe(true);
    }
    // Y vira los números coloridos (text-{tone}-300) al acento del tema.
    for (const sel of ['.text-cyan-300', '.text-violet-300', '.text-lime-300']) {
      expect(coveredForBothThemes(sel), `falta override de número ${sel}`).toBe(true);
    }
  });

  it('vira los gradientes de acento (texto "Chagra" + botón enviar) al acento', () => {
    expect(coveredForBothThemes('.from-emerald-300.to-lime-300')).toBe(true);
    expect(coveredForBothThemes('.from-lime-400.to-emerald-500')).toBe(true);
  });

  it('suaviza el halo verde del colibrí en temas claros', () => {
    expect(coveredForBothThemes('.chagra-hero-halo')).toBe(true);
    expect(coveredForBothThemes('.chagra-hero-halo-inner')).toBe(true);
  });

  it('reconstruye el lienzo bio-punk "cosecha mística" en CSS (sin data-theme)', () => {
    // El default bio-punk debe traer el lienzo digital del demo (grid teal +
    // glow), gated por :not([data-custom-bg]) para respetar foto custom.
    expect(css).toContain('html:not([data-theme]) body.app-bg-biodiversidad:not([data-custom-bg])');
    expect(css).toMatch(/--bp-teal-rgb:\s*25,\s*201,\s*154/);
  });
});
