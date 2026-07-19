/*
 * escenaGuardianes — EL MOMENTO: la máquina de estados de la escena de los
 * perros guardianes (Dante el beagle y Oliver el dálmata), como DATOS.
 *
 * Es una escena de CONVIVENCIA, no de pelea. Los perros NUNCA atacan ni
 * espantan: su papel es AVISAR y arrear el rebaño al corral — la medida real
 * que evita el conflicto con el jaguar/oso es encerrar el ganado, y el
 * depredador pasa ileso y sigue su camino (respeto mutuo).
 *
 *   tranquilo (fase null: el valle de siempre)
 *      │  arrancar()
 *      ▼
 *   'aparece'        el jaguar/oso ASOMA al borde del monte (atardecer/niebla)
 *      ▼
 *   'alerta'         Dante y Oliver AVISAN: se plantan mirando al monte y
 *                    ladran (3D, vía señal modo 'alerta' — HatoMovil)
 *      ▼
 *   'transformacion' el cruce 3D→2D: destello/aura → el mesh se apaga SECO →
 *                    nace el héroe dibujado (PerroTransicion 'heroe' × 2,
 *                    escalonados: Oliver primero, Dante detrás)
 *      ▼
 *   'guardia'        los héroes 2D trabajan: LADRAN, SEÑALAN al monte,
 *                    ARREAN (GUION_GUARDIA); el campesino encierra el ganado
 *      ▼
 *   'paso'           el rebaño a salvo; el jaguar/oso PASA ILESO y sigue su
 *                    camino; los héroes VIGILAN serenos (nada de perseguirlo)
 *      ▼
 *   'despedida'      el reverso 2D→3D: el héroe se recoge, se apaga y RENACE
 *                    el perrito 3D en el mismo punto (PerroTransicion 'normal')
 *      ▼
 *   tranquilo        perritos normales otra vez, siguiendo su vida
 *
 * El tiempo lo manejan TIMERS deterministas (mismo contrato que
 * AbejaTransicion/TransicionMundo): nada de `animationend`. Con reducedMotion
 * los CRUCES son instantáneos (msRM) y la narrativa conserva su pulso.
 */
import { useEffect, useRef, useState } from 'react';

/** Punto [x, z] en coords MUNDO del borde del monte por donde asoma el
    depredador — el rincón del oso negro (OSO_MONTE en composicionValle3D). */
export const MONTE_GUARDIANES = [5.4, -1.2];

/**
 * La línea de tiempo de la escena. `ms` = duración de la fase; `msRM` la
 * versión reduced-motion (solo los cruces colapsan — la historia se cuenta
 * igual). `actores` documenta qué hace cada capa para el host.
 */
export const FASES_GUARDIANES = Object.freeze([
  Object.freeze({
    id: 'aparece',
    ms: 2600,
    msRM: 2600,
    actores: Object.freeze({
      depredador: 'asoma al borde del monte (atardecer/niebla) — lo monta el host',
      perros3d: 'siguen su vida (orbitan el rebaño)',
      overlay: null,
    }),
  }),
  Object.freeze({
    id: 'alerta',
    ms: 2400,
    msRM: 2400,
    actores: Object.freeze({
      depredador: 'quieto, observa',
      perros3d: "modo 'alerta' (señal): plantados hacia el monte, ladran",
      overlay: null,
    }),
  }),
  Object.freeze({
    id: 'transformacion',
    ms: 1600, // ESCALON_PERROS_MS + PERRO_CRUCE_HEROE_MS + margen de asiento
    msRM: 80,
    actores: Object.freeze({
      depredador: 'quieto, observa',
      perros3d: "se apagan SECOS en PERRO_APAGA_3D_MS (señal 'oculto')",
      overlay: "PerroTransicion sentido='heroe' × 2 (Oliver 0ms, Dante +escalón)",
    }),
  }),
  Object.freeze({
    id: 'guardia',
    ms: 5200,
    msRM: 5200,
    actores: Object.freeze({
      depredador: 'espera al borde, sin drama',
      perros3d: 'dormidos (congelados donde se transformaron)',
      overlay: 'PerroHeroe × 2 con GUION_GUARDIA: ladra → señala → arrea',
    }),
  }),
  Object.freeze({
    id: 'paso',
    ms: 3400,
    msRM: 3400,
    actores: Object.freeze({
      depredador: 'PASA ILESO y sigue su camino (convivencia) — lo mueve el host',
      perros3d: 'dormidos',
      overlay: "PerroHeroe × 2 gesto 'vigila' (serenos: respeto, no persecución)",
    }),
  }),
  Object.freeze({
    id: 'despedida',
    ms: 1200, // ESCALON_PERROS_MS + PERRO_CRUCE_NORMAL_MS + margen
    msRM: 80,
    actores: Object.freeze({
      depredador: 'ya se fue',
      perros3d: "renacen SECOS en PERRO_RENACE_3D_MS (señal 'normal'), donde se transformaron",
      overlay: "PerroTransicion sentido='normal' × 2 (el reverso)",
    }),
  }),
]);

