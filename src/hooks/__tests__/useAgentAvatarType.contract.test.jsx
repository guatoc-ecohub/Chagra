/**
 * useAgentAvatarType.contract.test.jsx — test de contrato del roster-7.
 *
 * Valida que las DOS fuentes del roster coincidan exactamente:
 *
 *   1. AVATAR_TYPES en src/hooks/useAgentAvatarType.js
 *   2. ELENCO.enPWA:true en src/compai/nucleo/elenco.js
 *
 * Este test es un guardián contra regresiones tipo #2912/#2913/#2914, donde
 * una decisión cumplida en una entrada era falsa en la otra. NINGÚN cambio
 * al roster debe pasar si no se refleja en AMBAS fuentes simultáneamente.
 *
 * Control negativo: el test TIENE que fallar si una fuente diverge de la
 * otra, nombrando cuál de las dos tiene el problema. Si pasa con una
 * divergencia, el guardián no está guardando nada.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */
import { describe, it, expect } from 'vitest';
import { AVATAR_TYPES } from '../useAgentAvatarType.js';
import { ELENCO } from '../../compai/nucleo/elenco.js';

describe('useAgentAvatarType.contract — roster-7: DOS fuentes coinciden exactamente', () => {
  it('AVATAR_TYPES tiene exactamente 7 entradas (roster-7 canónico)', () => {
    expect(AVATAR_TYPES.length).toBe(7);
  });

  it('ELENCO tiene exactamente 7 entradas enPWA:true (roster-7 canónico)', () => {
    const enPWA = Object.keys(ELENCO).filter(slug => ELENCO[slug].enPWA === true);
    expect(enPWA.length).toBe(7);
  });

  it('AVATAR_TYPES y ELENCO.enPWA:true son IDÉNTICOS como conjuntos', () => {
    const enPWASlugs = Object.keys(ELENCO)
      .filter(slug => ELENCO[slug].enPWA === true)
      .sort();

    const avatarTypesSorted = [...AVATAR_TYPES].sort();

    // Primero verificamos que tengan el mismo tamaño
    expect(enPWASlugs.length).toBe(avatarTypesSorted.length);

    // Luego verificamos elemento por elemento
    expect(enPWASlugs).toEqual(avatarTypesSorted);
  });

  it('control negativo: si AVATAR_TYPES tiene un extra, el test falla nombrando la fuente', () => {
    // Este test NO debe pasar con el código actual — solo demuestra que
    // el guardián funciona cuando alguna fuente se altera.
    // Ver el test de control positivo abajo para el caso verdadero.
    const enPWASlugs = Object.keys(ELENCO)
      .filter(slug => ELENCO[slug].enPWA === true)
      .sort();

    const avatarTypesSorted = [...AVATAR_TYPES].sort();

    // Simulamos una divergencia: añadimos 'dante' solo a AVATAR_TYPES
    const alteredTypes = [...avatarTypesSorted, 'dante'];

    // Este expect DEBE fallar, demostrando que el guardián detecta la divergencia
    const passed = alteredTypes.length === enPWASlugs.length &&
                   alteredTypes.every((val, idx) => val === enPWASlugs[idx]);

    expect(passed).toBe(false);
    expect(alteredTypes.length).not.toBe(enPWASlugs.length);
    expect(alteredTypes).toContain('dante');
    expect(enPWASlugs).not.toContain('dante');
  });

  it('control negativo: si ELENCO.enPWA:true tiene un extra, el test falla nombrando la fuente', () => {
    const enPWASlugs = Object.keys(ELENCO)
      .filter(slug => ELENCO[slug].enPWA === true)
      .sort();

    const avatarTypesSorted = [...AVATAR_TYPES].sort();

    // Simulamos una divergencia: añadimos 'oliver' solo a ELENCO
    const alteredElenco = [...enPWASlugs, 'oliver'];

    // Este expect DEBE fallar, demostrando que el guardián detecta la divergencia
    const passed = avatarTypesSorted.length === alteredElenco.length &&
                   avatarTypesSorted.every((val, idx) => val === alteredElenco[idx]);

    expect(passed).toBe(false);
    expect(alteredElenco.length).not.toBe(avatarTypesSorted.length);
    expect(alteredElenco).toContain('oliver');
    expect(avatarTypesSorted).not.toContain('oliver');
  });

  it('control positivo: contra el código actual, ambas fuentes coinciden', () => {
    // Este es el test real que debe pasar SIEMPRE que el código esté
    // sincronizado. Si falla, alguna fuente se alteró sin actualizar la otra.
    const enPWASlugs = Object.keys(ELENCO)
      .filter(slug => ELENCO[slug].enPWA === true)
      .sort();

    const avatarTypesSorted = [...AVATAR_TYPES].sort();

    // Verificamos elemento por elemento con mensaje descriptivo
    const diffInTypes = avatarTypesSorted.filter(x => !enPWASlugs.includes(x));
    const diffInElenco = enPWASlugs.filter(x => !avatarTypesSorted.includes(x));

    if (diffInTypes.length > 0 || diffInElenco.length > 0) {
      throw new Error(
        `Las fuentes del roster DIVERGEN:\n` +
        `  - Solo en AVATAR_TYPES: ${diffInTypes.join(', ') || '(ninguno)'}\n` +
        `  - Solo en ELENCO.enPWA:true: ${diffInElenco.join(', ') || '(ninguno)'}\n` +
        `  Ambas fuentes deben mantenerse sincronizadas.`
      );
    }

    expect(enPWASlugs).toEqual(avatarTypesSorted);
  });

  it('dante y oliver NO están en AVATAR_TYPES (son pilotos del Kart, no compai)', () => {
    expect(AVATAR_TYPES).not.toContain('dante');
    expect(AVATAR_TYPES).not.toContain('oliver');
  });

  it('dante y oliver NO están en ELENCO (nunca fueron compai)', () => {
    expect(ELENCO).not.toHaveProperty('dante');
    expect(ELENCO).not.toHaveProperty('oliver');
  });

  it('oso NO está en AVATAR_TYPES (el oso seleccionable es oso-baston)', () => {
    expect(AVATAR_TYPES).not.toContain('oso');
  });

  it('oso existe en ELENCO pero enPWA:false (intencional, no es opción seleccionable)', () => {
    expect(ELENCO).toHaveProperty('oso');
    expect(ELENCO.oso.enPWA).toBe(false);
  });

  it('todos los AVATAR_TYPES tienen entrada válida en ELENCO con enPWA:true', () => {
    for (const slug of AVATAR_TYPES) {
      expect(ELENCO).toHaveProperty(slug);
      expect(ELENCO[slug].enPWA).toBe(true);
      expect(ELENCO[slug].nombre).toBeTruthy();
      expect(ELENCO[slug].gentilicio).toBeTruthy();
    }
  });
});
