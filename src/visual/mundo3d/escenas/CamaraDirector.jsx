/*
 * CamaraDirector — el GAME-FEEL de cámara compartido (FASE 4, pulido indie).
 *
 * Tres gestos de director, todos SUTILES y cálidos (juego cozy, no montaña rusa):
 *
 *  1. ESTABLISHING SHOT al montar: la cámara arranca un poco más atrás, más
 *     alta y con un pelo de arco lateral, y hace DOLLY con ease-out hacia el
 *     encuadre de reposo mientras el lente se asienta (unos grados más abierto
 *     → base, vía `setFocalLength`): la escena "se revela" en vez de aparecer
 *     clavada. Coreografiado con el velo de `TransicionMundo` (VIAJE_MS≈1s):
 *     el velo cubre la primera mitad del dolly y al abrirse la cámara todavía
 *     está llegando — entrar se siente como LLEGAR. El primer gesto del
 *     usuario (pointerdown) ACELERA el resto del ease: el director cede,
 *     siempre, sin teletransportes.
 *
 *  2. ENCUADRE QUE RESPIRA: terminado el intro, un vaivén vertical mínimo del
 *     target (dos senos lentos desfasados, amplitud ~centímetros de mundo).
 *     Es ADITIVO por delta de frame — no pelea con el orbit del usuario ni
 *     con otras cámaras (p. ej. `CamaraViajera` del valle) que muevan el
 *     mismo target.
 *
 *  3. RESPETO: con `activa=false` (reduced-motion o tier bajo) el componente
 *     es INERTE TOTAL — cero listeners, cero trabajo por frame, la cámara se
 *     queda quieta en la pose del Canvas. El estado FINAL del intro es
 *     EXACTAMENTE la pose de reposo de siempre: cero regresión de encuadre.
 *
 * No toca navegación ni escenas: vive junto a los OrbitControls y solo mueve
 * cámara/target (por MÉTODOS three — copy/lerp/lookAt/setFocalLength — nunca
 * reasignando props: react-hooks/immutability). Los controles quedan
 * habilitados durante el intro: como cada frame reescribe la pose, el arrastre
 * del usuario "entra" apenas termina el ease acelerado por su propio toque.
 * `unaVezClave` evita repetir el show en escenas que re-montan seguido (el
 * valle re-monta en cada regreso; su establishing corre una vez por sesión).
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const easeOutCubic = (p) => 1 - (1 - p) ** 3;

/* Claves ya presentadas en esta sesión: volver al valle no repite su intro. */
const yaPresentados = new Set();

