/**
 * useAngelitaGuia — EL MECANISMO REUTILIZABLE de "Angelita señala y enseña"
 * sobre CUALQUIER pantalla 2D de Chagra.
 *
 * Nace en `#/mockups/dia-en-finca` (la abejita señalando el café que hay que
 * guardar) pero no sabe nada de esa pantalla: recibe una lista de PARADAS —
 * `{ id, ref, texto, gesto?, tipo?, lado? }` — y hace tres cosas puras:
 *
 *   1. MIDE dónde está cada elemento real (getBoundingClientRect) y calcula
 *      dónde debe pararse Angelita junto a él (esquina superior, del lado
 *      con más aire), SIEMPRE dentro del viewport — nunca coordenadas fijas
 *      de una pantalla en particular.
 *   2. VISTE el texto de la parada activa con `angelitaVariedad` (misma capa
 *      que usa el store del agente): la misma idea suena distinto cada vez.
 *   3. NAVEGA el recorrido (siguiente/anterior/ir) o se queda quieta en una
 *      sola parada si `paradas.length === 1` — ambos casos son el mismo
 *      mecanismo.
 *
 * ADOPCIÓN EN OTRA PANTALLA (las 3 líneas que hacen falta):
 *
 *   const refTanque = useRef(null);
 *   const paradas = [{ id: 'tanque', ref: refTanque, texto: '…', gesto: 'invita' }];
 *   <AngelitaGuia paradas={paradas} />   // el componente en visual/agente
 *
 * `ref` acepta un ref de React (`{ current }`) o una función getter
 * (`() => elemento`) — útil cuando el elemento vive en una lista dinámica
 * (mapa de refs por id) y no hay un único `useRef` fijo por parada.
 *
 * GATES DE LA CASA:
 *   - reduced-motion: `quieta=true` en el retorno — el CONSUMIDOR (el
 *     componente) es quien decide qué no animar; este hook nunca toca DOM.
 *   - Nunca lanza: elemento ausente/aún no montado → posición null, el
 *     componente simplemente no pinta nada ese frame (no hay parpadeo feo).
 *
 * Puro en su geometría (`calcularPuestoGuia` es exportado y testeable sin
 * React) y sin dependencia de ningún store global — cualquier pantalla la usa
 * sin tocar `useAngelitaStore` (ese es el motor de notificaciones proactivas,
 * un problema distinto).
 *
 * @module useAngelitaGuia
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { variarMensaje } from '../services/angelitaVariedad';

/** Tamaño de avatar por defecto (px) — pensado para el corte 390px de campo. */
export const TAMANO_GUIA_DEFECTO = 64;
/** Aire mínimo respecto al borde de la pantalla (px). */
export const MARGEN_VIEWPORT_DEFECTO = 14;
/** Espera antes de aparecer — deja asentar el layout, sin teatro innecesario. */
export const DEMORA_INICIAL_MS_DEFECTO = 550;

/** Resuelve el elemento real de una parada: ref de React o función getter. */
function elementoDe(parada) {
  const ref = parada?.ref;
  if (!ref) return null;
  if (typeof ref === 'function') {
    try {
      return ref();
    } catch {
      return null;
    }
  }
  if (typeof ref === 'object' && 'current' in ref) return ref.current;
  return null;
}

function prefiereQuietud() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function clamp(v, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(v, min), max);
}

/** Aire vertical entre Angelita y el borde superior del elemento (px). */
const HOLGURA_VERTICAL = 6;

/**
 * Calcula dónde debe pararse Angelita junto a un elemento — pura, sin DOM
 * fuera del `rect` que le pasan (testeable con un `DOMRect` de mentiras).
 *
 * Se perchea SIEMPRE por ENCIMA del elemento — CERO solape vertical con su
 * contenido (regla dura: "nunca tapa lo que el usuario necesita leer" no es
 * un "casi", es geometría) — del lado con MÁS aire libre en pantalla (para
 * no quedar recortada contra el borde), y SIEMPRE clampeada dentro del
 * viewport.
 *
 * @param {{top:number,left:number,right:number,bottom:number}|null} rect
 * @param {Object} [opciones]
 * @param {number} [opciones.tamano=64]
 * @param {number} [opciones.margen=14]
 * @param {number} [opciones.viewportW] — default window.innerWidth.
 * @param {number} [opciones.viewportH] — default window.innerHeight.
 * @param {'izquierda'|'derecha'} [opciones.ladoForzado] — la pantalla puede
 *   pisar la elección automática (elemento angosto y centrado, por ejemplo).
 * @returns {{x:number,y:number,lado:'izquierda'|'derecha',direccion:'izquierda'|'derecha',enVista:boolean}|null}
 */
