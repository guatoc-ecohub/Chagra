/**
 * redService.test.js — orquestación de la red. Mockea la persistencia y la
 * identidad; usa el REAL construirContacto del mercado (verifica el reuse).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  save: vi.fn(),
  getAll: vi.fn(),
  computeOperatorHash: vi.fn(),
  getCurrentOperatorHash: vi.fn(),
}));

vi.mock('../../../db/redTransactions.js', () => ({
  redTransactions: { save: h.save, getAll: h.getAll },
  nuevoTratoId: () => 'trato-x',
}));

vi.mock('../../operatorIdentityService.js', () => ({
  computeOperatorHash: h.computeOperatorHash,
  getCurrentOperatorHash: h.getCurrentOperatorHash,
}));

import {
  buildTrato,
  registrarTrato,
  cargarReputaciones,
  cargarGrafoSocial,
  preguntarAlVecino,
  abrirCanal,
} from '../redService.js';
import { NIVEL_REPUTACION, SHARE_LEVEL, ENTREGA } from '../types.js';

const oferta = {
  id: 'of1',
  producto: 'Tomate chonto',
  categoria: 'hortaliza',
  vereda: 'El Curí',
  municipio: 'Choachí',
  cantidad: 30,
  unidad: 'kg',
};

let seq = 0;
const tratoTomate = (hash, o = {}) => ({
  id: `t${seq += 1}`,
  productorHash: hash,
  compradorHash: null,
  producto: 'Tomate',
  productoNorm: 'tomate',
  categoria: 'hortaliza',
  vereda: 'El Curí',
  municipio: 'Choachí',
  cantidad: 10,
  unidad: 'kg',
  entrega: ENTREGA.ENTREGADO,
  calidad: 5,
  confirmadoPor: 'ambos',
  shareLevel: SHARE_LEVEL.PARES,
  createdAt: seq,
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.save.mockImplementation(async (r) => ({ ...r, id: r.id || 'trato-x', createdAt: r.createdAt || 1 }));
  h.getAll.mockResolvedValue([]);
  h.computeOperatorHash.mockImplementation(async (id) => `hash-${id}`);
  h.getCurrentOperatorHash.mockReturnValue('hash-self');
});

describe('buildTrato (puro)', () => {
  it('mapea una oferta del mercado a un trato con default PRIVADO', () => {
    const t = buildTrato({ oferta, productorHash: 'p1' });
    expect(t.ofertaId).toBe('of1');
    expect(t.producto).toBe('Tomate chonto');
    expect(t.vereda).toBe('El Curí');
    expect(t.cantidad).toBe(30);
    expect(t.entrega).toBe(ENTREGA.PENDIENTE);
    expect(t.shareLevel).toBe(SHARE_LEVEL.PRIVADO);
  });
  it('clampa la calidad a 1..5 (o null)', () => {
    expect(buildTrato({ oferta, productorHash: 'p1', calidad: 4 }).calidad).toBe(4);
    expect(buildTrato({ oferta, productorHash: 'p1', calidad: 6 }).calidad).toBeNull();
    expect(buildTrato({ oferta, productorHash: 'p1', calidad: 0 }).calidad).toBeNull();
  });
});

describe('registrarTrato', () => {
  it('pseudonimiza el productorId crudo y persiste', async () => {
    const saved = await registrarTrato({
      productorId: 'juan', oferta, entrega: ENTREGA.ENTREGADO, shareLevel: SHARE_LEVEL.PARES,
    });
    expect(h.computeOperatorHash).toHaveBeenCalledWith('juan');
    expect(h.save).toHaveBeenCalledTimes(1);
    expect(saved.productorHash).toBe('hash-juan');
    expect(saved.shareLevel).toBe(SHARE_LEVEL.PARES);
  });

  it('usa el hash del operador actual si no se da identidad', async () => {
    await registrarTrato({ oferta });
    expect(h.save).toHaveBeenCalledWith(expect.objectContaining({ productorHash: 'hash-self' }));
  });
});

describe('cargarReputaciones / cargarGrafoSocial', () => {
  it('deriva reputaciones desde los tratos persistidos', async () => {
    h.getAll.mockResolvedValue([
      tratoTomate('hash-p2'), tratoTomate('hash-p2'), tratoTomate('hash-p2'),
    ]);
    const reps = await cargarReputaciones();
    expect(reps).toHaveLength(1);
    expect(reps[0].nivel).toBe(NIVEL_REPUTACION.VERDE);
  });

  it('deriva el grafo social', async () => {
    h.getAll.mockResolvedValue([tratoTomate('hash-p2'), tratoTomate('hash-p3')]);
    const g = await cargarGrafoSocial();
    expect(g.nodos.productores.sort()).toEqual(['hash-p2', 'hash-p3']);
  });
});

describe('preguntarAlVecino', () => {
  it('rutea al vecino competente y excluye al operador actual', async () => {
    h.getAll.mockResolvedValue([
      tratoTomate('hash-p2'), tratoTomate('hash-p2'), tratoTomate('hash-p2'),
      tratoTomate('hash-self'), tratoTomate('hash-self'), tratoTomate('hash-self'),
    ]);
    const out = await preguntarAlVecino({
      producto: 'Tomate', vereda: 'El Curí', municipio: 'Choachí',
      sintoma: 'gota', agentConfident: false,
    });
    expect(out.shouldRoute).toBe(true);
    expect(out.peer.productorHash).toBe('hash-p2'); // nunca a uno mismo
    expect(out.mensajeSugerido).toContain('Tomate');
  });
});

describe('abrirCanal (reusa el contacto del mercado)', () => {
  it('construye el wa.me si hay teléfono público', () => {
    const canal = abrirCanal({ contactoTel: '3001234567', producto: 'Tomate' });
    expect(canal).not.toBeNull();
    expect(canal.href).toContain('https://wa.me/573001234567');
  });
  it('respeta un mensaje personalizado', () => {
    const canal = abrirCanal({ contactoTel: '3001234567' }, { mensaje: 'Hola vecino' });
    expect(decodeURIComponent(canal.href)).toContain('Hola vecino');
  });
  it('sin teléfono público → null (no filtra números sin consentimiento)', () => {
    expect(abrirCanal({ producto: 'Tomate' })).toBeNull();
    expect(abrirCanal(null)).toBeNull();
  });
});