export default function CamaraDirector({
  /** ref de los OrbitControls hermanos (target compartido). */
  controls,
  /** [x,y,z] — pose FINAL de la cámara: la misma que ya fija el Canvas. */
  reposo,
  /** [x,y,z] — target del ARRANQUE (un pelín alto: revela con tilt-down).
      null → el intro no toca el target (p. ej. el valle, donde ya lo lleva
      `CamaraViajera`). */
  mirada = null,
  /** Duración del dolly (s). El velo del viaje cubre la primera mitad. */
  duracion = 2.1,
  /** Factor de retroceso del arranque (1.45 → 45% más lejos). */
  amplio = 1.45,
  /** Amplitud (unidades de mundo) de la respiración del encuadre. 0 → sin. */
  respiro = 0.03,
  /** false → inerte total (reduced-motion / tier bajo / frameloop demand). */
  activa = true,
  /** Si viene, el intro corre UNA vez por sesión para esa clave. */
  unaVezClave = null,
}) {
  const { camera } = useThree();
  const camPersp = /** @type {import('three').PerspectiveCamera} */ (camera);
  // ¿Saltar el intro? Se decide UNA vez al montar (ref-initializer): inactiva,
  // o clave ya presentada. La respiración igual queda gateada por `activa`.
  const saltarIntro = useRef(!activa || (unaVezClave !== null && yaPresentados.has(unaVezClave)));
  /** Estado del intro en curso; null = terminado (o nunca hubo). */
  const intro = useRef(null);
  const respiroPrev = useRef(0);

  useEffect(() => {
    if (saltarIntro.current) return undefined;
    if (unaVezClave !== null) yaPresentados.add(unaVezClave);
    const c = controls.current;
    const hasta = new THREE.Vector3(...reposo);
    // Target de reposo: el que los controles ya traen (0,0,0 por default) —
    // así el estado final es idéntico al encuadre de siempre.
    const tHasta = c ? c.target.clone() : new THREE.Vector3();
    const tDesde = mirada ? new THREE.Vector3(...mirada) : null;
    const pivote = tDesde || tHasta;
    // La pose amplia: retroceder sobre el eje cámara→pivote, girar un pelo
    // alrededor de Y (el dolly dibuja un ARCO, no una recta) y subir un poco
    // (grúa suave). Todo proporcional a la escala de la escena.
    const dir = hasta.clone().sub(pivote).multiplyScalar(amplio);
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.12);
    const desde = pivote.clone().add(dir);
    desde.setY(desde.y + dir.length() * 0.1);

    // El "lente que se asienta": del focal de reposo (el fov que ya fijó el
    // Canvas) a uno ~12% más corto (más abierto) al arrancar. `setFocalLength`
    // actualiza fov + projection matrix por método.
    const fRep = camPersp.getFocalLength();
    const fAmp = fRep / 1.12;
    intro.current = { p: 0, desde, hasta, tDesde, tHasta, fAmp, fRep };
    camPersp.position.copy(desde);
    camPersp.setFocalLength(fAmp);
    if (tDesde && c) c.target.copy(tDesde);
    camPersp.lookAt(tDesde || tHasta);

    // El primer gesto del usuario ACELERA la presentación (capture en window:
    // también los hotspots DOM, que no burbujean por el canvas). Sin saltos:
    // solo adelanta el progreso y el ease-out remata en ~0.3 s.
    const cortar = () => {
      const st = intro.current;
      if (st) st.p = Math.max(st.p, 0.82);
    };
    window.addEventListener('pointerdown', cortar, true);
    return () => window.removeEventListener('pointerdown', cortar, true);
    // Intro de montaje: corre exactamente una vez, con las props del arranque.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, delta) => {
    const c = controls.current;
    const st = intro.current;
    if (st) {
      // delta acotado: una pestaña dormida no "salta" el dolly al despertar.
      st.p = Math.min(1, st.p + Math.min(delta, 1 / 20) / duracion);
      const e = easeOutCubic(st.p);
      camPersp.position.lerpVectors(st.desde, st.hasta, e);
      if (st.tDesde && c) c.target.lerpVectors(st.tDesde, st.tHasta, e);
      camPersp.setFocalLength(THREE.MathUtils.lerp(st.fAmp, st.fRep, e));
      camPersp.lookAt(c ? c.target : st.tHasta);
      if (st.p >= 1) {
        // Aterrizaje EXACTO en la pose de reposo. El target solo se fija si
        // este director lo condujo (`mirada`); si otro lo lleva (CamaraViajera
        // en el valle), ni tocarlo.
        camPersp.position.copy(st.hasta);
        camPersp.setFocalLength(st.fRep);
        if (c) {
          if (st.tDesde) c.target.copy(st.tHasta);
          c.update();
        }
        intro.current = null;
      }
      return;
    }
    // ── La respiración del encuadre (solo activa y con amplitud) ──
    if (!activa || respiro <= 0 || !c) return;
    const t = state.clock.elapsedTime;
    const b = Math.sin(t * 0.45) * respiro + Math.sin(t * 0.23 + 1.7) * respiro * 0.5;
    // Aditivo por delta contra el frame anterior: convive con el orbit del
    // usuario y con cualquier otro sistema que mueva el mismo target.
    c.target.setY(c.target.y + b - respiroPrev.current);
    respiroPrev.current = b;
  });

  // Presencia puramente imperativa; nada que dibujar.
  return null;
}