export function calcularPuestoGuia(rect, opciones = {}) {
  if (!rect) return null;
  const {
    tamano = TAMANO_GUIA_DEFECTO,
    margen = MARGEN_VIEWPORT_DEFECTO,
    viewportW = typeof window !== 'undefined' ? window.innerWidth : 390,
    viewportH = typeof window !== 'undefined' ? window.innerHeight : 844,
    ladoForzado,
  } = opciones;

  const espacioDerecha = viewportW - rect.right;
  const espacioIzquierda = rect.left;
  const lado = ladoForzado || (espacioDerecha >= espacioIzquierda ? 'derecha' : 'izquierda');

  // Esquina del lado elegido, pero ARRIBA del todo: su propio borde inferior
  // queda por encima de rect.top — nunca superpone el cuerpo del elemento,
  // solo se asoma desde la esquina (como una vecina que se asoma por encima).
  let x = lado === 'derecha' ? rect.right - tamano * 0.62 : rect.left - tamano * 0.38;
  let y = rect.top - tamano - HOLGURA_VERTICAL;

  x = clamp(x, margen, viewportW - tamano - margen);
  y = clamp(y, margen, viewportH - tamano - margen);

  // ¿El elemento en sí anda por el viewport? (si lo scrollearon lejos, la
  // guía se apaga en vez de quedar pegada y huérfana contra un borde).
  const enVista = rect.bottom > 0 && rect.top < viewportH && rect.right > 0 && rect.left < viewportW;

  // Mira/señala HACIA el elemento: perchada a la derecha, apunta a la
  // izquierda (y viceversa) — el destello de "senala" vive en su propio
  // cuerpo, cerca de donde queda parada.
  const direccion = lado === 'derecha' ? 'izquierda' : 'derecha';

  return { x, y, lado, direccion, enVista };
}

/**
 * @typedef {Object} ParadaGuia
 * @property {string} id
 * @property {Object|Function} ref — ref de React ({current}) o getter.
 * @property {string} texto — lo que dice en la burbuja (agroecología real).
 * @property {string} [gesto='senala'] — uno de ESTADOS_ANGELITA (o alias).
 * @property {string} [tipo='sugerencia'] — uno de TIPOS_AVISO (color/ícono).
 * @property {'izquierda'|'derecha'} [lado] — pisa el lado automático.
 */

/**
 * @param {ParadaGuia[]} paradas
 * @param {Object} [opciones]
 * @param {boolean} [opciones.activo=true] — el host puede apagar toda la guía.
 * @param {number} [opciones.tamano=64]
 * @param {number} [opciones.margenViewport=14]
 * @param {number} [opciones.demoraInicialMs=550]
 * @param {string} [opciones.recordarCierreId] — si se da, cerrar() persiste en
 *   este dispositivo (localStorage) y la guía no vuelve a aparecer sola.
 * @param {boolean} [opciones.variar=true] — false = texto literal (tests / sin
 *   red del pool LLM de angelitaVariedad).
 */
