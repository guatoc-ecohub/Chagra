import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  resolverComportamiento,
  llaveDeDecision,
  estadoVisualDeComportamiento,
} from '../services/angelitaInteligencia';

/**
 * useAngelitaStore — LA API EN VIVO del comportamiento de Angelita.
 *
 * Es la superficie que consume la CARA (src/visual/agente/Angelita.jsx via
 * AgentFab) y las notificaciones: un store desacoplado, sin cablearse a la
 * fuerza en los archivos de nadie. El motor (angelitaInteligencia.js) es la
 * cabeza pura; este store la pone en el tiempo real de la app.
 *
 * Lo que expone para leer (selectores):
 *   - estado        → comportamiento actual: 'calma'|'aviso'|'celebra'|'husmea'.
 *   - visualEstado  → estado visual canónico que la cara pinta directamente.
 *   - mensaje       → lo que Angelita dice ahora (null en calma).
 *   - aria          → narración para lector de pantalla.
 *   - prompt        → prompt sugerido para sembrar al agente al tocarla.
 *
 * Lo que expone para actuar:
 *   - evaluar(ctx)  → corre el motor con el contexto en vivo y actualiza estado.
 *   - entrarMundo(mundo, datos) → husmear un mundo (comentario grounded).
 *   - celebrar(logro)           → celebrar un logro REAL (dedup por id).
 *   - reposar()                 → volver a la calma (default).
 *   - silenciar(bool)           → el usuario pide/quita silencio.
 *
 * ANTI-MOLESTIA + LOCAL-FIRST: los cooldowns (`ultimaHablaPorLlave`) y el flag
 * de silencio se PERSISTEN en localStorage — para que la cadencia sobreviva
 * recargas y Angelita no repita lo mismo al volver. Cero red: todo funciona
 * offline. Sólo persistimos lo mínimo (cooldowns + silencio); el mensaje en
 * curso es efímero por sesión.
 */

const inicial = {
  estado: 'calma',
  visualEstado: estadoVisualDeComportamiento('calma'),
  mensaje: null,
  aria: null,
  severidad: null,
  prioridad: 0,
  prompt: null,
  mundoActual: null,
};

const useAngelitaStore = create(
  persist(
    (set, get) => ({
      ...inicial,

      // Persistidos (anti-molestia). NO se limpian al reposar.
      ultimaHablaPorLlave: /** @type {Record<string, number>} */ ({}),
      ultimoLogroId: /** @type {string|null} */ (null),
      silenciado: false,

      /**
       * Aplica una decisión del motor al estado vivo, y si de verdad surge un
       * mensaje (interrumpe), registra la hora para el cooldown.
       * @param {import('../services/angelitaInteligencia').DecisionAngelita} decision
       * @param {string|null} [mundo]
       */
      _aplicar: (decision, mundo = null) => {
        if (!decision || !decision.interrumpe) {
          // La anti-molestia vetó (o nada que decir): Angelita reposa.
          set({ ...inicial, silenciado: get().silenciado, mundoActual: mundo });
          return;
        }
        const llave = llaveDeDecision(decision, mundo);
        const ahora = Date.now();
        set((s) => ({
          estado: decision.estado,
          visualEstado: decision.visualEstado,
          mensaje: decision.mensaje,
          aria: decision.aria,
          severidad: decision.severidad,
          prioridad: decision.prioridad,
          prompt: decision.prompt,
          mundoActual: mundo ?? s.mundoActual,
          ultimoLogroId: decision.logroId || s.ultimoLogroId,
          ultimaHablaPorLlave: llave
            ? { ...s.ultimaHablaPorLlave, [llave]: ahora }
            : s.ultimaHablaPorLlave,
        }));
      },

      /**
       * Corre el motor con el contexto en vivo. El shell arma `ctx` con lo que
       * tenga localmente (notificaciones, logro, mundo+datos, ocupado…); el
       * store inyecta la memoria anti-molestia y el silencio.
       * @param {Object} ctx — ver resolverComportamiento (sin la parte de memoria).
       */
      evaluar: (ctx = {}) => {
        const { ultimaHablaPorLlave, ultimoLogroId, silenciado } = get();
        const decision = resolverComportamiento({
          ...ctx,
          ahoraMs: ctx.ahoraMs ?? Date.now(),
          ultimaHablaPorLlave,
          ultimoLogroId,
          silenciado,
        });
        get()._aplicar(decision, ctx.mundo ?? get().mundoActual);
        return decision;
      },

      /**
       * Husmear un mundo: comentario grounded al entrar. Atajo de evaluar()
       * para el caso más común (navegación entre mundos).
       * @param {string} mundo
       * @param {Object} [datos] — datos reales del mundo (ver comentarioDeMundo).
       * @param {{ ocupado?: boolean, ahoraMs?: number }} [opts]
       */
      entrarMundo: (mundo, datos = {}, opts = {}) =>
        get().evaluar({ mundo, datosMundo: datos, ocupado: opts.ocupado, ahoraMs: opts.ahoraMs }),

      /**
       * Celebrar un logro REAL (cosecha registrada, racha, meta). Dedup por id:
       * el mismo logro no se celebra dos veces.
       * @param {{ id: string, texto: string }} logro
       * @param {{ ocupado?: boolean }} [opts]
       */
      celebrar: (logro, opts = {}) =>
        get().evaluar({ logro, ocupado: opts.ocupado }),

      /** Volver a la calma (default). No borra la memoria anti-molestia. */
      reposar: () =>
        set((s) => ({ ...inicial, silenciado: s.silenciado, mundoActual: s.mundoActual })),

      /** El usuario pide (o quita) silencio a Angelita. */
      silenciar: (flag = true) => {
        set({ silenciado: Boolean(flag) });
        if (flag) get().reposar();
      },
    }),
    {
      name: 'chagra:angelita:antimolestia',
      storage: createJSONStorage(() => localStorage),
      // Sólo la memoria anti-molestia sobrevive recargas — el mensaje en curso no.
      partialize: (s) => ({
        ultimaHablaPorLlave: s.ultimaHablaPorLlave,
        ultimoLogroId: s.ultimoLogroId,
        silenciado: s.silenciado,
      }),
    },
  ),
);

export default useAngelitaStore;
