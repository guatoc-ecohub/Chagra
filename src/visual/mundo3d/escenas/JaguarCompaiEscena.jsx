/*
 * JaguarCompaiEscena — LA COREOGRAFÍA DEL JAGUAR COMPAÑERO (avatarType 'jaguar').
 *
 * Molde: useEntradaAbeja/AbejaEscena vía ZariguyaCompaiEscena (la escena posee
 * la coreografía, la creature posee el cuerpo — que YA existía: Jaguar.jsx).
 * Pero el jaguar NO vuela y NO trota — es un FELINO, depredador ápice de
 * suelo, y su coreografía entera sale de esa verdad:
 *
 *   · CAMINA PESADO Y SILENCIOSO: se desplaza pegado al suelo SIN bob de paso
 *     (las almohadillas no rebotan: amortiguan). Lo que se ve moverse es el
 *     RODAR LENTO DE LOS HOMBROS (vaivén rotacional), no un trote.
 *   · ENTRADA = ACECHO: nace oculto en el borde del diorama (mismo ancla de
 *     tiempo del cruce del host) y entra AGAZAPADO (data-acecha del cuerpo),
 *     lento y controlado — un felino jamás corre a su marca.
 *   · MARCHA DE PERFIL: cuando viaja lejos (foco nuevo) el cuerpo cede al rig
 *     lateral de Jaguar.jsx (pose 'camina': ciclo real de cuadrúpedo). Al
 *     llegar vuelve al frontal ('anda'). Histéresis para no parpadear de rig.
 *   · SE ECHA: sin foco, patrulla en óvalos AMPLIOS y lentos y cada tanto se
 *     echa un buen rato (perfil idle 'jaguar': percha larga, poder contenido).
 *   · REACCIÓN = ACECHA un instante (los omóplatos suben, la mirada se afila)
 *     al toque de hotspot — atención depredadora, jamás aspaviento.
 *   · NOCTURNO-CREPUSCULAR: la noche no lo duerme (es SU jornada, como la
 *     zarigüeya) — no se le pasa hora='noche' al idle.
 *   · SALIDA: se retira caminando por donde vino, SIN PRISA (un depredador no
 *     huye), y se apaga en CRUCE_SUELTA_MS (el reloj del overlay del host).
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
import JaguarTrazado from '../../creatures/JaguarTrazado.jsx';
import { JAGUAR_PRESENCIA, JAGUAR_TINTA, JAGUAR_SLUG } from '../../creatures/jaguarIdentidad.js';
import { idleDeCreature, IDLE_NEUTRO } from '../../creatures/creatureIdle.js';
import { useLipSync } from '../../creatures/useLipSync.js';
import { horaDeReloj } from '../cielosHoraData.js';
import { CRUCE_ATRAPA_MS, CRUCE_SUELTA_MS } from '../../creatures/AbejaTransicion.jsx';
import { useSalidaAbeja, resetSalidaAbeja } from '../../creatures/senalSalidaAbeja.js';
import { SombraContacto } from './SombraContacto.jsx';
import { reaccionDeFinca } from './reaccionFinca.js';
import useHaptics from '../useHaptics.js';

/* LA IDENTIDAD COMPARTIDA (jaguarIdentidad.js): percha, tamaño y sombra de la
   MISMA fuente que el dibujo 2D — un solo jaguar. */
const PERCHA = JAGUAR_PRESENCIA.percha;
const SOMBRA = JAGUAR_PRESENCIA.sombra;

const CRUCE_ATRAPA_S = CRUCE_ATRAPA_MS / 1000;
const CRUCE_SUELTA_S = CRUCE_SUELTA_MS / 1000;
const ACECHO_S = 2.8;       // ventana de entrada agazapada (lenta y controlada)
const ACECHO_EMPUJE = 1.6;  // refuerzo del lerp en la entrada (nunca carrera)
const ENTRA_DESDE_X = 2.8;  // el borde del monte por el que aparece
const HOMBROS_FREQ = 1.9;   // el rodar de los hombros al andar (no hay trote)
const MARCHA_LEJOS = 0.6;   // a esta distancia el cuerpo cede al rig lateral
const MARCHA_CERCA = 0.22;  // y a esta vuelve al frontal (histéresis)

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* Temporal reutilizado por frame (cero alloc en el loop). */
const _dest = new THREE.Vector3();

