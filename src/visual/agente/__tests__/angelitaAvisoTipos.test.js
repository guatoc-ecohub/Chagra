/**
 * angelitaAvisoTipos — taxonomía de avisos.
 *
 * Contratos que cuidamos:
 *   - aparienciaDeTipo: fallback seguro a 'informativa' para tipo desconocido.
 *   - tipoDeDecision: mapea cada estado del motor a su tipo visual.
 *   - #109: luto → tipo 'luto' (gris, icono hoja), y MANDA sobre "modo niño"
 *     (nunca un tono dorado/estrella sobre una pérdida — gamificación tóxica).
 */
import { describe, it, expect } from 'vitest';
import { AVISO_TIPOS, TIPOS_AVISO, aparienciaDeTipo, tipoDeDecision } from '../angelitaAvisoTipos';

describe('AVISO_TIPOS', () => {
  it('cada tipo declarado en TIPOS_AVISO tiene entrada completa', () => {
    for (const t of TIPOS_AVISO) {
      const a = AVISO_TIPOS[t];
      expect(a).toBeTruthy();
      expect(a.acento).toBeTruthy();
      expect(a.icono).toBeTruthy();
      expect(a.aria).toBeTruthy();
    }
  });

  it('luto (#109) es gris, no rojo/alerta ni dorado/celebración', () => {
    const luto = AVISO_TIPOS.luto;
    expect(luto.acento.toLowerCase()).not.toBe(AVISO_TIPOS.alerta.acento.toLowerCase());
    expect(luto.acento.toLowerCase()).not.toBe(AVISO_TIPOS.celebracion.acento.toLowerCase());
    expect(luto.icono).not.toBe('💀'); // tierno, no mórbido (PlantCemeteryModal)
  });
});

describe('aparienciaDeTipo', () => {
  it('tipo desconocido cae a informativa', () => {
    expect(aparienciaDeTipo('inventado')).toBe(AVISO_TIPOS.informativa);
  });
  it('luto devuelve su propia apariencia', () => {
    expect(aparienciaDeTipo('luto')).toBe(AVISO_TIPOS.luto);
  });
});

describe('tipoDeDecision', () => {
  it('calma o sin decisión → null', () => {
    expect(tipoDeDecision(null)).toBeNull();
    expect(tipoDeDecision({ estado: 'calma' })).toBeNull();
  });

  it('luto → tipo luto', () => {
    expect(tipoDeDecision({ estado: 'luto' })).toBe('luto');
  });

  it('luto manda sobre "modo niño" (#109 anti-gamificación tóxica)', () => {
    expect(tipoDeDecision({ estado: 'luto' }, { esNino: true })).toBe('luto');
  });

  it('celebra sigue siendo celebracion (luto no lo pisa)', () => {
    expect(tipoDeDecision({ estado: 'celebra' })).toBe('celebracion');
  });

  it('aviso alta → alerta, incluso en modo niño', () => {
    expect(tipoDeDecision({ estado: 'aviso', severidad: 'alta' }, { esNino: true })).toBe('alerta');
  });
});
