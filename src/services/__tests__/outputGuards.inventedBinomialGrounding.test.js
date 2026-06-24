/**
 * outputGuards.inventedBinomialGrounding.test.js — GUARD #95: BINOMIO LATINO
 * INVENTADO FUERA DEL GROUNDING (anti-alucinación-de-especie).
 *
 * PROBLEMA (tarea #95): existe una prompt-rule ("REGLA CRÍTICA DE ESPECIE
 * DESCONOCIDA" en agentService) que prohíbe inventar el binomio de una especie no
 * resuelta, pero faltaba el GUARD DETERMINÍSTICO de SALIDA que lo capture cuando
 * el modelo igual lo inventa por similitud fonética y lo cuelga entre paréntesis
 * de un nombre común ("tomate de árbol (Solanum lycopersicum)").
 *
 * DOCTRINA (conservadora, anti-falso-positivo — preferir falsos negativos a
 * romper respuestas válidas):
 *  - Solo actúa sobre la atribución "<nombre común> (Genus species)". Binomios
 *    sueltos en prosa NO se tocan.
 *  - Un binomio en el grounding del turno (resolvedEntities + sub-arrays) se
 *    CONSERVA.
 *  - Whitelist fuera del grafo: patógenos conocidos, insumos/biocontroles reales
 *    (neem, Bt, Trichoderma…), géneros de organismos benéficos (Aphidius…).
 *  - Sin grounding (entities vacío/null) NO actúa.
 *  - Quirúrgico (no nuke): quita el paréntesis y deja el nombre común. Idempotente.
 *
 * Casos cubiertos:
 *  1. Inventa binomio fuera de grounding → se neutraliza (queda el nombre común).
 *  2. Binomio EN grounding → se conserva.
 *  3. Sin binomios → sin cambio.
 *  4. Sin grounding → no-op (conservador).
 *  5. Whitelist patógeno / biocontrol / benéfico → se conserva.
 *  6. Idempotencia: segunda pasada no re-dispara.
 *  7. Prosa entre paréntesis (no binomio) → no se toca.
 *  8. Texto vacío / no-string → no-op.
 *  9. Múltiples atribuciones: neutraliza la inventada, conserva la grounded.
 * 10. E2E vía applyOutputGuards: el binomio inventado desaparece de la respuesta.
 */

import { describe, it, expect } from 'vitest';
import {
  guardInventedBinomialOutOfGrounding,
  applyOutputGuards,
} from '../outputGuards.js';

const grounding = (overrides = []) => [
  { kind: 'species', nombre_comun: 'tomate', mentioned: 'tomate', nombre_cientifico: 'Solanum lycopersicum', viabilidad: 'viable' },
  ...overrides,
];

