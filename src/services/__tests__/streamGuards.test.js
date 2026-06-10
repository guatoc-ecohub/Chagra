/**
 * streamGuards.test.js — SEC-001: guardas de seguridad en el canal de STREAMING.
 *
 * PROBLEMA (auditoría DR-CHAGRA-AUDIT-IA-001, SEC-001, ALTO): el display en vivo
 * pinta cada token del LLM ANTES de que `applyOutputGuards` corra sobre el texto
 * FINAL. El usuario alcanza a LEER la dosis/receta peligrosa en pantalla aunque
 * el guard final la reemplace después. En campo eso es daño físico real.
 *
 * FIX bajo prueba: `createStreamGuard` envuelve el display del parcial. Reutiliza
 * los guards de PELIGRO ya existentes en outputGuards.js (sniff local, cero
 * latencia). Cuando un patrón peligroso dispara sobre el parcial, el display
 * pasa a un placeholder y NUNCA vuelve a pintar el crudo (latch) hasta que llega
 * el final ya guardado (que reemplaza limpio el stream).
 *
 * Doctrina anti-sobre-supresión (CRÍTICO):
 *  - Respuestas SEGURAS fluyen token a token IDÉNTICAS al crudo (cero cambio).
 *  - Dosis ORGÁNICAS legítimas ("2 kg de compost", "5 ml de jabón potásico")
 *    NO se suprimen — la batería reusa los anti-falsos-positivos de cada guard
 *    y EXCLUYE guards aditivos que disparan sobre contenido inocuo
 *    (guardDoseWithoutSource) y guards de siembra/cosmética.
 *
 * Doctrina perf (anti-O(n²)):
 *  - Latch: tras disparar, check() es O(1) — no se escanea más.
 *  - Throttle incremental: la batería corre como máximo cada `scanMinChars`
 *    chars nuevos; un hint barato (dígitos/keywords de riesgo) sobre SOLO el
 *    delta nuevo adelanta el scan sin re-escanear todo en cada token.
 */

import { describe, it, expect } from 'vitest';
import {
  createStreamGuard,
  sniffStreamDanger,
  STREAM_GUARD_PLACEHOLDER,
} from '../streamGuards.js';

/**
 * Simula el stream real: el LLM emite el texto en chunks y cada onToken recibe
 * el ACUMULADO (igual que markToken en AgentScreen). Devuelve la secuencia de
 * displays que el usuario habría visto en pantalla.
 */
function simulateStream(fullResponse, guard, chunkSize = 6) {
  const displays = [];
  for (let i = chunkSize; i < fullResponse.length + chunkSize; i += chunkSize) {
    displays.push(guard.check(fullResponse.slice(0, i)));
  }
  return displays;
}

const DANGEROUS_SYNTH_DOSE =
  'Para el gusano cogollero te recomiendo aplicar glifosato en dosis de 50 ml ' +
  'por bomba de 20 litros cada 8 días sobre el follaje afectado.';

const DANGEROUS_SYNTH_NO_DIGITS =
  'Para ese problema del lote te recomiendo aplicar glifosato sobre el follaje ' +
  'afectado con calma y luego seguir con el manejo habitual del cultivo para ' +
  'que la maleza no vuelva a aparecer en la temporada.';

const DANGEROUS_MIX =
  'Mezcla el caldo bordelés con el caldo sulfocálcico en el mismo tanque y ' +
  'aplica la mezcla al follaje cada semana para controlar el hongo.';

const SAFE_NO_HINTS =
  'El maíz se asocia muy bien con el frijol y la calabaza porque comparten ' +
  'nutrientes, dan sombra al suelo y se protegen entre ellas. Esa asociación ' +
  'tradicional mejora la vida del suelo y reduce las plagas sin químicos.';

const SAFE_ORGANIC_DOSES =
  'Para mejorar tu suelo aplica 2 kg de compost por árbol y 1 L de biol por ' +
  'planta cada mes. Para los pulgones prepara jabón potásico a 5 ml por litro ' +
  'de agua y aplica al envés de las hojas al atardecer.';

describe('sniffStreamDanger — batería de peligro sobre el parcial', () => {
  it('dispara con pesticida sintético + dosis', () => {
    const res = sniffStreamDanger(DANGEROUS_SYNTH_DOSE);
    expect(res.danger).toBe(true);
    expect(res.reason).toBeTruthy();
  });

  it('dispara con mezcla incompatible de biopreparados en el mismo tanque', () => {
    expect(sniffStreamDanger(DANGEROUS_MIX).danger).toBe(true);
  });

  it('NO dispara con respuesta segura sin dosis', () => {
    expect(sniffStreamDanger(SAFE_NO_HINTS).danger).toBe(false);
  });

  it('NO dispara con dosis orgánicas legítimas (compost, biol, jabón potásico)', () => {
    expect(sniffStreamDanger(SAFE_ORGANIC_DOSES).danger).toBe(false);
  });

  it('no-op con vacío / no-string', () => {
    expect(sniffStreamDanger('').danger).toBe(false);
    expect(sniffStreamDanger(null).danger).toBe(false);
    expect(sniffStreamDanger(undefined).danger).toBe(false);
  });
});

