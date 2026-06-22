/**
 * outputGuards.leakQuemaTexto.test.js — guards que MODIFICAN el texto mostrado.
 *
 * Verificación en vivo (agente prod, 2026-06-21):
 *   - LEAK: el agente respondía al usuario con plomería interna
 *     ("...usa query_corpus_dr034 / corpus DR-034..."). El sidecar lo redactaba
 *     pero el PWA solo lo usaba para la badge (no reescribía el texto), así que el
 *     usuario AÚN veía el leak.
 *   - QUEMA: el agente respondía "la quema puede tener beneficios... liberar
 *     nutrientes" — sin desaconsejarla.
 *
 * Estos dos guards viven AHORA en outputGuards (capa que SÍ reescribe
 * `guarded.text`, corre SIEMPRE, no gateada por entidades), espejo aplicado-al-
 * texto de sanitizeToolingLeak / detectBurnEndorsement+buildBurnSafetyCorrection
 * del sidecar (modules/agro-mcp/sidecar/src/lib/response-safety.ts).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardToolingLeakRedaction,
  guardBurnEndorsementCorrection,
  buildBurnSafetyCorrection,
  TOOLING_LEAK_REDACTION,
  applyOutputGuards,
  getOutputGuardTelemetry,
  resetOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

// Identificadores de plomería interna que JAMÁS deben sobrevivir en el texto.
const LEAK_RE =
  /query_corpus|corpus\s+DR[-\s]?\d|DR[-\s]?\d{2,}|\bget_[a-z]|\bquery_[a-z]|\/home\/|modules\/[a-z]|\.ts\b|\.js\b/i;

describe('guardToolingLeakRedaction — redacta leak de tooling EN EL TEXTO', () => {
  it('redacta "corpus DR-034" conservando el contenido agronómico', () => {
    const llm =
      'Para tu lulo puedo buscar en el corpus DR-034 los controladores de plaga. Aplica caldo bordelés al 1%.';
    const out = guardToolingLeakRedaction(llm);

    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/^tooling_leak_redaction/);
    expect(out.text).not.toMatch(LEAK_RE);
    // El contenido legítimo sobrevive.
    expect(out.text).toMatch(/caldo bordel[ée]s al 1%/i);
    expect(out.text).toMatch(/lulo/i);
    // El reemplazo es natural (no deja "el corpus" colgando).
    expect(out.text).toMatch(/cat[áa]logo/i);
    expect(out.text).not.toMatch(/\bel\s+corpus\b/i);
  });

  it('redacta "usa la herramienta query_corpus_dr034" (frase delatora completa)', () => {
    const llm =
      'Te puedo ayudar; voy a usar la herramienta query_corpus_dr034 para revisar. La Ley 1930 protege los páramos.';
    const out = guardToolingLeakRedaction(llm);

    expect(out.modified).toBe(true);
    expect(out.text).not.toMatch(LEAK_RE);
    // No deja "la herramienta el catálogo" ni "voy a ... el catálogo" agramatical.
    expect(out.text).not.toMatch(/herramienta\s+(?:el\s+)?cat[áa]logo/i);
    expect(out.text).not.toMatch(/\bvoy\s+a\s+(?:el\s+)?cat[áa]logo/i);
    expect(out.text).toMatch(/lo busco en el cat[áa]logo/i);
    // Normativa pública legítima intacta.
    expect(out.text).toMatch(/Ley 1930/);
  });

  it('redacta nombres de tools internas get_*/query_* y rutas internas', () => {
    const llm =
      'Consulta get_biopreparados y get_normativa_ica; el archivo modules/agro-mcp/x.ts en /home/runner/x.';
    const out = guardToolingLeakRedaction(llm);

    expect(out.modified).toBe(true);
    expect(out.text).not.toMatch(LEAK_RE);
    expect(out.text).not.toMatch(/get_/i);
    expect(out.text).not.toMatch(/\.ts\b/);
    expect(out.text).not.toMatch(/\/home\//);
  });

  it('NO toca términos legítimos (caldo bordelés, binomio latino, Ley 1930)', () => {
    const limpio =
      'El caldo bordelés al 1% (sulfato de cobre + cal) controla la gota. Phytophthora infestans ataca la papa. La Ley 1930 de 2018 protege los páramos.';
    const out = guardToolingLeakRedaction(limpio);

    expect(out.modified).toBe(false);
    expect(out.text).toBe(limpio);
  });

  it('NO dispara con prosa agronómica sin plomería interna', () => {
    const limpio = 'Siembra la curuba entre 1800 y 2600 msnm; asóciala con frijol para fijar nitrógeno.';
    const out = guardToolingLeakRedaction(limpio);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(limpio);
  });

  it('es idempotente: el marcador no vuelve a dispararse', () => {
    const llm = 'puedo buscar en el corpus DR-034 eso para ti.';
    const once = guardToolingLeakRedaction(llm);
    expect(once.modified).toBe(true);
    expect(once.text).toContain(TOOLING_LEAK_REDACTION);
    const twice = guardToolingLeakRedaction(once.text);
    expect(twice.modified).toBe(false);
    expect(twice.text).toBe(once.text);
  });

  it('no-op ante entrada vacía o no-string', () => {
    expect(guardToolingLeakRedaction('').modified).toBe(false);
    expect(guardToolingLeakRedaction(null).modified).toBe(false);
    expect(guardToolingLeakRedaction(undefined).modified).toBe(false);
  });
});

