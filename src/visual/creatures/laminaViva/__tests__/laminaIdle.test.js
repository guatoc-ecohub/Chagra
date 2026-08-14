import { describe, it, expect } from 'vitest';
import {
  semillaDe, azar01, poseDeLamina, crearParpadeo, canonizarEstado, POSE_NEUTRA,
  PERFILES_LAMINA,
} from '../laminaIdle.js';

describe('laminaIdle — determinismo (mismo contrato que creatureIdle.js/idleMachine.js)', () => {
  it('semillaDe es estable para el mismo slug', () => {
    expect(semillaDe('jaguar')).toBe(semillaDe('jaguar'));
  });

  it('dos compAI nunca comparten semilla', () => {
    const slugs = Object.keys(PERFILES_LAMINA);
    const semillas = new Set(slugs.map(semillaDe));
    expect(semillas.size).toBe(slugs.length);
  });

  it('azar01 es puro: mismos argumentos, mismo resultado', () => {
    const a = azar01(123, 4, 5);
    const b = azar01(123, 4, 5);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });
});

describe('poseDeLamina — pura y determinista', () => {
  it('mismo t, mismo perfil, misma familia → misma pose exacta', () => {
    const a = poseDeLamina(12.345, { perfil: 'oso-baston', familia: 'base' });
    const b = poseDeLamina(12.345, { perfil: 'oso-baston', familia: 'base' });
    expect(a).toEqual(b);
  });

  it('reducedMotion devuelve la pose neutra congelada, sin importar t', () => {
    const a = poseDeLamina(0, { reducedMotion: true });
    const b = poseDeLamina(999, { reducedMotion: true, perfil: 'jaguar', familia: 'animada' });
    expect(a).toEqual(POSE_NEUTRA);
    expect(b).toEqual(POSE_NEUTRA);
  });

  it('la respiración del cuerpo se mantiene en un rango acotado (nunca colapsa a 0 ni explota)', () => {
    for (let t = 0; t < 20; t += 0.37) {
      const pose = poseDeLamina(t, { perfil: 'angelita', familia: 'base' });
      expect(pose.sxCuerpo).toBeGreaterThan(0.8);
      expect(pose.sxCuerpo).toBeLessThan(1.2);
      expect(pose.syCuerpo).toBeGreaterThan(0.8);
      expect(pose.syCuerpo).toBeLessThan(1.2);
    }
  });

  it('la familia "animada" da más energía de gesto que "base" (reacción-firma del elenco)', () => {
    const base = poseDeLamina(5, { perfil: 'zariguya', familia: 'base' });
    const animada = poseDeLamina(5, { perfil: 'zariguya', familia: 'animada' });
    expect(animada.energia).toBeGreaterThan(base.energia);
  });

  it('perfil desconocido cae al perfil por defecto sin romper (vive, no se apaga)', () => {
    expect(() => poseDeLamina(3, { perfil: 'bicho-inventado' })).not.toThrow();
  });
});

describe('crearParpadeo — el parpadeo tiene memoria (no es puro en t solo)', () => {
  it('devuelve siempre un valor en [0,1]', () => {
    const parpadeo = crearParpadeo(semillaDe('luciernaga'));
    for (let t = 0; t < 15; t += 0.05) {
      const k = parpadeo(t, 'base');
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(1);
    }
  });

  it('parpadea al menos una vez en 15s de reloj (no se queda con los ojos abiertos para siempre)', () => {
    const parpadeo = crearParpadeo(semillaDe('chivito-punk'));
    let maximo = 0;
    for (let t = 0; t < 15; t += 0.02) {
      maximo = Math.max(maximo, parpadeo(t, 'base'));
    }
    expect(maximo).toBeGreaterThan(0.9); // llegó a cerrado del todo al menos una vez
  });

  it('dos instancias con semillas distintas no parpadean exactamente en el mismo instante (evita el efecto metrónomo)', () => {
    const p1 = crearParpadeo(semillaDe('oso-baston'));
    const p2 = crearParpadeo(semillaDe('chivito-punk'));
    const cerradosP1 = [];
    const cerradosP2 = [];
    for (let t = 0; t < 10; t += 0.02) {
      if (p1(t, 'base') > 0.95) cerradosP1.push(t.toFixed(2));
      if (p2(t, 'base') > 0.95) cerradosP2.push(t.toFixed(2));
    }
    // al menos algún instante de "cerrado del todo" difiere entre ambas
    expect(cerradosP1.join(',')).not.toBe(cerradosP2.join(','));
  });
});

describe('canonizarEstado — vocabulario ancho + rico caen en las mismas 4 familias', () => {
  it('vocabulario angosto (adaptadores)', () => {
    expect(canonizarEstado('idle')).toBe('base');
    expect(canonizarEstado('listening')).toBe('atenta');
    expect(canonizarEstado('thinking')).toBe('pensativa');
    expect(canonizarEstado('speaking')).toBe('animada');
  });

  it('vocabulario rico (Angelita/AgentFab)', () => {
    expect(canonizarEstado('acompana')).toBe('base');
    expect(canonizarEstado('escuchando')).toBe('atenta');
    expect(canonizarEstado('pensando')).toBe('pensativa');
    expect(canonizarEstado('respondiendo')).toBe('animada');
    expect(canonizarEstado('contenta')).toBe('animada');
    expect(canonizarEstado('invita')).toBe('animada');
  });

  it('token desconocido cae a base (nunca revienta)', () => {
    expect(canonizarEstado('algo-que-no-existe')).toBe('base');
    expect(canonizarEstado(undefined)).toBe('base');
  });
});
