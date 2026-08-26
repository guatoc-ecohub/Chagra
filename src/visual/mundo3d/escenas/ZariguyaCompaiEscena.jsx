/*
 * ZariguyaCompaiEscena — LA COREOGRAFÍA DE LA ZARIGÜEYA COMPAÑERA
 * (avatarType 'zariguya').
 *
 * Molde: useEntradaAbeja/AbejaEscena (la escena posee la coreografía, la
 * creature posee el cuerpo). SKIN DEFINITIVA (operador 2026-08-25):
 * `ZariguyaTrazado` — la lámina AUTO-TRAZADA a tinta sobre el esqueleto de
 * huesos (clip-regiones), la misma técnica del jaguar. REEMPLAZA al vector
 * rubber-hose `Zariguya.jsx` en el valle. Pero la chucha NO vuela — es un
 * marsupial NOCTURNO de piso, y su coreografía entera sale de esa verdad:
 *
 *   · CAMINA: se desplaza PEGADA AL SUELO con trote de pasos cortos (bob de
 *     paso + bamboleo de cadera — el waddle del marsupial), jamás la deriva
 *     flotante de la abeja.
 *   · ENTRADA = LLEGA TROTANDO desde el borde del diorama (nace oculta en el
 *     mismo ancla de tiempo del cruce del host y aparece trotando hacia su
 *     percha) — nada de picada desde la cámara.
 *   · SE ENCARAMA: si el foco está en alto (hotspot elevado), sube a él como
 *     a un tronco — la cola prensil y las manitas son para eso.
 *   · RONDA: sin foco activo, MERODEA por el piso en óvalos irregulares
 *     (ondas co-primas, lentas). El HUSMEO ya no lo orquesta la escena: vive
 *     en el idle-cerebro del propio trazado (data-vida husmea/tanatosis/
 *     reposo, ver vidaEstados.js), su reacción-firma nativa.
 *   · VIRAJE MÍSTICO (operador 2026-08-25): al cambiar de sentido NO gira —
 *     la zarigüeya-espíritu se DESVANECE y REAPARECE (parpadeo espectral de
 *     opacidad 1→0→1), igual que el jaguar/oso-compai. Reemplaza el scaleX(-1).
 *   · NOCTURNA: la noche es SU jornada — de noche no se acurruca como los
 *     demás: sigue trabajando (por eso NO se le pasa hora='noche' al idle).
 *   · SALIDA: sale CORRIENDO por donde vino y se apaga en CRUCE_SUELTA_MS
 *     (el mismo reloj del overlay del host).
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
import ZariguyaTrazado from '../../creatures/ZariguyaTrazado.jsx';
import { ZARIGUYA_PRESENCIA, ZARIGUYA_TINTA, ZARIGUYA_SLUG } from '../../creatures/zariguyaIdentidad.js';
import { idleDeCreature, IDLE_NEUTRO } from '../../creatures/creatureIdle.js';
import { useLipSync } from '../../creatures/useLipSync.js';
import { horaDeReloj } from '../cielosHoraData.js';
import { CRUCE_ATRAPA_MS, CRUCE_SUELTA_MS } from '../../creatures/AbejaTransicion.jsx';
import { useSalidaAbeja, resetSalidaAbeja } from '../../creatures/senalSalidaAbeja.js';
import { SombraContacto } from './SombraContacto.jsx';
import { reaccionDeFinca } from './reaccionFinca.js';
import useHaptics from '../useHaptics.js';

/* LA IDENTIDAD COMPARTIDA (zariguyaIdentidad.js): percha, tamaño y sombra de
   la MISMA fuente que el dibujo 2D — una sola chucha. */
const PERCHA = ZARIGUYA_PRESENCIA.percha;
const SOMBRA = ZARIGUYA_PRESENCIA.sombra;

