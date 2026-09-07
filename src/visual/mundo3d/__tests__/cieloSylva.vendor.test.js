/*
 * El cielo del descenso es una COPIA VERBATIM del del valle. Este test es el
 * control que impide que las dos copias se separen sin que nadie lo note:
 * fija el sha-256 del cuerpo copiado. Si alguien edita la copia (o el original
 * cambia y se re-sincroniza mal), falla acá y no seis meses después en una
 * captura que «se ve rara».
 *
 * Re-sincronizar:
 *   cp ~/demos/3d/lib3d/fx/cieloSylva.js src/visual/mundo3d/sierra/cieloSylva.js
 *   (restaurar la cabecera de vendorizado y actualizar SHA_CUERPO)
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { transmitanciaSol, leerParamsCielo } from '../sierra/cieloSylva.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const MARCADOR = '/* ── INICIO COPIA VERBATIM ── */\n';
const SHA_CUERPO = 'a2c2a9fe927061cce50c4a448e0953b07b1b6566d6d69b91887004d7c2b34b0b';

describe('cieloSylva vendorizado', () => {
  it('el cuerpo copiado es byte-a-byte el original del valle', () => {
    const txt = readFileSync(resolve(AQUI, '../sierra/cieloSylva.js'), 'utf8');
    const i = txt.indexOf(MARCADOR);
    expect(i).toBeGreaterThan(0);
    const cuerpo = txt.slice(i + MARCADOR.length);
    expect(createHash('sha256').update(cuerpo).digest('hex')).toBe(SHA_CUERPO);
  });

  it('conserva el notice MIT de Sylva', () => {
    const txt = readFileSync(resolve(AQUI, '../sierra/cieloSylva.js'), 'utf8');
    expect(txt).toContain('MIT License');
    expect(txt).toContain('Token Gremlin');
  });

  it('el msnm ENTRA en la física: más altitud, menos aire, sol más limpio', () => {
    // transmitanciaSol integra la profundidad óptica con `h + msnm`: a 5 000 m
    // el rayo atraviesa MENOS masa de aire que a 0 m, así que transmite más.
    const sol = { x: 0.35, y: 0.55, z: 0.75 };
    const mar = transmitanciaSol(sol, { msnm: 0 });
    const cumbre = transmitanciaSol(sol, { msnm: 5000 });
    expect(cumbre[2]).toBeGreaterThan(mar[2]); // el azul es el que más se extingue
    expect(cumbre[0]).toBeGreaterThanOrEqual(mar[0]);
  });

  it('sigue siendo opt-in por URL (sin ?cielo=1 no cambia nada)', () => {
    expect(leerParamsCielo('')).toBeNull();
    expect(leerParamsCielo('?cielo=0')).toBeNull();
    expect(leerParamsCielo('?cielo=1').msnm).toBe(2500);
  });
});