describe('createStreamGuard — display en vivo', () => {
  it('stream SEGURO fluye token a token idéntico al crudo (cero placeholder)', () => {
    const guard = createStreamGuard();
    const displays = simulateStream(SAFE_NO_HINTS, guard);
    displays.forEach((d, i) => {
      expect(d).toBe(SAFE_NO_HINTS.slice(0, Math.min((i + 1) * 6, SAFE_NO_HINTS.length)));
    });
    expect(displays.some((d) => d === STREAM_GUARD_PLACEHOLDER)).toBe(false);
    expect(guard.isDangerLatched()).toBe(false);
  });

  it('dosis ORGÁNICAS legítimas NO se suprimen (anti-sobre-supresión)', () => {
    const guard = createStreamGuard();
    const displays = simulateStream(SAFE_ORGANIC_DOSES, guard);
    expect(displays.some((d) => d === STREAM_GUARD_PLACEHOLDER)).toBe(false);
    expect(displays[displays.length - 1]).toBe(SAFE_ORGANIC_DOSES);
    expect(guard.isDangerLatched()).toBe(false);
  });

  it('stream PELIGROSO (sintético + dosis): el display queda guardado y la dosis cruda NUNCA se pinta', () => {
    const guard = createStreamGuard();
    const displays = simulateStream(DANGEROUS_SYNTH_DOSE, guard);
    // La cifra de la dosis jamás llega a pantalla (el hint de dígito fuerza el
    // scan en el mismo token en que aparece).
    expect(displays.some((d) => /50\s*ml/.test(d))).toBe(false);
    // El último display es el placeholder, no el crudo.
    expect(displays[displays.length - 1]).toBe(STREAM_GUARD_PLACEHOLDER);
    expect(guard.isDangerLatched()).toBe(true);
  });

  it('latch: tras disparar, TODOS los displays siguientes son placeholder (nunca vuelve el crudo)', () => {
    const guard = createStreamGuard();
    const displays = simulateStream(DANGEROUS_SYNTH_DOSE, guard);
    const firstHit = displays.indexOf(STREAM_GUARD_PLACEHOLDER);
    expect(firstHit).toBeGreaterThanOrEqual(0);
    for (let i = firstHit; i < displays.length; i += 1) {
      expect(displays[i]).toBe(STREAM_GUARD_PLACEHOLDER);
    }
  });

  it('throttle de piso garantiza detección aun SIN dígitos ni hints en el peligro', () => {
    const guard = createStreamGuard();
    const displays = simulateStream(DANGEROUS_SYNTH_NO_DIGITS, guard);
    // El piso de chars del throttle escanea periódicamente: al terminar el
    // stream el peligro quedó latcheado sí o sí.
    expect(displays[displays.length - 1]).toBe(STREAM_GUARD_PLACEHOLDER);
    expect(guard.isDangerLatched()).toBe(true);
  });

  it('mezcla incompatible de biopreparados → placeholder', () => {
    const guard = createStreamGuard();
    const displays = simulateStream(DANGEROUS_MIX, guard);
    expect(displays[displays.length - 1]).toBe(STREAM_GUARD_PLACEHOLDER);
  });

  it('perf: latch congela los scans (O(1) tras disparo)', () => {
    const guard = createStreamGuard();
    simulateStream(DANGEROUS_SYNTH_DOSE, guard);
    const scansAtLatch = guard.getScanCount();
    // Seguir alimentando tokens tras el latch no escanea más.
    guard.check(`${DANGEROUS_SYNTH_DOSE} y además`);
    guard.check(`${DANGEROUS_SYNTH_DOSE} y además repite`);
    expect(guard.getScanCount()).toBe(scansAtLatch);
  });

  it('perf: texto seguro SIN hints escanea solo por el piso del throttle (no por token)', () => {
    const scanMinChars = 64;
    const guard = createStreamGuard({ scanMinChars });
    const long = `${SAFE_NO_HINTS} ${SAFE_NO_HINTS}`;
    const displays = simulateStream(long, guard);
    // Cota: un scan como máximo cada `scanMinChars` chars nuevos — muy por
    // debajo de un scan por token.
    expect(guard.getScanCount()).toBeLessThanOrEqual(Math.ceil(long.length / scanMinChars) + 1);
    expect(guard.getScanCount()).toBeLessThan(displays.length);
  });

  it('reset en stream nuevo (segunda pasada tool-call): el latch NO contamina la respuesta nueva', () => {
    const guard = createStreamGuard();
    simulateStream(DANGEROUS_SYNTH_DOSE, guard);
    expect(guard.isDangerLatched()).toBe(true);
    // Texto más CORTO que el último parcial = stream nuevo (mismo patrón que
    // el reset streamingContentRef('') + segunda llamada del action loop).
    const displays = simulateStream(SAFE_NO_HINTS, guard);
    expect(guard.isDangerLatched()).toBe(false);
    expect(displays[displays.length - 1]).toBe(SAFE_NO_HINTS);
  });

  it('no-string / vacío: no revienta y devuelve string', () => {
    const guard = createStreamGuard();
    expect(guard.check(null)).toBe('');
    expect(guard.check(undefined)).toBe('');
    expect(guard.check('')).toBe('');
  });

  it('el placeholder es texto visible en español (tú/usted, sin voseo)', () => {
    expect(typeof STREAM_GUARD_PLACEHOLDER).toBe('string');
    expect(STREAM_GUARD_PLACEHOLDER.length).toBeGreaterThan(10);
    // Anti-voseo: nada de "tenés/querés/mostrarte vos".
    expect(/ten[eé]s|quer[eé]s|\bvos\b/i.test(STREAM_GUARD_PLACEHOLDER)).toBe(false);
  });
});

describe('createStreamGuard — receta de fermento sin caveat (DR-FOOD-3, caveat debe LIDERAR)', () => {
  it('la receta cruda no se pinta en vivo: el final guardado antepone el caveat', () => {
    const recipe =
      'Para preparar la kombucha necesitas un scoby, té negro y azúcar. Deja ' +
      'fermentar diez días en un frasco limpio y luego embotella con cuidado.';
    const guard = createStreamGuard({ userMessage: '¿cómo preparo kombucha en casa?' });
    const displays = simulateStream(recipe, guard);
    expect(displays[displays.length - 1]).toBe(STREAM_GUARD_PLACEHOLDER);
  });
});
