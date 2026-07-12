/*
 * useNavegacionMundos — LA MÁQUINA DE NAVEGACIÓN valle ↔ mundos (three-free).
 *
 * El framework de mundos monta CUALQUIER mundo (`<Mundo>`), pero el VIAJE entre
 * el valle y un mundo — entrar, transicionar, volver — vive aquí, UNA sola vez,
 * para que todo host (el mockup de la entrada, la app real) navegue igual.
 *
 * Cuatro fases, un ciclo:
 *
 *   'valle' ──viajarAlMundo(id)──▶ 'viajando' ──completarViaje()──▶ 'mundo'
 *      ▲                                                               │
 *      └──completarViaje()── 'regresando' ◀──────volverAlValle()───────┘
 *
 * - `viajarAlMundo(id)` valida contra el REGISTRO (`resolverMundo`): si el mundo
 *   aún no tiene escena montable (no registrado, o `escena:null` → ruta 2D real),
 *   NO viaja: marca `pronto` para que el host degrade elegante ("pronto") y
 *   devuelve `false`.
 * - Con `reducedMotion` las fases de viaje se SALTAN (corte simple, sin animar):
 *   valle → mundo y mundo → valle directos, sin overlay.
 * - `completarViaje()` lo llama la transición (TransicionMundo) al terminar.
 *
 * Sin three, sin DOM: puro estado. Seguro en el bundle base.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolverMundo } from './resolverMundo.js';
import useHaptics from './useHaptics.js';
import { mundosPorPisoTermico } from './mundosPorPisoTermico.js';

/** ¿Este mundo tiene una escena montable (3D o 2D) en el registro? */
export function puedeEntrarAlMundo(mundoId) {
  const plan = resolverMundo(mundoId, 'alto');
  return plan.modo === '3d' || plan.modo === '2d';
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.reducedMotion=false]  corte simple: sin fases de viaje.
 * @param {unknown} [opts.pisoUsuario=null] piso o altitud real de la finca.
 * @returns {{
 *   fase: 'valle'|'viajando'|'mundo'|'regresando',
 *   mundoId: string|null,
 *   enViaje: boolean, enMundo: boolean,
 *   pronto: string|null,
 *   viajarAlMundo: (id: string) => boolean,
 *   volverAlValle: () => void,
 *   completarViaje: () => void,
 *   puedeEntrar: (id: string) => boolean,
 * }}
 */
export function useNavegacionMundos({ reducedMotion = false, pisoUsuario = null } = {}) {
  const [estado, setEstado] = useState({ fase: 'valle', mundoId: null });
  // El mundo que aún no abre su puerta (para el aviso "pronto" del host).
  const [pronto, setPronto] = useState(null);
  const prontoTimer = useRef(null);
  // Háptica del viaje (DR-3D-HAPTICA): entrar absorbe, volver aterriza,
  // "pronto" marca el borde. Gate triple interno (soporte + pref + rm);
  // el reducedMotion del host manda para que el gate sea coherente con
  // el resto del árbol de mundos.
  const haptics = useHaptics({ reducedMotion });
  const catalogoPisos = useMemo(() => mundosPorPisoTermico(pisoUsuario), [pisoUsuario]);
  // Espejo de la fase actual para disparar hápticas FUERA del updater de
  // estado (los updaters deben ser puros — StrictMode los corre dos veces).
  const faseRef = useRef(estado.fase);
  useEffect(() => {
    faseRef.current = estado.fase;
  }, [estado.fase]);

  useEffect(() => () => clearTimeout(prontoTimer.current), []);

  const viajarAlMundo = useCallback(
    (mundoId) => {
      if (!puedeEntrarAlMundo(mundoId)) {
        setPronto(mundoId);
        clearTimeout(prontoTimer.current);
        prontoTimer.current = setTimeout(() => setPronto(null), 3200);
        haptics.error(); // "por aquí no" — dobla el aviso visual "pronto"
        return false;
      }
      setPronto(null);
      setEstado(reducedMotion ? { fase: 'mundo', mundoId } : { fase: 'viajando', mundoId });
      haptics.viajeEntrar(); // absorción: nace del tap del usuario
      return true;
    },
    [reducedMotion, haptics],
  );

  const volverAlValle = useCallback(() => {
    // Con reducedMotion el corte es directo a 'valle' (sin fase 'regresando'
    // ni completarViaje), así que el aterrizaje suena aquí; sin reducedMotion
    // suena al completar el viaje. Pulso solo si de verdad hay mundo abierto.
    if (reducedMotion && faseRef.current !== 'valle') haptics.viajeVolver();
    setEstado((e) => {
      if (!e.mundoId) return e;
      return reducedMotion
        ? { fase: 'valle', mundoId: null }
        : { fase: 'regresando', mundoId: e.mundoId };
    });
  }, [reducedMotion, haptics]);

  const completarViaje = useCallback(() => {
    // Aterrizar en casa: solo la vuelta vibra aquí (la ida ya sonó al zarpar).
    if (faseRef.current === 'regresando') haptics.viajeVolver();
    setEstado((e) => {
      if (e.fase === 'viajando') return { fase: 'mundo', mundoId: e.mundoId };
      if (e.fase === 'regresando') return { fase: 'valle', mundoId: null };
      return e;
    });
  }, [haptics]);

  return {
    fase: estado.fase,
    mundoId: estado.mundoId,
    /** Hay overlay de viaje en pantalla (ida o vuelta). */
    enViaje: estado.fase === 'viajando' || estado.fase === 'regresando',
    /** El mundo está (o sigue) montado: dentro, o saliendo bajo el velo. */
    enMundo: estado.fase === 'mundo' || estado.fase === 'regresando',
    pronto,
    viajarAlMundo,
    volverAlValle,
    completarViaje,
    puedeEntrar: puedeEntrarAlMundo,
    catalogoPisos,
  };
}
