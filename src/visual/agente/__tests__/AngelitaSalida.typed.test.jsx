/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { AngelitaSalida } from '../AngelitaSalida.jsx';

describe('AngelitaSalida - TypeScript types', () => {
  it('accepta prop title', () => {
    const onIdo = vi.fn();
    
    // El prop title debe ser aceptado según el JSDoc
    expect(() => render(
      <AngelitaSalida
        activa={true}
        onIdo={onIdo}
        size={88}
        title="Chagra IA"
      />
    )).not.toThrow();
  });

  it('funciona sin title', () => {
    const onIdo = vi.fn();
    
    // title es opcional según el JSDoc
    expect(() => render(
      <AngelitaSalida
        activa={true}
        onIdo={onIdo}
        size={88}
      />
    )).not.toThrow();
  });
});
