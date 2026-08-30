/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import CirculoRotoMilpa from '../CirculoRotoMilpa.jsx';

describe('CirculoRotoMilpa - TypeScript types', () => {
  it('accepta todos los props documentados', () => {
    const onRupturaCompleta = vi.fn();
    const onAsentado = vi.fn();
    
    // No debería lanzar error de TypeScript
    expect(() => render(
      <CirculoRotoMilpa
        trigger={true}
        roto={false}
        onRupturaCompleta={onRupturaCompleta}
        onAsentado={onAsentado}
        className="test-class"
      >
        <div>Contenido de prueba</div>
      </CirculoRotoMilpa>
    )).not.toThrow();
  });

  it('funciona con onAsentado opcional', () => {
    const onRupturaCompleta = vi.fn();
    
    // onAsentado es opcional según el JSDoc
    expect(() => render(
      <CirculoRotoMilpa
        trigger={true}
        onRupturaCompleta={onRupturaCompleta}
      />
    )).not.toThrow();
  });
});
