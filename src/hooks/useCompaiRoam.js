/**
 * useCompaiRoam — el DEAMBULAR físico del compai por la franja inferior de la
 * pantalla 2D.
 *
 * El compai NO se queda clavado en la esquina: camina de un lado a otro sobre
 * una franja de ~30% del ancho (`fraccionAncho`), con cadencia lenta —
 * caminatas cortas separadas por pausas— para que se lea VIVO, no un ícono
 * fijo. El movimiento vive en el eje X sobre la línea de base ya existente
 * (el host mantiene el anclaje vertical `bottom-*`): así nunca sube a tapar la
 * cámara ni el contenido, solo recorre la franja baja segura.
 *
 * REÚSO vs NUEVO: el "cerebro" de paseo que ya existía (`useCompaiPaseo` +
 * `compaiPaseoPlanificador`) decide CUÁNDO comentar una parada (semántica de
 * anillos/presupuesto), no MUEVE el cuerpo por el DOM — nunca hubo un roam
 * físico 2D reutilizable (los `wander` de `creatureIdle`/`faunaFuncional` son
 * del mundo 3D: unidades de mundo, three, billboards). Este hook es esa pieza
 * que faltaba: el desplazamiento real del nodo en pantalla.
 *
 * CÓMO SE MUEVE (sin re-render por frame): el paso se escribe DIRECTO al
 * `style.transform` del nodo vía `ref` en un `requestAnimationFrame` (mismo
 * patrón DOM-directo que `useMiradaUsted`: cero re-renders al andar). Solo se
 * sube a estado de React lo DISCRETO que el host necesita para pintar —
 * `caminando` (para poner al bicho en su pose de marcha) y `hacia` (para
 * espejarlo hacia donde anda)— y solo cuando CAMBIA, no cada frame.
 *
 * GATES DE LA CASA:
 *   · prefers-reduced-motion → NO deambula (se queda en casa, quieto). La
 *     dignidad de la calma es de todo el cuerpo.
 *   · `activo=false` → apaga el roam y limpia el transform (vuelve a la
 *     esquina).
 *   · `pausado=true` (panel abierto, compai ocupado…) → camina de vuelta a
 *     casa y se queda ahí hasta que se reanude — la animación de regreso es la
 *     MISMA caminata, nunca un salto seco.
 *   · pestaña oculta → el navegador congela el rAF (cero costo en background);
 *     al volver, el `dt` se acota para que no pegue un brinco acumulado.
 *
 * @param {{ current: HTMLElement|null }} ref  nodo a desplazar (su transform).
 * @param {Object} [opciones]
 * @param {boolean} [opciones.activo=true]
 * @param {boolean} [opciones.pausado=false]  fuerza el regreso a casa.
 * @param {number} [opciones.fraccionAncho=0.3]  franja recorrible (0..1 del ancho).
 * @param {boolean} [opciones.mistico=false]  fade y teleport opt-in entre paradas.
 * @param {number[]} [opciones.anclas]  posiciones seguras como fracciones de la franja.
 * @returns {{ caminando: boolean, hacia: 'izquierda'|'derecha', parada: number }}
 *   `parada` es un contador que se INCREMENTA cada vez que el compai LLEGA a un
 *   punto de su paseo y se detiene a descansar (no cuando vuelve a casa por
 *   `pausado`). Sirve para el "moverse-para-explicar": el host muestra el
 *   mensaje contextual de la pantalla en cada parada (ver CompaiOverlay).
 */
import { useEffect, useRef, useState } from 'react';

/** Velocidad de marcha (px/seg) — cadencia lenta, de paseo, no de huida. */
const PX_POR_SEG = 34;
/** Tope duro del desplazamiento (px): en pantallas anchas 30% sería demasiado;
 *  la franja recorrida se acota para que el compai no cruce media pantalla. */