export function useAngelitaGuia(paradas = [], opciones = {}) {
  const {
    activo = true,
    tamano = TAMANO_GUIA_DEFECTO,
    margenViewport = MARGEN_VIEWPORT_DEFECTO,
    demoraInicialMs = DEMORA_INICIAL_MS_DEFECTO,
    recordarCierreId = null,
    variar = true,
  } = opciones;

  const total = paradas.length;

  const [cerrada, setCerrada] = useState(() => {
    if (!recordarCierreId) return false;
    try {
      return globalThis.localStorage?.getItem(`chagra:angelita:guia:${recordarCierreId}`) === '1';
    } catch {
      return false;
    }
  });

  const [indice, setIndice] = useState(0);
  const [lista, setLista] = useState(() => prefiereQuietud()); // sin RM, espera su demora
  const [posicion, setPosicion] = useState(null);
  const [quieta, setQuieta] = useState(prefiereQuietud);

  // Si el índice quedó fuera de rango (la pantalla acortó sus paradas), se
  // recorta AL LEER — nunca se rompe por un host que cambió de idea en
  // caliente, y nunca hace falta una escritura correctiva de estado.
  const indiceEfectivo = total > 0 ? Math.min(indice, total - 1) : 0;

  // Espejo legible desde listeners/timers sin tener que re-atar los effects
  // cada vez que el host reconstruye el array `paradas` (cosa que hace en
  // cada render, porque es un literal — normal en React). Los refs se
  // escriben en un efecto (nunca durante el render: regla dura de la casa).
  const paradasRef = useRef(paradas);
  const indiceRef = useRef(indiceEfectivo);
  useLayoutEffect(() => {
    paradasRef.current = paradas;
    indiceRef.current = indiceEfectivo;
  });

  // La preferencia puede cambiar en vivo (rarísimo, pero gratis de escuchar).
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setQuieta(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else if (mq.removeListener) mq.removeListener(onChange);
    };
  }, []);

  // Demora inicial: deja asentar el layout de la pantalla antes de aparecer.
  // Con reduced-motion no hay teatro que perder: `lista` YA nació en `true`
  // (estado inicial perezoso, arriba) — este efecto solo tiene que ENCENDERLA
  // más tarde en el caso normal, nunca apagarla (activo/cerrada/total ya se
  // revisan aparte en todo lo que consume `lista`, así que dejarla prendida
  // de una sesión previa es inofensivo). Nunca setState síncrono en el
  // cuerpo del efecto — siempre desde el propio timer.
  useEffect(() => {
    if (!activo || cerrada || total === 0 || quieta) return undefined;
    const t = window.setTimeout(() => setLista(true), demoraInicialMs);
    return () => window.clearTimeout(t);
  }, [activo, cerrada, total, quieta, demoraInicialMs]);

  // Mide y coloca — rAF-throttled, disparado por scroll (capturado desde la
  // raíz para atrapar también contenedores anidados con su propio scroll),
  // resize y cambios de tamaño del propio elemento señalado.
  const recomputar = useCallback(() => {
    const parada = paradasRef.current[indiceRef.current];
    const el = elementoDe(parada);
    if (!el || typeof el.getBoundingClientRect !== 'function') {
      setPosicion(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setPosicion(calcularPuestoGuia(rect, { tamano, margen: margenViewport, ladoForzado: parada?.lado }));
  }, [tamano, margenViewport]);

  useLayoutEffect(() => {
    if (!activo || cerrada || !lista || total === 0) return undefined;
    let raf = 0;
    const pedir = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        recomputar();
      });
    };
    pedir();
    // Segunda pasada al asentar (fuentes/imágenes que cambian el layout tarde).
    const t2 = window.setTimeout(pedir, 60);

    window.addEventListener('scroll', pedir, { capture: true, passive: true });
    window.addEventListener('resize', pedir, { passive: true });

    let ro;
    const el = elementoDe(paradasRef.current[indiceRef.current]);
    if (el && typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(pedir);
      ro.observe(el);
    }

    return () => {
      window.removeEventListener('scroll', pedir, { capture: true });
      window.removeEventListener('resize', pedir);
      if (raf) window.cancelAnimationFrame(raf);
      window.clearTimeout(t2);
      if (ro) ro.disconnect();
    };
  }, [activo, cerrada, lista, indiceEfectivo, total, recomputar]);

  // El texto: vestido por angelitaVariedad — memoizado por parada activa, NO
  // en un efecto (evita el parpadeo de un tick donde el id ya cambió pero el
  // texto todavía es el de la parada anterior) y NO en cada render (el pool
  // de "vistos" de angelitaVariedad no se consume de más).
  const paradaTextoActual = paradas[indiceEfectivo]?.texto;
  const paradaTipoActual = paradas[indiceEfectivo]?.tipo;
  const textoMostrado = useMemo(() => {
    if (!paradaTextoActual) return null;
    return variar ? variarMensaje(paradaTextoActual, paradaTipoActual || 'sugerencia') : paradaTextoActual;
  }, [paradaTextoActual, paradaTipoActual, variar]);

  const siguiente = useCallback(() => {
    setIndice((i) => Math.min(i + 1, Math.max(paradasRef.current.length - 1, 0)));
  }, []);
  const anterior = useCallback(() => {
    setIndice((i) => Math.max(i - 1, 0));
  }, []);
  const ir = useCallback((id) => {
    const i = paradasRef.current.findIndex((p) => p.id === id);
    if (i >= 0) setIndice(i);
  }, []);
  const cerrar = useCallback(() => {
    setCerrada(true);
    if (recordarCierreId) {
      try {
        globalThis.localStorage?.setItem(`chagra:angelita:guia:${recordarCierreId}`, '1');
      } catch {
        /* sin storage: se cierra igual esta sesión */
      }
    }
  }, [recordarCierreId]);
  const reiniciar = useCallback(() => {
    setCerrada(false);
    setIndice(0);
    if (recordarCierreId) {
      try {
        globalThis.localStorage?.removeItem(`chagra:angelita:guia:${recordarCierreId}`);
      } catch {
        /* sin storage */
      }
    }
  }, [recordarCierreId]);

  const paradaCruda = paradas[indiceEfectivo] || null;
  const visible = Boolean(activo && !cerrada && lista && paradaCruda && posicion);

  return {
    visible,
    indice: indiceEfectivo,
    total,
    esPrimera: indiceEfectivo === 0,
    esUltima: indiceEfectivo >= total - 1,
    parada: paradaCruda
      ? {
          id: paradaCruda.id,
          texto: textoMostrado ?? paradaCruda.texto,
          gesto: paradaCruda.gesto || 'senala',
          tipo: paradaCruda.tipo || 'sugerencia',
        }
      : null,
    posicion,
    direccion: posicion?.direccion || 'derecha',
    enVista: posicion?.enVista ?? false,
    quieta,
    cerrada,
    siguiente,
    anterior,
    ir,
    cerrar,
    reiniciar,
  };
}

export default useAngelitaGuia;