const CRUCE_ATRAPA_S = CRUCE_ATRAPA_MS / 1000;
const CRUCE_SUELTA_S = CRUCE_SUELTA_MS / 1000;
const TROTE_S = 2.0;        // ventana de entrada con lerp reforzado (llega al trote)
const TROTE_EMPUJE = 2.4;   // refuerzo del lerp durante la llegada
const ENTRA_DESDE_X = 2.4;  // desde qué borde llega (offset del foco)
const PASO_FREQ = 7.3;      // frecuencia del trote (pasos cortos de marsupial)
const ENCARAME_UMBRAL = 0.35; // foco más alto que esto sobre el piso → se encarama
/* Histéresis del modo marcha (patrón feat/jaguar-camina-dev): lejos del
   destino el SKIN corre su walk-cycle real ('caminando': las patas
   ARTICULAN, spec zariguya-camina 2026-08-26); cerca vuelve al idle. Umbral
   más corto que el felino: la chucha es menuda y se planta rápido. */
const MARCHA_LEJOS = 0.5;
const MARCHA_CERCA = 0.2;
/* Con el walk-cycle del skin activo el bamboleo 3D BAJA (no se duplica la
   marcha: el bob/waddle grande era el sustituto cuando la piel no caminaba). */
const WADDLE_MARCHA = 0.4;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* Temporal reutilizado por frame (cero alloc en el loop). */
const _dest = new THREE.Vector3();

/**
 * Coreografía de la zarigüeya DE PISO. Devuelve `{ ref, caraRef, sombraRef,
 * visRef, idleRef, aparecioRef }` — el mismo contrato de refs que
 * useEntradaAbeja (la escena los cuelga igual).
 *
 * @param {THREE.Vector3} foco  a dónde va (hotspot activo o centro).
 * @param {object} [opts]
 * @param {boolean} [opts.entrando=true]  con foco se percha junto a él (o se
 *   ENCARAMA si está en alto); sin foco, merodea por el piso.
 * @param {number}  [opts.energia=1]  0..1 — brío del trote.
 * @param {boolean} [opts.reducedMotion=false]  aparece ya llegada y quieta.
 * @param {number}  [opts.piso=0]  y del suelo por el que camina.
 * @param {boolean} [opts.cruce=true]  espera el ancla del overlay para entrar.
 * @param {boolean} [opts.saliendo=false]  sale corriendo y se apaga.
 * @param {string}  [opts.hora='dorada']  hora del valle — la noche NO la
 *   duerme (nocturna): se usa solo para matices, nunca para acurrucarla.
 * @param {string}  [opts.tier='alto']  'bajo' → idle frugal.
 */
