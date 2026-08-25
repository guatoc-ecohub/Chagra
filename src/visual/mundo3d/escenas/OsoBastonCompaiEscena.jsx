/*
 * OsoBastonCompaiEscena — LA COREOGRAFÍA DEL OSO DEL BASTÓN COMPAÑERO
 * (avatarType 'oso-baston').
 *
 * Molde: useEntradaAbeja/AbejaEscena vía ZariguyaCompaiEscena (la escena posee
 * la coreografía, la creature posee el cuerpo — que YA existía: OsoBaston.jsx,
 * con el bastón florecido de serie). Pero el oso NO vuela y NO trota — es el
 * CAMINANTE DE LOS ANDES, plantígrado erguido con cayado, y su coreografía
 * entera sale de esa verdad:
 *
 *   · ANDA ERGUIDO Y LENTO: paso LARGO y pesado de plantígrado (bob de paso a
 *     la mitad de la cadencia de la chucha) con el vaivén lateral del que
 *     camina apoyado en un bastón.
 *   · SE APOYA EN ÉL: cada tanto SE DETIENE a mitad de camino — se apoya en
 *     el cayado, respira hondo, y sigue (compuerta de marcha periódica, jamás
 *     de reloj). El bastón es su firma: la pausa es parte del andar.
 *   · ENTRADA = LLEGA A PIE desde el borde del diorama (nace oculto en el
 *     ancla de tiempo del cruce del host y aparece caminando a su marca) —
 *     nada de picada desde la cámara.
 *   · LLEGADA = FLORECE: al plantarse en su marca el bastón LATE EN FLOR
 *     (data-florece del cuerpo) — "por donde camina, florece": su ecología de
 *     dispersor de semillas hecha celebración. El toque de hotspot también lo
 *     hace florecer (su reacción-firma).
 *   · DIURNO: de noche ACAMPA — el perfil idle 'oso-baston' lo acurruca junto
 *     al cayado (aquí SÍ se pasa la hora tal cual, al revés de la zarigüeya).
 *   · VIRAJE MÍSTICO (operador 2026-08-24): al cambiar de sentido NO gira —
 *     el oso-espíritu se DESVANECE y REAPARECE (parpadeo espectral de
 *     opacidad 1→0→1), igual que el jaguar-compai. Reemplaza el scaleX(-1).
 *   · SALIDA: se va caminando por donde vino, a su paso (un caminante no
 *     corre), y se apaga en CRUCE_SUELTA_MS (el reloj del overlay del host).
 *
 * Vive en escenas/ (chunk perezoso `vendor-three`): importa @react-three,
 * así que NUNCA se importa desde el barrel base del framework.
 */
/* eslint-disable react-refresh/only-export-components -- este módulo (hook de
   coreografía + su componente de escena) se importa SIEMPRE perezoso dentro de
   un <Canvas> vía CompaiEscena/EscenaBase3D; no es hot-reload-sensible. Van
   juntos a propósito (mismo contrato que useEntradaAbeja). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { OsoBaston } from '../../creatures/OsoBaston.jsx';
import { OSO_BASTON_PRESENCIA, OSO_BASTON_TINTA, OSO_BASTON_SLUG } from '../../creatures/osoBastonIdentidad.js';
import { idleDeCreature, IDLE_NEUTRO } from '../../creatures/creatureIdle.js';
import { useLipSync } from '../../creatures/useLipSync.js';
import { horaDeReloj } from '../cielosHoraData.js';
import { CRUCE_ATRAPA_MS, CRUCE_SUELTA_MS } from '../../creatures/AbejaTransicion.jsx';
import { useSalidaAbeja, resetSalidaAbeja } from '../../creatures/senalSalidaAbeja.js';
import { SombraContacto } from './SombraContacto.jsx';
import { reaccionDeFinca } from './reaccionFinca.js';
import useHaptics from '../useHaptics.js';

/* LA IDENTIDAD COMPARTIDA (osoBastonIdentidad.js): marca, tamaño y sombra de
   la MISMA fuente que el dibujo 2D — un solo caminante. */
const PERCHA = OSO_BASTON_PRESENCIA.percha;
const SOMBRA = OSO_BASTON_PRESENCIA.sombra;

