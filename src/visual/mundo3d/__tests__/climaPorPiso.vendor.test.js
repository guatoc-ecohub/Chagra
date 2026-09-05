/*
 * climaPorPiso vendorizado — el control que cierra la contradicción «4 pisos
 * vs 7 cotas» con un TEST, no con una promesa: la copia del SSOT de clima por
 * piso tiene que ser byte-a-byte el original del valle Y sus números tienen
 * que coincidir con los canónicos de este repo (pisosTermicos.js,
 * alertThresholds.js, sierra/descensoSierra.js). Si alguien mueve una cota en
 * un solo lado, falla acá.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { COTAS_MSNM, CUMBRE_M, HELADA_MIN_C, franjaCondensacion, pisoDeFinca, fenomenoEfectivo, hayHelada } from '../sierra/vendor/clima/climaPorPiso.js';
import { PISOS_TERMICOS_SIERRA, CUMBRE_SIERRA_M, pisoPorAltitud, pisoDeFinca as pisoDeFincaCanon } from '../pisosTermicos.js';
import { FORECAST_THRESHOLDS } from '../../../constants/alertThresholds.js';
import { franjaCondensacion as franjaDescenso } from '../sierra/descensoSierra.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const MARCADOR = '/* ── INICIO COPIA VERBATIM ── */\n';
const SHA_CUERPO = 'a14f8f892e1a073b92354eaa81540703a563c392ec07814cc21b8de80b15b979';

describe('climaPorPiso vendorizado', () => {
  it('el cuerpo copiado es byte-a-byte el original del valle', () => {
    const txt = readFileSync(resolve(AQUI, '../sierra/vendor/clima/climaPorPiso.js'), 'utf8');
    const i = txt.indexOf(MARCADOR);
    expect(i).toBeGreaterThan(0);
    expect(createHash('sha256').update(txt.slice(i + MARCADOR.length)).digest('hex')).toBe(SHA_CUERPO);
  });
  it('sus 7 cotas SON las de PISOS_TERMICOS_SIERRA (misma tabla, mismo orden de abajo a arriba)', () => {
    const canon = [...PISOS_TERMICOS_SIERRA].sort((a, b) => a.minMsnm - b.minMsnm);
    expect(COTAS_MSNM.length).toBe(canon.length);
    canon.forEach((c, i) => {
      expect(COTAS_MSNM[i].id).toBe(c.id);
      expect(COTAS_MSNM[i].min).toBe(c.minMsnm);
      expect(COTAS_MSNM[i].max).toBe(c.maxMsnm);
    });
    expect(CUMBRE_M).toBe(CUMBRE_SIERRA_M);
  });
  it('7 → 4: colapsa igual que el canónico de pisosTermicos.js', () => {
    for (const m of [0, 150, 299, 300, 999, 1000, 1999, 2000, 2200, 2999, 3000, 3999, 4000, 4799, 4800, 5775, 6000]) {
      expect(pisoDeFinca(m)).toBe(pisoDeFincaCanon(m));
      expect(pisoDeFinca(pisoPorAltitud(m)?.id)).toBe(pisoDeFincaCanon(m));
    }
  });
  it('los umbrales de helada son los de alertThresholds.js', () => {
    for (const k of ['paramo', 'frio', 'templado', 'calido']) expect(HELADA_MIN_C[k]).toBe(FORECAST_THRESHOLDS.HELADA_MIN_C[k]);
  });
  it('la franja de condensación es la misma aritmética que descensoSierra.js', () => {
    for (const fase of ['neutral', 'el_nino', 'la_nina']) for (const h of [null, 40, 70, 95]) expect(franjaCondensacion(fase, h)).toEqual(franjaDescenso(fase, h));
  });
  it('REGLA DURA: El Niño en frío = helada, nunca sol', () => {
    expect(fenomenoEfectivo({ piso: 2200, fenomeno: 'sol', enso: 'el_nino' })).toBe('helada');
    expect(hayHelada({ piso: 'frio', ensoFamily: 'nino' }).nivel).toBe('aviso');
    expect(hayHelada({ piso: 'calido', tempMin: -3 }).nivel).toBe('no');
  });
});