/**
 * Coreografía del jaguar DE SUELO. Devuelve `{ ref, caraRef, sombraRef,
 * visRef, idleRef, aparecioRef, modo }` — el contrato de refs de
 * useEntradaAbeja más `modo` ('acecho'|'marcha'|'quieto'), el estado discreto
 * con el que la escena elige rig del cuerpo (frontal vs marcha de perfil).
 *
 * @param {THREE.Vector3} foco  a dónde va (hotspot activo o centro).
 * @param {object} [opts]
 * @param {boolean} [opts.entrando=true]  con foco se planta junto a él; sin
 *   foco, patrulla en óvalos amplios.
 * @param {number}  [opts.energia=1]  0..1 — brío contenido del andar.
 * @param {boolean} [opts.reducedMotion=false]  aparece ya llegado y quieto.
 * @param {number}  [opts.piso=0]  y del suelo por el que camina.
 * @param {boolean} [opts.cruce=true]  espera el ancla del overlay para entrar.
 * @param {boolean} [opts.saliendo=false]  se retira caminando y se apaga.
 * @param {string}  [opts.hora='dorada']  hora del valle — la noche NO lo
 *   duerme (crepuscular): se usa solo para matices, nunca para echarlo.
 * @param {string}  [opts.tier='alto']  'bajo' → idle frugal.
 */
