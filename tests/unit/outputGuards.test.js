/**
 * outputGuards.test.js — tests unitarios para guardInvertedViability (#1240).
 *
 * Foco: HOTFIX del bug anti-alucinación donde `fincaAltitud === null` (finca sin
 * altitud configurada / geolocalización fallida) hacía que `Number(null) === 0`
 * tratara la finca como 0 msnm. En la rama de fallback-por-rango eso marcaba
 * cultivos de MONTAÑA como "inviable a 0 msnm" en FALSO, y como #1237 hizo que el
 * guard REEMPLACE el texto del modelo, borraba respuestas correctas.
 *
 * Sigue el patrón de tests/unit/setup.js y usa Vitest.
 */
import { describe, it, expect } from 'vitest';
import {
  guardInvertedViability,
  guardSpeciesSubstitution,
} from '../../src/services/outputGuards.js';

describe('guardInvertedViability — altitud null (HOTFIX #1240)', () => {
  it('1) altitud null + especie de montaña SIN viabilidad autoritativa → NO dispara', () => {
    // Especie de montaña (banda 1800–2600 msnm). Sin campo `viabilidad`, el guard
    // cae al fallback-por-rango. Con altitud null NO debe inventar "inviable a 0 msnm".
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'curuba',
        altitud_min: 1800,
        altitud_max: 2600,
        // sin `viabilidad`: fuerza la rama de fallback-por-rango
      },
    ];
    const texto = 'La curuba es buena para tu zona, puedes sembrarla sin problema.';
    const res = guardInvertedViability(texto, entities, null);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.reason).toBeNull();
  });

  it('2) altitud null + especie con viabilidad:"inviable" autoritativa → SÍ corrige', () => {
    // La rama autoritativa NO depende de la altitud: si el grafo ya dictaminó
    // 'inviable', el guard debe corregir aunque la altitud sea null.
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'curuba',
        viabilidad: 'inviable',
        altitud_min: 1800,
        altitud_max: 2600,
        alternativas_viables: ['lulo', 'mora'],
      },
    ];
    const texto = 'La curuba es excelente para tu finca, puedes sembrarla este invierno.';
    const res = guardInvertedViability(texto, entities, null);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Corrección importante');
    expect(res.text).toContain('curuba');
    expect(res.text).toContain('NO es viable');
    // Sin altitud no debe inventar "a 0 msnm".
    expect(res.text).not.toContain('0 msnm');
    expect(res.text).not.toContain('msnm');
    expect(res.reason).toMatch(/viabilidad_invertida/);
  });

  it('3) altitud 2580 válida + especie inviable por banda → sigue corrigiendo (no-regresión)', () => {
    // Finca a 2580 msnm; especie de tierra caliente (0–1000) → fuera de banda por
    // >300m → inviable por fallback. Debe seguir corrigiendo con la altitud real.
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'cacao',
        altitud_min: 0,
        altitud_max: 1000,
        // sin `viabilidad`: usa el fallback-por-rango con la altitud real
      },
    ];
    const texto = 'El cacao es ideal para tu finca, deberías sembrarlo ya.';
    const res = guardInvertedViability(texto, entities, 2580);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Corrección importante');
    expect(res.text).toContain('cacao');
    expect(res.text).toContain('NO es viable');
    // Con altitud válida SÍ menciona los msnm reales.
    expect(res.text).toContain('2580 msnm');
    expect(res.reason).toMatch(/viabilidad_invertida/);
  });
});

describe('guardSpeciesSubstitution — prosa española NO es binomio (fix 2026-06-02)', () => {
  // Caso real prod (query de precio "¿a cómo está la papa?"): el guard tomaba
  // "Sin embargo", "Estos cultivos", "Marzano debido" como binomios foráneos y
  // emitía "...es X, no Sin embargo". El gate _looksLikeLatinBinomial lo corta.
  it('1) "Sin embargo" / "Estos cultivos" NO disparan corrección', () => {
    const entities = [
      { kind: 'species', nombre_comun: 'aliso andino', nombre_cientifico: 'Alnus acuminata' },
    ];
    const texto =
      'El aliso andino es un buen árbol de sombra. Sin embargo, necesita suelo húmedo. ' +
      'Estos cultivos conviven bien con él.';
    const res = guardSpeciesSubstitution(texto, entities, null);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.text).not.toContain('Sin embargo. Ese');
    expect(res.text).not.toContain('no Sin');
  });

  it('2) binomio foráneo REAL (Passiflora tripartita atribuido al lulo) SÍ corrige', () => {
    // No-regresión: el caso para el que se diseñó el guard sigue funcionando.
    const entities = [
      { kind: 'species', nombre_comun: 'lulo', nombre_cientifico: 'Solanum quitoense' },
    ];
    const texto =
      'El lulo es una fruta andina; su nombre científico es Passiflora tripartita y ' +
      'se da bien en clima frío.';
    const res = guardSpeciesSubstitution(texto, entities, null);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Corrección importante');
    expect(res.text).toContain('Solanum quitoense');
    expect(res.reason).toMatch(/sustituci/);
  });
});
