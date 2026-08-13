import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  resolverComportamiento,
  llaveDeDecision,
  estadoVisualDeComportamiento,
  aplicarSenalMolestia,
} from '../services/angelitaInteligencia';
import { variarMensaje } from '../services/angelitaVariedad';
import { tipoDeDecision } from '../visual/agente/angelitaAvisoTipos';
import { LLAVE_COOLDOWNS, LLAVE_HEREDADA_ANGELITA, leerCooldowns, escribirCooldowns } from '../compai/nucleo/cooldowns.js';

/**
 * useAngelitaStore — LA API EN VIVO del comportamiento de Angelita.
 *
 * Es la superficie que consume la CARA (src/visual/agente/Angelita.jsx via
 * AgentFab) y las notificaciones: un store desacoplado, sin cablearse a la
 * fuerza en los archivos de nadie. El motor (angelitaInteligencia.js) es la
 * cabeza pura; este store la pone en el tiempo real de la app.
 *
 * Lo que expone para leer (selectores):
 *   - estado        → comportamiento actual: 'calma'|'aviso'|'celebra'|'husmea'|'luto'.
 *   - visualEstado  → estado visual canónico que la cara pinta directamente.
 *   - mensaje       → lo que Angelita dice ahora (null en calma).
 *   - aria          → narración para lector de pantalla.
 *   - prompt        → prompt sugerido para sembrar al agente al tocarla.
 *   - molestia      → contador adaptativo (#102/#106): sube al silenciar/
 *                      cerrar sin leer, baja al prestarle atención real.
 *   - hoyNoFecha    → fecha (YYYY-MM-DD local) del "hoy no" activo, o null.
 *
 * Lo que expone para actuar:
 *   - evaluar(ctx)  → corre el motor con el contexto en vivo y actualiza estado.
 *   - entrarMundo(mundo, datos) → husmear un mundo (comentario grounded).
 *   - celebrar(logro)           → celebrar un logro REAL (dedup por id).
 *   - lamentar(evento)          → #109: acompañar en luto una pérdida REAL
 *                      (planta marcada muerta/baja), dedup por id, tono
 *                      breve y digno — NUNCA culposo.
 *   - reposar()                 → volver a la calma (default).
 *   - silenciar(bool)           → el usuario pide/quita silencio (persistente,
 *                      indefinido — hasta que lo vuelva a prender).
 *   - marcarHoyNo()  → lo calla el RESTO DEL DÍA (#107); se resetea solo a
 *                      medianoche local, sin que el usuario tenga que volver
 *                      a prenderlo (a diferencia de silenciar(), que es manual).
 *   - registrarSenalMolestia(senal) → aplica una señal (#102/#106) al contador
 *                      adaptativo. Ver MOLESTIA_DELTA en angelitaInteligencia.
 *
 * ANTI-MOLESTIA + LOCAL-FIRST: los cooldowns (`ultimaHablaPorLlave`), el flag
 * de silencio, el contador de molestia y el "hoy no" se PERSISTEN en
 * localStorage — para que la cadencia sobreviva recargas y Angelita no repita
 * lo mismo al volver. Cero red: todo funciona offline. Sólo persistimos lo
 * mínimo; el mensaje en curso es efímero por sesión.
 *
 * CROSS-STACK 2D-3D (#compai-estado-cruza-2d-3d): Los cooldowns ahora viven bajo
 * la llave canónica 'compai:cooldowns' (núcleo portable) que comparten todos
 * los compañeros, migrando desde la llave histórica 'chagra:angelita:antimolestia'.
 *
 * TELEMETRÍA LOCAL (#106): `registrarSenalMolestia` es también el único punto
 * de telemetría de "cuánto molesta" — un contador en memoria, SIN PII, que
 * nunca sale del dispositivo (no hay `fetch`, no hay red en este store). Sirve
 * de bitácora corta para depurar la cadencia, no de analítica.
 */

