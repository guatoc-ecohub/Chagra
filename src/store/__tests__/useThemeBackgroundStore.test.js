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
  esGradiente,
} from '../useThemeBackgroundStore';

describe('useThemeBackgroundStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Singleton entre tests: volver al default universal (Páramo completo).
    useThemeBackgroundStore.getState().setBackground('valle-calido');
  });

  it('default universal: selected="biopunk-1" (Páramo completo, operador 2026-06-06)', () => {
    expect(useThemeBackgroundStore.getState().selected).toBe('valle-calido');
    expect(DEFAULT_BACKGROUND_ID).toBe('valle-calido');
  });

  it('setBackground cambia el fondo seleccionado', () => {
    useThemeBackgroundStore.getState().setBackground('paramo-frio');
    expect(useThemeBackgroundStore.getState().selected).toBe('paramo-frio');
  });

  it('setBackground persiste en localStorage chagra:background:v1', () => {
    useThemeBackgroundStore.getState().setBackground('paramo-frio');
    const raw = localStorage.getItem('chagra:background:v1');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw).state.selected).toBe('paramo-frio');
  });

  it('id desconocido cae al default universal "biopunk-1" (defensivo)', () => {
    useThemeBackgroundStore.getState().setBackground('paramo-frio');
    useThemeBackgroundStore.getState().setBackground('no-existe');
    expect(useThemeBackgroundStore.getState().selected).toBe('valle-calido');
  });

  it('el legado "default" (Clásico, eliminado) ya no es válido → cae a biopunk-1', () => {
    useThemeBackgroundStore.getState().setBackground('default');
    expect(useThemeBackgroundStore.getState().selected).toBe('valle-calido');
  });

  it('catálogo: SOLO 3 gradientes andinos (fotos biopunk archivadas) y congelado', () => {
    expect(BACKGROUND_CATALOG).toHaveLength(3);
    expect(BACKGROUND_CATALOG.map((b) => b.id)).toEqual([
      'valle-calido',
      'paramo-frio',
      'noche-andina',
    ]);
    // Las 4 fotos biopunk (todas con oso realista) se archivaron 2026-07-16: cero .jpg.
    expect(BACKGROUND_CATALOG.some((b) => /** @type {any} */ (b).src.includes('.jpg'))).toBe(false);
    expect(BACKGROUND_CATALOG.some((b) => /** @type {any} */ (b).id === 'default')).toBe(false);
    expect(Object.isFrozen(BACKGROUND_CATALOG)).toBe(true);
    expect(Object.isFrozen(BACKGROUND_CATALOG[0])).toBe(true);
  });

  it('getBackgroundById retorna ref ESTABLE del catálogo (anti #185)', () => {
    const a = getBackgroundById('valle-calido');
    const b = getBackgroundById('valle-calido');
    expect(a).toBe(b); // misma referencia, no objeto nuevo
    expect(a).toBe(BACKGROUND_CATALOG[0]);
  });

  it('getBackgroundById con id inválido retorna la entrada default (Valle cálido) estable', () => {
    const entry = getBackgroundById('no-existe');
    expect(entry.id).toBe('valle-calido');
    // Ref estable entre llamadas (no objeto nuevo).
    expect(getBackgroundById('otro-invalido')).toBe(entry);
  });

  it('getBackgroundSrc: id desconocido cae al default (gradiente Valle cálido)', () => {
    expect(getBackgroundSrc('no-existe')).toBe(DEFAULT_BACKGROUND_SRC);
    expect(getBackgroundSrc('default')).toBe(DEFAULT_BACKGROUND_SRC);
    expect(DEFAULT_BACKGROUND_SRC).toContain('gradient(');
  });

  it('getBackgroundSrc: cada fondo es un gradiente CSS (sin foto)', () => {
    expect(getBackgroundSrc('valle-calido')).toContain('gradient(');
    expect(getBackgroundSrc('paramo-frio')).toContain('gradient(');
    expect(getBackgroundSrc('noche-andina')).toContain('gradient(');
  });

  describe('esGradiente', () => {
    it('detecta radial-gradient correctamente', () => {
      expect(esGradiente('radial-gradient(120% 95% at 50% 12%, #3a4a24 0%, #263318 45%, #141d0d 100%)')).toBe(true);
    });

    it('detecta linear-gradient correctamente', () => {
      expect(esGradiente('linear-gradient(165deg, #1a2530 0%, #26343c 45%, #33454a 100%)')).toBe(true);
    });

    it('detecta conic-gradient correctamente', () => {
      expect(esGradiente('conic-gradient(from 0deg, red, yellow, green)')).toBe(true);
    });

    it('detecta variantes con prefijo vendor (-webkit-gradient, etc.)', () => {
      expect(esGradiente('-webkit-linear-gradient(top, blue, red)')).toBe(true);
      expect(esGradiente('-moz-radial-gradient(circle, white, black)')).toBe(true);
    });

    it('rechaza rutas de imagen normales', () => {
      expect(esGradiente('/images/foto.jpg')).toBe(false);
      expect(esGradiente('https://example.com/bg.png')).toBe(false);
      expect(esGradiente('/biodiversidad-bg.jpg')).toBe(false);
    });

    it('rechaza strings vacíos o undefined', () => {
      expect(esGradiente('')).toBe(false);
      expect(esGradiente(null)).toBe(false);
      expect(esGradiente(undefined)).toBe(false);
      expect(esGradiente(123)).toBe(false);
      expect(esGradiente({})).toBe(false);
    });

    it('es case-insensitive para gradient', () => {
      expect(esGradiente('RADIAL-GRADIENT(...)')).toBe(true);
      expect(esGradiente('Linear-Gradient(...)')).toBe(true);
      expect(esGradiente('linear-gradient(...)')).toBe(true);
    });

    it('coincide con los gradientes reales del catálogo', () => {
      expect(esGradiente(getBackgroundSrc('valle-calido'))).toBe(true);
      expect(esGradiente(getBackgroundSrc('paramo-frio'))).toBe(true);
      expect(esGradiente(getBackgroundSrc('noche-andina'))).toBe(true);
    });
  });
});
