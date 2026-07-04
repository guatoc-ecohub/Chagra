import { describe, it, expect } from 'vitest';
import {
  AYUDA_FUNCIONES,
  matchAyudaFuncion,
  listAyudaFunciones,
  getAyudaFuncion,
} from '../ayudaFunciones.js';
import { buildAyudaResponse } from '../../services/ayudaAgentResponder.js';

/**
 * Tests del manifiesto de AYUDA groundeado («Chagra enseña a usar Chagra»).
 * Contrato crítico: anti-alucinación (nunca inventa una función que no existe)
 * + deep-link a la función real.
 */
describe('AYUDA_FUNCIONES — manifiesto derivado de CAPABILITY_MANIFEST', () => {
  it('no está vacío y toda entrada tiene forma canónica', () => {
    expect(AYUDA_FUNCIONES.length).toBeGreaterThan(10);
    for (const f of AYUDA_FUNCIONES) {
      expect(typeof f.id).toBe('string');
      expect(f.nombre).toBeTruthy();
      expect(typeof f.que_hace).toBe('string');
      expect(Array.isArray(f.como_se_usa)).toBe(true);
      expect(f.como_se_usa.length).toBeGreaterThan(0);
      expect(f.accion && typeof f.accion.tipo).toBe('string');
      expect(Array.isArray(f.keywords)).toBe(true);
    }
  });

  it('las funciones de navegación tienen una vista destino (deep-link)', () => {
    const navs = AYUDA_FUNCIONES.filter((f) => f.accion.tipo === 'nav');
    expect(navs.length).toBeGreaterThan(3);
    for (const f of navs) expect(f.accion.view).toBeTruthy();
  });
});

describe('matchAyudaFuncion — match grounded', () => {
  it('«¿cómo registro una siembra?» → Registrar hablando (función real)', () => {
    const r = matchAyudaFuncion('como registro una siembra');
    if (!r.found) throw new Error('se esperaba found:true');
    expect(r.funcion.id).toBe('procesos');
  });

  it('«dónde veo mis plantas» → Mis plantas, con vista de navegación', () => {
    const r = matchAyudaFuncion('donde veo mis plantas');
    if (!r.found) throw new Error('se esperaba found:true');
    expect(r.funcion.id).toBe('plantas');
    expect(r.funcion.accion.tipo).toBe('nav');
    expect(r.funcion.accion.view).toBe('activos');
  });

  it('«el mapa de la finca» → mapa', () => {
    const r = matchAyudaFuncion('el mapa de la finca');
    if (!r.found) throw new Error('se esperaba found:true');
    expect(r.funcion.id).toBe('mapa');
  });

  it('ANTI-ALUCINACIÓN: función inexistente → found:false + sugerencias reales', () => {
    const r = matchAyudaFuncion('como pido un dron con inteligencia artificial cuantica');
    if (r.found) throw new Error('se esperaba found:false');
    // tsc corre con strict:false (jsconfig.json): el narrowing de CFA no reduce
    // el branch `found:false` de una unión discriminada por booleano tras un
    // `throw` (limitación conocida sin strictNullChecks). Cast explícito,
    // documentado, ya validado arriba por el `if`.
    const { sugerencias } = /** @type {{ found: false, sugerencias: import('../ayudaFunciones.js').AyudaFuncion[] }} */ (r);
    expect(Array.isArray(sugerencias)).toBe(true);
    expect(sugerencias.length).toBeGreaterThan(0);
    // Todas las sugerencias son funciones REALES del manifiesto.
    for (const s of sugerencias) {
      expect(getAyudaFuncion(s.id)).not.toBeNull();
    }
  });
});

describe('listAyudaFunciones — catálogo', () => {
  it('devuelve total y grupos no vacíos', () => {
    const { total, grupos } = listAyudaFunciones();
    expect(total).toBe(AYUDA_FUNCIONES.length);
    expect(Object.keys(grupos).length).toBeGreaterThan(1);
  });
});

describe('buildAyudaResponse — respuesta groundeada + deep-link', () => {
  it('how-to con match → texto de la función + acción nav', () => {
    const resp = buildAyudaResponse({ isMeta: true, kind: 'howto', consulta: 'donde veo mis plantas' });
    expect(resp).not.toBeNull();
    expect(resp.content).toContain('Mis plantas');
    expect(resp.ayudaAction).toMatchObject({ tipo: 'nav', view: 'activos' });
  });

  it('capabilities → catálogo, sin acción única', () => {
    const resp = buildAyudaResponse({ isMeta: true, kind: 'capabilities', consulta: 'que puede hacer chagra' });
    expect(resp.content).toMatch(/funciones/i);
    expect(resp.ayudaAction).toBeNull();
  });

  it('how-to SIN match → mensaje honesto (no inventa función)', () => {
    const resp = buildAyudaResponse({ isMeta: true, kind: 'howto', consulta: 'quiero un tractor volador teletransportador' });
    expect(resp.content).toMatch(/todav[ií]a no tengo esa funci[oó]n/i);
    expect(resp.ayudaAction).toBeNull();
  });

  it('no-meta → null (sigue el flujo normal)', () => {
    expect(buildAyudaResponse({ isMeta: false })).toBeNull();
  });
});
