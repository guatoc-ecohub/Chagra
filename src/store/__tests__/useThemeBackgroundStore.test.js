/**
 * useThemeBackgroundStore — selector de fondos.
 *
 * Cubre (post 2026-06-06, default cambió a Páramo completo):
 *   - default universal selected="biopunk-1" (Páramo completo)
 *   - el catálogo contiene SOLO los 4 fondos biopunk (sin 'default'/Clásico)
 *   - setBackground cambia y persiste en localStorage (chagra:background:v1)
 *   - id desconocido (y el legado 'default') cae a "biopunk-1" (defensivo)
 *   - helpers puros getBackgroundById / getBackgroundSrc retornan refs
 *     estables del catálogo congelado (anti React #185)
 *   - catálogo congelado (Object.freeze) — no mutable
 */
import { describe, it, expect, beforeEach } from 'vitest';
import useThemeBackgroundStore, {
  BACKGROUND_CATALOG,
  DEFAULT_BACKGROUND_ID,
  DEFAULT_BACKGROUND_SRC,
  getBackgroundById,
  getBackgroundSrc,
} from '../useThemeBackgroundStore';

describe('useThemeBackgroundStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Singleton entre tests: volver al default universal (Páramo completo).
    useThemeBackgroundStore.getState().setBackground('biopunk-1');
  });

  it('default universal: selected="biopunk-1" (Páramo completo, operador 2026-06-06)', () => {
    expect(useThemeBackgroundStore.getState().selected).toBe('biopunk-1');
    expect(DEFAULT_BACKGROUND_ID).toBe('biopunk-1');
  });

  it('setBackground cambia el fondo seleccionado', () => {
    useThemeBackgroundStore.getState().setBackground('biopunk-2');
    expect(useThemeBackgroundStore.getState().selected).toBe('biopunk-2');
  });

  it('setBackground persiste en localStorage chagra:background:v1', () => {
    useThemeBackgroundStore.getState().setBackground('biopunk-2');
    const raw = localStorage.getItem('chagra:background:v1');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw).state.selected).toBe('biopunk-2');
  });

  it('id desconocido cae al default universal "biopunk-1" (defensivo)', () => {
    useThemeBackgroundStore.getState().setBackground('biopunk-2');
    useThemeBackgroundStore.getState().setBackground('no-existe');
    expect(useThemeBackgroundStore.getState().selected).toBe('biopunk-1');
  });

  it('el legado "default" (Clásico, eliminado) ya no es válido → cae a biopunk-1', () => {
    useThemeBackgroundStore.getState().setBackground('default');
    expect(useThemeBackgroundStore.getState().selected).toBe('biopunk-1');
  });

  it('catálogo: SOLO 4 fondos biopunk (sin Clásico) y congelado', () => {
    expect(BACKGROUND_CATALOG).toHaveLength(4);
    expect(BACKGROUND_CATALOG.map((b) => b.id)).toEqual([
      'biopunk-1',
      'biopunk-2',
      'biopunk-3',
      'biopunk-4',
    ]);
    // El fondo "Clásico"/'default' fue eliminado del catálogo.
    expect(BACKGROUND_CATALOG.some((b) => /** @type {any} */ (b).id === 'default')).toBe(false);
    expect(BACKGROUND_CATALOG.some((b) => /** @type {any} */ (b).label === 'Clásico')).toBe(false);
    expect(Object.isFrozen(BACKGROUND_CATALOG)).toBe(true);
    expect(Object.isFrozen(BACKGROUND_CATALOG[0])).toBe(true);
  });

  it('getBackgroundById retorna ref ESTABLE del catálogo (anti #185)', () => {
    const a = getBackgroundById('biopunk-1');
    const b = getBackgroundById('biopunk-1');
    expect(a).toBe(b); // misma referencia, no objeto nuevo
    expect(a).toBe(BACKGROUND_CATALOG[0]);
  });

  it('getBackgroundById con id inválido retorna la entrada default (Páramo completo) estable', () => {
    const entry = getBackgroundById('no-existe');
    expect(entry.id).toBe('biopunk-1');
    // Ref estable entre llamadas (no objeto nuevo).
    expect(getBackgroundById('otro-invalido')).toBe(entry);
  });

  it('getBackgroundSrc: id desconocido cae a Páramo completo (DEFAULT_BACKGROUND_SRC)', () => {
    expect(getBackgroundSrc('no-existe')).toBe(DEFAULT_BACKGROUND_SRC);
    expect(getBackgroundSrc('default')).toBe(DEFAULT_BACKGROUND_SRC);
    expect(DEFAULT_BACKGROUND_SRC).toBe('/fondo-biopunk-1.jpg');
  });

  it('getBackgroundSrc: fondo biopunk usa su JPG', () => {
    expect(getBackgroundSrc('biopunk-1')).toBe('/fondo-biopunk-1.jpg');
    expect(getBackgroundSrc('biopunk-2')).toBe('/fondo-biopunk-2.jpg');
    expect(getBackgroundSrc('biopunk-3')).toBe('/fondo-biopunk-3.jpg');
    expect(getBackgroundSrc('biopunk-4')).toBe('/fondo-biopunk-4.jpg');
  });
});
