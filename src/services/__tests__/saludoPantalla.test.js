/**
 * saludoPantalla — el saludo contextual de Angelita por pantalla.
 *
 * Contratos:
 *   - pantalla mapeada → saludo en usted, terminado en pregunta o invitación.
 *   - mundos de cultivo comparten plantilla (cambia la mata).
 *   - seguimiento_* paramétrico cae al saludo de seguimiento.
 *   - pantalla desconocida / vacía / no-string → null (el greeting de siempre
 *     sigue mandando — cero regresión para rutas sin saludo propio).
 *   - tono: nunca voseo (ni "vos", ni "tenés"), nunca tuteo en los saludos.
 */
import { describe, it, expect } from 'vitest';
import { saludoDePantalla } from '../saludoPantalla';

describe('saludoDePantalla', () => {
  it('pantallas clave tienen saludo propio', () => {
    expect(saludoDePantalla('semilla')).toMatch(/semillas/i);
    expect(saludoDePantalla('sierra_global')).toMatch(/altura/i);
    expect(saludoDePantalla('compost')).toMatch(/compostera/i);
    expect(saludoDePantalla('valle3d')).toMatch(/finca/i);
  });

  it('mundos de cultivo usan la plantilla con su mata', () => {
    expect(saludoDePantalla('cafe')).toMatch(/el café/);
    expect(saludoDePantalla('uchuva')).toMatch(/la uchuva/);
  });

  it('seguimiento paramétrico cae al saludo de proceso', () => {
    expect(saludoDePantalla('seguimiento_reforestacion')).toBe(saludoDePantalla('seguimiento'));
  });

  it('desconocida, vacía o no-string → null (sin regresión)', () => {
    expect(saludoDePantalla('pantalla_inventada_xyz')).toBeNull();
    expect(saludoDePantalla('')).toBeNull();
    expect(saludoDePantalla(null)).toBeNull();
    expect(saludoDePantalla(undefined)).toBeNull();
    expect(saludoDePantalla(42)).toBeNull();
  });

  it('tono: usted, sin voseo ni tuteo', () => {
    const rutas = ['semilla', 'cafe', 'compost', 'agua', 'animales_gallinas', 'valle3d', 'sierra_global'];
    for (const r of rutas) {
      const s = saludoDePantalla(r);
      expect(s).toBeTruthy();
      expect(s).not.toMatch(/\bvos\b|tenés|querés|podés|\btu\b|\bte\b/i);
    }
  });
});