export function useAndanzaZariguya(foco, {
  entrando = true, energia = 1, reducedMotion = false, piso = 0,
  cruce = true, saliendo = false, hora = 'dorada', tier = 'alto',
} = {}) {
  const ref = useRef(null);
  const caraRef = useRef(null);
  const sombraRef = useRef(null);
  const visRef = useRef(null);
  const idleRef = useRef(null);
  const nacioEn = useRef(null);
  const salioEn = useRef(null);
  const llegoEn = useRef(null);
  const posadaEn = useRef(null);
  const ultimoTf = useRef('');
  const ultimaPose = useRef('anda');
  const prevX = useRef(foco.x);
  // VIRAJE MÍSTICO (operador 2026-08-25): la zarigüeya-espíritu NO gira — al
  // cambiar de sentido horizontal se DESVANECE y REAPARECE (parpadeo espectral
  // de opacidad sobre caraRef), en vez de espejarse con scaleX. Refs → cero
  // re-render por frame.
  const signoCara = useRef(0);      // sentido horizontal (-1|1); 0 = aún sin fijar
  const apagoEn = useRef(null);     // t del inicio del parpadeo; null = presente
  const ultimaOpCara = useRef('');  // cache del write de opacidad
  const aparecioRef = useRef(false);
  // Fase de entrada: 'oculta' (pre-ancla) → 'trote' (llega) → 'no'.
  const fase = useRef(cruce && !reducedMotion ? 'oculta' : 'no');
  // Modo discreto del cuerpo (estado React, cambia poco — patrón jaguar):
  // 'marcha' = el skin corre su walk-cycle real; 'quieto' = idle-cerebro.
  // Entra TROTANDO: con cruce nace ya en marcha.
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
      // Nace en el BORDE por el que va a entrar (no en el cielo ni en la
      // cámara: los marsupiales llegan caminando).
      ref.current.position.set(foco.x - ENTRA_DESDE_X, piso + PERCHA.y, foco.z + 0.35);
    }
    const vida = t - nacioEn.current;

    // ── SALIDA: sale corriendo por donde vino y se apaga en el reloj del
    //    overlay (CRUCE_SUELTA_S) — el host retoma la capa 2D ahí.
    if (saliendo && !reducedMotion) {
      if (fase.current === 'oculta') { ponVis(false); return; } // salió antes de entrar
      if (salioEn.current === null) salioEn.current = t;
      if (t - salioEn.current >= CRUCE_SUELTA_S) { ponVis(false); return; }
      ponModo('marcha'); // sale CORRIENDO: el walk-cycle acompaña la huida
      _dest.set(foco.x - ENTRA_DESDE_X * 1.6, piso + PERCHA.y, foco.z + 0.35);
      ref.current.position.lerp(_dest, 0.22);
      // NO gira al salir: se retira y se disuelve por visibilidad (ponVis) —
      // el volteo por scaleX se retiró con el viraje místico.
      state.invalidate();
      return;
    }
    salioEn.current = null;

    // ── ENTRADA: oculta en el borde hasta el ancla del overlay; después
    //    aparece y llega AL TROTE (lerp reforzado) a su percha.
    if (fase.current === 'oculta') {
      if (vida < CRUCE_ATRAPA_S) { ponVis(false); state.invalidate(); return; }
      fase.current = 'trote';
      ponVis(true);
    } else if (fase.current === 'trote' && vida >= CRUCE_ATRAPA_S + TROTE_S) {
      fase.current = 'no';
    }
    if (!aparecioRef.current) ponVis(true); // sin cruce (RM): aparece ya
    const empuje = fase.current === 'trote' ? TROTE_EMPUJE : 1;

    // ── PERSONALIDAD IDLE (creatureIdle, perfil 'zariguya'): pasos cortos,
    //    husmeos frecuentes, voltereta rara (lleva tres crías encima),
    //    celebración al llegar. NOCTURNA: jamás se le pasa 'noche' — la noche
    //    es su jornada, no su siesta (el acurruque genérico la dormiría).
    const idle = fase.current !== 'no' ? IDLE_NEUTRO : idleDeCreature(t, {
      especie: ZARIGUYA_SLUG, hora: hora === 'noche' ? 'dorada' : hora,
      reducedMotion, tier,
      llegadaHace: llegoEn.current === null ? null : t - llegoEn.current,
    });
    const quieta = Math.max(0, idle.posada);
    const brio = 0.35 + 0.65 * energia;

    // ── A DÓNDE VA: percha junto al foco (o ENCARAMADA si el foco vive en
    //    alto) — o merodeo por el piso en óvalos irregulares (ondas co-primas
    //    lentas: pasos de chucha, no vuelo de abeja).
    const encarama = entrando && (foco.y - piso) > ENCARAME_UMBRAL;
    const vagarX = reducedMotion || entrando
      ? 0
      : (Math.sin(t * 0.31) * 0.55 + Math.sin(t * 0.83) * 0.12) * (1 - quieta);
    const vagarZ = reducedMotion || entrando
      ? 0
      : (Math.cos(t * 0.31) * 0.4 + Math.sin(t * 0.57 + 1.3) * 0.12) * (1 - quieta);
    const yDest = encarama ? foco.y + 0.12 : piso + PERCHA.y;
    _dest.set(
      foco.x + (entrando ? PERCHA.x : 0.3 + vagarX),
      yDest,
      foco.z + (entrando ? PERCHA.z : 0.55 + vagarZ),
    );

    // ── EL TROTE: qué tanto se está moviendo decide el paso (bob + waddle).
    const dist = ref.current.position.distanceTo(_dest);
    const moviendo = reducedMotion ? 0 : clamp01(dist * 2.5) * (1 - quieta);
    // En 'marcha' el walk-cycle del SKIN pone el paso (patas que articulan,
    // tronco-bob propio): el bamboleo 3D baja a acento — no se duplica.
    const factorWaddle = modoRef.current === 'marcha' ? WADDLE_MARCHA : 1;
    const pasoBob = Math.abs(Math.sin(t * PASO_FREQ)) * 0.035 * moviendo * brio * factorWaddle;
    const waddle = Math.sin(t * PASO_FREQ) * 3.2 * moviendo * factorWaddle;
    _dest.y += pasoBob;
    // El MODO del cuerpo, con histéresis (patrón jaguar-camina): lejos →
    // walk-cycle real del skin; cerca → se planta y el idle-cerebro retoma.
    // La entrada conserva su trote hasta que la fase termina.
    if (fase.current === 'no') {
      if (dist > MARCHA_LEJOS) ponModo('marcha');
      else if (dist < MARCHA_CERCA) ponModo('quieto');
    }
    // Lerp terrestre: más lento que el vuelo de la abeja; al encaramarse sube
    // con calma (trepa, no salta).
    ref.current.position.lerp(_dest, (encarama ? 0.028 : 0.038) * brio * empuje);

    // Llegó a su percha: celebración idle + roce háptico (una vez por foco).
    if (entrando && posadaEn.current !== foco && ref.current.position.distanceTo(_dest) < 0.28) {
      posadaEn.current = foco;
      llegoEn.current = t;
      haptics.tap();
    }

    // VIRAJE MÍSTICO (operador 2026-08-25): la zarigüeya-espíritu NO gira — al
    // invertir el sentido horizontal se DESVANECE y REAPARECE (parpadeo
    // espectral de opacidad ~0.55s: 1 → 0 → 1), en vez de espejarse con
    // scaleX. Solo opacity (GPU); el trote (lerp hacia el foco) reencara el
    // rumbo mientras está invisible. Mismo lenguaje que el jaguar/oso-compai.
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

    // El gesto del frame (waddle del trote + idle de personalidad) — un solo
    // style-write cacheado; la pose discreta viaja como data-pose.
    if (idleRef.current) {
      const tf = `rotate(${(idle.rot + waddle).toFixed(1)}deg) scale(${idle.sx.toFixed(3)},${idle.sy.toFixed(3)})`;
      if (tf !== ultimoTf.current) { ultimoTf.current = tf; idleRef.current.style.transform = tf; }
      if (idle.pose !== ultimaPose.current) {
        ultimaPose.current = idle.pose;
        idleRef.current.setAttribute('data-pose', idle.pose);
      }
    }

    // Sombra de contacto: la sigue por el piso; al encaramarse se abre y
    // atenúa (peso visual sin shadow-maps).
    if (sombraRef.current) {
      const pos = ref.current.position;
      const h = Math.max(0, pos.y - piso);
      sombraRef.current.position.set(pos.x, piso + 0.03, pos.z);
      sombraRef.current.scale.setScalar(1 + h * SOMBRA.ensanchaPorAltura);
      sombraRef.current.material.opacity = Math.max(SOMBRA.opacidadMin, SOMBRA.opacidadBase - h * SOMBRA.atenuaPorAltura);
    }

    // frameloop='demand': trote/merodeo/idle piden el próximo frame.
    if (idle.activo || moviendo > 0 || fase.current !== 'no') state.invalidate();
  });
  return { ref, caraRef, sombraRef, visRef, idleRef, aparecioRef, modo };
}

