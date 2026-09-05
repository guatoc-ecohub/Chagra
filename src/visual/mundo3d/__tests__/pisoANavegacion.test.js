/**
 * Rescate fix/valle2d-fallback-y-sierra-clic (bug P1 huérfanos-3D): tocar una
 * banda de piso térmico en la vista global de la Sierra debe bajar al PRIMER
 * mundo real que `pisosTermicos.js` declara para ese piso.
 *
 * Cubre los dos eslabones de la cadena:
 *  1. `mundoPrincipalDePiso` — resolución honesta piso→mundo (SSOT).
 *  2. El cableado del host en App.jsx — la ruta #/mockups/sierra-global pasa
 *     `onSeleccionPiso` y navega con el `view` del mundo resuelto (contrato
 *     por fuente, mismo patrón que App.mockup-routes-contract).
 */
import { describe, expect, it } from 'vitest';
import appSource from '../../../App.jsx?raw';
import { PISOS_TERMICOS, PISOS_TERMICOS_SIERRA, mundoPrincipalDePiso } from '../pisosTermicos.js';

describe('mundoPrincipalDePiso — resolución piso→mundo (SSOT pisosTermicos)', () => {
  it('resuelve el primer mundo declarado de cada piso de la tabla', () => {
    expect(mundoPrincipalDePiso({ id: 'calido' })?.view).toBe('milpa_cultivo');
    expect(mundoPrincipalDePiso({ id: 'templado' })?.view).toBe('cafe');
    expect(mundoPrincipalDePiso({ id: 'frio' })?.view).toBe('tuberculos');
    expect(mundoPrincipalDePiso({ id: 'paramo' })?.view).toBe('agua');
    expect(mundoPrincipalDePiso({ id: 'superparamo' })?.view).toBe('biodiversidad');
    expect(mundoPrincipalDePiso({ id: 'nival' })?.view).toBe('hoy_finca');
  });

  it('resuelve bandas visuales de la Sierra por su id contra la tabla canónica', () => {
    for (const banda of PISOS_TERMICOS_SIERRA) {
      const mundo = mundoPrincipalDePiso(banda);
      expect(mundo, `banda ${banda.id} debe resolver mundo`).not.toBeNull();
      expect(mundo.view).toBeTruthy();
    }
  });

  it('es honesto: sin piso, sin mundos o sin view NO inventa ruta', () => {
    expect(mundoPrincipalDePiso(null)).toBeNull();
    expect(mundoPrincipalDePiso(undefined)).toBeNull();
    expect(mundoPrincipalDePiso({})).toBeNull();
    expect(mundoPrincipalDePiso({ id: 'no-existe' })).toBeNull();
    expect(mundoPrincipalDePiso({ id: 'no-existe', mundos: [] })).toBeNull();
    expect(mundoPrincipalDePiso({ id: 'no-existe', mundos: [{ id: 'x', nombre: 'x', view: '' }] })).toBeNull();
  });

  it('cada mundo principal apunta a un view que la tabla declara con mundos', () => {
    // Invariante de datos: ningún piso cultivable queda sin destino.
    for (const piso of PISOS_TERMICOS) {
      if (!piso.cultivable) continue;
      expect(mundoPrincipalDePiso(piso), `piso ${piso.id}`).not.toBeNull();
    }
  });
});

describe('cableado del host — #/mockups/sierra-global navega al mundo del piso', () => {
  const casoSierra = appSource.match(/case 'mockup_sierra_global':([\s\S]*?)case 'mockup_/);
  expect(casoSierra, 'App.jsx debe seguir teniendo el case mockup_sierra_global').toBeTruthy();

  it('pasa onSeleccionPiso a la vista global', () => {
    expect(casoSierra[1]).toContain('onSeleccionPiso=');
  });

  it('resuelve el mundo con el SSOT y navega a su view', () => {
    expect(appSource).toContain('mundoPrincipalDePiso');
    expect(casoSierra[1]).toMatch(/mundoPrincipalDePiso\(piso\)/);
    expect(casoSierra[1]).toMatch(/navigate\(\s*mundo\.view\s*\)/);
  });
});
