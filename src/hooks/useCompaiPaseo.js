/**
 * useCompaiPaseo — EL CABLEADO en vivo del planificador de paseo
 * (`compaiPaseoPlanificador.js`) sobre una pantalla real.
 *
 * El planificador es puro (estado + reloj → decisión); este hook es quien
 * pregunta CUÁNDO y con qué. Une tres piezas que ya existían sueltas:
 *
 *   - `compaiPaseoPlanificador` — el cerebro (presupuesto 35%, anillos #31).
 *   - `compaiParadasPorPantalla` — el registro de qué hay para comentar
 *     (#27), filtrado por anillo según la fase del paseo actual.
 *   - `compaiOcupado.estaOcupado()` — la señal `ocupado` que YA existía
 *     (`angelitaInteligencia.debeHablar` la documentaba desde el principio)
 *     y nadie había cableado al paseo: #28, "nunca pasea mientras el
 *     usuario escribe/graba/está en un formulario".
 *
 * CERO TIMERS EN BACKGROUND (#34): el único `setInterval` del hook vive
 * DENTRO de un efecto que depende de `document.visibilityState` — con la
 * pestaña oculta, el efecto se desmonta y el interval se limpia por
 * completo (mismo patrón que `useIdleDetection.js`, que ya paga este costo
 * para el resto de la app). Al volver a visible, arranca de cero: no hay
 * timers fantasma acumulando fases mientras nadie mira.
 *
 * REGRESO ANIMADO, NO SALTO (#32): el planificador entrega la fase
 * 'volviendo' y este hook la sostiene — sigue reportando la ÚLTIMA parada
 * visitada (no la limpia de golpe) durante `msRegreso`, tiempo para que el
 * consumidor (`AngelitaGuia`/CSS) anime el vuelo de vuelta con su propia
 * transición; solo al cerrarse esa ventana el hook aterriza en 'puesto'.
 *
 * ABORT POR TOQUE (#33): `abortarPaseo()` se expone para que el host lo
 * cablee a cualquier gesto de interacción real del usuario (tap/click fuera
 * del propio compAI) — corta el paseo al vuelo, YA en fase 'volviendo' para
 * que la animación de regreso siempre sea la misma, nunca un corte seco.
 *
 * @module hooks/useCompaiPaseo
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  estadoInicial,
  decidirFase,
  avanzar,
} from '../services/compaiPaseoPlanificador.js';
import { paradasCercaDe, paradasPantallaDe, tieneParadas } from '../services/compaiParadasPorPantalla.js';
import { estaOcupado } from '../services/compaiOcupado.js';

/** Cada cuánto el planificador reevalúa la fase (ms) — no necesita más fino
 *  que esto: los umbrales de anillo son de decenas de segundos. */
const TICK_MS = 2000;

/** Cuánto dura el vuelo de regreso animado antes de aterrizar en 'puesto'. */
const MS_REGRESO_DEFECTO = 900;

