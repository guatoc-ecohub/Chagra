/* i18n (ADR-050): mensajes de error user-facing en español Colombia. La regla
 * chagra-i18n es soft (warn); se desactiva a nivel de archivo siguiendo el
 * mismo criterio que MercadosScreen para no bloquear el pre-commit
 * (max-warnings=0). */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { create } from 'zustand';
import {
  registrarTrato as registrarTratoRed,
  cargarReputaciones,
  cargarGrafoSocial,
  preguntarAlVecino as preguntarAlVecinoRed,
  abrirCanal,
  normalizeShareLevel,
} from '../services/red';
import { redTransactions } from '../db/redTransactions';

/**
 * useRedStore — fachada reactiva de la RED humana (campesino ↔ campesino).
 *
 * Hidrata desde los servicios de `services/red` (mismo patrón que
 * useCosechaStore: este store NO es fuente de verdad — los tratos viven
 * append-only en `db/redTransactions`; reputaciones y grafo social son cache
 * DERIVADA y reconstruible, ADR-019). La UI solo pinta lo que sale de aquí.
 *
 * Principio anti-extractivo (inviolable, ver services/red/README.md): nada de
 * lo que pasa por este store monetiza el saber — la única superficie de
 * dinero es el mercado. El grafo y la reputación solo ven tratos con
 * shareLevel >= PARES (la compuerta vive en redSharing, no aquí).
 */
const useRedStore = create((set, get) => ({
  /** @type {Array<import('../services/red/types.js').Reputacion>} */
  reputaciones: [],
  /** @type {import('../services/red/types.js').SocialGraph|null} */
  grafo: null,
  isLoading: false,
  error: null,
  lastLoadedAt: null,

  /**
   * Hidrata reputaciones + grafo social desde los tratos persistidos.
   * @returns {Promise<{reputaciones:Array, grafo:Object}|null>}
   */
  cargar: async () => {
    set({ isLoading: true, error: null });
    try {
      const [reputaciones, grafo] = await Promise.all([
        cargarReputaciones(),
        cargarGrafoSocial(),
      ]);
      set({ reputaciones, grafo, isLoading: false, lastLoadedAt: Date.now() });
      return { reputaciones, grafo };
    } catch (err) {
      set({ isLoading: false, error: err?.message || 'No se pudo cargar la red' });
      return null;
    }
  },

  /**
   * Registra un TRATO cerrado del mercado (el gesto que alimenta toda la red)
   * y rehidrata las derivadas. Delega la construcción + persistencia al
   * servicio (identidad pseudonimizada, privado-por-default).
   * @param {Object} input - ver services/red/redService.buildTrato.
   * @returns {Promise<Object|null>} el trato persistido, o null si falló.
   */
  registrarTrato: async (input) => {
    try {
      const trato = await registrarTratoRed(input);
      await get().cargar();
      return trato;
    } catch (err) {
      set({ error: err?.message || 'No se pudo registrar el trato' });
      return null;
    }
  },

  /**
   * Cambia el nivel de compartición de un trato YA registrado (el productor
   * siempre puede abrir o cerrar la compuerta de su propio dato). Niveles
   * inválidos caen a PRIVADO — nunca se comparte de más por accidente.
   * @param {string} tratoId
   * @param {number} nivel - SHARE_LEVEL.*
   * @returns {Promise<Object|null>} el trato actualizado, o null.
   */
  setNivelCompartir: async (tratoId, nivel) => {
    try {
      const trato = await redTransactions.get(tratoId);
      if (!trato) return null;
      const actualizado = { ...trato, shareLevel: normalizeShareLevel(nivel) };
      await redTransactions.save(actualizado);
      await get().cargar();
      return actualizado;
    } catch (err) {
      set({ error: err?.message || 'No se pudo cambiar el nivel de compartición' });
      return null;
    }
  },

  /**
   * "Pregúntele al vecino": rutea una duda al par competente y cercano.
   * Passthrough al servicio (la decisión no se cachea: cada duda es nueva).
   * @param {Object} problema - { producto, vereda, municipio, sintoma, agentConfident }
   * @param {Object} [opts]
   * @returns {Promise<Object|null>} la decisión de ruteo, o null si falló.
   */
  preguntarAlVecino: async (problema, opts = {}) => {
    try {
      return await preguntarAlVecinoRed(problema, opts);
    } catch (err) {
      set({ error: err?.message || 'No se pudo buscar un vecino' });
      return null;
    }
  },

  /**
   * Abre el canal directo (WhatsApp del mercado) con un vecino que expuso
   * teléfono público. Sin consentimiento devuelve null — la red no filtra
   * números. Passthrough síncrono a redService.abrirCanal.
   */
  abrirCanal,

  reset: () => set({
    reputaciones: [], grafo: null, isLoading: false, error: null, lastLoadedAt: null,
  }),
}));

// Al cambiar de finca (tenant), invalidar las derivadas en memoria — mismo
// patrón que useCosechaStore.
if (typeof window !== 'undefined') {
  window.addEventListener('tenantChanged', () => {
    useRedStore.getState().reset();
  });
}

export default useRedStore;