const CRUCE_ATRAPA_S = CRUCE_ATRAPA_MS / 1000;
const CRUCE_SUELTA_S = CRUCE_SUELTA_MS / 1000;
const CAMINATA_S = 3.2;     // ventana de entrada a paso de caminante (larga: llega lento)
const CAMINATA_EMPUJE = 1.5; // refuerzo del lerp en la llegada (paso firme, no carrera)
const ENTRA_DESDE_X = 2.4;  // desde qué borde de la trocha llega
const PASO_FREQ = 3.4;      // pasos LARGOS de plantígrado (la mitad del trote de la chucha)
const APOYO_FREQ = 0.21;    // el ritmo de sus pausas: se apoya, respira, sigue
const MARCHA_LEJOS = 0.55;  // a esta distancia el cuerpo cede al ciclo de andar
const MARCHA_CERCA = 0.2;   // y a esta vuelve a plantarse (histéresis)

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* Temporal reutilizado por frame (cero alloc en el loop). */
const _dest = new THREE.Vector3();

/**
 * Coreografía del caminante DE TROCHA. Devuelve `{ ref, caraRef, sombraRef,
 * visRef, idleRef, aparecioRef, modo }` — el contrato de refs de
 * useEntradaAbeja más `modo` ('marcha'|'quieto'), el estado discreto con el
 * que la escena elige la pose del cuerpo (ciclo de andar vs plantado).
 *
 * @param {THREE.Vector3} foco  a dónde va (hotspot activo o centro).
 * @param {object} [opts]
 * @param {boolean} [opts.entrando=true]  con foco se planta junto a él; sin
 *   foco, merodea despacio por la trocha.
 * @param {number}  [opts.energia=1]  0..1 — brío del paso.
 * @param {boolean} [opts.reducedMotion=false]  aparece ya llegado y quieto.
 * @param {number}  [opts.piso=0]  y del suelo que camina.
 * @param {boolean} [opts.cruce=true]  espera el ancla del overlay para entrar.
 * @param {boolean} [opts.saliendo=false]  se va caminando y se apaga.
 * @param {(f: boolean) => void} [opts.onLlega]  aviso de llegada a su marca
 *   (la escena lo usa para hacer FLORECER el bastón).
 * @param {string}  [opts.hora='dorada']  hora del valle — de noche ACAMPA (el
 *   idle lo acurruca junto al cayado: es diurno).
 * @param {string}  [opts.tier='alto']  'bajo' → idle frugal.
 */
