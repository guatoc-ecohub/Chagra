/*
 * creatureIdle — la máquina de personalidad idle rubber-hose es PURA y
 * DETERMINISTA: estos tests fijan ese contrato (misma entrada → misma pose,
 * cadencia de la vuelta de campana, gates de reduced-motion/tier/noche).
 */
import { describe, it, expect } from 'vitest';
import {
  idleDeCreature, IDLE_PERFILES, IDLE_NEUTRO, semillaDe, azar01, backOut,
} from '../creatureIdle.js';

/* Barre la línea de tiempo y devuelve los arranques del evento pedido. */
function arranquesDe(evento, opts, hasta = 140, paso = 0.05) {
  const inicios = [];
  let dentro = false;
  for (let t = 0; t < hasta; t += paso) {
    const es = idleDeCreature(t, opts).evento === evento;
    if (es && !dentro) inicios.push(t);
    dentro = es;
  }
  return inicios;
}

describe('creatureIdle — determinismo', () => {
  it('misma entrada → exactamente la misma pose (cero azar por frame)', () => {
    for (const t of [0.4, 7.77, 21.3, 39.9, 88.1]) {
      const a = idleDeCreature(t, { especie: 'abeja-angelita', hora: 'dorada' });
      const b = idleDeCreature(t, { especie: 'abeja-angelita', hora: 'dorada' });
      expect(b).toEqual(a);
    }
  });

  it('cada especie tiene semilla propia y estable (nunca sincronizan)', () => {
    expect(semillaDe('abeja-angelita')).toBe(semillaDe('abeja-angelita'));
    expect(semillaDe('abeja-angelita')).not.toBe(semillaDe('colibri'));
    expect(azar01(1, 2, 3)).toBe(azar01(1, 2, 3));
    expect(azar01(1, 2, 3)).toBeGreaterThanOrEqual(0);
    expect(azar01(1, 2, 3)).toBeLessThan(1);
  });
});

describe('creatureIdle — repertorio de Angelita', () => {
  const opts = { especie: 'abeja-angelita', hora: 'dorada' };

  it('vuelta de campana cada ~18-22 s (y nunca en el ciclo 0)', () => {
    const v = IDLE_PERFILES['abeja-angelita'].vuelta;
    const inicios = arranquesDe('vuelta', opts);
    expect(inicios.length).toBeGreaterThanOrEqual(3);
    expect(inicios[0]).toBeGreaterThanOrEqual(v.base); // warmup: nadie gira al nacer
    for (let i = 1; i < inicios.length; i++) {
      const gap = inicios[i] - inicios[i - 1];
      // separación ~base (±jitter); si una vuelta cede su turno por solapar
      // con una percha, el gap es un múltiplo del período (nunca arbitrario)
      const n = Math.round(gap / v.base);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
      expect(Math.abs(gap - n * v.base)).toBeLessThanOrEqual(v.jitter + 0.3);
    }
  });

  it('la vuelta anticipa (rot negativa), se pasa de rosca y asienta en 360', () => {
    const v = IDLE_PERFILES['abeja-angelita'].vuelta;
    // localizar una vuelta REAL (ya resuelta contra los otros carriles) con
    // detección fina, y muestrear su fase completa
    const [ini] = arranquesDe('vuelta', opts, 90, 0.01);
    expect(ini).toBeDefined();
    const rots = [];
    for (let f = 0.02; f < 0.99; f += 0.02) rots.push(idleDeCreature(ini + f * v.dur, opts).rot);
    expect(Math.min(...rots.slice(0, 5))).toBeLessThan(0);   // anticipación: se arma hacia atrás
    expect(Math.max(...rots)).toBeGreaterThan(v.grados);     // se pasa de rosca (overshoot)
    expect(Math.abs(rots[rots.length - 1] - v.grados)).toBeLessThanOrEqual(25); // asienta hacia 360≡0
  });

  it('se posa (percha → pose reposo, posada=1) y despega con overshoot', () => {
    const inicios = arranquesDe('percha', opts, 200);
    expect(inicios.length).toBeGreaterThanOrEqual(2);
    const p = IDLE_PERFILES['abeja-angelita'].percha;
    const mitad = idleDeCreature(inicios[0] + p.dur * 0.5, opts);
    expect(mitad.evento).toBe('percha');
    expect(mitad.pose).toBe('reposo');
    expect(mitad.posada).toBe(1);
    // en el despegue la posada asoma negativa un instante (el brinquito)
    let hop = 0;
    for (let f = 0.8; f < 1; f += 0.01) {
      hop = Math.min(hop, idleDeCreature(inicios[0] + p.dur * f, opts).posada);
    }
    expect(hop).toBeLessThan(0);
  });

  it('se asea de vez en cuando (rasca o sacude, decidido por ciclo)', () => {
    const eventos = new Set();
    for (let t = 0; t < 300; t += 0.05) eventos.add(idleDeCreature(t, opts).evento);
    expect(eventos.has('rasca') || eventos.has('sacude')).toBe(true);
  });

  it('respira siempre: squash & stretch sutil en contrafase', () => {
    const r = idleDeCreature(3.3, opts); // temprano: ningún evento programado
    expect(r.evento).toBe('respira');
    expect(r.activo).toBe(true);
    expect(Math.abs(r.sx - 1)).toBeLessThan(0.08);
    expect(Math.sign(r.sx - 1)).toBe(-Math.sign(r.sy - 1)); // contrafase
  });

  it('celebra al llegar: pose celebra, giro con overshoot y rebotico', () => {
    const dur = IDLE_PERFILES['abeja-angelita'].celebra.dur;
    const c = idleDeCreature(50, { ...opts, llegadaHace: dur * 0.5 });
    expect(c.pose).toBe('celebra');
    expect(c.evento).toBe('celebra');
    expect(c.rot).toBeGreaterThan(180);
    expect(c.sy).toBeGreaterThan(1);
    // pasada la ventana, vuelve al repertorio normal
    expect(idleDeCreature(50, { ...opts, llegadaHace: dur + 0.1 }).evento).not.toBe('celebra');
  });
});