const MAX_DESPLAZAMIENTO = 460;
/** Pausa entre caminatas (ms): rango con azar para que no marque metrónomo. */
const PAUSA_MIN_MS = 2400;
const PAUSA_MAX_MS = 5600;
/** Primera caminata poco después de montar (ms). */
const ARRANQUE_MS = 900;
/** dt máximo por frame (s): acota el salto al volver de pestaña oculta. */
const DT_MAX = 0.05;
/** Duración de cada aparición/desaparición mística (ms). */
const DURACION_FADE_MS = 220;
/** Anclas seguras de respaldo, expresadas como fracción de la franja inferior. */
const ANCLAS_MISTICAS_DEFAULT = [0.18, 0.52, 0.84];

/** ¿El usuario pidió quietud? (mismo criterio que useVidaIdle). */
function prefiereQuietud() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function useCompaiRoam(ref, opciones = {}) {
  const {
    activo = true,
    pausado = false,
    fraccionAncho = 0.3,
    mistico = false,
    anclas = null,
  } = opciones;

  const [caminando, setCaminando] = useState(false);
  const [hacia, setHacia] = useState(/** @type {'izquierda'|'derecha'} */ ('izquierda'));
  // Contador de paradas del paseo (llegó a un punto y descansa) — dispara el
  // mensaje contextual en el host. Vive en un ref para persistir entre re-runs
  // del effect; solo se sube a estado (discreto) cuando cambia.
  const [parada, setParada] = useState(0);
  const paradasRef = useRef(0);

  // Espejos vivos leídos DENTRO del rAF (el efecto del loop no se recrea al
  // togglear `pausado`: lo consulta por ref en cada frame → reacción inmediata).
  const pausadoRef = useRef(pausado);
  useEffect(() => { pausadoRef.current = pausado; }, [pausado]);
  const anclasRef = useRef(anclas);
  useEffect(() => { anclasRef.current = anclas; }, [anclas]);
  const caminandoRef = useRef(false);
  const haciaRef = useRef(/** @type {'izquierda'|'derecha'} */ ('izquierda'));

  useEffect(() => {
    const el = ref.current;
    if (!activo || !el || prefiereQuietud()
      || typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      if (el) el.style.transform = '';
      if (el && mistico) el.style.opacity = '';
      return undefined;
    }

    let cancelado = false;
    let rafId = 0;
    let x = 0;              // posición actual (px, ≤ 0: casa = esquina, se aleja a la izquierda)
    let objetivo = 0;      // destino de la caminata en curso
    let fase = /** @type {'reposo'|'camina'|'desaparece'|'aparece'} */ ('reposo');
    let reposoHasta = 0;   // timestamp (ms) en que termina la pausa
    let ultimoTs = 0;      // para el dt
    let transicionMs = 0;
    let anclaIndice = 0;
    let primerRecorrido = true;

    const distancia = () => {
      const w = (window.innerWidth || 0);
      return Math.min(Math.max(w * fraccionAncho, 0), MAX_DESPLAZAMIENTO);
    };

    const pintar = () => {
      el.style.transform = x ? `translate3d(${x.toFixed(1)}px, 0, 0)` : '';
    };

    const pintarOpacidad = (valor) => {
      if (mistico) el.style.opacity = String(Math.max(0, Math.min(1, valor)));
    };

    const marcarCaminando = (v) => {
      if (caminandoRef.current !== v) {
        caminandoRef.current = v;
        setCaminando(v);
      }
    };
    const marcarHacia = (v) => {
      if (haciaRef.current !== v) {
        haciaRef.current = v;
        setHacia(v);
      }
    };

    /** Elige un nuevo destino dentro de la franja, garantizando recorrido. */
    const nuevoDestino = (d) => {
      if (d <= 0) return 0;
      let destino = -Math.random() * d;
      // Si cae demasiado cerca de donde ya está, mándalo al extremo opuesto de
      // la franja: así siempre se ve un tramo caminado, nunca un pasito inerte.
      if (Math.abs(destino - x) < d * 0.35) destino = x < -d / 2 ? 0 : -d;
      return destino;
    };

    const siguienteAncla = (d) => {
      const candidatas = Array.isArray(anclasRef.current) && anclasRef.current.length > 0
        ? anclasRef.current
        : ANCLAS_MISTICAS_DEFAULT;
      const valor = Number(candidatas[anclaIndice % candidatas.length]);
      anclaIndice += 1;
      if (!Number.isFinite(valor)) return null;
      return -d * Math.max(0, Math.min(1, valor));
    };

    const iniciarFadeTeleport = (d) => {
      const destino = siguienteAncla(d);
      if (destino === null) {
        objetivo = nuevoDestino(d);
        fase = 'camina';
        return;
      }
      objetivo = destino;
      transicionMs = 0;
      fase = 'desaparece';
      marcarCaminando(false);
    };

    const loop = (ts) => {
      if (cancelado) return;
      rafId = window.requestAnimationFrame(loop);

      if (!ultimoTs) ultimoTs = ts;
      const dt = Math.min((ts - ultimoTs) / 1000, DT_MAX);
      ultimoTs = ts;

      const d = distancia();

      if (pausadoRef.current) {
        // Regreso a casa: la misma caminata, hacia x=0.
        objetivo = 0;
        fase = 'camina';
        transicionMs = 0;
        pintarOpacidad(1);
      } else if (fase === 'reposo') {
        if (ts >= reposoHasta) {
          if (mistico && primerRecorrido) {
            objetivo = siguienteAncla(d);
            fase = 'camina';
            primerRecorrido = false;
          } else if (mistico) {
            iniciarFadeTeleport(d);
          } else {
            objetivo = nuevoDestino(d);
            fase = 'camina';
          }
        }
      } else if (objetivo < -d) {
        // La franja se encogió (rotación/resize): recentra el destino.
        objetivo = -d;
      }

      if (fase === 'desaparece') {
        transicionMs += dt * 1000;
        pintarOpacidad(1 - transicionMs / DURACION_FADE_MS);
        if (transicionMs >= DURACION_FADE_MS) {
          x = objetivo;
          pintar();
          pintarOpacidad(0);
          transicionMs = 0;
          fase = 'aparece';
        }
        return;
      }

      if (fase === 'aparece') {
        transicionMs += dt * 1000;
        pintarOpacidad(transicionMs / DURACION_FADE_MS);
        if (transicionMs >= DURACION_FADE_MS) {
          pintarOpacidad(1);
          transicionMs = 0;
          fase = 'reposo';
          reposoHasta = ts + PAUSA_MIN_MS + Math.random() * (PAUSA_MAX_MS - PAUSA_MIN_MS);
          paradasRef.current += 1;
          setParada(paradasRef.current);
        }
        return;
      }

      if (fase === 'camina') {
        const delta = objetivo - x;
        const paso = PX_POR_SEG * dt;
        if (Math.abs(delta) <= paso) {
          x = objetivo;
          marcarCaminando(false);
          if (!pausadoRef.current) {
            // Llegó a un punto del paseo: descansa antes de la próxima caminata.
            // Marca la PARADA (moverse-para-explicar): el host muestra aquí el
            // mensaje contextual de la pantalla mientras dura el reposo.
            fase = 'reposo';
            reposoHasta = ts + PAUSA_MIN_MS + Math.random() * (PAUSA_MAX_MS - PAUSA_MIN_MS);
            paradasRef.current += 1;
            setParada(paradasRef.current);
          } else {
            // Aterrizó en casa con el panel abierto: mira hacia la pantalla.
            marcarHacia('izquierda');
          }
        } else {
          marcarHacia(delta < 0 ? 'izquierda' : 'derecha');
          x += Math.sign(delta) * paso;
          marcarCaminando(true);
        }
        pintar();
      }
    };

    // Arranca en reposo con una primera caminata próxima.
    reposoHasta = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + ARRANQUE_MS;
    rafId = window.requestAnimationFrame(loop);

    return () => {
      cancelado = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      caminandoRef.current = false;
      el.style.transform = '';
      if (mistico) el.style.opacity = '';
    };
  }, [activo, ref, fraccionAncho, mistico]);

  return { caminando, hacia, parada };
}
