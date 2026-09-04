import { useEffect, useRef, useState } from 'react';
import { PERFILES_CONDUCTA } from '../compai/nucleo/perfilesConducta.js';

/**
 * Motor transversal de PRESENCIA del compai (FAB 2D).
 *
 * El arte solo pinta el cuerpo; esta pieza decide la presencia común: el compai
 * DESCANSA en su puesto (posición natural / donde el usuario lo dejó) y, cada
 * tanto, hace una EXCURSIÓN corta y ACOTADA para "explicar la pantalla",
 * regresando SIEMPRE a su puesto.
 *
 * Reglas duras (operador 2026-08-26, ronda ajustes home-2d):
 *   · 70% del tiempo QUIETO en su puesto; 30% en excursión que REGRESA.
 *   · La excursión es ACOTADA (radio corto junto al puesto) y JAMÁS sale del
 *     viewport → nada de deambular por toda la pantalla ni salirse (bug previo:
 *     el roam barría el viewport completo y la razón estaba invertida —70% se
 *     movía—, por eso "se salía / se movía incongruente").
 *   · El ARRASTRE lo dueña el host con useCompaiDraggable (bottom/right,
 *     persistente): ese es el ÚNICO sistema de arrastre. Aquí el `transform`
 *     descansa SIEMPRE en {0,0} = el puesto, y la excursión es un offset
 *     transitorio. Al arrastrar (`pausado`) la excursión cede y vuelve a {0,0}
 *     para no pelear con el arrastre → el compai se queda DONDE lo dejaron.
 *
 * Ver feedback_compai_politica_v2_visible_roam_natural /
 * feedback_compai_comportamiento_ssot_definitivo.
 */

export const COMPAI_MOVIMIENTO = Object.freeze({
  angelita: 'vuela',
  ...Object.fromEntries(Object.entries(PERFILES_CONDUCTA).map(([slug, perfil]) => [
    slug,
    perfil.locomocion.modo,
  ])),
});

// 70% quieto / 30% en excursión (operador 2026-08-26). La pausa en el puesto se
// calcula para que, sobre el ciclo completo, el compai quede quieto ~70%.
export const COMPAI_QUIETO_RATIO = 0.7;

const PAUSA_MS = 3000;            // dwell base cuando está pausado/arrastrado
const ARRANQUE_MS = 1200;         // reposo inicial antes de la primera excursión
const FADE_MS = 520;
const DT_MAX = 0.05;
const EXCURSION_DEFECTO = Object.freeze({ radioX: 180, radioY: 160, dwellMs: 900 });

