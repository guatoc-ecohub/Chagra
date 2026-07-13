/*
 * DirectorValle — el COMPONENTE r3f de la cámara de director del valle 3D.
 *
 * Cablea la lógica pura de `directorValle.js` a la cámara y a los OrbitControls
 * del valle. Vive DENTRO del `<Canvas>` y se monta DESPUÉS de `CamaraViajera`
 * (no en vez de: la viajera sigue llevando el target hacia el mundo enfocado).
 * Como el resto de las cámaras de `mundo3d`, NO reasigna props de three: escribe
 * cámara y target solo por métodos (position/lerp/lookAt/setFocalLength) — regla
 * react-hooks/immutability.
 *
 * ── Sin peleas de cámara (por ORDEN de frame, no por banderas) ─────────────
 * El orden de `useFrame` sigue el orden de montaje: como el director va DESPUÉS
 * de la viajera, tiene la última palabra sobre la cámara. Durante el barrido
 * establishing / el asentamiento el director ESCRIBE pose absoluta
 * (position + lookAt + focal), así que sobrescribe lo que la viajera haya puesto
 * ese frame — sin necesidad de que la viajera "ceda". En gameplay el director NO
 * conduce: solo suma follow y beats como offsets aditivos sobre el target/lente,
 * que la viajera respeta. El aplane New Donk del túnel se monta de ÚLTIMO y tiene
 * la última palabra: con `aplanando` el director se repliega y devuelve lo aditivo.
 *
 * ── Tier + calma (regla dura) ─────────────────────────────────────────────
 * `modoDirector` decide: tier alto = 'cine' (establishing + follow + beats),
 * tier medio = 'sobrio' (establishing corto + follow, sin beats), y tier bajo,
 * `prefers-reduced-motion` o `activa=false` = 'fijo' (INERTE TOTAL: el
 * componente no toca la cámara — el encuadre digno de siempre). El monitor de
 * rendimiento (usePerformanceMonitor) NO se toca aquí: su tier ya llega por
 * prop, igual que al resto de la escena.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  crearDirector,
  modoDirector,
  reclamarPresentacion,
  pasoDirector,
  acelerarPresentacion,
  anticiparEntrada,
  aplicarPoseInicial,
} from './directorValle.js';

/**
 * @param {Object} props
 * @param {{ current: any }} props.controls  ref de los OrbitControls hermanos.
 * @param {number[]} props.reposo   [x,y,z] pose jugable de la cámara.
 * @param {number[]} props.mira     [x,y,z] target de reposo del valle.
 * @param {number} [props.fov]      fov jugable (el del Canvas).
 * @param {import('three').Vector3} props.foco  el foco vigente (CamaraViajera).
 * @param {{ current: import('three').Vector3|null }} [props.avatarRef]  posición
 *   viva del avatar central (Angelita) — el follow la sigue con lead.
 * @param {{ current: (import('./directorValle.js').BeatValle & { n?: number })|null }} [props.beatsRef]
 *   buzón de beats del host (fauna/Ent): un objeto con `n` incremental. El
 *   director lo LEE (nunca lo escribe: recuerda el último `n` consumido) — así
 *   no se muta un prop-ref (regla react-hooks/immutability).
 * @param {boolean} [props.entrando]   hay un mundo enfocado (no seguir avatar).
 * @param {boolean} [props.aplanando]  el aplane del túnel manda: el director cede.
 * @param {boolean} [props.activa]     false → inerte total.
 * @param {string} [props.tier]        gama del equipo ('alto'|'medio'|'bajo').
 * @param {boolean} [props.reducedMotion]
 * @param {string} [props.unaVezClave]  clave de presentación una-vez-por-sesión.
 */
export default function DirectorValle({
  controls,
  reposo,
  mira,
  fov = 40,
  foco,
  avatarRef = null,
  beatsRef = null,
  entrando = false,
  aplanando = false,
  activa = true,
  tier = 'alto',
  reducedMotion = false,
  unaVezClave = null,
}) {
  const invalidate = useThree((s) => s.invalidate);
  // La cámara del valle es PerspectiveCamera (Canvas la crea así); el store la
  // tipa como Camera genérica — el cast la alinea con lo que espera el director
  // (getFocalLength/setFocalLength). Es un método, no una prop (immutability OK).
  const camera = /** @type {import('three').PerspectiveCamera} */ (useThree((s) => s.camera));
  const stRef = useRef(null);
  const prevEntrando = useRef(entrando);
  /* Último beat consumido (por `n`): el director LEE beatsRef sin escribirlo. */
  const ultimoBeatN = useRef(0);

  const modo = modoDirector({ activo: activa, tier, reducedMotion });

  // Construir (o soltar) el director cuando cambia el modo. En 'fijo' queda
  // null: el useFrame es un no-op y la cámara se queda como la dejó el Canvas.
  useEffect(() => {
    if (modo === 'fijo') {
      stRef.current = null;
      return undefined;
    }
    const presentar = reclamarPresentacion(unaVezClave);
    const st = crearDirector({ modo, reposo, mira, fov, presentar });
    stRef.current = st;
    // Clava el arranque del barrido ANTES del primer pintado (sin flash en la
    // pose de reposo del Canvas). Sin presentación no hace nada.
    aplicarPoseInicial(st, camera);
    invalidate(); // despierta el frameloop 'demand' si lo hubiera
    // El primer gesto del usuario acelera la presentación (capture en window:
    // también los hotspots DOM, que no burbujean por el canvas). Sin saltos.
    const cortar = () => acelerarPresentacion(stRef.current);
    window.addEventListener('pointerdown', cortar, true);
    return () => window.removeEventListener('pointerdown', cortar, true);
    // Solo depende del modo: reposo/mira/fov son estables (constantes de módulo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  useFrame((state, delta) => {
    const st = stRef.current;
    if (!st) return;
    // Flanco de entrada a un mundo → anticipación focal (solo cine, adentro
    // decide). Se dispara ANTES de que el aplane New Donk tome el control.
    if (entrando && !prevEntrando.current) anticiparEntrada(st);
    prevEntrando.current = entrando;

    // Drenar el buzón de beats del host (fauna/Ent/alerta) SIN escribirlo: se
    // consume cuando su `n` supera al último visto (contador local).
    const pend = beatsRef ? beatsRef.current : null;
    if (pend && (pend.n ?? 0) > ultimoBeatN.current) {
      ultimoBeatN.current = pend.n ?? 0;
      st.beatPendiente = pend;
    }

    const conduciendo = pasoDirector(
      st,
      {
        camara: camera,
        controls: controls ? controls.current : null,
        foco,
        avatarPos: avatarRef ? avatarRef.current : null,
        entrando,
        aplanando,
        t: state.clock.elapsedTime,
      },
      delta,
    );
    if (conduciendo) invalidate(); // presentación en curso: pedir el próximo frame
  });

  return null;
}