export function useAndanzaJaguar(foco, {
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
  const posadoEn = useRef(null);
  const ultimoTf = useRef('');
  const ultimaPose = useRef('anda');
  const prevX = useRef(foco.x);
  // VIRAJE MÍSTICO (operador 2026-08-24): el jaguar-espíritu NO gira — al
  // cambiar de sentido horizontal se DESVANECE y REAPARECE (parpadeo espectral
  // de opacidad sobre caraRef), en vez de espejarse con scaleX. Refs → cero
  // re-render por frame.
  const signoCara = useRef(0);      // sentido horizontal (-1|1); 0 = aún sin fijar
  const apagoEn = useRef(null);     // t del inicio del parpadeo; null = presente
  const ultimaOpCara = useRef('');  // cache del write de opacidad
  const aparecioRef = useRef(false);
  // Fase de entrada: 'oculta' (pre-ancla) → 'acecho' (entra agazapado) → 'no'.
  const fase = useRef(cruce && !reducedMotion ? 'oculta' : 'no');
  // Modo discreto del cuerpo (estado React: elige el RIG, cambia poco):
  // 'acecho' entra agazapado · 'marcha' viaja de perfil · 'quieto' frontal.
  const [modo, setModo] = useState(cruce && !reducedMotion ? 'acecho' : 'quieto');
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
      // Nace en el BORDE por el que va a entrar (del monte, no del cielo:
      // los felinos aparecen caminando, a ras de piso).
      ref.current.position.set(foco.x - ENTRA_DESDE_X, piso + PERCHA.y, foco.z + 0.35);
    }
    const vida = t - nacioEn.current;

    // ── SALIDA: se retira caminando por donde vino, sin prisa, y se apaga en
    //    el reloj del overlay (CRUCE_SUELTA_S) — el host retoma la capa 2D ahí.
    if (saliendo && !reducedMotion) {
      if (fase.current === 'oculta') { ponVis(false); return; } // salió antes de entrar
      if (salioEn.current === null) salioEn.current = t;
      if (t - salioEn.current >= CRUCE_SUELTA_S) { ponVis(false); return; }
      ponModo('marcha');
      _dest.set(foco.x - ENTRA_DESDE_X * 1.6, piso + PERCHA.y, foco.z + 0.35);
      ref.current.position.lerp(_dest, 0.12);
      // NO gira al salir: se retira y se disuelve por visibilidad (ponVis).
      state.invalidate();
      return;
    }
    salioEn.current = null;

    // ── ENTRADA: oculto en el borde hasta el ancla del overlay; después
    //    aparece y entra AGAZAPADO (lerp apenas reforzado: llega acechando).
    if (fase.current === 'oculta') {
      if (vida < CRUCE_ATRAPA_S) { ponVis(false); state.invalidate(); return; }
      fase.current = 'acecho';
      ponVis(true);
    } else if (fase.current === 'acecho' && vida >= CRUCE_ATRAPA_S + ACECHO_S) {
      fase.current = 'no';
    }
    if (!aparecioRef.current) ponVis(true); // sin cruce (RM): aparece ya
    const empuje = fase.current === 'acecho' ? ACECHO_EMPUJE : 1;

    // ── PERSONALIDAD IDLE (creatureIdle, perfil 'jaguar'): respira lento y
    //    hondo, voltereta rara y majestuosa, SE ECHA un buen rato (percha
    //    larga). CREPUSCULAR: jamás se le pasa 'noche' — la noche es su
    //    jornada, no su siesta (el acurruque genérico lo dormiría).
    const idle = fase.current !== 'no' ? IDLE_NEUTRO : idleDeCreature(t, {
      especie: JAGUAR_SLUG, hora: hora === 'noche' ? 'dorada' : hora,
      reducedMotion, tier,
      llegadaHace: llegoEn.current === null ? null : t - llegoEn.current,
    });
    const quieto = Math.max(0, idle.posada);
    const brio = 0.35 + 0.65 * energia;

    // ── A DÓNDE VA: su marca junto al foco (un paso más allá que la chucha:
    //    distancia de depredador que observa) — o patrulla en óvalos AMPLIOS
    //    y lentos (ondas co-primas de período largo: ronda de felino, jamás
    //    el zigzag inquieto de un bicho chico).
    const vagarX = reducedMotion || entrando
      ? 0
      : (Math.sin(t * 0.17) * 0.7 + Math.sin(t * 0.47) * 0.1) * (1 - quieto);
    const vagarZ = reducedMotion || entrando
      ? 0
      : (Math.cos(t * 0.17) * 0.5 + Math.sin(t * 0.29 + 1.3) * 0.12) * (1 - quieto);
    _dest.set(
      foco.x + (entrando ? PERCHA.x : 0.35 + vagarX),
      piso + PERCHA.y,
      foco.z + (entrando ? PERCHA.z : 0.6 + vagarZ),
    );

    // ── EL ANDAR SILENCIOSO: nada de bob vertical (las almohadillas
    //    amortiguan) — el movimiento se lee en el RODAR de los hombros
    //    (vaivén rotacional suave) y en el lerp terrestre lento y parejo.
    const dist = ref.current.position.distanceTo(_dest);
    const moviendo = reducedMotion ? 0 : clamp01(dist * 2.2) * (1 - quieto);
    const hombros = Math.sin(t * HOMBROS_FREQ) * 1.4 * moviendo;
    ref.current.position.lerp(_dest, 0.026 * brio * empuje);

    // El RIG del cuerpo, con histéresis: lejos → marcha de perfil; cerca →
    // frontal. La entrada conserva su acecho hasta que la fase termina.
    if (fase.current === 'no') {
      if (dist > MARCHA_LEJOS) ponModo('marcha');
      else if (dist < MARCHA_CERCA) ponModo('quieto');
    }

    // Llegó a su marca: celebración idle + roce háptico (una vez por foco).
    if (entrando && posadoEn.current !== foco && dist < 0.28) {
      posadoEn.current = foco;
      llegoEn.current = t;
      haptics.tap();
    }

    // VIRAJE MÍSTICO: el jaguar-espíritu NO gira — al invertir el sentido
    // horizontal se DESVANECE y REAPARECE (parpadeo espectral de opacidad,
    // ~0.55s: 1 → 0 → 1), en vez de espejarse con scaleX. Solo opacity (GPU).
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

    // El gesto del frame (hombros que ruedan + idle de personalidad) — un
    // solo style-write cacheado; la pose discreta viaja como data-pose.
    if (idleRef.current) {
      const tf = `rotate(${(idle.rot + hombros).toFixed(1)}deg) scale(${idle.sx.toFixed(3)},${idle.sy.toFixed(3)})`;
      if (tf !== ultimoTf.current) { ultimoTf.current = tf; idleRef.current.style.transform = tf; }
      if (idle.pose !== ultimaPose.current) {
        ultimaPose.current = idle.pose;
        idleRef.current.setAttribute('data-pose', idle.pose);
      }
    }

    // Sombra de contacto con peso real: lo sigue pegada al piso (un felino
    // grande PESA; casi nunca se despega del suelo).
    if (sombraRef.current) {
      const pos = ref.current.position;
      const h = Math.max(0, pos.y - piso);
      sombraRef.current.position.set(pos.x, piso + 0.03, pos.z);
      sombraRef.current.scale.setScalar(1 + h * SOMBRA.ensanchaPorAltura);
      sombraRef.current.material.opacity = Math.max(SOMBRA.opacidadMin, SOMBRA.opacidadBase - h * SOMBRA.atenuaPorAltura);
    }

    // frameloop='demand': andar/patrulla/idle piden el próximo frame.
    if (idle.activo || moviendo > 0 || fase.current !== 'no') state.invalidate();
  });
  return { ref, caraRef, sombraRef, visRef, idleRef, aparecioRef, modo };
}

