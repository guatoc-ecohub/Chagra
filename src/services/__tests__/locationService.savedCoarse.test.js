/**
 * locationService.savedCoarse.test.js — confianza en la ubicación GUARDADA
 * (mitad geo de #364, 2026-06-03).
 *
 * Contexto del operador: en Brave/escritorio sin GPS, durante el onboarding la
 * lectura de geolocalización fue GRUESA (Shields difuminan el GPS → varios km)
 * y se grabó en el perfil la cabecera del municipio grande/caliente, NO su
 * vereda. El clima/saludo del agente lee esa ubicación GUARDADA y afirma el
 * municipio equivocado "como si fuera cierto".
 *
 * `isSavedLocationCoarse(profile)` es el predicado puro que decide si NO
 * debemos afirmar el municipio/zona con confianza y, en su lugar, empujar al
 * usuario a confirmar su ubicación real (mini-mapa). No mira el GPS en vivo:
 * mira lo que quedó PERSISTIDO (`ubicacion_accuracy` + `altitud_source`).
 *
 * Regla:
 *   - coarse  ⇔ `ubicacion_accuracy` numérico y > umbral (default 5000 m)
 *              Y el usuario NO corrigió la altitud a mano (`altitud_source`
 *              !== 'manual'). Una altitud manual = el usuario YA confirmó su
 *              zona → no molestar.
 *   - todo lo demás (accuracy fino, ausente, manual) ⇒ NO coarse (no molesta).
 */
import { describe, test, expect } from 'vitest';
import { isSavedLocationCoarse } from '../locationService';

describe('isSavedLocationCoarse — confianza en la ubicación guardada', () => {
  test('accuracy guardada gruesa (12 km) y sin corrección manual → coarse', () => {
    expect(
      isSavedLocationCoarse({ ubicacion_accuracy: 12000 }),
    ).toBe(true);
  });

  test('accuracy guardada gruesa pero el usuario fijó la altitud a mano → NO coarse', () => {
    // El usuario ya confirmó su zona escribiendo su altura real: no molestar.
    expect(
      isSavedLocationCoarse({ ubicacion_accuracy: 12000, altitud_source: 'manual' }),
    ).toBe(false);
  });

  test('accuracy guardada fina (GPS celular, 35 m) → NO coarse', () => {
    expect(isSavedLocationCoarse({ ubicacion_accuracy: 35 })).toBe(false);
  });

  test('justo en el umbral (5000 m) NO es coarse (estricto >)', () => {
    expect(isSavedLocationCoarse({ ubicacion_accuracy: 5000 })).toBe(false);
  });

  test('sin ubicacion_accuracy (perfil viejo / fijado a mano) → NO coarse', () => {
    // Si no guardamos el radio de incertidumbre no podemos afirmar que es
    // gruesa: no molestamos (false). Perfiles fijados por pin/búsqueda guardan
    // accuracy = undefined.
    expect(isSavedLocationCoarse({})).toBe(false);
    expect(isSavedLocationCoarse({ municipio: 'Choachí' })).toBe(false);
  });

  test('perfil null/undefined → NO coarse (no lanza)', () => {
    expect(isSavedLocationCoarse(null)).toBe(false);
    expect(isSavedLocationCoarse(undefined)).toBe(false);
  });

  test('umbral parametrizable (segundo argumento)', () => {
    expect(isSavedLocationCoarse({ ubicacion_accuracy: 1500 }, 1000)).toBe(true);
    expect(isSavedLocationCoarse({ ubicacion_accuracy: 1500 }, 2000)).toBe(false);
  });
});
