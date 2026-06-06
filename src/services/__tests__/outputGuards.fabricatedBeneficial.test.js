/**
 * outputGuards.fabricatedBeneficial.test.js — GUARD: binomio de organismo
 * BENÉFICO fabricado (depredador / parasitoide / polinizador).
 *
 * BUG REAL (2026-06-06): respondiendo sobre control del pulgón, el agente
 * recomendó enemigos naturales e INVENTÓ un binomio que no existe: "hormigas
 * cazadoras (*Oligamus pectoralis*)". `Aphidius colemani`, mencionado al lado,
 * SÍ es real. El campesino recibe un nombre falso de organismo benéfico →
 * desinformación.
 *
 * DOCTRINA (conservadora, anti-falso-positivo):
 *  - "No está en el catálogo" ≠ "inventado". Colombia tiene muchísimas especies
 *    nativas reales fuera de las ~496 del catálogo → NUNCA suprimir un binomio
 *    por no estar en el grafo (tacharíamos nativas legítimas).
 *  - El guard NO borra: ANEXA un caveat suave sobre los binomios de organismos
 *    benéficos que NO se pueden confirmar contra una allowlist curada de géneros
 *    de biocontrol REALES y conocidos. El cuerpo del LLM queda intacto.
 *  - Solo actúa en CONTEXTO de control biológico / enemigos naturales: un binomio
 *    suelto fuera de ese contexto no se toca.
 *  - Géneros de biocontrol reales y conocidos (Aphidius, Chrysoperla, Coccinella,
 *    Trichogramma…) NO reciben caveat.
 *  - Determinístico, barato (regex + lookup), idempotente, sin llamar al LLM.
 *
 * Casos cubiertos:
 *  1. Caso real "Oligamus pectoralis" (género inexistente) en contexto de
 *     enemigos naturales → recibe caveat suave.
 *  2. Anti-FP: "Aphidius colemani" (parasitoide real) en el mismo contexto → NO
 *     recibe caveat.
 *  3. Anti-FP: "Chrysoperla" / "Chrysoperla carnea" (crisopa real) → NO caveat.
 *  4. Anti-FP: especie nativa real fuera de catálogo, mencionada como cultivo /
 *     planta (NO como enemigo natural) → NO se toca (ni caveat ni supresión).
 *  5. El caveat es ADITIVO: el cuerpo original se preserva entero.
 *  6. Idempotencia: segunda pasada no re-anexa.
 *  7. Texto vacío / no-string → no-op.
 *  8. Binomio grounded (en resolvedEntities) → no recibe caveat aunque su
 *     género no esté en la allowlist (la fuente curada lo respalda).
 */

import { describe, it, expect } from 'vitest';
import {
  guardFabricatedBeneficialBinomial,
  applyOutputGuards,
  getOutputGuardTelemetry,
  resetOutputGuardTelemetry,
} from '../outputGuards.js';

// Marca textual del caveat para asserts robustos (independiente de la prosa).
const CAVEAT_MARK = /verifica este nombre con tu t[eé]cnico|no pude confirmar/i;

