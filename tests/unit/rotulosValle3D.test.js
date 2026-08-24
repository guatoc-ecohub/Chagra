import { describe, expect, it } from 'vitest';
import {
  MAX_PLENAS_POR_BANDA,
  chipEnRadioMovil,
  seleccionarIdsPlenos,
} from '../../src/mockups/valle/rotulosValle3D.js';

const puntos = [
  { id: 'borde', dc: 260, elegible: true },
  { id: 'centro', dc: 12, elegible: true },
  { id: 'medio', dc: 86, elegible: true },
];

describe('densidad de rótulos del valle 3D', () => {
  it('mantiene un tope duro de nombres plenos en lejos y prioriza el centro', () => {
    const plenos = seleccionarIdsPlenos({ puntos, banda: 'lejos', candidata: 'borde' });

    expect(MAX_PLENAS_POR_BANDA).toBe(1);
    expect([...plenos]).toEqual(['centro']);
  });

  it('conserva solo el foco pleno fuera de lejos', () => {
    const plenos = seleccionarIdsPlenos({ puntos, banda: 'media', candidata: 'medio' });

    expect([...plenos]).toEqual(['medio']);
  });

  it('recorta chips alejados del centro en móvil, pero no el foco', () => {
    expect(chipEnRadioMovil({ dc: 170, ancho: 390 })).toBe(true);
    expect(chipEnRadioMovil({ dc: 190, ancho: 390 })).toBe(false);
    expect(chipEnRadioMovil({ dc: 300, ancho: 390, esFoco: true })).toBe(true);
    expect(chipEnRadioMovil({ dc: 300, ancho: 1024 })).toBe(true);
  });
});