describe('guardBurnEndorsementCorrection — corrige quema balanceada EN EL TEXTO', () => {
  it('corrige la respuesta balanceada de prod ("la quema puede tener beneficios")', () => {
    const llm =
      'La quema puede tener beneficios y desventajas: la ceniza aporta nutrientes como potasio y calcio al suelo.';
    const out = guardBurnEndorsementCorrection(llm);

    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/^quema_balanceada_corregida/);
    // La corrección LIDERA (desaconseja la quema).
    expect(out.text.startsWith('⚠️ Importante: no se recomienda quemar')).toBe(true);
    expect(out.text).toMatch(/materia org[áa]nica/i);
    expect(out.text).toMatch(/biolog[íi]a del suelo/i);
    expect(out.text).toMatch(/Ley 1930 de 2018/);
    // Alternativas agroecológicas presentes.
    expect(out.text).toMatch(/rastrojo/i);
    expect(out.text).toMatch(/mulch/i);
    expect(out.text).toMatch(/compost/i);
    expect(out.text).toMatch(/abonos verdes/i);
    // El cuerpo original se preserva debajo (aditivo).
    expect(out.text).toContain(llm);
  });

  it('dispara con el fraseo ceniza-como-nutriente aun sin verbo de quema explícito', () => {
    const llm = 'Después de la cosecha, la ceniza aporta potasio y calcio que enriquecen el suelo.';
    const out = guardBurnEndorsementCorrection(llm);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/no se recomienda quemar/);
  });

  it('marca el agravante de páramo cuando hay contexto de páramo', () => {
    const llm = 'En el páramo la quema puede tener beneficios porque la ceniza libera nutrientes.';
    const out = guardBurnEndorsementCorrection(llm);
    expect(out.modified).toBe(true);
    expect(out.reason).toBe('quema_balanceada_corregida_paramo');
    expect(out.text).toMatch(/P[ÁA]RAMO la quema es un delito grave/);
  });

  it('NO toca una respuesta que YA desaconseja la quema', () => {
    const limpio =
      'No se recomienda quemar el rastrojo; mejor incorpóralo al suelo. La ceniza aporta muy poco frente al daño.';
    const out = guardBurnEndorsementCorrection(limpio);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(limpio);
  });

  it('FALSO POSITIVO evitado: "el compost aporta nutrientes" sin quema NO dispara', () => {
    const limpio =
      'El compost aporta nutrientes como potasio y calcio; es una buena práctica para el suelo.';
    const out = guardBurnEndorsementCorrection(limpio);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(limpio);
  });

  it('FALSO POSITIVO evitado: mencionar la Ley 1930 (sin quema) NO dispara', () => {
    const limpio = 'La Ley 1930 de 2018 protege los páramos; siembra nativas y deja cobertura viva.';
    const out = guardBurnEndorsementCorrection(limpio);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(limpio);
  });

  it('es idempotente: no vuelve a anteponer la corrección', () => {
    const llm = 'La quema puede tener beneficios; la ceniza aporta potasio.';
    const once = guardBurnEndorsementCorrection(llm);
    expect(once.modified).toBe(true);
    const twice = guardBurnEndorsementCorrection(once.text);
    expect(twice.modified).toBe(false);
    expect(twice.text).toBe(once.text);
  });

  it('buildBurnSafetyCorrection: variante páramo agrega el marco legal específico', () => {
    const noParamo = buildBurnSafetyCorrection(false);
    const paramo = buildBurnSafetyCorrection(true);
    expect(noParamo).toMatch(/Ley 1930 de 2018/);
    expect(noParamo).not.toMatch(/delito grave/);
    expect(paramo).toMatch(/delito grave/);
    expect(paramo).toMatch(/CAR/);
  });

  it('no-op ante entrada vacía o no-string', () => {
    expect(guardBurnEndorsementCorrection('').modified).toBe(false);
    expect(guardBurnEndorsementCorrection(null).modified).toBe(false);
  });
});

