/*
 * CamaraDirector (raíz mundo3d) — el SECUENCIADOR DE TOMAS del framework
 * (FASE 4, cámara de director).
 *
 * Los dos hermanos de FASE 4 coreografían UN beat de llegada al montar:
 *   - `escenas/CamaraDirector.jsx` → game-feel genérico (establishing + respiro).
 *   - `CamaraDioramas.jsx`         → el mismo beat con fotografía curada por mundo.
 * Este módulo es la pieza que faltaba ENCIMA de ellos: una SECUENCIA de tomas
 * nombradas (establishing → detalle → travelling → remate) que la UI puede
 * dirigir en vivo — recorridos guiados, momentos del onboarding, la "visita a
 * la finca" contada en planos. No dibuja nada: conduce cámara y target por
 * MÉTODOS three (copy/set/lerpVectors/lookAt/setFocalLength), nunca
 * reasignando props.
 *
 * NO montar junto a los hermanos en la misma escena: los tres conducen la
 * MISMA cámara (uno por Canvas, siempre).
 *
 * ── Movimiento (rubber-hose, jamás brusco) ────────────────────────────────
 * Las llegadas entre tomas van con RESORTE SUB-AMORTIGUADO semi-implícito
 * (easing exponencial estilo maath/easing damp/damp3, frame-rate independiente
 * vía delta acotado): la cámara sobrepasa el encuadre un pelito y se asienta —
 * el overshoot suave del squash & stretch, nunca montaña rusa. El lente viaja
 * en el mismo resorte (`setFocalLength`), así cada cambio de toma trae su
 * micro-gesto de zoom que se asienta solo. El TRAVELLING (fase `viaje` de una
 * toma) es un deslizamiento ease-in-out sin overshoot: la grúa no rebota.
 *
 * ── Frugalidad ────────────────────────────────────────────────────────────
 * Pensado para Canvas con `frameloop="demand"`: el hook llama `invalidate()`
 * SOLO mientras hay toma en curso; asentada la toma, cero trabajo por frame y
 * el Canvas vuelve a dormir. Por tier (deviceTier.js): 'medio' llega más
 * resuelto y sin rebote (resorte crítico); 'bajo' y `reducedMotion` CLAVAN la
 * pose final de cada toma sin interpolar (mismo encuadre, cero movimiento).
 *
 * ── Uso (dentro del <Canvas>) ─────────────────────────────────────────────
 *   const SHOTS = [
 *     { id: 'apertura', posicion: [8, 6, 11], target: [0, 0.6, 0], fov: 40 },
 *     { id: 'detalle', posicion: [-4, 1.4, 1], target: [-2.6, 0.9, -1.8], fov: 34 },
 *     { id: 'travelling', posicion: [-6, 2, 7], target: [-1, 0.5, 0], fov: 44,
 *       viaje: { posicion: [6, 2.4, 7], target: [1.5, 0.5, -1], duracion: 7 } },
 *   ]; // módulo-scope o useMemo: la identidad debe ser estable
 *
 *   function Direccion({ indice, alAsentar }) {
 *     useCamaraDirector({ shots: SHOTS, indice, tier, reducedMotion, alAsentar });
 *     return null;
 *   }
 *
 * El host (fuera del Canvas) sostiene `indice` en estado y lo cambia con sus
 * botones; `alAsentar(i)` le avisa cuándo la toma terminó (para encadenar una
 * secuencia con la pausa que quiera).
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * @typedef {Object} ViajeShot  El TRAVELLING opcional de una toma: al asentar
 *   la llegada, la cámara se desliza (ease-in-out, sin rebote) hasta aquí.
 * @property {number[]} posicion   [x,y,z] final del deslizamiento.
 * @property {number[]} [target]   [x,y,z] final de la mirada (si la mirada
 *                                 también viaja; si no, queda la de la toma).
 * @property {number} [duracion]   segundos del deslizamiento (default 6).
 */

/**
 * @typedef {Object} ShotDirector  Una toma de la secuencia.
 * @property {string} [id]         nombre de la toma (para la UI del host).
 * @property {number[]} posicion   [x,y,z] de la cámara (unidades de mundo).
 * @property {number[]} target     [x,y,z] a donde mira.
 * @property {number} [fov]        ángulo del lente (default 42; corto = tele
 *                                 íntimo, abierto = gran angular de plaza).
 * @property {number} [lambda]     velocidad de la llegada (freq. del resorte,
 *                                 rad/s aprox.): ~1.6 contemplativa, ~3 resuelta.
 * @property {ViajeShot} [viaje]   travelling opcional tras la llegada.
 */

/** Toma neutra del framework (espeja ENCUADRE_DEFECTO de camaraDioramas). */
export const SHOT_DEFECTO = Object.freeze({
  posicion: [3.6, 3.25, 6.5],
  target: [0, 0.7, 0],
  fov: 42,
  lambda: 2.2,
});

/* Amortiguación del resorte en tier alto: sub-crítica (< 1) → la cámara
   sobrepasa el encuadre un pelo y se asienta. El overshoot rubber-hose. */