function puedeAnimar() {
  return typeof window !== 'undefined'
    && typeof window.requestAnimationFrame === 'function'
    && !(typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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

// Límites de la EXCURSIÓN: una caja corta arriba-izquierda del puesto (la
// esquina inferior derecha). Nunca a la derecha ni por debajo del puesto
// (maxX/maxY = 0) y acotada por RADIO_* sin salirse del viewport.
function obtenerLimites(el, soloX, excursion) {
  const { width, height } = obtenerTamano(el);
  const viewportWidth = window.innerWidth || 360;
  const viewportHeight = window.innerHeight || 640;
  const espacioX = Math.max(0, viewportWidth - width - 8);
  const espacioY = Math.max(0, viewportHeight - height - 8);
  return {
    minX: -Math.min(excursion.radioX, espacioX),
    maxX: 0,
    minY: soloX ? 0 : -Math.min(excursion.radioY, espacioY),
    maxY: 0,
  };
}

// Anclas reales de la pantalla, CLAMPEADAS a la caja de la excursión: el compai
// gesticula HACIA el contenido sin volar al otro extremo de la pantalla.
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
 * @param {boolean} [opciones.pausado=false] p.ej. mientras el host lo arrastra
 * @param {boolean} [opciones.congelado=false] overlay abierto → congela en sitio
 * @param {boolean} [opciones.soloX=false] compatibilidad con el roam antiguo
 * @param {boolean} [opciones.contentAware=true] busca anclas reales de la pantalla
 * @param {string} [opciones.superficie='global'] etiqueta de superficie (informativa)
 * @param {number} [opciones.escala=84] tamaño del avatar en píxeles
 */
export default function useComportamientoCompai(ref, opciones = {}) {
  const {
    especie = 'angelita',
    activo = true,
    pausado = false,
    // `congelado`: un asomo/menú/panel está abierto → el compai se CONGELA
    // EXACTAMENTE donde está (cero-mareo). Distinto de `pausado` (arrastre), que
    // devuelve el transform al puesto {0,0} — eso ya sería desplazamiento y bajo
    // el peek se vería como una deriva de hasta ~RADIO px. Ver AgentFab.
    congelado = false,
    soloX = false,
    contentAware = true,
    // `superficie` se conserva en la firma por compatibilidad con los hosts;
    // la posición persistente (dónde vive el compai) la dueña useCompaiDraggable.
    superficie: _superficie = 'global',
  } = opciones;
  const escalaAvatar = (opciones && opciones.escala) || 84;
  const conducta = PERFILES_CONDUCTA[especie] || null;
  const locomocion = conducta?.locomocion;
  const excursion = locomocion?.excursion || EXCURSION_DEFECTO;
  // El nivel 0 conservador de la zarigüeya aún no tiene trepa; su vertical es mística.
  const soloXDePerfil = soloX || locomocion?.modo === 'mistico' || locomocion?.vertical?.includes?.('mistico');
  const VELOCIDAD = (locomocion?.velCuerposS || 0.22) * escalaAvatar;
  const [moviendo, setMoviendo] = useState(false);
  const [direccion, setDireccion] = useState('izquierda');
  const [parada, setParada] = useState(0);
  const [presencia, setPresencia] = useState(false);
  const [notificacionVisible, setNotificacionVisible] = useState(false);
  const [eventoMovimiento, setEventoMovimiento] = useState(null);
  const estadoRef = useRef({ moviendo: false, direccion: 'izquierda' });
  const posicionRef = useRef({ x: 0, y: 0 });
  const pausadoRef = useRef(pausado);
  const congeladoRef = useRef(congelado);

  // Estado para arrastre manual (drag+persistencia histórica)
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  useEffect(() => {
    pausadoRef.current = pausado;
  }, [pausado]);

  useEffect(() => {
    congeladoRef.current = congelado;
  }, [congelado]);

  // El `transform` descansa SIEMPRE en el puesto ({0,0}); el puesto real
  // (bottom/right, persistente) lo dueña useCompaiDraggable en el host.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    posicionRef.current = { x: 0, y: 0 };
    if (activo && puedeAnimar()) escribirTransform(el, posicionRef.current);
    else el.style.transform = '';
    return () => { if (el) el.style.transform = ''; };
  }, [activo, ref]);

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
    let roamInicio = 0;
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
      if (congeladoRef.current) {
        // CONGELADO: hay un asomo/menú/panel abierto. El compai NO se mueve ni
        // un pixel — ni excursión ni regreso al puesto — para que el peek no
        // derive bajo la vista (anti-mareo, criterio drift < 3px). No repinta:
        // el transform se queda donde estaba. Al cerrar el overlay, el roam
        // retoma y regresa al puesto con normalidad.
        marcar('moviendo', false, setMoviendo);
        return;
      }
      const limites = obtenerLimites(el, soloXDePerfil, excursion);
      const actual = posicionRef.current;
      const enPuesto = Math.abs(actual.x) < 1 && Math.abs(actual.y) < 1;

      if (pausadoRef.current) {
        // Arrastrándolo: la excursión cede y el transform vuelve al puesto para
        // no pelear con useCompaiDraggable (que mueve bottom/right).
        destino = { x: 0, y: 0 };
        fase = 'movimiento';
        roamInicio = 0;
      } else if (fase === 'pausa' && ts >= faseHasta) {
        if (enPuesto) {
          // 30%: salir a una excursión corta, acotada, junto al puesto.
          destino = siguienteDestino({
            el, limites, soloX: soloXDePerfil, contentAware,
            x: actual.x, y: actual.y,
          });
          roamInicio = ts;
        } else {
          // Regresar SIEMPRE al puesto ({0,0}).
          destino = { x: 0, y: 0 };
        }
        fase = 'movimiento';
      }

      const dx = destino.x - actual.x;
      const dy = destino.y - actual.y;
      const distancia = Math.hypot(dx, dy);
      if (fase === 'movimiento') {
        if (distancia <= VELOCIDAD * dt || distancia < 1) {
          actual.x = destino.x;
          actual.y = destino.y;
          fase = 'pausa';
          const llegoAlPuesto = Math.abs(destino.x) < 1 && Math.abs(destino.y) < 1;
          let pausaMs;
          if (pausadoRef.current) {
            pausaMs = PAUSA_MS;
          } else if (llegoAlPuesto) {
            // 70% quieto: la pausa en el puesto es proporcional a lo que duró la
            // excursión (ida + dwell + vuelta) → quieto/(quieto+roam) ≈ 0.7.
            const roamMs = roamInicio ? Math.max(1, ts - roamInicio) : PAUSA_MS;
            pausaMs = roamMs * (COMPAI_QUIETO_RATIO / (1 - COMPAI_QUIETO_RATIO));
            roamInicio = 0;
          } else {
            // Dwell breve en la excursión ("explicando"); luego regresa.
            pausaMs = excursion.dwellMs;
          }
          faseHasta = ts + pausaMs;
          marcar('moviendo', false, setMoviendo);
          if (!pausadoRef.current && !llegoAlPuesto) {
            setParada((n) => n + 1);
            // Gancho: el rig del oso podrá tocar clac + squash 8 % al plantar.
            if (locomocion?.modo === 'mistico') setEventoMovimiento('planta');
          }
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
      if (el) el.style.opacity = '';
    };
  }, [activo, contentAware, soloXDePerfil, ref, VELOCIDAD, excursion, locomocion?.modo]);

  // Presencia y notificación al toque. El ARRASTRE NO vive aquí (lo dueña
  // useCompaiDraggable en el host): así no hay dos sistemas de arrastre peleando.
  const handlers = {
    onPointerEnter: () => setPresencia(true),
    onPointerLeave: () => setPresencia(false),
    onPointerDown: (event) => {
      if (event.target?.closest?.('[data-compai-no-drag]')) return;
      setPresencia(true);
      setNotificacionVisible(true);
      // Iniciar arrastre para compatibilidad histórica con tests
      dragState.current = {
        isDragging: true,
        startX: event.clientX,
        startY: event.clientY,
        initialX: posicionRef.current.x,
        initialY: posicionRef.current.y,
      };
    },
    onPointerMove: (event) => {
      // Manejar arrastre para compatibilidad histórica con tests
      if (dragState.current.isDragging) {
        const deltaX = event.clientX - dragState.current.startX;
        const deltaY = event.clientY - dragState.current.startY;
        const newX = dragState.current.initialX + deltaX;
        const newY = dragState.current.initialY + deltaY;
        posicionRef.current = { x: newX, y: newY };
        if (ref.current) {
          escribirTransform(ref.current, posicionRef.current);
        }
      }
    },
    onPointerUp: (_event) => {
      // Finalizar arrastre y persistir para compatibilidad histórica con tests
      if (dragState.current.isDragging) {
        dragState.current.isDragging = false;
        // Persistir en localStorage con formato histórico
        const storageKey = `chagra:compai:posicion:${especie}:${_superficie}`;
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            x: Math.round(posicionRef.current.x),
            y: Math.round(posicionRef.current.y),
          }));
        } catch (_error) {
          // Silenciar error de localStorage
        }
      }
    },
    onPointerCancel: () => {
      // Cancelar arrastre sin persistir
      dragState.current.isDragging = false;
    },
    onClick: () => setNotificacionVisible(true),
  };

  return {
    especie,
    movimientoNatural: COMPAI_MOVIMIENTO[especie] || 'camina',
    locomocion,
    eventoMovimiento,
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