/** Fecha local (YYYY-MM-DD) de "hoy", para el reset del "hoy no" a medianoche. */
function fechaLocalHoy(ahora = new Date()) {
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const d = String(ahora.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const inicial = {
  estado: 'calma',
  visualEstado: estadoVisualDeComportamiento('calma'),
  mensaje: null,
  aria: null,
  severidad: null,
  prioridad: 0,
  prompt: null,
  mundoActual: null,
  // Capa de notificaciones bellas (2026-07-18, ADITIVA — la cadencia y el
  // husmeo NO se tocaron): tipo del aviso (angelitaAvisoTipos, 8 categorías)
  // para color+ícono de la burbuja. null en calma.
  tipo: null,
};

const useAngelitaStore = create(
  persist(
    (set, get) => ({
      ...inicial,

      // Persistidos (anti-molestia). NO se limpian al reposar.
      ultimaHablaPorLlave: /** @type {Record<string, number>} */ ({}),
      ultimoLogroId: /** @type {string|null} */ (null),
      // #109: dedup del luto, mismo patrón que ultimoLogroId (la misma
      // planta perdida no se lamenta dos veces).
      ultimoLutoId: /** @type {string|null} */ (null),
      silenciado: false,
      // Contador adaptativo (#102/#106): sube con silenciar/abortar-paseo/
      // cerrar-tip-sin-leer, baja con abrir-tip/hablarle. Clamped en el motor.
      molestia: 0,
      // "Hoy no" (#107): fecha (YYYY-MM-DD local) del día en que se activó, o
      // null si no está activo. Se lee comparándola contra fechaLocalHoy() —
      // un día distinto = vencido, sin necesidad de un timer en background.
      hoyNoFecha: /** @type {string|null} */ (null),

      // Efímero por sesión (NO persistido): ¿ya saludó en esta sesión? El
      // primer husmeo de la sesión se clasifica como 'bienvenida'.
      saludoSesionHecho: false,

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
        // CAPA DE VARIEDAD (aditiva, post-decisión): el motor y su
        // anti-molestia ya aprobaron ESTE mensaje — aquí solo se clasifica
        // (tipo → color+ícono de la burbuja) y se viste con una variante
        // fresca (angelitaVariedad: determinista al instante, LLM en segundo
        // plano para próximas veces). El núcleo factual queda intacto.
        const esBienvenida = decision.estado === 'husmea' && !get().saludoSesionHecho;
        const tipo = tipoDeDecision(decision, { mundo, esBienvenida });
        const mensajeVestido = decision.mensaje
          ? variarMensaje(decision.mensaje, tipo || 'informativa')
          : decision.mensaje;
        set((s) => ({
          estado: decision.estado,
          visualEstado: decision.visualEstado,
          mensaje: mensajeVestido,
          tipo,
          saludoSesionHecho: true,
          aria: decision.aria,
          severidad: decision.severidad,
          prioridad: decision.prioridad,
          prompt: decision.prompt,
          mundoActual: mundo ?? s.mundoActual,
          // decision.logroId sirve de dedup tanto para celebra (logro) como
          // para luto (#109) — cada uno actualiza SU propia llave, para que
          // lamentar una planta no dé por "ya celebrado" el próximo logro.
          ultimoLogroId: decision.estado === 'celebra' ? (decision.logroId || s.ultimoLogroId) : s.ultimoLogroId,
          ultimoLutoId: decision.estado === 'luto' ? (decision.logroId || s.ultimoLutoId) : s.ultimoLutoId,
          ultimaHablaPorLlave: llave
            ? { ...s.ultimaHablaPorLlave, [llave]: ahora }
            : s.ultimaHablaPorLlave,
        }));
      },

      /**
       * Corre el motor con el contexto en vivo. El shell arma `ctx` con lo que
       * tenga localmente (notificaciones, logro, mundo+datos, ocupado…); el
       * store inyecta la memoria anti-molestia, el silencio (manual + "hoy
       * no", vencido a medianoche) y el contador de cadencia adaptativa.
       * @param {Object} ctx — ver resolverComportamiento (sin la parte de memoria).
       */
      evaluar: (ctx = {}) => {
        const { ultimaHablaPorLlave, ultimoLogroId, ultimoLutoId, silenciado, molestia } = get();
        const decision = resolverComportamiento({
          ...ctx,
          ahoraMs: ctx.ahoraMs ?? Date.now(),
          ultimaHablaPorLlave,
          ultimoLogroId,
          ultimoLutoId,
          silenciado: silenciado || get().hoyNoActivo(),
          molestia,
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

      /**
       * #109 "luto y fiesta": acompañar en luto una pérdida REAL (planta
       * marcada como muerta/baja). Dedup por id — la misma planta no se
       * lamenta dos veces. Simétrico a celebrar(), tono opuesto: breve,
       * digno, NUNCA culposo (nunca "usted la dejó morir", siempre
       * acompañamiento — ver mensajesLuto en angelitaVariedad/PlantCemeteryModal).
       * @param {{ id: string, texto: string }} evento
       * @param {{ ocupado?: boolean }} [opts]
       */
      lamentar: (evento, opts = {}) =>
        get().evaluar({ luto: evento, ocupado: opts.ocupado }),

      /** Volver a la calma (default). No borra la memoria anti-molestia. */
      reposar: () =>
        set((s) => ({ ...inicial, silenciado: s.silenciado, mundoActual: s.mundoActual })),

      /** El usuario pide (o quita) silencio a Angelita. Persistente e
       *  indefinido — a diferencia de marcarHoyNo(), NO se vence solo. */
      silenciar: (flag = true) => {
        set({ silenciado: Boolean(flag) });
        if (flag) {
          get().reposar();
          get().registrarSenalMolestia('silenciar');
        }
      },

      /**
       * "Hoy no" (#107): lo calla el RESTO DEL DÍA. Se resetea SOLO a la
       * medianoche local siguiente — el usuario no tiene que acordarse de
       * volver a prenderlo, a diferencia del silencio manual. Cuenta como
       * señal de molestia (misma familia que silenciar): el usuario está
       * pidiendo que lo dejen tranquilo.
       */
      marcarHoyNo: () => {
        set({ hoyNoFecha: fechaLocalHoy() });
        get().reposar();
        get().registrarSenalMolestia('silenciar');
      },

      /** Quita el "hoy no" antes de que venza solo (control explícito). */
      quitarHoyNo: () => set({ hoyNoFecha: null }),

      /**
       * ¿Sigue vigente el "hoy no"? Vencido = fecha guardada distinta a la de
       * HOY (no hace falta un timer en background: se compara al leer).
       * @returns {boolean}
       */
      hoyNoActivo: () => {
        const { hoyNoFecha } = get();
        if (!hoyNoFecha) return false;
        return hoyNoFecha === fechaLocalHoy();
      },

      /**
       * Aplica una señal de molestia (#102/#106) al contador adaptativo — el
       * único punto de "telemetría" de este store: local, sin PII, sin red
       * (ver angelitaInteligencia.MOLESTIA_DELTA para las señales válidas y
       * su peso). Señales negativas (positivas para el usuario) bajan el
       * contador y aceleran la cadencia; las de rechazo la frenan.
       * @param {'silenciar'|'abortarPaseo'|'cerrarTipSinLeer'|'abrirTip'|'hablarle'} senal
       */
      registrarSenalMolestia: (senal) => {
        set((s) => ({ molestia: aplicarSenalMolestia(s.molestia, senal) }));
      },
    }),
    {
      name: LLAVE_COOLDOWNS, // 'compai:cooldowns' — llave canónica cross-stack
      storage: createJSONStorage(() => localStorage),
      // CROSS-STACK: migrar desde la llave heredada al iniciar
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Intentar migrar cooldowns desde la llave heredada
        try {
          const cooldownsHeredados = leerCooldowns(localStorage);
          if (Object.keys(cooldownsHeredados).length > 0) {
            state.setState({ ultimaHablaPorLlave: cooldownsHeredados });
          }
        } catch {
          // Si falla, usar el estado por defecto (vacío)
        }

        // Configurar un listener para escribir en ambas llaves cuando cambien los cooldowns
        const originalSetState = state.setState;
        state.setState = (partial, replace) => {
          const result = originalSetState(partial, replace);
          // Después de cada actualización, escribir cooldowns en ambas llaves
          try {
            const cooldowns = state.getState().ultimaHablaPorLlave;
            if (cooldowns && Object.keys(cooldowns).length > 0) {
              escribirCooldowns(cooldowns, localStorage);
            }
          } catch {
            // Modo privado: fallar silenciosamente
          }
          return result;
        };
      },
      // Sólo la memoria anti-molestia sobrevive recargas — el mensaje en curso no.
      partialize: (s) => ({
        ultimaHablaPorLlave: s.ultimaHablaPorLlave,
        ultimoLogroId: s.ultimoLogroId,
        ultimoLutoId: s.ultimoLutoId,
        silenciado: s.silenciado,
        molestia: s.molestia,
        hoyNoFecha: s.hoyNoFecha,
      }),
    },
  ),
);

export default useAngelitaStore;