/**
 * La zarigüeya ya montada en una escena: drop-in del contrato de AbejaEscena
 * (CompaiEscena le pasa las mismas props). Billboard `<Html>` con la SKIN
 * definitiva `ZariguyaTrazado` (lámina auto-trazada a tinta sobre huesos,
 * operador 2026-08-25); PULSA al narrar y REBOTA al toque con las clases
 * genéricas del billboard (`.mundo-abeja*`). Su husmeo/tanatosis/reposo corren
 * en el idle-cerebro del propio trazado. VIRAJE MÍSTICO: no gira — se
 * desvanece y reaparece.
 */
export function ZariguyaCompaiEscena({
  foco, entrando = true, energia = 1, reducedMotion = false, piso = 0,
  hablando = false, rebote = 0, tier = 'alto', cruce = true,
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
  const energiaReal = reaccion?.energia ?? energia;
  // La hora del valle: para la zarigüeya la noche es JORNADA (el hook no la
  // acurruca); aquí solo se lee una vez, determinista.
  const hora = useMemo(() => horaDeReloj(), []);

  const { ref, caraRef, sombraRef, visRef, idleRef, aparecioRef, modo } = useAndanzaZariguya(foco, {
    entrando, energia: energiaReal, reducedMotion, piso,
    cruce: cruce && !reducedMotion, saliendo, hora, tier,
  });

  // Microrrebote del toque (mismo patrón de reflow que AbejaEscena): el
  // billboard REBOTA con la clase genérica `.mundo-abeja__rebote`. Un reflow
  // por toque, jamás por frame.
  const reboteRef = useRef(null);
  useEffect(() => {
    if (reducedMotion || rebote === 0 || !reboteRef.current) return undefined;
    const el = reboteRef.current;
    el.removeAttribute('data-rebote');
    void el.offsetWidth; // fuerza reflow → reinicia el keyframe
    el.setAttribute('data-rebote', '1');
    const t = setTimeout(() => el.removeAttribute('data-rebote'), 640);
    return () => clearTimeout(t);
  }, [rebote, reducedMotion]);

  const size = ZARIGUYA_PRESENCIA.billboardBase + Math.round(energiaReal * ZARIGUYA_PRESENCIA.billboardPorEnergia);
  const vivo = !reducedMotion;
  // LIP-SYNC: la chucha "habla" cuando el agente narra (única boca del mundo).
  const { visema } = useLipSync({ activo: vivo });
  // Estado del skin trazado: narra → 'speaking'; viaja → 'caminando' (spec
  // zariguya-camina 2026-08-26: las patas ARTICULAN — el walk-cycle real del
  // trazado, patrón jaguar-camina); parada → 'idle' (su idle-cerebro 70/30
  // husmea/escucha/rasca/tanatosis/dormita/reposo corre solo). El waddle 3D
  // baja a acento durante la marcha para no duplicar el paso.
  const estadoTrazado = hablando && vivo
    ? 'speaking'
    : (vivo && modo === 'marcha' ? 'caminando' : 'idle');
  const cruceVivo = cruce && !reducedMotion;
  return (
    <>
      <group ref={ref} position={[foco.x - ENTRA_DESDE_X, piso + PERCHA.y, foco.z + 0.35]}>
        <Html center distanceFactor={ZARIGUYA_PRESENCIA.distancia} zIndexRange={[40, 10]}>
          <div
            ref={visRef}
            className="mundo-abeja"
            /* hidden SOLO hasta que entra trotando; después de aparecer, los
               re-renders no deben volver a esconderla (patrón BUG-COMPAI-ENTRADA).
               La lectura del ref en render es la excepción heredada del molde
               (useEntradaAbeja): el ref ES la memoria de "ya apareció" que el
               useFrame escribe imperativo. */
            // eslint-disable-next-line react-hooks/refs
            style={cruceVivo && !aparecioRef.current ? { visibility: 'hidden' } : undefined}
            aria-hidden="true"
            data-hablando={hablando && vivo ? '1' : undefined}
          >
            <div ref={reboteRef} className="mundo-abeja__rebote">
              {/* Capa del gesto (waddle + idle) — imperativa por frame; propia
                  para no pisar la transition del volteo de la cara. */}
              <div ref={idleRef} style={{ transformOrigin: 'center bottom' }} data-creature={ZARIGUYA_SLUG}>
                <div ref={caraRef} className="mundo-abeja__cara">
                  <ZariguyaTrazado
                    size={size}
                    estado={estadoTrazado}
                    visema={vivo ? visema : null}
                    animated={vivo}
                    tier={tier}
                    title="Zarigüeya (chucha)"
                  />
                </div>
              </div>
            </div>
          </div>
        </Html>
      </group>
      {/* Su sombra: pegada al piso que camina, tintada con la tinta de la casa. */}
      <SombraContacto
        refExt={sombraRef}
        pos={[foco.x - ENTRA_DESDE_X, piso + 0.03, foco.z + 0.35]}
        radio={SOMBRA.radio}
        color={ZARIGUYA_TINTA}
        opacidad={SOMBRA.opacidad}
        orden={3}
      />
    </>
  );
}