describe('creatureIdle — gates (noche, reduced-motion, tier)', () => {
  it('de noche se acurruca: reposo, posada, y CERO piruetas', () => {
    for (let t = 0; t < 120; t += 0.5) {
      const n = idleDeCreature(t, { especie: 'abeja-angelita', hora: 'noche' });
      expect(n.pose).toBe('reposo');
      expect(n.posada).toBe(1);
      expect(n.evento).toBe('acurruca');
    }
  });

  it('reducedMotion → pose calma ESTÁTICA, activo=false (nadie pide frames)', () => {
    const dia = idleDeCreature(33, { reducedMotion: true, hora: 'dorada' });
    expect(dia).toEqual(IDLE_NEUTRO);
    const noche = idleDeCreature(33, { reducedMotion: true, hora: 'noche' });
    expect(noche.activo).toBe(false);
    expect(noche.pose).toBe('reposo');
    expect(noche.sx).toBe(1);
    expect(noche.rot).toBe(0);
  });

  it('tier bajo = frugal: solo respiración, sin giros ni perchas', () => {
    for (let t = 0; t < 120; t += 0.5) {
      const b = idleDeCreature(t, { especie: 'abeja-angelita', tier: 'bajo' });
      expect(b.evento).toBe('respira');
      expect(b.rot).toBe(0);
    }
  });
});

describe('creatureIdle — genérica por especie (misma máquina, otro animal)', () => {
  it('los cuatro perfiles de la casa existen y declaran su medio', () => {
    for (const slug of ['abeja-angelita', 'colibri', 'oso-andino', 'rana-dorada']) {
      expect(IDLE_PERFILES[slug]).toBeDefined();
      expect(['aire', 'suelo']).toContain(IDLE_PERFILES[slug].medio);
      expect(IDLE_PERFILES[slug].poseBase).toBeTruthy();
    }
  });

  it('el oso anda (poseBase de suelo) y su timeline NO calca la de la abeja', () => {
    const oso = idleDeCreature(3.3, { especie: 'oso-andino' });
    expect(oso.pose).toBe('anda');
    const vueltasOso = arranquesDe('vuelta', { especie: 'oso-andino' });
    const vueltasAbeja = arranquesDe('vuelta', { especie: 'abeja-angelita' });
    expect(vueltasOso).not.toEqual(vueltasAbeja);
  });

  it('especie desconocida cae al perfil de Angelita (nunca undefined)', () => {
    const x = idleDeCreature(3.3, { especie: 'quimera-inexistente', semilla: 7 });
    expect(x.pose).toBe('vuela');
    expect(x.activo).toBe(true);
  });

  it('backOut asienta en 1 con pasada por encima en el camino', () => {
    expect(backOut(1)).toBeCloseTo(1, 6);
    expect(backOut(0)).toBeCloseTo(0, 6);
    let pico = 0;
    for (let x = 0; x <= 1; x += 0.01) pico = Math.max(pico, backOut(x));
    expect(pico).toBeGreaterThan(1.02); // el overshoot rubber-hose
  });
});