/**
 * El jaguar ya montado en una escena: drop-in del contrato de AbejaEscena
 * (CompaiEscena le pasa las mismas props). Billboard `<Html>` con la SKIN
 * definitiva `JaguarTrazado` (lámina auto-trazada a tinta, operador 2026-08-24);
 * PULSA al narrar y REBOTA al toque con las clases genéricas del billboard
 * (`.mundo-abeja*`). VIRAJE MÍSTICO: no gira — se desvanece y reaparece.
 */
export function JaguarCompaiEscena({
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
  // La hora del valle: para el jaguar la noche es JORNADA (el hook no lo
  // acurruca); aquí solo se lee una vez, determinista.
  const hora = useMemo(() => horaDeReloj(), []);

  const { ref, caraRef, sombraRef, visRef, idleRef, aparecioRef, modo } = useAndanzaJaguar(foco, {
    entrando, energia: energiaReal, reducedMotion, piso,
    cruce: cruce && !reducedMotion, saliendo, hora, tier,
  });

  // Microrrebote del toque (mismo patrón de reflow que AbejaEscena): el
  // billboard REBOTA con la clase genérica `.mundo-abeja__rebote`. Un reflow
  // por toque, jamás por frame. (La reacción-acecho del cuerpo rubber-hose no
  // aplica al skin trazado — su expresividad vive en su propia cadencia CSS.)
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

  const size = JAGUAR_PRESENCIA.billboardBase + Math.round(energiaReal * JAGUAR_PRESENCIA.billboardPorEnergia);
  const vivo = !reducedMotion;
  // LIP-SYNC: el felino "habla" cuando el agente narra (única boca del mundo).
  const { visema } = useLipSync({ activo: vivo });
  // Estado del skin trazado: narra → 'speaking'; viaja de perfil → 'caminando';
  // parado/idle → 'idle' (su idle-cerebro 70/30 acecha/ruge/reposo corre solo).
  const estadoTrazado = hablando && vivo
    ? 'speaking'
    : (vivo && modo === 'marcha' ? 'caminando' : 'idle');
  const cruceVivo = cruce && !reducedMotion;
  return (
    <>
      <group ref={ref} position={[foco.x - ENTRA_DESDE_X, piso + PERCHA.y, foco.z + 0.35]}>
        <Html center distanceFactor={JAGUAR_PRESENCIA.distancia} zIndexRange={[40, 10]}>
          <div
            ref={visRef}
            className="mundo-abeja"
            /* hidden SOLO hasta que entra acechando; después de aparecer, los
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
              {/* Capa del gesto (hombros + idle) — imperativa por frame; propia
                  para no pisar la transition del volteo de la cara. */}
              <div ref={idleRef} style={{ transformOrigin: 'center bottom' }} data-creature={JAGUAR_SLUG}>
                <div ref={caraRef} className="mundo-abeja__cara">
                  <JaguarTrazado
                    size={size}
                    estado={estadoTrazado}
                    visema={vivo ? visema : null}
                    animated={vivo}
                    tier={tier}
                    title="Jaguar"
                  />
                </div>
              </div>
            </div>
          </div>
        </Html>
      </group>
      {/* Su sombra: pegada al piso que pisa, tintada con la tinta de la casa. */}
      <SombraContacto
        refExt={sombraRef}
        pos={[foco.x - ENTRA_DESDE_X, piso + 0.03, foco.z + 0.35]}
        radio={SOMBRA.radio}
        color={JAGUAR_TINTA}
        opacidad={SOMBRA.opacidad}
        orden={3}
      />
    </>
  );
}
