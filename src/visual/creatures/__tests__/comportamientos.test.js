import { describe, expect, it } from 'vitest';
import {
  aplicarComportamientos,
  aplicarGesto,
  celebrar,
  reposar,
  senalar,
  mojar,
  tenerSed,
  comer,
  resolverPoliticaR1R5,
  configurarTransicion,
} from '../comportamientos/index.js';

describe('comportamientos: gestos importables', () => {
  it('expone las poses sin conocer la especie', () => {
    expect(celebrar().pose).toBe('celebra');
    expect(reposar().pose).toBe('reposo');
    expect(senalar().pose).toBe('señala');
    expect(aplicarGesto('desconocido').pose).toBe('vuela');
    expect(celebrar({ activo: false }).pose).toBeUndefined();
  });

  it('expone reacciones corporales componibles', () => {
    expect({ ...mojar(), ...tenerSed(), ...comer() }).toEqual({
      mojada: true,
      sed: true,
      comiendo: true,
    });
  });
});
describe('comportamientos: orquestador', () => {
  it('compone idle, clima, lip-sync y gesto en un snapshot', () => {
    const estado = aplicarComportamientos('jaguar', {
      idle: { tiempo: 3.3, tier: 'alto' },
      clima: { estado: 'lluvia' },
      lipsync: { rms: 0.8 },
      gestos: { ...celebrar(), mojada: true },
    });

    expect(estado.criatura).toBe('jaguar');
    expect(estado.idle.activo).toBe(true);
    expect(estado.clima.humedad).toBeGreaterThan(0);
    expect(estado.lipsync.visema).toBe('V3');
    expect(estado.gestos.pose.pose).toBe('celebra');
    expect(estado.gestos.mojada).toBe(true);
    expect(estado.rubberhose.capasContinuas).toBe(true);
  });

  it('acepta descriptor de criatura y mantiene gates frugales', () => {
    const estado = aplicarComportamientos({ slug: 'zariguya' }, {
      idle: { animated: false, tier: 'bajo' },
      gestos: reposar(),
    });

    expect(estado.criatura).toBe('zariguya');
    expect(estado.gestos.pose.pose).toBeUndefined();
    expect(estado.rubberhose.animado).toBe(false);
    expect(estado.rubberhose.capasContinuas).toBe(false);
  });
});

describe('comportamientos: política y transición', () => {
  it('resuelve R2 y R3 según interacción y elegibilidad', () => {
    expect(resolverPoliticaR1R5({ interactuando: true }).R2.atenuado).toBe(true);
    expect(resolverPoliticaR1R5({ hintDisponible: true }).R3.ensena).toBe(true);
    expect(resolverPoliticaR1R5({ aviso: true, hintDisponible: true }).R3.ensena).toBe(false);
  });

  it('centraliza tiempos de entrada, vuelta y reduced-motion', () => {
    expect(configurarTransicion('entrar').instanteMesh).toBe(760);
    expect(configurarTransicion('volver').duracion).toBe(620);
    expect(configurarTransicion('entrar', { reducedMotion: true }).duracion).toBe(0);
  });
});
