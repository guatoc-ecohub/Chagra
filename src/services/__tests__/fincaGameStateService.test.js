import { describe, it, expect, beforeEach } from 'vitest';
import {
  getGameState,
  setLastLevel,
  markMissionDone,
  getMisionesHechasSet,
} from '../fincaGameStateService';

describe('fincaGameStateService — persistencia del juego', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('estado inicial es vacío y seguro', () => {
    const s = getGameState('finca-x');
    expect(s.lastLevel).toBe(null);
    expect(s.misionesHechas).toEqual([]);
  });

  it('persiste el último nivel visto', () => {
    setLastLevel('finca-x', 3);
    expect(getGameState('finca-x').lastLevel).toBe(3);
  });

  it('marca misiones hechas de forma idempotente', () => {
    markMissionDone('finca-x', 'aprender_ficha');
    markMissionDone('finca-x', 'aprender_ficha');
    markMissionDone('finca-x', 'otra');
    const s = getGameState('finca-x');
    expect(s.misionesHechas).toEqual(['aprender_ficha', 'otra']);
  });

  it('getMisionesHechasSet devuelve un Set', () => {
    markMissionDone('finca-x', 'aprender_ficha');
    const set = getMisionesHechasSet('finca-x');
    expect(set instanceof Set).toBe(true);
    expect(set.has('aprender_ficha')).toBe(true);
  });

  it('estados por finca son independientes', () => {
    setLastLevel('finca-a', 2);
    setLastLevel('finca-b', 4);
    expect(getGameState('finca-a').lastLevel).toBe(2);
    expect(getGameState('finca-b').lastLevel).toBe(4);
  });

  it('marcar nivel preserva las misiones hechas y viceversa', () => {
    markMissionDone('finca-x', 'aprender_ficha');
    setLastLevel('finca-x', 1);
    const s = getGameState('finca-x');
    expect(s.lastLevel).toBe(1);
    expect(s.misionesHechas).toContain('aprender_ficha');
  });

  it('tolera JSON corrupto en localStorage', () => {
    localStorage.setItem('chagra:juego-finca:finca-x', '{no es json');
    const s = getGameState('finca-x');
    expect(s.lastLevel).toBe(null);
    expect(s.misionesHechas).toEqual([]);
  });
});
