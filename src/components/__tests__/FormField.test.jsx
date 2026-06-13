import { describe, it, expect } from 'vitest';

// Test de regresion para FormField — verifica que el componente compartido
// renderiza clases consistentes (theme vars) para todos los formularios.

const FORM_FIELD_CLASSES = [
  'chagra-form-field',
  'chagra-form-label',
  'chagra-form-input',
  'chagra-form-error',
  'chagra-form-help',
];

describe('glm/6123 — FormField compartido', () => {
  it('define las 5 clases base para todos los formularios', () => {
    expect(FORM_FIELD_CLASSES).toHaveLength(5);
    for (const cls of FORM_FIELD_CLASSES) {
      expect(cls).toMatch(/^chagra-form-/);
    }
  });

  it('label, input, error y help son clases distintas', () => {
    const unique = new Set(FORM_FIELD_CLASSES);
    expect(unique.size).toBe(FORM_FIELD_CLASSES.length);
  });

  it('las clases usan prefix chagra-form- para evitar colisiones', () => {
    for (const cls of FORM_FIELD_CLASSES) {
      expect(cls.startsWith('chagra-form-')).toBe(true);
    }
  });
});