export function useCaminataOsoBaston(foco, {
  entrando = true, energia = 1, reducedMotion = false, piso = 0,
  cruce = true, saliendo = false, onLlega = null, hora = 'dorada', tier = 'alto',
} = {}) {
  const ref = useRef(null);
  const caraRef = useRef(null);
  const sombraRef = useRef(null);
  const visRef = useRef(null);
  const idleRef = useRef(null);
  const nacioEn = useRef(null);
  const salioEn = useRef(null);
  const llegoEn = useRef(null);
  const posadoEn = useRef(null);
  const ultimoTf = useRef('');
  const ultimaPose = useRef('anda');
  const prevX = useRef(foco.x);
  // VIRAJE MÍSTICO (operador 2026-08-24): el oso-espíritu NO gira — al
  // cambiar de sentido horizontal se DESVANECE y REAPARECE (parpadeo
  // espectral de opacidad sobre caraRef), en vez de espejarse con scaleX.
  // Mismo lenguaje que el jaguar-compai. Refs → cero re-render por frame.
  const signoCara = useRef(0);      // sentido horizontal (-1|1); 0 = aún sin fijar
  const apagoEn = useRef(null);     // t del inicio del parpadeo; null = presente
  const ultimaOpCara = useRef('');  // cache del write de opacidad
  const aparecioRef = useRef(false);
  // Fase de entrada: 'oculta' (pre-ancla) → 'caminata' (llega) → 'no'.
  const fase = useRef(cruce && !reducedMotion ? 'oculta' : 'no');
  // Modo discreto del cuerpo: 'marcha' (ciclo de andar) | 'quieto' (plantado).
  const [modo, setModo] = useState(cruce && !reducedMotion ? 'marcha' : 'quieto');
  const modoRef = useRef(modo);
  const ponModo = (m) => {
    if (modoRef.current !== m) { modoRef.current = m; setModo(m); }
  };
  const ponVis = (visible) => {
    if (visible) aparecioRef.current = true;
    if (visRef.current) visRef.current.style.visibility = visible ? '' : 'hidden';
    if (sombraRef.current) sombraRef.current.visible = visible;
  };
  const haptics = useHaptics({ reducedMotion });

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    if (nacioEn.current === null) {
      nacioEn.current = t;
      // Nace en el BORDE por el que va a entrar (la trocha, no el cielo:
      // los caminantes llegan a pie).
      ref.current.position.set(foco.x - ENTRA_DESDE_X, piso + PERCHA.y, foco.z + 0.35);
    }
    const vida = t - nacioEn.current;

    // ── SALIDA: se va caminando por donde vino, a su paso, y se apaga en el
    //    reloj del overlay (CRUCE_SUELTA_S) — el host retoma la capa 2D ahí.
    if (saliendo && !reducedMotion) {
      if (fase.current === 'oculta') { ponVis(false); return; } // salió antes de entrar
      if (salioEn.current === null) salioEn.current = t;
      if (t - salioEn.current >= CRUCE_SUELTA_S) { ponVis(false); return; }
      ponModo('marcha');
      _dest.set(foco.x - ENTRA_DESDE_X * 1.6, piso + PERCHA.y, foco.z + 0.35);
      ref.current.position.lerp(_dest, 0.09);
      // NO gira al salir: se retira y se disuelve por visibilidad (ponVis) —
      // el volteo por scaleX se retiró con el viraje místico.
      state.invalidate();
      return;
    }
    salioEn.current = null;

    // ── ENTRADA: oculto en el borde hasta el ancla del overlay; después
    //    aparece y llega A PIE (lerp reforzado apenas: paso firme).
    if (fase.current === 'oculta') {
      if (vida < CRUCE_ATRAPA_S) { ponVis(false); state.invalidate(); return; }
      fase.current = 'caminata';
      ponVis(true);
    } else if (fase.current === 'caminata' && vida >= CRUCE_ATRAPA_S + CAMINATA_S) {
      fase.current = 'no';
    }
    if (!aparecioRef.current) ponVis(true); // sin cruce (RM): aparece ya
    const empuje = fase.current === 'caminata' ? CAMINATA_EMPUJE : 1;

    // ── PERSONALIDAD IDLE (creatureIdle, perfil 'oso-baston'): respira hondo
    //    apoyado en el bastón, se detiene a revisar la corona, y de noche
    //    ACAMPA (la hora viaja tal cual: es diurno, al revés de la
    //    zarigüeya — el acurruque junto al cayado es SUYO).
    const idle = fase.current !== 'no' ? IDLE_NEUTRO : idleDeCreature(t, {
      especie: OSO_BASTON_SLUG, hora,
      reducedMotion, tier,
      llegadaHace: llegoEn.current === null ? null : t - llegoEn.current,
    });
    const quieto = Math.max(0, idle.posada);
    const brio = 0.35 + 0.65 * energia;

    // ── SE APOYA EN EL BASTÓN: compuerta de marcha periódica (cubo del seno:
    //    casi siempre 0, cada tanto una pausa larga) — se detiene, se apoya,
    //    respira, y retoma. La pausa es parte del andar del caminante.
    const apoyo = reducedMotion ? 0 : Math.max(0, Math.sin(t * APOYO_FREQ)) ** 3;

    // ── A DÓNDE VA: su marca junto al foco — o merodeo LENTÍSIMO por la
    //    trocha (ondas co-primas de período largo: pasos de caminante).
    const vagarX = reducedMotion || entrando
      ? 0
      : (Math.sin(t * 0.13) * 0.45 + Math.sin(t * 0.37) * 0.08) * (1 - quieto);
    const vagarZ = reducedMotion || entrando
      ? 0
      : (Math.cos(t * 0.13) * 0.3 + Math.sin(t * 0.23 + 1.1) * 0.1) * (1 - quieto);
    _dest.set(
      foco.x + (entrando ? PERCHA.x : 0.3 + vagarX),
      piso + PERCHA.y,
      foco.z + (entrando ? PERCHA.z : 0.55 + vagarZ),
    );

    // ── EL PASO: largo y pesado (bob a la mitad de la cadencia de la chucha)
    //    con el vaivén lateral del que camina apoyado en su cayado. La pausa
    //    del apoyo congela paso y avance (pero no la respiración del idle).
    const dist = ref.current.position.distanceTo(_dest);
    const moviendo = reducedMotion ? 0 : clamp01(dist * 2.2) * (1 - quieto) * (1 - apoyo);
    const pasoBob = Math.abs(Math.sin(t * PASO_FREQ)) * 0.05 * moviendo * brio;
    const vaiven = Math.sin(t * PASO_FREQ * 0.5) * 2.6 * moviendo;
    _dest.y += pasoBob;
    // Lerp terrestre LENTO (el más calmo del elenco de piso): el caminante no
    // corre, y en la pausa del apoyo casi se detiene.
    ref.current.position.lerp(_dest, 0.02 * brio * empuje * (1 - 0.85 * apoyo));

    // La pose del cuerpo, con histéresis: lejos → ciclo de andar con bastón;
    // cerca → plantado en su marca.
    if (fase.current === 'no') {
      if (dist > MARCHA_LEJOS) ponModo('marcha');
      else if (dist < MARCHA_CERCA) ponModo('quieto');
    }

    // Llegó a su marca: FLORECE (aviso a la escena) + roce háptico, una vez
    // por foco — "por donde camina, florece".
    if (entrando && posadoEn.current !== foco && dist < 0.26) {
      posadoEn.current = foco;
      llegoEn.current = t;
      haptics.tap();
      if (onLlega) onLlega(true);
    }

    // VIRAJE MÍSTICO (operador 2026-08-24): el oso-espíritu NO gira — al
    // invertir el sentido horizontal se DESVANECE y REAPARECE (parpadeo
    // espectral de opacidad ~0.55s: 1 → 0 → 1), en vez de espejarse con
    // scaleX. Solo opacity (GPU); el paso del caminante (lerp hacia el foco)
    // reencara el rumbo mientras está invisible.
    if (caraRef.current) {
      const dx = ref.current.position.x - prevX.current;
      if (Math.abs(dx) > 0.0015) {
        const signo = dx < 0 ? -1 : 1;
        if (signoCara.current !== 0 && signo !== signoCara.current && !reducedMotion && apagoEn.current === null) {
          apagoEn.current = t; // dispara el teletransporte espectral
        }
        signoCara.current = signo;
      }
      prevX.current = ref.current.position.x;
      let op = 1;
      if (apagoEn.current !== null) {
        const k = (t - apagoEn.current) / 0.55;
        if (k >= 1) apagoEn.current = null;
        else op = Math.abs(Math.cos(k * Math.PI)); // baja a 0 a mitad y vuelve
      }
      const ops = op.toFixed(2);
      if (ops !== ultimaOpCara.current) { caraRef.current.style.opacity = ops; ultimaOpCara.current = ops; }
    }

    // El gesto del frame (vaivén del paso + idle de personalidad) — un solo
    // style-write cacheado; la pose discreta viaja como data-pose.
    if (idleRef.current) {
      const tf = `rotate(${(idle.rot + vaiven).toFixed(1)}deg) scale(${idle.sx.toFixed(3)},${idle.sy.toFixed(3)})`;
      if (tf !== ultimoTf.current) { ultimoTf.current = tf; idleRef.current.style.transform = tf; }
      if (idle.pose !== ultimaPose.current) {
        ultimaPose.current = idle.pose;
        idleRef.current.setAttribute('data-pose', idle.pose);
      }
    }

    // Sombra de contacto FIRME: el caminante pesa; lo sigue por la trocha.
    if (sombraRef.current) {
      const pos = ref.current.position;
      const h = Math.max(0, pos.y - piso - PERCHA.y);
      sombraRef.current.position.set(pos.x, piso + 0.03, pos.z);
      sombraRef.current.scale.setScalar(1 + h * SOMBRA.ensanchaPorAltura);
      sombraRef.current.material.opacity = Math.max(SOMBRA.opacidadMin, SOMBRA.opacidadBase - h * SOMBRA.atenuaPorAltura);
    }

    // frameloop='demand': paso/merodeo/idle piden el próximo frame.
    if (idle.activo || moviendo > 0 || fase.current !== 'no') state.invalidate();
  });
  return { ref, caraRef, sombraRef, visRef, idleRef, aparecioRef, modo };
}

