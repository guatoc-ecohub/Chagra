import { describe, it, expect } from 'vitest';
import { correccionEnPantalla } from '../burbujaAngelitaUtils.js';

/**
 * La burbuja del compAI va anclada al personaje con `<Html center>`, o sea
 * CENTRADA en su posición de pantalla. Cerca de un borde, media burbuja
 * quedaba afuera y el aviso no se podía leer — en un teléfono modesto, que es
 * el aparato del usuario, eso es el tip perdido.
 *
 * `correccionEnPantalla` es la geometría de ese arreglo, aislada para poder
 * probarla sin navegador (misma idea que `calcularPuestoGuia`).
 */
describe('correccionEnPantalla — la burbuja nunca se sale', () => {
  const caja = (left, right) => ({ left, right });

  it('si ya cabe entera, no la mueve', () => {
    expect(correccionEnPantalla(caja(100, 300), 430)).toBe(0);
  });

  it('si se sale por la derecha, la corre a la izquierda lo justo', () => {
    // pantalla 430, margen 10 → el borde útil es 420. Sobra 40.
    expect(correccionEnPantalla(caja(200, 460), 430)).toBe(-40);
  });

  it('si se sale por la izquierda, la corre a la derecha lo justo', () => {
    expect(correccionEnPantalla(caja(-25, 200), 430)).toBe(35);
  });

  it('deja exactamente el margen pedido cuando toca el borde', () => {
    const desvio = correccionEnPantalla(caja(300, 430), 430);
    expect(300 + desvio).toBeGreaterThanOrEqual(0);
    expect(430 + desvio).toBe(420); // 430 - margen 10
  });

  it('converge: aplicada la corrección, la segunda pasada ya no mueve nada', () => {
    const d1 = correccionEnPantalla(caja(200, 460), 430);
    const d2 = correccionEnPantalla(caja(200 + d1, 460 + d1), 430);
    // Es LA propiedad que faltaba: sin ella el efecto entraba en bucle
    // infinito de renders ("Maximum update depth exceeded").
    expect(d2).toBe(0);
  });

  it('si no cabe por ningún lado, la pega a la izquierda en vez de centrarla', () => {
    // Una burbuja más ancha que la pantalla: perder texto por UN borde es
    // mejor que perderlo por los dos.
    const desvio = correccionEnPantalla(caja(-30, 500), 430);
    expect(desvio).toBe(40); // deja left en +10
  });

  it('no lanza ni inventa con entradas basura', () => {
    expect(correccionEnPantalla(null, 430)).toBe(0);
    expect(correccionEnPantalla(caja(0, 100), 0)).toBe(0);
    expect(correccionEnPantalla(caja(0, 100), NaN)).toBe(0);
  });
});