describe('guardInventedBinomialOutOfGrounding (guard #95)', () => {
  // ── CASO 1: el bug — binomio inventado fuera de grounding ───────────────────
  it('neutraliza un binomio inventado fuera del grounding, conservando el nombre común', () => {
    const text = 'El tomate de árbol (Solanum lycopersicum) se siembra en clima frío.';
    // El grounding del turno NO trae "tomate de árbol"; trae papa.
    const ent = [{ nombre_comun: 'papa', nombre_cientifico: 'Solanum tuberosum' }];
    const res = guardInventedBinomialOutOfGrounding(text, ent);

    expect(res.modified).toBe(true);
    expect(res.text).not.toMatch(/Solanum lycopersicum/);
    expect(res.text).toContain('tomate de árbol');
    // sin paréntesis huérfano ni doble espacio
    expect(res.text).toBe('El tomate de árbol se siembra en clima frío.');
    expect(res.reason).toMatch(/binomio_inventado_fuera_de_grounding/);
    expect(res.binomials).toContain('solanum lycopersicum');
  });

  // ── CASO 2: binomio EN grounding → se conserva ──────────────────────────────
  it('conserva un binomio que SÍ está en el grounding del turno', () => {
    const text = 'El tomate (Solanum lycopersicum) prospera bien a clima medio.';
    const res = guardInventedBinomialOutOfGrounding(text, grounding());

    expect(res.modified).toBe(false);
    expect(res.text).toBe(text);
    expect(res.text).toContain('Solanum lycopersicum');
  });

  it('conserva un binomio de un sub-array del grounding (companions/alternativas)', () => {
    const text = 'Como alternativa, la mora (Rubus glaucus) va bien en tu zona.';
    const ent = [
      {
        nombre_comun: 'lulo',
        nombre_cientifico: 'Solanum quitoense',
        alternativas_viables: [{ nombre_comun: 'mora', nombre_cientifico: 'Rubus glaucus' }],
      },
    ];
    const res = guardInventedBinomialOutOfGrounding(text, ent);

    expect(res.modified).toBe(false);
    expect(res.text).toContain('Rubus glaucus');
  });

  // ── CASO 3: sin binomios → sin cambio ───────────────────────────────────────
  it('no cambia un texto sin binomios entre paréntesis', () => {
    const text = 'El tomate de árbol se siembra en clima frío y necesita buena poda.';
    const res = guardInventedBinomialOutOfGrounding(text, grounding());

    expect(res.modified).toBe(false);
    expect(res.text).toBe(text);
    expect(res.reason).toBeNull();
  });

  // ── CASO 4: sin grounding → no-op (conservador) ─────────────────────────────
  it('no actúa cuando no hay grounding del turno (preferir falso negativo)', () => {
    const text = 'El tomate de árbol (Solanum lycopersicum) se siembra en clima frío.';
    expect(guardInventedBinomialOutOfGrounding(text, []).modified).toBe(false);
    expect(guardInventedBinomialOutOfGrounding(text, null).modified).toBe(false);
  });

  // ── CASO 5: whitelist fuera del grafo ───────────────────────────────────────
  it('conserva un binomio de PATÓGENO conocido (Mycosphaerella fijiensis)', () => {
    const text = 'El plátano sufre Sigatoka negra (Mycosphaerella fijiensis) en zonas húmedas.';
    const res = guardInventedBinomialOutOfGrounding(text, grounding());

    expect(res.modified).toBe(false);
    expect(res.text).toContain('Mycosphaerella fijiensis');
  });

  it('conserva un BIOCONTROL real (neem = Azadirachta indica)', () => {
    const text = 'Aplica neem (Azadirachta indica) diluido al follaje.';
    const res = guardInventedBinomialOutOfGrounding(text, grounding());

    expect(res.modified).toBe(false);
    expect(res.text).toContain('Azadirachta indica');
  });

  it('conserva un ORGANISMO BENÉFICO real (género allowlisteado, Aphidius colemani)', () => {
    const text = 'Contra el pulgón suelta la avispita (Aphidius colemani).';
    const res = guardInventedBinomialOutOfGrounding(text, grounding());

    expect(res.modified).toBe(false);
    expect(res.text).toContain('Aphidius colemani');
  });

  // ── CASO 6: idempotencia ────────────────────────────────────────────────────
  it('es idempotente: segunda pasada no re-dispara', () => {
    const text = 'El borojó de monte (Quercus inventado) se da en sombra.';
    const ent = [{ nombre_comun: 'café', nombre_cientifico: 'Coffea arabica' }];
    const first = guardInventedBinomialOutOfGrounding(text, ent);
    expect(first.modified).toBe(true);

    const second = guardInventedBinomialOutOfGrounding(first.text, ent);
    expect(second.modified).toBe(false);
    expect(second.text).toBe(first.text);
  });

  // ── CASO 7: prosa entre paréntesis (no binomio) → no se toca ────────────────
  it('no toca un paréntesis de prosa española (no es binomio latino)', () => {
    const text = 'El tomate de árbol (que es nativo de los Andes) crece bien en ladera.';
    const res = guardInventedBinomialOutOfGrounding(text, grounding());

    expect(res.modified).toBe(false);
    expect(res.text).toBe(text);
  });

  // ── CASO 8: texto vacío / no-string ─────────────────────────────────────────
  it('es no-op ante texto vacío o no-string', () => {
    expect(guardInventedBinomialOutOfGrounding('', grounding()).modified).toBe(false);
    expect(guardInventedBinomialOutOfGrounding(null, grounding()).modified).toBe(false);
    expect(guardInventedBinomialOutOfGrounding(undefined, grounding()).modified).toBe(false);
  });

  // ── CASO 9: múltiples atribuciones — selectivo ──────────────────────────────
  it('neutraliza solo la atribución inventada y conserva la grounded', () => {
    const text =
      'El tomate (Solanum lycopersicum) va bien, pero el tomate de árbol (Solanum lycopersicum) no es lo mismo.';
    // grounding trae tomate=Solanum lycopersicum. La SEGUNDA atribución (al tomate
    // de árbol) usa el MISMO binomio del tomate → es la misma especie del grounding,
    // así que se conserva (no inventado). Verificamos un binomio inventado distinto:
    const text2 =
      'El tomate (Solanum lycopersicum) va bien; el lulo de monte (Solanum giganteum) no está en catálogo.';
    const res = guardInventedBinomialOutOfGrounding(text2, grounding());

    expect(res.modified).toBe(true);
    expect(res.text).toContain('Solanum lycopersicum'); // grounded, conservado
    expect(res.text).not.toMatch(/Solanum giganteum/); // inventado, neutralizado
    expect(res.text).toContain('lulo de monte');
    // el primer texto (mismo binomio del grounding en ambas) no se modifica
    expect(guardInventedBinomialOutOfGrounding(text, grounding()).modified).toBe(false);
  });
});

describe('applyOutputGuards — integración guard #95', () => {
  it('E2E: el binomio inventado fuera de grounding desaparece de la respuesta final', () => {
    const ent = [
      { kind: 'species', nombre_comun: 'papa', mentioned: 'papa', nombre_cientifico: 'Solanum tuberosum', viabilidad: 'viable' },
    ];
    const text = 'El lulo de monte (Solanum giganteum) es una fruta silvestre que crece a buena altura.';
    const res = applyOutputGuards(text, { resolvedEntities: ent, userMessage: '¿qué sabes del lulo de monte?' });

    expect(res.modified).toBe(true);
    expect(res.text).not.toMatch(/Solanum giganteum/);
    expect(res.text).toContain('lulo de monte');
    expect(res.reasons).toContain('binomio_inventado_fuera_de_grounding: solanum giganteum');
  });

  it('E2E: un binomio grounded sobrevive intacto a la cadena de guards', () => {
    const ent = [
      { kind: 'species', nombre_comun: 'tomate', mentioned: 'tomate', nombre_cientifico: 'Solanum lycopersicum', viabilidad: 'viable' },
    ];
    const text = 'El tomate (Solanum lycopersicum) se da bien con riego constante.';
    const res = applyOutputGuards(text, { resolvedEntities: ent, userMessage: '¿cómo cuido el tomate?' });

    expect(res.text).toContain('Solanum lycopersicum');
    expect((res.reasons || []).join(' ')).not.toMatch(/binomio_inventado_fuera_de_grounding/);
  });
});