const ZETA_ALTO = 0.86;
/* Duración por defecto del travelling (s). */
const VIAJE_DURACION = 6;
/* Umbral de asentamiento, relativo a la escala del recorrido. */
const EPSILON = 0.004;
/* Focal mínima de seguridad (mm de film): el resorte jamás voltea el lente. */
const FOCAL_MIN = 6;

/** Distancia focal (mm de film) que produce un fov vertical dado. */
const focalDeFov = (camera, fov) =>
  (0.5 * camera.getFilmHeight()) / Math.tan(THREE.MathUtils.degToRad(fov * 0.5));

/** Ease-in-out senoidal del travelling: arranca y frena con calma, sin rebote. */
const suave = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);

/**
 * Un paso semi-implícito del resorte para un Vector3 (muta pos y vel).
 * Con zeta < 1 el asentamiento trae overshoot suave; con zeta = 1 es damp
 * crítico (equivalente al espíritu de maath/easing.damp3). Estable con el
 * delta acotado del frame-loop.
 */
function pasoResorteV3(pos, vel, hasta, omega, zeta, dt) {
  const k = omega * omega;
  const c = 2 * zeta * omega;
  vel.set(
    vel.x + (-c * vel.x - k * (pos.x - hasta.x)) * dt,
    vel.y + (-c * vel.y - k * (pos.y - hasta.y)) * dt,
    vel.z + (-c * vel.z - k * (pos.z - hasta.z)) * dt,
  );
  pos.addScaledVector(vel, dt);
}

/** El mismo paso de resorte para un escalar (el lente). Devuelve [valor, vel]. */
function pasoResorte(valor, vel, hasta, omega, zeta, dt) {
  const v = vel + (-2 * zeta * omega * vel - omega * omega * (valor - hasta)) * dt;
  return [valor + v * dt, v];
}

/**
 * Normaliza una toma de la lista (defaults completos + índice acotado).
 * Pura y exportada para tests y para que el host lea la toma vigente.
 *
 * @param {ShotDirector[]} shots  la secuencia (no vacía).
 * @param {number} indice         índice pedido (se acota al rango).
 * @returns {ShotDirector & { indice: number }} toma completa, nunca undefined.
 */
export function resolverShot(shots, indice) {
  const i = Math.max(0, Math.min(indice, shots.length - 1));
  return { ...SHOT_DEFECTO, ...shots[i], indice: i };
}

/**
 * Hook que ORQUESTA la cámara del Canvas por tomas nombradas.
 *
 * Declare la secuencia una vez (identidad estable) y cambie `indice` desde su
 * UI: la cámara llega sola a cada toma con resorte suave (overshoot
 * rubber-hose), corre el travelling si la toma lo trae, y le avisa por
 * `alAsentar` cuando terminó. Con `reducedMotion` (o tier 'bajo') cada cambio
 * de toma CLAVA la pose final sin interpolar — mismo encuadre, cero mareo.
 *
 * Debe vivir DENTRO del `<Canvas>` (usa la cámara y el frame-loop de r3f).
 *
 * @param {Object} opciones
 * @param {ShotDirector[]} opciones.shots      la secuencia de tomas (identidad
 *                                             estable: módulo-scope o useMemo).
 * @param {number} [opciones.indice]           toma vigente (la dirige el host).
 * @param {boolean} [opciones.activo]          false → el director suelta la
 *                                             cámara (inerte total).
 * @param {boolean} [opciones.reducedMotion]   true → tomas sin interpolar.
 * @param {'alto'|'medio'|'bajo'} [opciones.tier]  perfil de equipo (deviceTier).
 * @param {{ current: Object|null }} [opciones.controls]  ref opcional de unos
 *        OrbitControls hermanos: al asentar cada toma se les sincroniza el
 *        target (el usuario retoma el orbit donde el director lo dejó).
 * @param {(indice: number) => void} [opciones.alAsentar]  aviso de toma
 *        terminada (llegada + travelling); útil para encadenar secuencias.
 * @returns {ShotDirector & { indice: number } | null} la toma vigente
 *          normalizada (null si la secuencia viene vacía).
 */