describe('guardFabricatedBeneficialBinomial', () => {
  // ── CASO 1: el bug real ────────────────────────────────────────────────────
  it('caso real: "Oligamus pectoralis" como enemigo natural → caveat suave', () => {
    const text =
      'Para el pulgón puedes usar enemigos naturales como las hormigas cazadoras ' +
      '(Oligamus pectoralis) y la avispita parasitoide Aphidius colemani, que atacan a los áfidos.';

    const res = guardFabricatedBeneficialBinomial(text);

    expect(res.modified).toBe(true);
    // El caveat menciona el binomio dudoso
    expect(res.text).toContain('Oligamus pectoralis');
    // El caveat es de "no pude confirmar" / "verifica con tu técnico"
    expect(res.text).toMatch(CAVEAT_MARK);
    // NUNCA borra: el cuerpo original sigue presente
    expect(res.text).toContain('pulgón');
    expect(res.text).toContain('hormigas cazadoras');
    // El parasitoide REAL del mismo texto NO debe figurar como dudoso
    expect(res.text).not.toMatch(/Aphidius colemani[^.]*no pude confirmar/i);
  });

  // ── CASO 2: anti-FP parasitoide real ──────────────────────────────────────
  it('anti-FP: "Aphidius colemani" (parasitoide real) → NO caveat', () => {
    const text =
      'Contra el pulgón, libera la avispita parasitoide Aphidius colemani; ' +
      'es un enemigo natural muy efectivo de los áfidos.';

    const res = guardFabricatedBeneficialBinomial(text);

    expect(res.modified).toBe(false);
    expect(res.text).toBe(text);
    expect(res.text).not.toMatch(CAVEAT_MARK);
  });

  // ── CASO 3: anti-FP crisopa real ──────────────────────────────────────────
  it('anti-FP: "Chrysoperla carnea" (crisopa, depredador real) → NO caveat', () => {
    const text =
      'La crisopa (Chrysoperla carnea) es un depredador voraz de pulgones y ' +
      'sus larvas devoran cochinillas. Es un excelente controlador biológico.';

    const res = guardFabricatedBeneficialBinomial(text);

    expect(res.modified).toBe(false);
    expect(res.text).toBe(text);
  });

  it('anti-FP: catarina / mariquita "Coccinella septempunctata" depredador → NO caveat', () => {
    const text =
      'Las mariquitas (Coccinella septempunctata) son depredadoras de áfidos; ' +
      'atrae estos enemigos naturales sembrando flores.';
    const res = guardFabricatedBeneficialBinomial(text);
    expect(res.modified).toBe(false);
  });

  // ── CASO 4: anti-FP especie nativa fuera de catálogo (NO benéfica) ────────
  it('anti-FP: especie nativa real fuera de catálogo como CULTIVO → no se toca', () => {
    // Genus real colombiano, probablemente fuera de las ~496 del catálogo, pero
    // mencionado como planta/cultivo, NO como enemigo natural. Sin contexto de
    // biocontrol → el guard no debe tocarlo.
    const text =
      'El chontaduro (Bactris gasipaes) y el copoazú (Theobroma grandiflorum) ' +
      'son cultivos amazónicos que se dan bien en tu zona cálida y húmeda.';

    const res = guardFabricatedBeneficialBinomial(text);

    expect(res.modified).toBe(false);
    expect(res.text).toBe(text);
    expect(res.text).not.toMatch(CAVEAT_MARK);
  });

  it('anti-FP: binomio plausible pero SIN contexto de enemigo natural → no se toca', () => {
    // "Inga edulis" mencionado como árbol de sombra, no como biocontrol.
    const text =
      'El guamo (Inga edulis) da buena sombra al cafetal y fija nitrógeno en el suelo.';
    const res = guardFabricatedBeneficialBinomial(text);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(text);
  });

  // ── CASO 5: el caveat es ADITIVO ──────────────────────────────────────────
  it('el caveat ANEXA, no reemplaza: el cuerpo del LLM queda intacto', () => {
    const text =
      'Suelta el depredador Falsus inexistentus para comerse las larvas. ' +
      'También ayuda mantener flores que atraigan polinizadores.';

    const res = guardFabricatedBeneficialBinomial(text);

    expect(res.modified).toBe(true);
    // todo el cuerpo original presente
    expect(res.text).toContain('Falsus inexistentus');
    expect(res.text).toContain('mantener flores que atraigan polinizadores');
    expect(res.text).toMatch(CAVEAT_MARK);
  });

  // ── CASO 6: idempotencia ──────────────────────────────────────────────────
  it('idempotencia: segunda pasada no re-anexa el caveat', () => {
    const text =
      'Las hormigas cazadoras (Oligamus pectoralis) atacan al pulgón como enemigos naturales.';
    const first = guardFabricatedBeneficialBinomial(text);
    expect(first.modified).toBe(true);

    const second = guardFabricatedBeneficialBinomial(first.text);
    expect(second.modified).toBe(false);
    expect(second.text).toBe(first.text);
  });

  // ── CASO 7: texto vacío / no-string ───────────────────────────────────────
  it('texto vacío → no-op', () => {
    expect(guardFabricatedBeneficialBinomial('')).toEqual({
      text: '',
      modified: false,
      reason: null,
    });
  });

  it('texto no-string → no-op graceful', () => {
    const r = guardFabricatedBeneficialBinomial(null);
    expect(r.modified).toBe(false);
    expect(r.text).toBe('');
  });

  // ── CASO 8: binomio grounded → no recibe caveat ───────────────────────────
  it('binomio grounded (resolvedEntities) → NO caveat aunque género desconocido', () => {
    // Si el grounding curado trae el binomio (p.ej. como pest_controller), está
    // respaldado por una fuente y NO debe marcarse como dudoso, aunque su género
    // no esté en la allowlist estática.
    const text =
      'Para el pulgón usa el parasitoide Lysiphlebus testaceipes, un enemigo natural.';
    const resolvedEntities = [
      {
        kind: 'species',
        nombre_comun: 'pulgón',
        nombre_cientifico: 'Aphis gossypii',
        pest_controllers: [
          { nombre_comun: 'avispita', nombre_cientifico: 'Lysiphlebus testaceipes' },
        ],
      },
    ];

    const res = guardFabricatedBeneficialBinomial(text, resolvedEntities);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(text);
  });

  // ── prosa española capitalizada no se trata como binomio ──────────────────
  it('prosa española capitalizada no dispara (Sin embargo / Estos enemigos)', () => {
    const text =
      'Sin embargo, los enemigos naturales ayudan. Estos depredadores controlan la plaga.';
    const res = guardFabricatedBeneficialBinomial(text);
    expect(res.modified).toBe(false);
  });

  // ── telemetría ────────────────────────────────────────────────────────────
  it('dispara telemetría cuando anexa el caveat', () => {
    resetOutputGuardTelemetry();
    const text =
      'Usa el depredador Inventus benefico contra el pulgón como enemigo natural.';
    guardFabricatedBeneficialBinomial(text);
    const t = getOutputGuardTelemetry();
    expect(t['fabricated_beneficial_binomial']).toBeGreaterThan(0);
  });
});