/**
 * El guion de la fase 'guardia': qué gesto hace cada héroe y cuándo (ms desde
 * el arranque de la fase). Oliver manda el arreo; Dante lo secunda desfasado
 * (nunca los dos el mismo gesto al tiempo — se leen como pareja, no como
 * clones). Gestos: 'ladra' | 'senala' | 'arrea' | 'vigila'.
 */
export const GUION_GUARDIA = Object.freeze({
  dalmata: Object.freeze([
    Object.freeze({ ms: 0, gesto: 'ladra' }),
    Object.freeze({ ms: 1600, gesto: 'senala' }),
    Object.freeze({ ms: 3200, gesto: 'arrea' }),
  ]),
  beagle: Object.freeze([
    Object.freeze({ ms: 0, gesto: 'ladra' }),
    Object.freeze({ ms: 1300, gesto: 'arrea' }),
    Object.freeze({ ms: 3600, gesto: 'senala' }),
  ]),
});

/** Duración de una fase (respetando reduced-motion). Fase desconocida → 0. */
export function duracionFase(id, reducedMotion = false) {
  const f = FASES_GUARDIANES.find((x) => x.id === id);
  if (!f) return 0;
  return reducedMotion ? f.msRM : f.ms;
}

/**
 * Hook que RECORRE la línea de tiempo con timers deterministas.
 * `activa` en true arranca la escena desde 'aparece'; al agotar la última
 * fase vuelve a null (tranquilo) y llama `onFin`. Bajar `activa` a false
 * en mitad de la escena la corta (el host debe resetear la señal —
 * MomentoGuardianes lo hace solo al desmontar).
 *
 * @returns {string|null} id de la fase en curso (null = tranquilo).
 */
export function useEscenaGuardianes({ activa = false, reducedMotion = false, onFase, onFin } = {}) {
  const [fase, setFase] = useState(/** @type {string|null} */ (null));
  const cbFase = useRef(onFase);
  const cbFin = useRef(onFin);
  useEffect(() => {
    cbFase.current = onFase;
    cbFin.current = onFin;
  });

  useEffect(() => {
    if (!activa) {
      setFase(null);
      return undefined;
    }
    let vivo = true;
    let timer = 0;
    let i = 0;
    const avanza = () => {
      if (!vivo) return;
      if (i >= FASES_GUARDIANES.length) {
        setFase(null);
        cbFin.current?.();
        return;
      }
      const f = FASES_GUARDIANES[i];
      i += 1;
      setFase(f.id);
      cbFase.current?.(f.id);
      timer = setTimeout(avanza, reducedMotion ? f.msRM : f.ms);
    };
    avanza();
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [activa, reducedMotion]);

  return fase;
}
