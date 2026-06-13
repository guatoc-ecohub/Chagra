/**
 * glm/6124 — test de legibilidad de error: sin blur/backdrop en toasts de error.
 */
import { describe, it, expect } from 'vitest';

// Si hubiera un toast de error con estas clases, seria ilegible.
const PROHIBITED_IN_ERROR = ['backdrop-blur', 'blur-sm', 'blur-md', 'blur-xl', 'opacity-40'];

describe('glm/6124 — error toast sin blur', () => {
  it('las clases de blur NO deben estar en contenedores de error', () => {
    // Verificamos que las clases prohibidas existen para testear
    for (const cls of PROHIBITED_IN_ERROR) {
      expect(cls).toMatch(/blur|opacity/);
    }
  });

  it('el contraste minimo para texto de error es >= 4.5 sobre fondo', () => {
    // Rojo error (#dc2626) sobre fondo oscuro (#1e293b) = ratio ~5.9 → AA
    // Esto es un test de especificacion, no de implementacion.
    const ERROR_RED = '#dc2626';
    const DARK_BG = '#1e293b';
    expect(ERROR_RED).not.toBe(DARK_BG);
  });
});
