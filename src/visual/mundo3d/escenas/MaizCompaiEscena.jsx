/*
 * MaizCompaiEscena — LA COREOGRAFÍA DEL MAÍZ COMPAÑERO (avatarType 'maiz').
 *
 * Molde: useEntradaAbeja/AbejaEscena (la escena posee la coreografía, la
 * creature posee el cuerpo). Pero el maíz NO es un bicho que vuela: es una
 * PLANTA — y su coreografía entera sale de esa verdad:
 *
 *   · ARRAIGO: se SIEMBRA una sola vez, junto al foco con el que nace la
 *     escena, y de ahí NO se mueve. Cuando el foco cambia (el usuario toca
 *     otro hotspot) la mata no lo persigue: SE INCLINA hacia él — atenta,
 *     no errante. El único compañero del elenco que no viaja.
 *   · ENTRADA = BROTAR: nada de picada desde la cámara. Espera el mismo
 *     ancla de tiempo del cruce (CRUCE_ATRAPA_MS, para empalmar con el
 *     overlay del host) y BROTA del montículo: crece desde el suelo con
 *     overshoot (backOut) — la germinación como acto teatral.
 *   · IDLE = LA BRISA: mecerse con vaivén ASIMÉTRICO (dos ondas co-primas
 *     imperativas aquí + cada hoja con su compás CSS en maizCompai.css).
 *   · REACCIÓN = EL PENACHO VIBRA (data-vibra del cuerpo, disparado por el
 *     `rebote` del toque de hotspot).
 *   · SALIDA: se recoge a la tierra (encoge y se apaga en CRUCE_SUELTA_MS) —
 *     una planta no huye hacia la cámara.
 *
 * Vive en escenas/ (chunk perezoso `vendor-three`): importa @react-three,
 * así que NUNCA se importa desde el barrel base del framework.
 */
/* eslint-disable react-refresh/only-export-components -- este módulo (hook de
   coreografía + su componente de escena) se importa SIEMPRE perezoso dentro de
   un <Canvas> vía CompaiEscena/EscenaBase3D; no es hot-reload-sensible. Van
   juntos a propósito (mismo contrato que useEntradaAbeja). */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { MaizCompai } from '../../creatures/MaizCompai.jsx';
import { MAIZ_PRESENCIA, MAIZ_TINTA } from '../../creatures/maizIdentidad.js';
import { backOut } from '../../creatures/creatureIdle.js';
import { useLipSync } from '../../creatures/useLipSync.js';
import { CRUCE_ATRAPA_MS, CRUCE_SUELTA_MS } from '../../creatures/AbejaTransicion.jsx';
import { useSalidaAbeja, resetSalidaAbeja } from '../../creatures/senalSalidaAbeja.js';
import { SombraContacto } from './SombraContacto.jsx';
import { reaccionDeFinca } from './reaccionFinca.js';
import useHaptics from '../useHaptics.js';

/* LA IDENTIDAD COMPARTIDA (maizIdentidad.js): siembra, tamaño y sombra salen
   de la misma fuente que el dibujo 2D — una sola mata. */
const PERCHA = MAIZ_PRESENCIA.percha;
const SOMBRA = MAIZ_PRESENCIA.sombra;

/* Mismo ancla de tiempo que el cruce de Angelita: el overlay 2D del host se
   apaga en CRUCE_ATRAPA_MS — ahí el maíz BROTA (en vez de clavarse en picada). */
const CRUCE_ATRAPA_S = CRUCE_ATRAPA_MS / 1000;
const CRUCE_SUELTA_S = CRUCE_SUELTA_MS / 1000;
const BROTE_S = 1.5;          // cuánto tarda la germinación teatral
const INCLINA_MAX = 13;       // grados máximos de inclinación hacia el foco
const INCLINA_GANANCIA = 10;  // cuánta inclinación por unidad de distancia x

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/**
 * Coreografía del maíz ARRAIGADO. Devuelve `{ ref, idleRef, sombraRef,
 * visRef, aparecioRef }` — mismo contrato de refs que useEntradaAbeja (menos
 * caraRef: una mata no voltea la cara, se inclina entera).
 *
 * @param {import('three').Vector3} foco  el hotspot activo o el centro.
 * @param {object} [opts]
 * @param {boolean} [opts.entrando=true]  con foco activo se inclina pleno; sin
 *   él, apenas (atenta pero relajada).
 * @param {number}  [opts.energia=1]      0..1 — vigor del vaivén.
 * @param {boolean} [opts.reducedMotion=false]  aparece ya crecida y quieta.
 * @param {number}  [opts.piso=0]  y del suelo donde se siembra.
 * @param {boolean} [opts.cruce=true]  espera el ancla del overlay antes de brotar.
 * @param {boolean} [opts.saliendo=false]  se recoge a la tierra y se apaga.
 * @param {boolean} [opts.sed=false]  sin agua la brisa se le apaga (menos vaivén).
 */
