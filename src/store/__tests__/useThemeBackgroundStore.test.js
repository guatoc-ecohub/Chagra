/**
 * useThemeBackgroundStore — selector de fondos 2026-05-28.
 *
 * Cubre:
 *   - estado inicial 'default'
 *   - setBackground cambia y persiste en localStorage (chagra:background:v1)
 *   - id inválido cae a 'default' (defensivo)
 *   - helpers puros getBackgroundById / getBackgroundSrc retornan refs
 *     estables del catálogo congelado (anti React #185)
 *   - catálogo congelado (Object.freeze) — no mutable
 */
import { describe, it, expect, beforeEach } from 'vitest';
import useThemeBackgroundStore, {
  BACKGROUND_CATALOG,
  DEFAULT_BACKGROUND_SRC,
  getBackgroundById,
  getBackgroundSrc,
} from '../useThemeBackgroundStore';

describe('useThemeBackgroundStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Singleton entre tests: volver a 'default'.
    useThemeBackgroundStore.getState().setBackground('default');
  });

  it('estado inicial: selected="default"', () => {
    expect(useThemeBackgroundStore.getState().selected).toBe('default');
  });

  it('setBackground cambia el fondo seleccionado', () => {
    useThemeBackgroundStore.getState().setBackground('biopunk-1');
    expect(useThemeBackgroundStore.getState().selected).toBe('biopunk-1');
  });

  it('setBackground persiste en localStorage chagra:background:v1', () => {
    useThemeBackgroundStore.getState().setBackground('biopunk-2');
    const raw = localStorage.getItem('chagra:background:v1');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw).state.selected).toBe('biopunk-2');
  });

  it('id desconocido cae a "default" (defensivo)', () => {
    useThemeBackgroundStore.getState().setBackground('biopunk-1');
    useThemeBackgroundStore.getState().setBackground('no-existe');
    expect(useThemeBackgroundStore.getState().selected).toBe('default');
  });

  it('catálogo tiene default + biopunk y está congelado', () => {
    expect(BACKGROUND_CATALOG).toHaveLength(5);
    expect(BACKGROUND_CATALOG.map((b) => b.id)).toEqual([
      'default',
      'biopunk-1',
      'biopunk-2',
      'biopunk-3',
      'biopunk-4',
    ]);
    expect(Object.isFrozen(BACKGROUND_CATALOG)).toBe(true);
    expect(Object.isFrozen(BACKGROUND_CATALOG[0])).toBe(true);
  });

  it('getBackgroundById retorna ref ESTABLE del catálogo (anti #185)', () => {
    const a = getBackgroundById('biopunk-1');
    const b = getBackgroundById('biopunk-1');
    expect(a).toBe(b); // misma referencia, no objeto nuevo
    expect(a).toBe(BACKGROUND_CATALOG[1]);
  });

  it('getBackgroundById con id inválido retorna la entrada default estable', () => {
    expect(getBackgroundById('no-existe')).toBe(BACKGROUND_CATALOG[0]);
  });

  it('getBackgroundSrc: default usa la imagen clásica', () => {
    expect(getBackgroundSrc('default')).toBe(DEFAULT_BACKGROUND_SRC);
  });

  it('getBackgroundSrc: fondo biopunk usa su JPG', () => {
    expect(getBackgroundSrc('biopunk-1')).toBe('/fondo-biopunk-1.jpg');
    expect(getBackgroundSrc('biopunk-2')).toBe('/fondo-biopunk-2.jpg');
    expect(getBackgroundSrc('biopunk-3')).toBe('/fondo-biopunk-3.jpg');
  });
});
