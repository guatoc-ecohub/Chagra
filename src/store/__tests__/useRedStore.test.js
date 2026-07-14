/**
 * useRedStore — fachada reactiva de la RED humana.
 *
 * Contrato cubierto:
 *   - cargar() hidrata reputaciones + grafo social desde services/red.
 *   - registrarTrato() delega al servicio y REHIDRATA las derivadas (el trato
 *     nuevo debe reflejarse en reputación/grafo sin recargar la app).
 *   - setNivelCompartir() persiste el cambio de compuerta NORMALIZADO — un
 *     nivel inválido cae a PRIVADO, nunca se comparte de más por accidente.
 *   - Errores de I/O degradan a estado honesto (error legible), no a crash.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/red', async () => {
  const types = await vi.importActual('../../services/red/types.js');
  const sharing = await vi.importActual('../../services/red/redSharing.js');
  return {
    ...types,
    normalizeShareLevel: sharing.normalizeShareLevel,
    registrarTrato: vi.fn(),
    cargarReputaciones: vi.fn(),
    cargarGrafoSocial: vi.fn(),
    preguntarAlVecino: vi.fn(),
    abrirCanal: vi.fn(),
  };
});

vi.mock('../../db/redTransactions', () => ({
  redTransactions: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

import {
  registrarTrato, cargarReputaciones, cargarGrafoSocial, SHARE_LEVEL,
} from '../../services/red';
import { redTransactions } from '../../db/redTransactions';
import useRedStore from '../useRedStore';

const REPUTACIONES = [{ productorHash: 'h1', producto: 'Tomate', productoNorm: 'tomate', nivel: 'verde' }];
const GRAFO = { nodos: { productores: ['h1'], cultivos: ['tomate'], veredas: [] }, meta: { tratos: 1, compartidos: 1, minShareLevel: 2 } };

beforeEach(() => {
  vi.clearAllMocks();
  useRedStore.getState().reset();
  /** @type {any} */ (cargarReputaciones).mockResolvedValue(REPUTACIONES);
  /** @type {any} */ (cargarGrafoSocial).mockResolvedValue(GRAFO);
});

describe('useRedStore — hidratación', () => {
  it('cargar() hidrata reputaciones + grafo desde los servicios de red', async () => {
    await useRedStore.getState().cargar();
    const s = useRedStore.getState();
    expect(s.reputaciones).toEqual(REPUTACIONES);
    expect(s.grafo).toEqual(GRAFO);
    expect(s.isLoading).toBe(false);
    expect(s.error).toBeNull();
    expect(s.lastLoadedAt).toBeTruthy();
  });

  it('un fallo de carga degrada a error honesto, no a crash', async () => {
    /** @type {any} */ (cargarReputaciones).mockRejectedValue(new Error('IndexedDB caída'));
    const out = await useRedStore.getState().cargar();
    expect(out).toBeNull();
    const s = useRedStore.getState();
    expect(s.error).toBe('IndexedDB caída');
    expect(s.isLoading).toBe(false);
  });
});

describe('useRedStore — registrarTrato', () => {
  it('delega al servicio y rehidrata las derivadas', async () => {
    const trato = { id: 'trato-1', producto: 'Tomate', shareLevel: SHARE_LEVEL.PARES };
    /** @type {any} */ (registrarTrato).mockResolvedValue(trato);

    const out = await useRedStore.getState().registrarTrato({ oferta: { producto: 'Tomate' } });

    expect(out).toEqual(trato);
    expect(registrarTrato).toHaveBeenCalledWith({ oferta: { producto: 'Tomate' } });
    // Rehidratación: el trato nuevo debe verse en reputación/grafo.
    expect(cargarReputaciones).toHaveBeenCalled();
    expect(useRedStore.getState().reputaciones).toEqual(REPUTACIONES);
  });

  it('si el registro falla, devuelve null y deja error legible', async () => {
    /** @type {any} */ (registrarTrato).mockRejectedValue(new Error('sin identidad de productor'));
    const out = await useRedStore.getState().registrarTrato({});
    expect(out).toBeNull();
    expect(useRedStore.getState().error).toBe('sin identidad de productor');
  });
});

describe('useRedStore — setNivelCompartir (la compuerta)', () => {
  it('persiste el nivel nuevo y rehidrata', async () => {
    /** @type {any} */ (redTransactions.get).mockResolvedValue({ id: 'trato-1', shareLevel: SHARE_LEVEL.PRIVADO });
    /** @type {any} */ (redTransactions.save).mockImplementation(async (t) => t);

    const out = await useRedStore.getState().setNivelCompartir('trato-1', SHARE_LEVEL.PARES);

    expect(out.shareLevel).toBe(SHARE_LEVEL.PARES);
    expect(redTransactions.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'trato-1', shareLevel: SHARE_LEVEL.PARES }),
    );
    expect(cargarReputaciones).toHaveBeenCalled();
  });

  it('un nivel inválido cae a PRIVADO — nunca se comparte de más', async () => {
    /** @type {any} */ (redTransactions.get).mockResolvedValue({ id: 'trato-1', shareLevel: SHARE_LEVEL.PARES });
    /** @type {any} */ (redTransactions.save).mockImplementation(async (t) => t);

    const out = await useRedStore.getState().setNivelCompartir('trato-1', 99);

    expect(out.shareLevel).toBe(SHARE_LEVEL.PRIVADO);
  });

  it('trato inexistente devuelve null sin tocar la persistencia', async () => {
    /** @type {any} */ (redTransactions.get).mockResolvedValue(null);
    const out = await useRedStore.getState().setNivelCompartir('nope', SHARE_LEVEL.PARES);
    expect(out).toBeNull();
    expect(redTransactions.save).not.toHaveBeenCalled();
  });
});
