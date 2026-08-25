import { useEffect, useRef, useState } from 'react';

/**
 * Motor transversal de presencia del compai.
 *
 * El arte solamente pinta el cuerpo. Esta pieza decide la presencia común:
 * una posición persistente, movimiento por la pantalla, pausa natural,
 * reacción al puntero y aparición mística al cambiar de rumbo. Los hosts
 * pueden escoger el verbo visual de la especie sin duplicar esta máquina.
 */

export const COMPAI_MOVIMIENTO = Object.freeze({
  angelita: 'vuela',
  jaguar: 'camina',
  'oso-baston': 'camina',
  zariguya: 'camina',
  guacamaya: 'vuela',
  luciernaga: 'vuela',
  'chivito-punk': 'vuela',
});

const POSICION_PREFIX = 'chagra:compai:posicion:';
const VELOCIDAD = 90;
const FADE_MS = 520;
const PAUSA_MS = 3000;
const ARRANQUE_MS = 900;
const DT_MAX = 0.05;
export const COMPAI_MOVIMIENTO_RATIO = 0.7;

function puedeAnimar() {
  return typeof window !== 'undefined'
    && typeof window.requestAnimationFrame === 'function'
    && !(typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function leerPosicion(clave) {
  try {
    const valor = JSON.parse(window.localStorage?.getItem(clave) || 'null');
    if (valor && Number.isFinite(valor.x) && Number.isFinite(valor.y)) {
      return { x: valor.x, y: valor.y };
    }
  } catch {
    // Private mode, storage disabled or malformed old data: start naturally.
  }
  return { x: 0, y: 0 };
}

function guardarPosicion(clave, posicion) {
  try {
    window.localStorage?.setItem(clave, JSON.stringify({
      x: Math.round(posicion.x),
      y: Math.round(posicion.y),
    }));
  } catch {
    // Storage is an enhancement. Presence must keep working offline/private.
  }
}

function escribirTransform(el, posicion) {
  if (!el) return;
  const { x, y } = posicion;
  el.style.transform = x || y
    ? `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
    : '';
}

function obtenerTamano(el) {
  const rect = el?.getBoundingClientRect?.();
  return {
    width: rect?.width || el?.offsetWidth || 84,
    height: rect?.height || el?.offsetHeight || 84,
  };
}

function obtenerLimites(el, soloX) {
  const { width, height } = obtenerTamano(el);
  const viewportWidth = window.innerWidth || 360;
  const viewportHeight = window.innerHeight || 640;
  const maxX = Math.max(0, viewportWidth - width - 8);
  const maxY = Math.max(0, viewportHeight - height - 8);
  return {
    minX: -maxX,
    maxX: 8,
    minY: soloX ? 0 : -maxY,
    maxY: soloX ? 0 : 8,
  };
}

function puntosDeContenido(el, limites, x, y) {
  if (typeof document === 'undefined') return [];
  const nodos = Array.from(document.querySelectorAll(
    '[data-compai-guide], main button, main [role="button"], [data-compai-anchor]',
  )).filter((n) => n !== el && n.getClientRects?.().length);
  const base = el.getBoundingClientRect?.();
  if (!base) return [];
  return nodos.slice(0, 12).map((n) => {
    const rect = n.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - (base.left + base.width / 2);
    const dy = rect.top + rect.height / 2 - (base.top + base.height / 2);
    return {
      x: Math.max(limites.minX, Math.min(limites.maxX, x + dx)),
      y: Math.max(limites.minY, Math.min(limites.maxY, y + dy)),
    };
  });
}

function siguienteDestino({ el, limites, soloX, contentAware, x, y }) {
  const puntos = contentAware ? puntosDeContenido(el, limites, x, y) : [];
  if (puntos.length) {
    const candidato = puntos[Math.floor(Math.random() * puntos.length)];
    if (Math.hypot(candidato.x - x, candidato.y - y) > 42) return candidato;
  }
  const destinoX = limites.minX + Math.random() * (limites.maxX - limites.minX);
  return {
    x: destinoX,
    y: soloX ? 0 : limites.minY + Math.random() * (limites.maxY - limites.minY),
  };
}

/**
 * @param {{ current: HTMLElement|null }} ref nodo que se mueve
 * @param {object} [opciones]
 * @param {string} [opciones.especie='angelita'] especie del compai
 * @param {boolean} [opciones.activo=true]
 * @param {boolean} [opciones.pausado=false]
 * @param {boolean} [opciones.soloX=false] compatibilidad con el roam antiguo
 * @param {boolean} [opciones.contentAware=true] busca anclas reales de la pantalla
 * @param {string} [opciones.superficie='global'] clave persistente de superficie
 */
export default function useComportamientoCompai(ref, opciones = {}) {
  const {
    especie = 'angelita',
    activo = true,
    pausado = false,
    soloX = false,
    contentAware = true,
    superficie = 'global',
  } = opciones;
  const [moviendo, setMoviendo] = useState(false);
  const [direccion, setDireccion] = useState('izquierda');
  const [parada, setParada] = useState(0);
  const [presencia, setPresencia] = useState(false);
  const [notificacionVisible, setNotificacionVisible] = useState(false);
  const estadoRef = useRef({ moviendo: false, direccion: 'izquierda' });
  const posicionRef = useRef({ x: 0, y: 0 });
  const pausadoRef = useRef(pausado);
  const storageKey = `${POSICION_PREFIX}${especie}:${superficie}`;

  useEffect(() => {
    pausadoRef.current = pausado;
  }, [pausado]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const posicion = leerPosicion(storageKey);
    posicionRef.current = posicion;
    if (activo && puedeAnimar()) escribirTransform(el, posicion);
    else el.style.transform = '';
    return () => guardarPosicion(storageKey, posicionRef.current);
  }, [activo, ref, storageKey]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !activo || !puedeAnimar()) {
      if (el && activo) el.style.opacity = '';
      return undefined;
    }
    let rafId = 0;
    let cancelado = false;
    let ultimoTs = 0;
    let fase = 'pausa';
    let faseHasta = (performance.now?.() || Date.now()) + ARRANQUE_MS;
    let movimientoInicio = 0;
    let destino = { ...posicionRef.current };
    let opacidad = 1;
    let fadeInicio = null;
    let ultimaDireccion = estadoRef.current.direccion;

    const pintar = () => escribirTransform(el, posicionRef.current);
    const marcar = (nombre, valor, setter) => {
      if (estadoRef.current[nombre] !== valor) {
        estadoRef.current[nombre] = valor;
        setter(valor);
      }
    };
    const comenzarFade = () => {
      if (ultimaDireccion !== estadoRef.current.direccion && fadeInicio === null) {
        fadeInicio = 0;
        ultimaDireccion = estadoRef.current.direccion;
      }
    };

    const loop = (ts) => {
      if (cancelado) return;
      rafId = window.requestAnimationFrame(loop);
      if (!ultimoTs) ultimoTs = ts;
      const dt = Math.min((ts - ultimoTs) / 1000, DT_MAX);
      ultimoTs = ts;
      const limites = obtenerLimites(el, soloX);

      if (fase === 'pausa' && ts >= faseHasta && !pausadoRef.current) {
        destino = siguienteDestino({
          el, limites, soloX, contentAware,
          x: posicionRef.current.x, y: posicionRef.current.y,
        });
        fase = 'movimiento';
        movimientoInicio = ts;
      }
      if (pausadoRef.current) {
        destino = { x: 0, y: 0 };
        fase = 'movimiento';
        if (!movimientoInicio) movimientoInicio = ts;
      }

      const actual = posicionRef.current;
      const dx = destino.x - actual.x;
      const dy = destino.y - actual.y;
      const distancia = Math.hypot(dx, dy);
      if (fase === 'movimiento') {
        if (distancia <= VELOCIDAD * dt || distancia < 1) {
          actual.x = destino.x;
          actual.y = destino.y;
          fase = 'pausa';
          const movimientoMs = movimientoInicio ? Math.max(1, ts - movimientoInicio) : PAUSA_MS;
          const pausaMs = pausadoRef.current || (limites.maxX - limites.minX < 24)
            ? PAUSA_MS
            : movimientoMs * ((1 - COMPAI_MOVIMIENTO_RATIO) / COMPAI_MOVIMIENTO_RATIO);
          faseHasta = ts + pausaMs;
          movimientoInicio = 0;
          marcar('moviendo', false, setMoviendo);
          if (!pausadoRef.current) setParada((n) => n + 1);
          guardarPosicion(storageKey, actual);
        } else {
          const step = Math.min(VELOCIDAD * dt, distancia);
          actual.x += (dx / distancia) * step;
          actual.y += (dy / distancia) * step;
          const nuevaDireccion = dx < 0 ? 'izquierda' : 'derecha';
          marcar('direccion', nuevaDireccion, setDireccion);
          comenzarFade();
          marcar('moviendo', true, setMoviendo);
        }
        pintar();
      }

      if (fadeInicio !== null) {
        fadeInicio += (dt * 1000);
        opacidad = fadeInicio < FADE_MS / 2
          ? 1 - (fadeInicio / (FADE_MS / 2))
          : (fadeInicio - FADE_MS / 2) / (FADE_MS / 2);
        if (fadeInicio >= FADE_MS) {
          fadeInicio = null;
          opacidad = 1;
        }
        el.style.opacity = opacidad.toFixed(2);
      }
    };
    rafId = window.requestAnimationFrame(loop);
    return () => {
      cancelado = true;
      window.cancelAnimationFrame(rafId);
      guardarPosicion(storageKey, posicionRef.current);
      el.style.opacity = '';
    };
  }, [activo, contentAware, especie, ref, soloX, storageKey]);

  const dragRef = useRef(null);
  const draggedRef = useRef(false);
  const handlers = {
    onPointerEnter: () => {
      setPresencia(true);
    },
    onPointerLeave: () => {
      setPresencia(false);
    },
    onPointerDown: (event) => {
      if (event.target?.closest?.('[data-compai-no-drag]')) return;
      const el = ref.current;
      if (el) {
        const limites = obtenerLimites(el, soloX);
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          posicion: { ...posicionRef.current },
          limites,
        };
        draggedRef.current = false;
        el.setPointerCapture?.(event.pointerId);
      }
      setPresencia(true);
      setNotificacionVisible(true);
    },
    onPointerMove: (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) > 5) draggedRef.current = true;
      const posicion = posicionRef.current;
      posicion.x = Math.max(drag.limites.minX, Math.min(drag.limites.maxX, drag.posicion.x + dx));
      posicion.y = Math.max(drag.limites.minY, Math.min(drag.limites.maxY, drag.posicion.y + dy));
      escribirTransform(ref.current, posicion);
    },
    onPointerUp: (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      ref.current?.releasePointerCapture?.(event.pointerId);
      guardarPosicion(storageKey, posicionRef.current);
      dragRef.current = null;
    },
    onPointerCancel: (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      ref.current?.releasePointerCapture?.(event.pointerId);
      guardarPosicion(storageKey, posicionRef.current);
      dragRef.current = null;
    },
    onClick: () => {
      if (draggedRef.current) {
        draggedRef.current = false;
        return;
      }
      setNotificacionVisible(true);
    },
  };

  return {
    especie,
    movimientoNatural: COMPAI_MOVIMIENTO[especie] || 'camina',
    moviendo,
    caminando: moviendo,
    direccion,
    hacia: direccion,
    parada,
    presencia,
    notificacionVisible,
    ocultarNotificacion: () => setNotificacionVisible(false),
    handlers,
  };
}
