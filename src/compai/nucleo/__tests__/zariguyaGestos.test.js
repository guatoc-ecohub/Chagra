/**
 * zariguyaGestos — lo que la zarigüeya sabe y hace.
 *
 * Contratos que cuidamos:
 *   - la MUERTA (thanatosis) es un gesto OCASIONAL: cae ~1 de cada 5 momentos
 *     ociosos (≈0.20 sobre el azar sin-repetir de `gestos`), nunca el default.
 *   - la FRASE es gentil y educativa (empatía, no susto): habla de sobrevivir,
 *     no hace daño a nadie.
 *   - los pesos suman de modo que muerta = 3.5/17.5 = 0.20 exacto (sin el
 *     anti-repetición); todos los momentos declaran peso y dur.
 *   - el mapa estado→momento cubre los alias de los botones (acompana/ver/
 *     escuchando/muerta) y 'acompana' vuelve al idle (null).
 */
import { describe, it, expect } from 'vitest';
import {
  FRASE_MUERTA, ARIA_ZARIGUYA, IDLE_ZARIGUYA, GESTOS_VISIBLES, ESTADO_A_MOMENTO,
} from '../zariguyaGestos';
import { elegirSinRepetir } from '../gestos';

describe('IDLE_ZARIGUYA', () => {
  it('cada momento declara peso (>0) y dur (ms)', () => {
    for (const [nombre, cfg] of Object.entries(IDLE_ZARIGUYA)) {
      expect(cfg.peso, `${nombre}.peso`).toBeGreaterThan(0);
      expect(cfg.dur, `${nombre}.dur`).toBeGreaterThan(0);
    }
  });

  it('la muerta pesa exactamente 0.20 del total de pesos (sin anti-repetición)', () => {
    const total = Object.values(IDLE_ZARIGUYA).reduce((s, c) => s + c.peso, 0);
    expect(total).toBeCloseTo(17.5, 5);
    expect(IDLE_ZARIGUYA.muerta.peso / total).toBeCloseTo(0.2, 5);
  });

  it('sobre el azar sin-repetir, la muerta cae ~1 de cada 5 (0.15–0.22), nunca el default', () => {
    let previo = null;
    const cuenta = {};
    const N = 40000;
    for (let i = 0; i < N; i += 1) {
      const m = elegirSinRepetir(IDLE_ZARIGUYA, previo);
      cuenta[m] = (cuenta[m] || 0) + 1;
      previo = m;
    }
    const share = cuenta.muerta / N;
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.22);
    // NO es el default: la zarigüeya está viva (haciendo otra cosa) ~4/5 del
    // tiempo. Estar muerta es la minoría clara de sus momentos.
    const vivaShare = (N - cuenta.muerta) / N;
    expect(vivaShare).toBeGreaterThan(0.78);
  });
});

describe('FRASE_MUERTA', () => {
  it('es gentil y educativa: habla de sobrevivir y de no hacer daño', () => {
    expect(FRASE_MUERTA.toLowerCase()).toContain('sobreviviendo');
    expect(FRASE_MUERTA.toLowerCase()).toContain('no le hago daño');
    expect(FRASE_MUERTA.length).toBeGreaterThan(60);
  });
});

describe('mapa de estados y gestos visibles', () => {
  it('los gestos visibles son ver / escucha / muerta', () => {
    expect(GESTOS_VISIBLES).toEqual(expect.arrayContaining(['ver', 'escucha', 'muerta']));
  });

  it('acompana/idle vuelven al idle (null); los alias mapean a su momento', () => {
    expect(ESTADO_A_MOMENTO.acompana).toBeNull();
    expect(ESTADO_A_MOMENTO.idle).toBeNull();
    expect(ESTADO_A_MOMENTO.ver).toBe('ver');
    expect(ESTADO_A_MOMENTO.escuchando).toBe('escucha');
    expect(ESTADO_A_MOMENTO.muerta).toBe('muerta');
    expect(ESTADO_A_MOMENTO.tanatosis).toBe('muerta');
  });

  it('cada aria describe el gesto en usted (accesible)', () => {
    for (const clave of ['acompana', 'ver', 'escuchando', 'muerta']) {
      expect(typeof ARIA_ZARIGUYA[clave]).toBe('string');
      expect(ARIA_ZARIGUYA[clave].length).toBeGreaterThan(10);
    }
  });
});