describe('applyOutputGuards — integración (capa que reescribe el texto)', () => {
  it('redacta el leak de tooling en la respuesta final mostrada', () => {
    const llm =
      'Para tu lulo puedo buscar en el corpus DR-034 los controladores. Aplica caldo bordelés al 1%.';
    const out = applyOutputGuards(llm, { userMessage: '¿qué hago con las plagas del lulo?' });

    expect(out.modified).toBe(true);
    expect(out.reasons.some((r) => r.startsWith('tooling_leak_redaction'))).toBe(true);
    expect(out.text).not.toMatch(LEAK_RE);
    expect(getOutputGuardTelemetry().tooling_leak_redaction).toBeGreaterThanOrEqual(1);
  });

  it('antepone la corrección anti-quema en la respuesta final mostrada', () => {
    const llm = 'La quema puede tener beneficios: la ceniza libera nutrientes como potasio y calcio al suelo.';
    const out = applyOutputGuards(llm, { userMessage: '¿me sirve quemar el rastrojo?' });

    expect(out.modified).toBe(true);
    expect(out.reasons.some((r) => r.startsWith('quema_balanceada_corregida'))).toBe(true);
    expect(out.text.startsWith('⚠️ Importante: no se recomienda quemar')).toBe(true);
    expect(out.text).toMatch(/Ley 1930 de 2018/);
  });

  it('respuesta agroecológica limpia pasa intacta (sin falsos positivos)', () => {
    // Nota: NO mezclamos "siembra" + "páramo" en el mismo texto a propósito —
    // eso dispararía guardParamoNormativa (ajeno a estos dos guards). Aquí
    // validamos que NI el guard de leak NI el de quema se activen con prosa
    // agroecológica normal que menciona compost-aporta-nutrientes y la Ley 1930.
    const limpio =
      'Para nutrir el suelo usa compost y bocashi, que aportan potasio y calcio. ' +
      'El caldo bordelés al 1% controla la gota. La Ley 1930 de 2018 protege los ecosistemas estratégicos.';
    const out = applyOutputGuards(limpio, { userMessage: '¿cómo nutro el suelo de mi cultivo?' });

    expect(out.text).not.toMatch(/no se recomienda quemar/);
    expect(out.reasons.some((r) => r.startsWith('tooling_leak_redaction'))).toBe(false);
    expect(out.reasons.some((r) => r.startsWith('quema_balanceada_corregida'))).toBe(false);
    // El contenido legítimo sobrevive intacto.
    expect(out.text).toMatch(/Ley 1930 de 2018/);
    expect(out.text).toMatch(/compost/i);
    expect(out.text).toMatch(/caldo bordel[ée]s/i);
  });
});