// ── integración con applyOutputGuards ─────────────────────────────────────────
describe('applyOutputGuards · binomio benéfico fabricado', () => {
  it('el caso real pasa por la cadena y sale con caveat (no suprimido)', () => {
    const text =
      'Para el pulgón, usa enemigos naturales como las hormigas cazadoras ' +
      '(Oligamus pectoralis) junto con Aphidius colemani.';

    const out = applyOutputGuards(text, {
      userMessage: '¿cómo controlo el pulgón en mi cultivo?',
    });

    expect(out.modified).toBe(true);
    expect(out.text).toContain('Oligamus pectoralis');
    expect(out.text).toMatch(CAVEAT_MARK);
    // aditivo: el binomio real sobrevive sin caveat propio
    expect(out.text).toContain('Aphidius colemani');
  });

  it('anti-FP en cadena: respuesta solo con benéficos reales no recibe el caveat de fabricación', () => {
    const text =
      'Contra el pulgón libera Aphidius colemani y atrae crisopas (Chrysoperla carnea).';
    const out = applyOutputGuards(text, {
      userMessage: '¿qué enemigos naturales hay para el pulgón?',
    });
    // Puede que otros guards aditivos (MIP) actúen, pero NUNCA el caveat de
    // binomio fabricado sobre estos dos reales.
    expect(out.text).not.toMatch(/Aphidius colemani[^.]*no pude confirmar/i);
    expect(out.text).not.toMatch(/Chrysoperla carnea[^.]*no pude confirmar/i);
  });
});
