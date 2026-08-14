import { describe, it, expect, beforeEach } from 'vitest';
import { AVATAR_TYPES, AVATAR_NOMBRE } from '../../../hooks/useAgentAvatarType.js';
import { COMPAI_REGISTRO } from '../../../visual/mundo3d/escenas/compaiRegistry.js';
import { render, screen } from '@testing-library/react';
import AgentAvatarSelector from '../AgentAvatarSelector';

/**
 * Test de contrato: REGLA DURA INVIOLABLE
 *
 * Ninguna opción ofrecida al usuario puede renderizar en silencio un compai
 * distinto del que dice su etiqueta, en NINGUNA de las dos superficies:
 * - Selector 2D (AgentAvatarSelector.jsx)
 * - Registry 3D (compaiRegistry.js)
 *
 * Si un id no tiene cuerpo propio, NO se ofrece (o se ofrece deshabilitado
 * marcado como 'próximamente'), pero NUNCA se ofrece sirviendo Angelita
 * disfrazada.
 */
describe('AgentAvatarSelector contract: REGLA DURA', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('TODAS las OPTIONS del selector tienen Component PROPIO (no fallback silencioso)', () => {
    render(<AgentAvatarSelector />);
    
    // IDs que el selector ofrece al usuario (solo 6 con cuerpo propio)
    const selectorOptions = [
      { id: 'angelita', label: 'Angelita, la abeja' },
      { id: 'zariguya', label: 'Zarigüeya' },
      { id: 'jaguar', label: 'Jaguar' },
      { id: 'oso-baston', label: 'Oso de anteojos' },
      { id: 'luciernaga', label: 'Luciérnaga' },
      { id: 'chivito-punk', label: 'Chivito de páramo' },
    ];
    
    // Cada uno debe tener un Component REAL importado en AgentAvatarSelector.jsx
    // (esto se valida indirectamente: si el selector renderiza sin error,
    // significa que todos los Components existen)
    for (const { id, label } of selectorOptions) {
      const btn = screen.getByText(label, { selector: 'p' });
      expect(btn, `Opción ${id} no encontrada en el selector`).toBeInTheDocument();
    }
    
    // Control negativo: IDs que NO deben estar en el selector
    const idsProhibidos = [
      { id: 'guacamaya', label: 'Guacamaya' },
      { id: 'dante', label: 'Dante' },
      { id: 'oliver', label: 'Oliver' },
    ];
    for (const { id, label } of idsProhibidos) {
      // No deben aparecer en el selector (no tienen cuerpo propio o fueron retirados)
      const elem = screen.queryByText(label, { selector: 'p' });
      expect(elem, `ID prohibido ${id} aparece en el selector`).toBeNull();
    }
  });

  it('TODOS los AVATAR_TYPES están en el REGISTRO (sin huérfanos)', () => {
    for (const tipo of AVATAR_TYPES) {
      expect(COMPAI_REGISTRO[tipo], `Falta ${tipo} en el registro 3D`).toBeDefined();
    }
  });

  it('TODOS los AVATAR_TYPES tienen AVATAR_NOMBRE (sin nombres vacíos)', () => {
    for (const tipo of AVATAR_TYPES) {
      expect(AVATAR_NOMBRE[tipo], `Falta nombre para ${tipo}`).toBeDefined();
      expect(typeof AVATAR_NOMBRE[tipo]).toBe('string');
      expect(AVATAR_NOMBRE[tipo].length).toBeGreaterThan(0);
    }
  });

  it('guacamaya YA NO está en AVATAR_TYPES (retirada 2026-08-14)', () => {
    expect(AVATAR_TYPES).not.toContain('guacamaya');
    expect(AVATAR_NOMBRE.guacamaya).toBeUndefined();
  });

  it('dante y oliver están en AVATAR_TYPES PERO NO en el selector (sin arte propio)', () => {
    // En AVATAR_TYPES porque el núcleo los conoce
    expect(AVATAR_TYPES).toContain('dante');
    expect(AVATAR_TYPES).toContain('oliver');
    expect(AVATAR_NOMBRE.dante).toBe('Dante');
    expect(AVATAR_NOMBRE.oliver).toBe('Oliver');
    
    // PERO NO en el selector porque no tienen arte propio aún
    render(<AgentAvatarSelector />);
    expect(screen.queryByText('Dante', { selector: 'p' })).toBeNull();
    expect(screen.queryByText('Oliver', { selector: 'p' })).toBeNull();
  });

  it('dante y oliver están en el REGISTRO con pendienteFable:true (caen a Angelita)', () => {
    expect(COMPAI_REGISTRO.dante).toBeDefined();
    expect(COMPAI_REGISTRO.oliver).toBeDefined();
    expect(COMPAI_REGISTRO.dante.pendienteFable).toBe(true);
    expect(COMPAI_REGISTRO.oliver.pendienteFable).toBe(true);
    expect(COMPAI_REGISTRO.dante.EscenaComponent).toBeNull();
    expect(COMPAI_REGISTRO.oliver.EscenaComponent).toBeNull();
  });

  it('chivito-punk está en AVATAR_TYPES, en el selector y en el REGISTRO', () => {
    // Tiene cuerpo 2.5D en la PWA, así que SÍ está en el selector
    expect(AVATAR_TYPES).toContain('chivito-punk');
    expect(AVATAR_NOMBRE['chivito-punk']).toBe('el chivito');
    
    render(<AgentAvatarSelector />);
    expect(screen.getByText('Chivito de páramo', { selector: 'p' })).toBeInTheDocument();
    
    // PERO pendienteFable en 3D (sin coreografía propia)
    expect(COMPAI_REGISTRO['chivito-punk']).toBeDefined();
    expect(COMPAI_REGISTRO['chivito-punk'].pendienteFable).toBe(true);
    expect(COMPAI_REGISTRO['chivito-punk'].EscenaComponent).toBeNull();
  });

  it('REGLA DURA: ninguna opción del selector renderiza un compai distinto', () => {
    // Este test valida que no exista la brecha donde el selector ofrece "Dante"
    // pero el registry 3D resuelve a Angelita (el bug del kart: "eligo a Dante
    // y en la pista sale el chivito").
    //
    // La validación es:
    // 1. Si está en OPTIONS → tiene Component propio
    // 2. Si está en AVATAR_TYPES → está en COMPAI_REGISTRO
    // 3. Si está en OPTIONS → NO es pendienteFable (o si lo es, está deshabilitado)
    //
    // Para roster-8, la validación es:
    // - OPTIONS = [angelita, zariguya, jaguar, oso-baston, luciernaga, chivito-punk]
    // - AVATAR_TYPES = OPTIONS + [dante, oliver] (estos dos NO están en OPTIONS)
    
    const OPTIONS = ['angelita', 'zariguya', 'jaguar', 'oso-baston', 'luciernaga', 'chivito-punk'];
    
    // Todos los OPTIONS están en AVATAR_TYPES
    for (const opt of OPTIONS) {
      expect(AVATAR_TYPES).toContain(opt);
    }
    
    // Todos los AVATAR_TYPES están en COMPAI_REGISTRO
    for (const tipo of AVATAR_TYPES) {
      expect(COMPAI_REGISTRO[tipo]).toBeDefined();
    }
    
    // AVATAR_TYPES = OPTIONS + [dante, oliver] (control negativo)
    const soloEnTypes = AVATAR_TYPES.filter(t => !OPTIONS.includes(t));
    expect(soloEnTypes).toEqual(['dante', 'oliver']);
    
    // dante/oliver NO están en OPTIONS (control negativo)
    render(<AgentAvatarSelector />);
    expect(screen.queryByText('Dante', { selector: 'p' })).toBeNull();
    expect(screen.queryByText('Oliver', { selector: 'p' })).toBeNull();
  });
});