export function useCamaraDirector({
  shots,
  indice = 0,
  activo = true,
  reducedMotion = false,
  tier = 'alto',
  controls = null,
  alAsentar = null,
}) {
  const camera = /** @type {import('three').PerspectiveCamera} */ (useThree((s) => s.camera));
  const invalidate = useThree((s) => s.invalidate);

  /* Callback en ref: cambiarlo no re-corre la toma en curso. */
  const alAsentarRef = useRef(alAsentar);
  useEffect(() => {
    alAsentarRef.current = alAsentar;
  });

  /* Todo el estado mutable del director en un ref (nunca se lee en render):
     transición en curso, mirada actual y velocidades del resorte. */
  const stRef = useRef({
    trans: null, // { fase, hasta, tHasta, fHasta, omega, zeta, escala, viaje, indice }
    mira: new THREE.Vector3(),
    velPos: new THREE.Vector3(),
    velMira: new THREE.Vector3(),
    velLente: 0,
  });

  useEffect(() => {
    const st = stRef.current;
    if (!activo || !shots || shots.length === 0) {
      st.trans = null;
      return;
    }
    const shot = resolverShot(shots, indice);
    const fHasta = focalDeFov(camera, shot.fov);
    const c = controls ? controls.current : null;

    /* Sin interpolación (calma pedida o equipo justo): la pose FINAL de la
       toma — remate del travelling incluido — se clava en un paso. */
    if (reducedMotion || tier === 'bajo') {
      st.trans = null;
      st.velPos.set(0, 0, 0);
      st.velMira.set(0, 0, 0);
      st.velLente = 0;
      const fin = shot.viaje ? shot.viaje.posicion : shot.posicion;
      const finMira = (shot.viaje && shot.viaje.target) || shot.target;
      camera.position.set(fin[0], fin[1], fin[2]);
      st.mira.set(finMira[0], finMira[1], finMira[2]);
      camera.setFocalLength(fHasta);
      camera.lookAt(st.mira);
      if (c) {
        c.target.copy(st.mira);
        c.update();
      }
      invalidate();
      if (alAsentarRef.current) alAsentarRef.current(shot.indice);
      return;
    }

    /* Tier medio: llegada más resuelta y resorte crítico (sin rebote) — el
       encuadre final es idéntico, solo se ahorra el gesto. */
    const frugal = tier === 'medio';
    const hasta = new THREE.Vector3(...shot.posicion);
    const tHasta = new THREE.Vector3(...shot.target);
    st.trans = {
      fase: 'llegada',
      indice: shot.indice,
      hasta,
      tHasta,
      fHasta,
      omega: shot.lambda * (frugal ? 1.5 : 1),
      zeta: frugal ? 1 : ZETA_ALTO,
      escala: Math.max(camera.position.distanceTo(hasta), 1),
      viaje: shot.viaje
        ? {
            desde: hasta.clone(),
            hasta: new THREE.Vector3(...shot.viaje.posicion),
            tDesde: tHasta.clone(),
            tHasta: shot.viaje.target
              ? new THREE.Vector3(...shot.viaje.target)
              : tHasta.clone(),
            duracion: shot.viaje.duracion || VIAJE_DURACION,
            p: 0,
          }
        : null,
    };
    invalidate(); // despierta el frameloop "demand": la toma arranca ya
  }, [shots, indice, activo, reducedMotion, tier, camera, controls, invalidate]);

  useFrame((_, delta) => {
    const st = stRef.current;
    const t = st.trans;
    if (!t) return; // asentado: cero trabajo por frame, el Canvas duerme
    // delta acotado: una pestaña dormida no dispara el resorte al despertar.
    const dt = Math.min(delta, 1 / 20);

    if (t.fase === 'llegada') {
      pasoResorteV3(camera.position, st.velPos, t.hasta, t.omega, t.zeta, dt);
      pasoResorteV3(st.mira, st.velMira, t.tHasta, t.omega, t.zeta, dt);
      const [f, vf] = pasoResorte(
        camera.getFocalLength(),
        st.velLente,
        t.fHasta,
        t.omega,
        t.zeta,
        dt,
      );
      st.velLente = vf;
      camera.setFocalLength(Math.max(f, FOCAL_MIN));
      camera.lookAt(st.mira);

      const eps = EPSILON * t.escala;
      const quieta =
        camera.position.distanceTo(t.hasta) < eps &&
        st.velPos.length() < eps * 6 &&
        st.mira.distanceTo(t.tHasta) < eps;
      if (quieta) {
        // Aterrizaje EXACTO en el encuadre de la toma; velocidades a cero.
        camera.position.copy(t.hasta);
        st.mira.copy(t.tHasta);
        camera.setFocalLength(t.fHasta);
        camera.lookAt(st.mira);
        st.velPos.set(0, 0, 0);
        st.velMira.set(0, 0, 0);
        st.velLente = 0;
        if (t.viaje) {
          t.fase = 'viaje'; // el travelling arranca desde el encuadre clavado
        } else {
          st.trans = null;
          const c = controls ? controls.current : null;
          if (c) {
            c.target.copy(st.mira);
            c.update();
          }
          if (alAsentarRef.current) alAsentarRef.current(t.indice);
          return;
        }
      }
    } else {
      // ── TRAVELLING: deslizamiento ease-in-out, la grúa no rebota ──
      const v = t.viaje;
      v.p = Math.min(1, v.p + dt / v.duracion);
      const e = suave(v.p);
      camera.position.lerpVectors(v.desde, v.hasta, e);
      st.mira.lerpVectors(v.tDesde, v.tHasta, e);
      camera.lookAt(st.mira);
      if (v.p >= 1) {
        st.trans = null;
        const c = controls ? controls.current : null;
        if (c) {
          c.target.copy(st.mira);
          c.update();
        }
        if (alAsentarRef.current) alAsentarRef.current(t.indice);
        return;
      }
    }
    invalidate(); // toma en curso: pedimos el próximo frame (frameloop demand)
  });

  return shots && shots.length > 0 ? resolverShot(shots, indice) : null;
}