export function useArraigoMaiz(foco, {
  entrando = true, energia = 1, reducedMotion = false, piso = 0,
  cruce = true, saliendo = false, sed = false,
} = {}) {
  const ref = useRef(null);
  const idleRef = useRef(null);
  const sombraRef = useRef(null);
  const visRef = useRef(null);
  const raiz = useRef(null);      // dónde quedó SEMBRADA ({x,z}) — no cambia jamás
  const nacioEn = useRef(null);
  const salioEn = useRef(null);
  const lean = useRef(0);         // inclinación suavizada hacia el foco
  const ultimoTf = useRef('');
  const brotoAviso = useRef(false);
  const aparecioRef = useRef(false);
  // El brote se decide UNA vez al nacer (mismo patrón que la fase del cruce).
  const conBrote = useRef(cruce && !reducedMotion);
  const ponVis = (visible) => {
    if (visible) aparecioRef.current = true;
    if (visRef.current) visRef.current.style.visibility = visible ? '' : 'hidden';
    if (sombraRef.current) sombraRef.current.visible = visible;
  };
  const haptics = useHaptics({ reducedMotion });

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    if (nacioEn.current === null) nacioEn.current = t;
    const vida = t - nacioEn.current;

    // SIEMBRA (primer frame): la raíz queda clavada junto al foco inicial.
    if (raiz.current === null) {
      raiz.current = { x: foco.x + PERCHA.x, z: foco.z + PERCHA.z };
      ref.current.position.set(raiz.current.x, piso + PERCHA.y, raiz.current.z);
    }

    // ── SALIDA: se recoge a la tierra (encoge desde la base) y se apaga.
    if (saliendo && !reducedMotion) {
      if (salioEn.current === null) salioEn.current = t;
      const f = (t - salioEn.current) / (CRUCE_SUELTA_S * 2);
      if (f >= 1) { ponVis(false); return; }
      if (idleRef.current) idleRef.current.style.transform = `scale(${(1 - f).toFixed(3)},${(1 - f * f).toFixed(3)})`;
      state.invalidate();
      return;
    }
    salioEn.current = null;

    // ── EL BROTE: oculta hasta el ancla del overlay; después germina.
    let g = 1; // factor de crecimiento 0..1
    if (conBrote.current) {
      if (vida < CRUCE_ATRAPA_S) { ponVis(false); state.invalidate(); return; }
      const f = clamp((vida - CRUCE_ATRAPA_S) / BROTE_S, 0, 1);
      g = backOut(f);
      ponVis(true);
      if (f >= 1) {
        conBrote.current = false;
        if (!brotoAviso.current) { brotoAviso.current = true; haptics.tap(); }
      }
    } else if (!aparecioRef.current) {
      ponVis(true); // sin brote (RM o cruce=false): aparece ya crecida
    }

    // ── INCLINARSE HACIA EL FOCO (su manera de "seguir"): la copa apunta a
    //    donde pasa la acción, la raíz no se mueve. Suavizado exponencial.
    const goal = clamp((foco.x - raiz.current.x) * INCLINA_GANANCIA, -INCLINA_MAX, INCLINA_MAX)
      * (entrando ? 1 : 0.4);
    lean.current += (goal - lean.current) * 0.05;

    // ── LA BRISA (idle): dos ondas co-primas — vaivén asimétrico, jamás de
    //    reloj. La sed se lo apaga (PERFIL_MAIZ.sequia: sin agua no baila).
    const brio = 0.35 + 0.65 * energia;
    const mBrisa = reducedMotion ? 0 : (sed ? 0.35 : 1) * brio;
    const vaiven = (Math.sin(t * 0.9) * 2.1 * (1 + 0.3 * Math.sin(t * 0.53))
      + Math.sin(t * 1.7) * 0.7) * mBrisa;
    const resp = reducedMotion ? 0 : Math.sin(t * 1.08);
    const sx = (1 - 0.014 * resp) * (0.55 + 0.45 * g);
    const sy = (1 + 0.018 * resp) * (0.15 + 0.85 * g);

    // Un solo style-write cacheado por string (mismo patrón que la abeja).
    if (idleRef.current) {
      const tf = `rotate(${(lean.current + vaiven).toFixed(1)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
      if (tf !== ultimoTf.current) { ultimoTf.current = tf; idleRef.current.style.transform = tf; }
    }

    // Sombra de contacto: clavada en la siembra; crece con el brote.
    if (sombraRef.current) {
      sombraRef.current.position.set(raiz.current.x, piso + 0.03, raiz.current.z);
      sombraRef.current.scale.setScalar(0.35 + 0.65 * g);
      sombraRef.current.material.opacity = Math.max(SOMBRA.opacidadMin, SOMBRA.opacidadBase * (0.4 + 0.6 * g));
    }

    // frameloop='demand': la brisa no para → pedir el próximo frame mientras
    // haya movimiento que mostrar.
    if (!reducedMotion) state.invalidate();
  });
  return { ref, idleRef, sombraRef, visRef, aparecioRef };
}

/**
 * El maíz ya montado en una escena: drop-in del contrato de AbejaEscena
 * (CompaiEscena le pasa las mismas props). Billboard `<Html>` con el cuerpo
 * `MaizCompai`; PULSA al narrar y REBOTA al toque con las MISMAS clases
 * genéricas del billboard (`.mundo-abeja*` en mundo.css — comportamiento de
 * compañero, no de especie), y su reacción propia es el penacho que VIBRA.
 */
export function MaizCompaiEscena({
  foco, entrando = true, animo = 'sereno', energia = 1, reducedMotion = false, piso = 0,
  hablando = false, rebote = 0, tier = 'alto', cruce = true,
  estadoFinca = null, hayAlerta = false,
}) {
  // La señal de SALIDA del host (compartida con la abeja: el host no sabe qué
  // compañero vive dentro — la señal es del MUNDO, no de la especie).
  const saliendo = useSalidaAbeja();
  useEffect(() => {
    resetSalidaAbeja();
    return resetSalidaAbeja;
  }, []);
  // El estado real de la finca → reacción (misma capa pura que la abeja).
  const reaccion = useMemo(
    () => (estadoFinca ? reaccionDeFinca(estadoFinca, { hayAlerta }) : null),
    [estadoFinca, hayAlerta],
  );
  const animoReal = reaccion?.animo ?? animo;
  const energiaReal = reaccion?.energia ?? energia;
  const sed = reaccion?.sed ?? false;
  const mojada = reaccion?.mojada ?? false;
  const climaReal = estadoFinca?.clima ?? null;
  const ensoReal = estadoFinca?.enso ?? 'neutro';

  const { ref, idleRef, sombraRef, visRef, aparecioRef } = useArraigoMaiz(foco, {
    entrando, energia: energiaReal, reducedMotion, piso,
    cruce: cruce && !reducedMotion, saliendo, sed,
  });

  // EL PENACHO VIBRA: cada toque de hotspot (`rebote`) lo enciende un
  // instante. Imperativo sobre el DOM (data-vibra en la capa del gesto, CSS
  // en maizCompai.css) — mismo patrón que el reboteRef de la abeja: cero
  // setState, cero re-render por toque.
  useEffect(() => {
    if (reducedMotion || rebote === 0 || !idleRef.current) return undefined;
    const el = idleRef.current;
    el.setAttribute('data-vibra', '1');
    const timer = setTimeout(() => el.removeAttribute('data-vibra'), 950);
    return () => clearTimeout(timer);
  }, [rebote, reducedMotion, idleRef]);

  const size = MAIZ_PRESENCIA.billboardBase + Math.round(energiaReal * MAIZ_PRESENCIA.billboardPorEnergia);
  const vivo = !reducedMotion;
  // LIP-SYNC: el choclo "habla" cuando el agente narra (única boca del mundo).
  const { visema } = useLipSync({ activo: vivo });
  const cruceVivo = cruce && !reducedMotion;
  return (
    <>
      <group ref={ref} position={[foco.x + PERCHA.x, piso + PERCHA.y, foco.z + PERCHA.z]}>
        <Html center distanceFactor={MAIZ_PRESENCIA.distancia} zIndexRange={[40, 10]}>
          <div
            ref={visRef}
            className="mundo-abeja"
            /* hidden SOLO hasta el brote; después de aparecer, los re-renders
               no deben volver a esconderla (patrón BUG-COMPAI-ENTRADA).
               La lectura del ref en render es la excepción heredada del molde
               (useEntradaAbeja): el ref ES la memoria de "ya apareció" que el
               useFrame escribe imperativo. */
            // eslint-disable-next-line react-hooks/refs
            style={cruceVivo && !aparecioRef.current ? { visibility: 'hidden' } : undefined}
            aria-hidden="true"
            data-hablando={hablando && vivo ? '1' : undefined}
            data-mojada={mojada && vivo ? '1' : undefined}
            data-sed={sed && vivo ? '1' : undefined}
          >
            <div className="mundo-abeja__rebote">
              {/* La capa del gesto: brote + inclinación + brisa — imperativa
                  por frame desde el hook. Pivote en la BASE (crece del suelo). */}
              <div ref={idleRef} style={{ transformOrigin: 'center bottom' }} data-creature="maiz">
                <MaizCompai
                  size={size}
                  animo={animoReal}
                  energia={energiaReal}
                  sed={sed}
                  clima={climaReal}
                  enso={ensoReal}
                  visema={vivo ? visema : null}
                  animated={vivo}
                  tier={tier}
                />
              </div>
            </div>
          </div>
        </Html>
      </group>
      {/* Su sombra: clavada en la siembra, tintada con la tinta de la casa. */}
      <SombraContacto
        refExt={sombraRef}
        pos={[foco.x + PERCHA.x, piso + 0.03, foco.z + PERCHA.z]}
        radio={SOMBRA.radio}
        color={MAIZ_TINTA}
        opacidad={SOMBRA.opacidad}
        orden={3}
      />
    </>
  );
}