function documentoVisible() {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

/**
 * @param {string} pantallaId — el mismo id con que la pantalla registró sus
 *   paradas en `compaiParadasPorPantalla`.
 * @param {Object} [opciones]
 * @param {boolean} [opciones.activo=true] — el host puede apagar el paseo
 *   entero (p.ej. mientras hay un modal crítico abierto).
 * @param {number} [opciones.msRegreso=900] — duración del vuelo de vuelta.
 * @returns {{
 *   fase: 'puesto'|'cerca'|'pantalla'|'volviendo',
 *   enPuesto: boolean,
 *   paseando: boolean,
 *   paradasActivas: import('./useAngelitaGuia').ParadaGuia[],
 *   abortarPaseo: () => void,
 * }}
 */
export default function useCompaiPaseo(pantallaId, opciones = {}) {
  const { activo = true, msRegreso = MS_REGRESO_DEFECTO } = opciones;

  const [fase, setFase] = useState('puesto');
  const estadoRef = useRef(null);
  const regresoTimerRef = useRef(null);

  const limpiarRegresoTimer = useCallback(() => {
    if (regresoTimerRef.current) {
      window.clearTimeout(regresoTimerRef.current);
      regresoTimerRef.current = null;
    }
  }, []);

  // Reinicia la sesión de presupuesto cuando cambia la pantalla o se apaga
  // el paseo — cada pantalla vive SU propio 35%, no se arrastra de otra. El
  // reset depende de `pantallaId`/`activo` cambiando DESPUÉS del montaje
  // (navegación entre pantallas) — no hay forma de calcular `fase:'puesto'`
  // durante el render sin duplicar esta misma lógica ahí.
  useEffect(() => {
    estadoRef.current = estadoInicial(Date.now());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFase('puesto');
    limpiarRegresoTimer();
  }, [pantallaId, activo, limpiarRegresoTimer]);

  useEffect(() => {
    if (!activo || !pantallaId) return undefined;

    let cancelado = false;

    const tick = () => {
      if (cancelado || !estadoRef.current) return;
      const ahora = Date.now();
      const bloqueado = !documentoVisible() || estaOcupado();
      const hayParadas = tieneParadas(pantallaId);
      const siguienteFase = decidirFase(estadoRef.current, ahora, { bloqueado, hayParadas });
      estadoRef.current = avanzar(estadoRef.current, siguienteFase, ahora);
      setFase(siguienteFase);
    };

    // Nunca corre en background: si la pestaña está oculta al montar, no
    // arranca el interval — igual que `useIdleDetection`, el listener de
    // visibilitychange es quien decide cuándo (re)empezar a preguntar.
    let intervalId = null;
    const arrancar = () => {
      if (intervalId != null) return;
      tick();
      intervalId = window.setInterval(tick, TICK_MS);
    };
    const detener = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };
    const onVisibility = () => {
      if (documentoVisible()) arrancar();
      else detener();
    };

    if (documentoVisible()) arrancar();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelado = true;
      detener();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activo, pantallaId]);

  // 'volviendo' es una fase TRANSITORIA de vuelo: tras `msRegreso`, aterriza
  // en 'puesto' (contabilidad ya cerrada del lado del planificador — aquí
  // solo se refleja en el estado visible que consume la UI).
  useEffect(() => {
    if (fase !== 'volviendo') return undefined;
    regresoTimerRef.current = window.setTimeout(() => {
      regresoTimerRef.current = null;
      setFase('puesto');
    }, msRegreso);
    return limpiarRegresoTimer;
  }, [fase, msRegreso, limpiarRegresoTimer]);

  const abortarPaseo = useCallback(() => {
    if (!estadoRef.current || estadoRef.current.fase === 'puesto') return;
    const ahora = Date.now();
    // Cierra la contabilidad de una (misma regla que 'volviendo' normal),
    // pero la UI pasa por la fase 'volviendo' igual — el abort por toque
    // corta el PASEO, no salta la animación de regreso (#32 sigue aplicando
    // incluso cuando quien lo pide es #33).
    estadoRef.current = avanzar(estadoRef.current, 'puesto', ahora);
    limpiarRegresoTimer();
    setFase('volviendo');
    regresoTimerRef.current = window.setTimeout(() => {
      regresoTimerRef.current = null;
      setFase('puesto');
    }, msRegreso);
  }, [limpiarRegresoTimer, msRegreso]);

  // Paradas activas según el anillo de la fase actual — 'volviendo' sostiene
  // las últimas del anillo que estaba visitando (regreso visual coherente,
  // no un vacío repentino) hasta aterrizar en 'puesto'.
  const paradasActivas = useMemo(() => {
    if (fase === 'puesto') return [];
    if (fase === 'cerca') return paradasCercaDe(pantallaId);
    // 'pantalla' y 'volviendo' comparten el recorrido amplio.
    const amplias = paradasPantallaDe(pantallaId);
    if (amplias.length > 0) return amplias;
    return paradasCercaDe(pantallaId);
  }, [fase, pantallaId]);

  return {
    fase,
    enPuesto: fase === 'puesto',
    paseando: fase === 'cerca' || fase === 'pantalla',
    volviendo: fase === 'volviendo',
    paradasActivas,
    abortarPaseo,
  };
}