/* Cuánto late en flor el bastón al llegar o al toque (su celebración). */
const FLORECE_MS = 2400;

/**
 * El oso del bastón ya montado en una escena: drop-in del contrato de
 * AbejaEscena (CompaiEscena le pasa las mismas props). Billboard `<Html>` con
 * el cuerpo `OsoBaston` (el bastón florecido = su firma, de serie); PULSA al
 * narrar y REBOTA al toque con las clases genéricas del billboard
 * (`.mundo-abeja*`), y su reacción propia es FLORECER (el bastón late en flor
 * al llegar a su marca y al toque de hotspot).
 */
export function OsoBastonCompaiEscena({
  foco, entrando = true, animo = 'sereno', energia = 1, reducedMotion = false, piso = 0,
  hablando = false, rebote = 0, mundoId = null, tier = 'alto', cruce = true,
  estadoFinca = null, hayAlerta = false,
}) {
  // La señal de SALIDA del host (compartida: la señal es del MUNDO, no de la
  // especie que viva dentro).
  const saliendo = useSalidaAbeja();
  useEffect(() => {
    resetSalidaAbeja();
    return resetSalidaAbeja;
  }, []);
  const reaccion = useMemo(
    () => (estadoFinca ? reaccionDeFinca(estadoFinca, { hayAlerta }) : null),
    [estadoFinca, hayAlerta],
  );
  const animoReal = reaccion?.animo ?? animo;
  const energiaReal = reaccion?.energia ?? energia;
  const climaReal = estadoFinca?.clima ?? null;
  const ensoReal = estadoFinca?.enso ?? 'neutro';
  // La hora del valle: el caminante es diurno — de noche el idle lo acampa.
  const hora = useMemo(() => horaDeReloj(), []);

  // EL FLORECER: estado discreto y breve (un re-render por llegada/toque,
  // jamás por frame). Lo disparan la llegada a la marca (onLlega del hook) y
  // el toque de hotspot (rebote).
  const [florece, setFlorece] = useState(false);
  const floreceTimer = useRef(null);
  const florecer = () => {
    setFlorece(true);
    clearTimeout(floreceTimer.current);
    floreceTimer.current = setTimeout(() => setFlorece(false), FLORECE_MS);
  };
  useEffect(() => () => clearTimeout(floreceTimer.current), []);

  const { ref, caraRef, sombraRef, visRef, idleRef, aparecioRef, modo } = useCaminataOsoBaston(foco, {
    entrando, energia: energiaReal, reducedMotion, piso,
    cruce: cruce && !reducedMotion, saliendo, hora, tier,
    onLlega: reducedMotion ? null : florecer,
  });

  // Microrrebote del toque (mismo patrón de reflow que AbejaEscena) + su
  // reacción-firma: el bastón FLORECE también al toque.
  const reboteRef = useRef(null);
  useEffect(() => {
    if (reducedMotion || rebote === 0 || !reboteRef.current) return undefined;
    const el = reboteRef.current;
    el.removeAttribute('data-rebote');
    void el.offsetWidth; // fuerza reflow → reinicia el keyframe
    el.setAttribute('data-rebote', '1');
    florecer();
    const t = setTimeout(() => el.removeAttribute('data-rebote'), 640);
    return () => clearTimeout(t);
  }, [rebote, reducedMotion]);

  const size = OSO_BASTON_PRESENCIA.billboardBase + Math.round(energiaReal * OSO_BASTON_PRESENCIA.billboardPorEnergia);
  const vivo = !reducedMotion;
  // LIP-SYNC: el caminante "habla" cuando el agente narra (única boca del mundo).
  const { visema } = useLipSync({ activo: vivo });
  const cruceVivo = cruce && !reducedMotion;
  return (
    <>
      <group ref={ref} position={[foco.x - ENTRA_DESDE_X, piso + PERCHA.y, foco.z + 0.35]}>
        <Html center distanceFactor={OSO_BASTON_PRESENCIA.distancia} zIndexRange={[40, 10]}>
          <div
            ref={visRef}
            className="mundo-abeja"
            /* hidden SOLO hasta que llega a pie; después de aparecer, los
               re-renders no deben volver a esconderlo (patrón BUG-COMPAI-ENTRADA).
               La lectura del ref en render es la excepción heredada del molde
               (useEntradaAbeja): el ref ES la memoria de "ya apareció" que el
               useFrame escribe imperativo. */
            // eslint-disable-next-line react-hooks/refs
            style={cruceVivo && !aparecioRef.current ? { visibility: 'hidden' } : undefined}
            aria-hidden="true"
            data-hablando={hablando && vivo ? '1' : undefined}
          >
            <div ref={reboteRef} className="mundo-abeja__rebote">
              {/* Capa del gesto (vaivén del paso + idle) — imperativa por
                  frame; propia para no pisar el volteo de la cara. */}
              <div ref={idleRef} style={{ transformOrigin: 'center bottom' }} data-creature={OSO_BASTON_SLUG}>
                <div ref={caraRef} className="mundo-abeja__cara">
                  <OsoBaston
                    size={size}
                    animo={animoReal}
                    energia={energiaReal}
                    pose={vivo && modo === 'marcha' ? 'camina' : 'anda'}
                    florece={florece && vivo}
                    clima={climaReal}
                    enso={ensoReal}
                    visema={vivo ? visema : null}
                    mundoId={mundoId}
                    animated={vivo}
                    tier={tier}
                  />
                </div>
              </div>
            </div>
          </div>
        </Html>
      </group>
      {/* Su sombra: firme sobre la trocha, tintada con la tinta de la casa. */}
      <SombraContacto
        refExt={sombraRef}
        pos={[foco.x - ENTRA_DESDE_X, piso + 0.03, foco.z + 0.35]}
        radio={SOMBRA.radio}
        color={OSO_BASTON_TINTA}
        opacidad={SOMBRA.opacidad}
        orden={3}
      />
    </>
  );
}
