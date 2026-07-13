/**
 * redMatchmaking.test.js — "pregúntele al vecino" + ruteo de dudas. Verifica
 * cercanía, competencia ganada (no declarada) y la decisión de enrutar.
 */
import { describe, it, expect } from 'vitest';
import {
  proximidadTier,
  findCompetentPeers,
  buildMensajeVecino,
  routeQuestion,
} from '../redMatchmaking.js';
import { NIVEL_REPUTACION } from '../types.js';

const rep = (o = {}) => ({
  productorHash: 'p1',
  producto: 'Tomate',
  productoNorm: 'tomate',
  nivel: NIVEL_REPUTACION.VERDE,
  score: 0.7,
  vereda: 'El Curí',
  municipio: 'Choachí',
  nTransacciones: 4,
  reciente: 2000,
  ...o,
});

describe('proximidadTier', () => {
  it('misma vereda = 3 (tolerante a tildes/mayúsculas)', () => {
    expect(proximidadTier({ vereda: 'El Curí' }, { vereda: 'el curi' })).toBe(3);
  });
  it('mismo municipio, distinta vereda = 2', () => {
    expect(proximidadTier(
      { vereda: 'A', municipio: 'Choachí' },
      { vereda: 'B', municipio: 'choachi' },
    )).toBe(2);
  });
  it('más lejos = 1', () => {
    expect(proximidadTier(
      { vereda: 'A', municipio: 'Choachí' },
      { vereda: 'B', municipio: 'Ubaque' },
    )).toBe(1);
  });
});

describe('findCompetentPeers', () => {
  it('filtra por cultivo, excluye rojo y nuevo, y a uno mismo', () => {
    const reputaciones = [
      rep({ productorHash: 'p1', nivel: NIVEL_REPUTACION.VERDE }),
      rep({ productorHash: 'p2', nivel: NIVEL_REPUTACION.ROJO }),
      rep({ productorHash: 'p3', nivel: NIVEL_REPUTACION.NUEVO }),
      rep({ productorHash: 'yo', nivel: NIVEL_REPUTACION.VERDE }),
      rep({ productorHash: 'p4', producto: 'Mora', productoNorm: 'mora' }),
    ];
    const peers = findCompetentPeers(
      { producto: 'Tomate', vereda: 'El Curí', excludeHash: 'yo' },
      { reputaciones },
    );
    expect(peers.map((p) => p.productorHash)).toEqual(['p1']);
  });

  it('incluye nuevos si allowNuevo', () => {
    const reputaciones = [rep({ productorHash: 'p3', nivel: NIVEL_REPUTACION.NUEVO })];
    const peers = findCompetentPeers(
      { producto: 'Tomate' },
      { reputaciones, allowNuevo: true },
    );
    expect(peers).toHaveLength(1);
  });

  it('ordena por cercanía y luego por score', () => {
    const reputaciones = [
      rep({ productorHash: 'lejano', vereda: 'X', municipio: 'Otro', score: 0.95 }),
      rep({ productorHash: 'vecino', vereda: 'El Curí', municipio: 'Choachí', score: 0.5 }),
      rep({ productorHash: 'municipio', vereda: 'Y', municipio: 'Choachí', score: 0.9 }),
    ];
    const peers = findCompetentPeers(
      { producto: 'Tomate', vereda: 'El Curí', municipio: 'Choachí' },
      { reputaciones },
    );
    expect(peers.map((p) => p.productorHash)).toEqual(['vecino', 'municipio', 'lejano']);
    expect(peers[0].proximidad).toBe(3);
  });

  it('sin producto no devuelve nada', () => {
    expect(findCompetentPeers({ producto: '' }, { reputaciones: [rep()] })).toEqual([]);
  });
});

describe('buildMensajeVecino', () => {
  it('cita cultivo, vereda y síntoma en usted, sin revelar identidad', () => {
    const msg = buildMensajeVecino({ producto: 'Tomate', vereda: 'El Curí', sintoma: 'gota' });
    expect(msg).toContain('Tomate');
    expect(msg).toContain('El Curí');
    expect(msg).toContain('gota');
    expect(msg).toContain('usted');
  });
  it('degrada sin síntoma ni vereda', () => {
    const msg = buildMensajeVecino({ producto: 'Mora' });
    expect(msg).toContain('Mora');
    expect(typeof msg).toBe('string');
  });
});

describe('routeQuestion', () => {
  it('sin vecino competente → no rutea y no inventa contacto', () => {
    const out = routeQuestion(
      { producto: 'Tomate', agentConfident: false },
      { reputaciones: [] },
    );
    expect(out.shouldRoute).toBe(false);
    expect(out.peer).toBeNull();
    expect(out.motivo).toBe('sin_vecino_competente');
    expect(out.mensajeSugerido).toBeNull();
  });

  it('agente no sabe + hay candidato → rutea (agente_no_sabe)', () => {
    const out = routeQuestion(
      { producto: 'Tomate', vereda: 'X', municipio: 'Choachí', agentConfident: false },
      { reputaciones: [rep({ productorHash: 'p2', vereda: 'Y', municipio: 'Choachí' })] },
    );
    expect(out.shouldRoute).toBe(true);
    expect(out.peer.productorHash).toBe('p2');
    expect(out.motivo).toBe('agente_no_sabe');
    expect(out.mensajeSugerido).toContain('Tomate');
  });

  it('agente confiado pero vecino fuerte de la misma vereda → rutea (saber_local)', () => {
    const out = routeQuestion(
      { producto: 'Tomate', vereda: 'El Curí', municipio: 'Choachí', agentConfident: true },
      { reputaciones: [rep({ productorHash: 'p2', vereda: 'El Curí', nivel: NIVEL_REPUTACION.VERDE })] },
    );
    expect(out.shouldRoute).toBe(true);
    expect(out.motivo).toBe('saber_local');
  });

  it('agente confiado y solo vecino lejano/ámbar → responde el agente', () => {
    const out = routeQuestion(
      { producto: 'Tomate', vereda: 'El Curí', municipio: 'Choachí', agentConfident: true },
      { reputaciones: [rep({ productorHash: 'p2', vereda: 'Otra', municipio: 'Otro', nivel: NIVEL_REPUTACION.AMBAR })] },
    );
    expect(out.shouldRoute).toBe(false);
    expect(out.motivo).toBe('agente_responde');
  });
});
