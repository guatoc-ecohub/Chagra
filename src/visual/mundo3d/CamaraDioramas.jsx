/*
 * CamaraDioramas — aplica el ENCUADRE DE DIORAMA de cada mundo (FASE 4).
 *
 * Hermano por-mundo de `escenas/CamaraDirector.jsx`: donde aquel es el
 * game-feel GENÉRICO, este lee la fotografía curada de `camaraDioramas.js`
 * (posición/target/fov propios de valle, café, sanidad, mercado, animales,
 * semillero, clima…) y coreografía UN beat de entrada:
 *
 *  1. La cámara arranca retirada sobre un arco lateral (retiro/arcoY/grua
 *     del beat), con el lente un pelo más abierto, y LLEGA al encuadre final
 *     por damp exponencial (`THREE.MathUtils.damp` — frame-rate independiente,
 *     nada de lerp por frame fijo). El primer pointerdown del usuario ACELERA
 *     la llegada (el director cede, sin teletransportes).
 *
 *  2. Con `reducedMotion`, `activa=false` o tier 'bajo': la pose final se
 *     CLAVA en un solo paso al montar y el frame-loop queda inerte (retorno
 *     temprano, cero trabajo por frame). El encuadre final es idéntico al
 *     del beat completo: cero regresión.
 *
 *  3. Al cambiar `mundoId` el beat corre de nuevo con el encuadre del mundo
 *     nuevo (cada diorama re-presenta su plano). `unaVezPorSesion` evita
 *     repetir el show en mundos que re-montan seguido: la segunda visita
 *     clava la pose final directo.
 *
 * Solo MÉTODOS three (copy/set/lookAt/setFocalLength), nunca reasignación de
 * props de cámara. No dibuja nada (return null) y no toca navegación.
 *
 * ── Cableo (lo hace Opus; este archivo es autocontenido) ──────────────────
 * Dentro del <Canvas> de la escena, junto a los OrbitControls:
 *
 *   <CamaraDioramas
 *     mundoId={mundoId}                 // clave de MUNDO ('cafe', 'valle'…)
 *     tier={tier}                       // deviceTier: 'alto'|'medio'|'bajo'
 *     reducedMotion={reducedMotion}     // de detectarTier().reducedMotion
 *     controls={controlsRef}            // opcional: ref de OrbitControls
 *   />
 *
 * NO montar junto a CamaraDirector en la misma escena (ambos conducen la
 * misma cámara); este lo reemplaza donde haya encuadre curado.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { resolverEncuadre } from './camaraDioramas';

/** Distancia focal (mm de film) que produce un fov vertical dado. */
const focalDeFov = (camera, fov) =>
  (0.5 * camera.getFilmHeight()) / Math.tan(THREE.MathUtils.degToRad(fov * 0.5));

/** Umbral de asentamiento: por debajo, la pose se clava exacta y el beat muere. */
const EPSILON = 0.002;

/* Mundos ya presentados en esta sesión (para `unaVezPorSesion`). */
const yaPresentados = new Set();

export default function CamaraDioramas({
  /** Clave de MUNDO (mundoData.js) cuyo encuadre curado se aplica. */
  mundoId,
  /** Tier de equipo (deviceTier.js). 'medio' acorta el beat, 'bajo' lo anula. */
  tier = 'alto',
  /** true → pose final directa, sin beat (misma pose, cero movimiento). */
  reducedMotion = false,
  /** Ref opcional de los OrbitControls hermanos (target compartido). */
  controls = null,
  /** false → inerte total (el host decide apagar el director). */
  activa = true,
  /** true → el beat de cada mundo corre una sola vez por sesión. */
  unaVezPorSesion = false,
}) {
  const { camera } = useThree();
  const camPersp = /** @type {import('three').PerspectiveCamera} */ (camera);
  /** Estado del beat en curso; null = asentado (o nunca hubo). */
  const beatRef = useRef(null);

  useEffect(() => {
    const enc = resolverEncuadre(mundoId, /** @type {'alto'|'medio'|'bajo'} */ (tier));
    const hasta = new THREE.Vector3(...enc.posicion);
    const tHasta = new THREE.Vector3(...enc.target);
    const fFinal = focalDeFov(camera, enc.fov);
    const c = controls ? controls.current : null;
    const clavar = () => {
      beatRef.current = null;
      camPersp.position.copy(hasta);
      camPersp.setFocalLength(fFinal);
      if (c) {
        c.target.copy(tHasta);
        c.update();
      }
      camPersp.lookAt(tHasta);
    };

    const sinBeat =
      !activa ||
      reducedMotion ||
      enc.beat.lambda <= 0 ||
      (unaVezPorSesion && yaPresentados.has(mundoId));
    if (sinBeat) {
      clavar();
      return undefined;
    }
    if (unaVezPorSesion) yaPresentados.add(mundoId);

    // Pose de arranque: retroceder sobre el eje target→cámara, girar el arco
    // alrededor de Y y aplicar la grúa (fracción de la distancia, con signo:
    // positiva arranca alta y baja, negativa arranca baja y sube).
    const dir = hasta.clone().sub(tHasta).multiplyScalar(enc.beat.retiro);
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), enc.beat.arcoY);
    const desde = tHasta.clone().add(dir);
    desde.setY(desde.y + dir.length() * enc.beat.grua);

    beatRef.current = {
      hasta,
      tHasta,
      fFinal,
      lambda: enc.beat.lambda,
      escala: dir.length(), // para normalizar el umbral de asentamiento
    };
    camPersp.position.copy(desde);
    camPersp.setFocalLength(fFinal / enc.beat.lente);
    if (c) c.target.copy(tHasta);
    camPersp.lookAt(tHasta);

    // El primer gesto del usuario ACELERA la llegada (capture en window:
    // los hotspots DOM no burbujean por el canvas). Sin saltos: solo sube
    // la velocidad del damp y el asentamiento remata solo.
    const ceder = () => {
      const b = beatRef.current;
      if (b) b.lambda = Math.max(b.lambda * 4, 8);
    };
    window.addEventListener('pointerdown', ceder, true);
    return () => {
      window.removeEventListener('pointerdown', ceder, true);
      beatRef.current = null;
    };
    // El beat re-corre solo cuando cambia el mundo o el contexto de respeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mundoId, tier, reducedMotion, activa]);

  useFrame((state, delta) => {
    const b = beatRef.current;
    if (!b) return; // asentado: cero trabajo por frame
    // delta acotado: una pestaña dormida no "salta" la llegada al despertar.
    const dt = Math.min(delta, 1 / 20);
    const { position } = camPersp;
    position.setX(THREE.MathUtils.damp(position.x, b.hasta.x, b.lambda, dt));
    position.setY(THREE.MathUtils.damp(position.y, b.hasta.y, b.lambda, dt));
    position.setZ(THREE.MathUtils.damp(position.z, b.hasta.z, b.lambda, dt));
    camPersp.setFocalLength(
      THREE.MathUtils.damp(camPersp.getFocalLength(), b.fFinal, b.lambda, dt),
    );
    camPersp.lookAt(b.tHasta);
    if (position.distanceTo(b.hasta) < EPSILON * b.escala) {
      // Aterrizaje EXACTO en el encuadre curado; el beat muere aquí.
      camPersp.position.copy(b.hasta);
      camPersp.setFocalLength(b.fFinal);
      const c = controls ? controls.current : null;
      if (c) {
        c.target.copy(b.tHasta);
        c.update();
      }
      camPersp.lookAt(b.tHasta);
      beatRef.current = null;
    }
  });

  // Presencia puramente imperativa; nada que dibujar.
  return null;
}
