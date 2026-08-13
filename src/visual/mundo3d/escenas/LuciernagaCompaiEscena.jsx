/*
 * LuciernagaCompaiEscena — LA COREOGRAFÍA DE LA LUCIÉRNAGA COMPAÑERA
 * (avatarType 'luciernaga').
 *
 * Molde: useEntradaAbeja/AbejaEscena (la escena posee la coreografía, la
 * creature posee el cuerpo — que YA existía: Luciernaga.jsx, con la linterna
 * de serie). SÍ vuela — pero NO como la abeja: es un cocuyo NOCTURNO cuya
 * gracia es el PARPADEO, no el zumbido, y su coreografía entera sale de esa
 * verdad:
 *
 *   · DERIVA LENTO: flota en óvalos anchos y calmos con un lerp a un TERCIO
 *     del de la abeja — nada del dardeo inquieto de Angelita. Vuela BAJO
 *     (rondaAltura 0.6 contra 1.6 de la abeja) y también deriva en vertical.
 *   · PULSA LUZ: el billboard entero RESPIRA en opacidad (el latido lento de
 *     la que brilla) — encima del latido CSS de la linterna del cuerpo.
 *   · ENTRADA = SE ENCIENDE: nada de picada — nace ya en el aire cerca de su
 *     percha y aparece POR PULSOS (parpadeo de llegada: tres destellos que
 *     terminan encendidos), en el mismo ancla de tiempo del cruce del host.
 *   · LEE LA NOCHE: cada tanto se detiene y su linterna pasa a 'leer'
 *     (data-eco del cuerpo) — la bioindicadora midiendo humedad, agua y luz.
 *     El toque de hotspot también la pone a leer (su reacción-firma). Y si la
 *     finca tiene ALERTA, la linterna titila 'degradado': el diagnóstico real.
 *   · NOCTURNA: la noche es SU jornada — jamás se le pasa hora='noche' al
 *     idle (el acurruque genérico la apagaría justo cuando más brilla).
 *   · SALIDA = SE APAGA: deriva hacia arriba desvaneciéndose (la luz que se
 *     va) y se apaga en CRUCE_SUELTA_MS (el reloj del overlay del host).
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
import { Luciernaga } from '../../creatures/Luciernaga.jsx';
import { LUCIERNAGA_PRESENCIA, LUCIERNAGA_TINTA, LUCIERNAGA_SLUG } from '../../creatures/luciernagaIdentidad.js';
import { idleDeCreature, IDLE_NEUTRO } from '../../creatures/creatureIdle.js';
import { useLipSync } from '../../creatures/useLipSync.js';
import { horaDeReloj } from '../cielosHoraData.js';
import { CRUCE_ATRAPA_MS, CRUCE_SUELTA_MS } from '../../creatures/AbejaTransicion.jsx';
import { useSalidaAbeja, resetSalidaAbeja } from '../../creatures/senalSalidaAbeja.js';
import { SombraContacto } from './SombraContacto.jsx';
import { reaccionDeFinca } from './reaccionFinca.js';
import useHaptics from '../useHaptics.js';

/* LA IDENTIDAD COMPARTIDA (luciernagaIdentidad.js): percha, tamaño y sombra
   de la MISMA fuente que el dibujo 2D — un solo cocuyo. */
const PERCHA = LUCIERNAGA_PRESENCIA.percha;
const SOMBRA = LUCIERNAGA_PRESENCIA.sombra;

const CRUCE_ATRAPA_S = CRUCE_ATRAPA_MS / 1000;
const CRUCE_SUELTA_S = CRUCE_SUELTA_MS / 1000;
const LLEGADA_S = 1.9;       // el parpadeo de llegada (tres pulsos que encienden)
const ENTRA_DESDE = { x: 1.6, y: 0.9 }; // nace YA EN EL AIRE, arriba y al lado
const DERIVA_LERP = 0.014;   // deriva LENTA: un tercio del vuelo de la abeja (0.05)
const FLOTA_FREQ = 0.9;      // el vaivén vertical calmo (la abeja late a 1.6+)
const PULSO_FREQ = 1.3;      // el latido de opacidad del billboard (su brillo)

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* Temporal reutilizado por frame (cero alloc en el loop). */
const _dest = new THREE.Vector3();

/**
 * Coreografía de la luciérnaga DE DERIVA. Devuelve `{ ref, caraRef,
 * sombraRef, visRef, idleRef, aparecioRef }` — el mismo contrato de refs que
 * useEntradaAbeja (la escena los cuelga igual).
 *
 * @param {THREE.Vector3} foco  a dónde va (hotspot activo o centro).
 * @param {object} [opts]
 * @param {boolean} [opts.entrando=true]  con foco flota junto a él; sin foco,
 *   deriva en óvalos anchos, bajos y lentos.
 * @param {number}  [opts.energia=1]  0..1 — brío del brillo y la deriva.
 * @param {boolean} [opts.reducedMotion=false]  aparece ya llegada y quieta.
 * @param {number}  [opts.piso=0]  y del suelo sobre el que flota.
 * @param {boolean} [opts.cruce=true]  espera el ancla del overlay para encenderse.
 * @param {boolean} [opts.saliendo=false]  se apaga derivando hacia arriba.
 * @param {string}  [opts.hora='dorada']  hora del valle — la noche NO la
 *   apaga (nocturna): se usa solo para matices, jamás para acurrucarla.
 * @param {string}  [opts.tier='alto']  'bajo' → idle frugal.
 */
export function useDerivaLuciernaga(foco, {
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
  const ultimaOp = useRef('');
  const ultimaPose = useRef('vuela');
  const prevX = useRef(foco.x);
  const aparecioRef = useRef(false);
  // Fase de entrada: 'oculta' (pre-ancla) → 'enciende' (parpadea) → 'no'.
  const fase = useRef(cruce && !reducedMotion ? 'oculta' : 'no');
  const ponVis = (visible) => {
    if (visible) aparecioRef.current = true;
    if (visRef.current) visRef.current.style.visibility = visible ? '' : 'hidden';
    if (sombraRef.current) sombraRef.current.visible = visible;
  };
  // El brillo del frame — un solo style-write de opacidad, cacheado.
  const ponBrillo = (op) => {
    if (!idleRef.current) return;
    const v = op.toFixed(2);
    if (v !== ultimaOp.current) { ultimaOp.current = v; idleRef.current.style.opacity = v; }
  };
  const haptics = useHaptics({ reducedMotion });

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    if (nacioEn.current === null) {
      nacioEn.current = t;
      // Nace YA EN EL AIRE, arriba y al lado de su percha (las luciérnagas no
      // llegan de ningún borde: se ENCIENDEN donde estaban, invisibles).
      ref.current.position.set(foco.x + ENTRA_DESDE.x, piso + PERCHA.y + ENTRA_DESDE.y, foco.z + 0.3);
    }
    const vida = t - nacioEn.current;

    // ── SALIDA = SE APAGA: deriva hacia arriba desvaneciéndose y se apaga en
    //    el reloj del overlay (CRUCE_SUELTA_S) — el host retoma la capa 2D ahí.
    if (saliendo && !reducedMotion) {
      if (fase.current === 'oculta') { ponVis(false); return; } // salió antes de encender
      if (salioEn.current === null) salioEn.current = t;
      const f = (t - salioEn.current) / CRUCE_SUELTA_S;
      if (f >= 1) { ponVis(false); return; }
      _dest.set(foco.x + ENTRA_DESDE.x, piso + PERCHA.y + ENTRA_DESDE.y * 1.3, foco.z + 0.3);
      ref.current.position.lerp(_dest, 0.05);
      ponBrillo(Math.max(0, 1 - f)); // la luz que se va
      state.invalidate();
      return;
    }
    salioEn.current = null;

    // ── ENTRADA = SE ENCIENDE: oculta hasta el ancla del overlay; después
    //    aparece POR PULSOS (|sin| a 3.5 medios ciclos: tres destellos que
    //    TERMINAN encendidos) mientras deriva hacia su percha.
    if (fase.current === 'oculta') {
      if (vida < CRUCE_ATRAPA_S) { ponVis(false); state.invalidate(); return; }
      fase.current = 'enciende';
      ponVis(true);
    } else if (fase.current === 'enciende' && vida >= CRUCE_ATRAPA_S + LLEGADA_S) {
      fase.current = 'no';
    }
    if (!aparecioRef.current) ponVis(true); // sin cruce (RM): aparece ya

    // ── PERSONALIDAD IDLE (creatureIdle, perfil 'luciernaga'): flota más que
    //    dardea, vuelta lenta, percha corta. NOCTURNA: jamás se le pasa
    //    'noche' — la noche es cuando sale a brillar, no su siesta.
    const idle = fase.current !== 'no' ? IDLE_NEUTRO : idleDeCreature(t, {
      especie: LUCIERNAGA_SLUG, hora: hora === 'noche' ? 'dorada' : hora,
      reducedMotion, tier,
      llegadaHace: llegoEn.current === null ? null : t - llegoEn.current,
    });
    const quieta = Math.max(0, idle.posada);
    const brio = 0.35 + 0.65 * energia;

    // ── A DÓNDE VA: su percha junto al foco — o deriva en óvalos ANCHOS,
    //    BAJOS y LENTOS (ondas co-primas de período largo), también en
    //    vertical: la lucecita que va y viene, nunca el dardeo de la abeja.
    const vagarX = reducedMotion || entrando
      ? 0
      : (Math.sin(t * 0.21) * 0.5 + Math.sin(t * 0.57) * 0.08) * (1 - quieta);
    const vagarZ = reducedMotion || entrando
      ? 0
      : (Math.cos(t * 0.21) * 0.35 + Math.sin(t * 0.33 + 1.1) * 0.1) * (1 - quieta);
    const vagarY = reducedMotion || entrando
      ? 0
      : Math.sin(t * 0.27) * 0.12 * (1 - quieta);
    const flota = reducedMotion
      ? 0
      : (Math.sin(t * FLOTA_FREQ) * 0.05 + Math.sin(t * 0.37 + 2) * 0.03) * brio * (1 - 0.7 * quieta);
    const alto = entrando ? PERCHA.y : LUCIERNAGA_PRESENCIA.rondaAltura;
    _dest.set(
      foco.x + (entrando ? PERCHA.x : 0.3 + vagarX),
      piso + alto + vagarY + flota,
      foco.z + (entrando ? PERCHA.z : 0.5 + vagarZ),
    );

    // ── LA DERIVA: lerp aéreo LENTO (un tercio del de la abeja) — llega
    //    derivando, sin picada ni empuje de entrada.
    const dist = ref.current.position.distanceTo(_dest);
    const moviendo = reducedMotion ? 0 : clamp01(dist * 2.5) * (1 - quieta);
    ref.current.position.lerp(_dest, DERIVA_LERP * brio);

    // ── EL BRILLO: en la llegada, el parpadeo que enciende; después, el
    //    latido lento de opacidad (0.78..1) — su gracia es el parpadeo.
    if (!reducedMotion) {
      if (fase.current === 'enciende') {
        const f = clamp01((vida - CRUCE_ATRAPA_S) / LLEGADA_S);
        ponBrillo(0.2 + 0.8 * Math.abs(Math.sin(f * Math.PI * 3.5)));
      } else {
        ponBrillo(1 - 0.22 * (0.5 + 0.5 * Math.sin(t * PULSO_FREQ)));
      }
    }

    // Llegó a su percha: celebración idle + roce háptico (una vez por foco).
    if (entrando && posadaEn.current !== foco && dist < 0.3) {
      posadaEn.current = foco;
      llegoEn.current = t;
      haptics.tap();
    }

    // VOLTEO: mira hacia donde deriva (suave — deriva, no dardea).
    if (caraRef.current) {
      const vx = ref.current.position.x - prevX.current;
      if (Math.abs(vx) > 0.001) caraRef.current.style.transform = `scaleX(${vx < 0 ? -1 : 1})`;
      prevX.current = ref.current.position.x;
    }

    // El gesto del frame (ladeo de deriva + idle de personalidad) — un solo
    // style-write cacheado; la pose discreta viaja como data-pose.
    if (idleRef.current) {
      const ladeo = reducedMotion ? 0 : Math.sin(t * 0.6) * 2.0;
      const tf = `rotate(${(idle.rot + ladeo).toFixed(1)}deg) scale(${idle.sx.toFixed(3)},${idle.sy.toFixed(3)})`;
      if (tf !== ultimoTf.current) { ultimoTf.current = tf; idleRef.current.style.transform = tf; }
      if (idle.pose !== ultimaPose.current) {
        ultimaPose.current = idle.pose;
        idleRef.current.setAttribute('data-pose', idle.pose);
      }
    }

    // Sombra de contacto casi nula: es de LUZ, no de peso — apenas un susurro
    // que se abre y desvanece con la altura del vuelo.
    if (sombraRef.current) {
      const pos = ref.current.position;
      const h = Math.max(0, pos.y - piso);
      sombraRef.current.position.set(pos.x, piso + 0.03, pos.z);
      sombraRef.current.scale.setScalar(1 + h * SOMBRA.ensanchaPorAltura);
      sombraRef.current.material.opacity = Math.max(SOMBRA.opacidadMin, SOMBRA.opacidadBase - h * SOMBRA.atenuaPorAltura);
    }

    // frameloop='demand': la deriva y el latido de luz no paran → pedir el
    // próximo frame mientras haya movimiento que mostrar.
    if (!reducedMotion || idle.activo || moviendo > 0 || fase.current !== 'no') state.invalidate();
  });
  return { ref, caraRef, sombraRef, visRef, idleRef, aparecioRef };
}

/* Ritmo de la LECTURA escénica: cada tanto se detiene a LEER LA NOCHE (la
   reacción-firma del cuerpo, data-eco='leer'). Períodos con jitter para que
   nunca sea de reloj. */
const LEE_CADA_MS = 9200;
const LEE_JITTER_MS = 3200;
const LEE_DURA_MS = 1700;

/**
 * La luciérnaga ya montada en una escena: drop-in del contrato de AbejaEscena
 * (CompaiEscena le pasa las mismas props). Billboard `<Html>` con el cuerpo
 * `Luciernaga` (la linterna = su alma, de serie); PULSA al narrar y REBOTA al
 * toque con las clases genéricas del billboard (`.mundo-abeja*`), cada tanto
 * se detiene a LEER LA NOCHE (data-eco='leer'), y si la finca tiene alerta su
 * linterna titila 'degradado' — la bioindicadora diagnosticando de verdad.
 */
export function LuciernagaCompaiEscena({
  foco, entrando = true, animo = 'sereno', energia = 1, reducedMotion = false, piso = 0,
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
  const animoReal = reaccion?.animo ?? animo;
  const energiaReal = reaccion?.energia ?? energia;
  const climaReal = estadoFinca?.clima ?? null;
  const ensoReal = estadoFinca?.enso ?? 'neutro';
  // La hora del valle: para la luciérnaga la noche es JORNADA (el hook no la
  // acurruca); aquí solo se lee una vez, determinista.
  const hora = useMemo(() => horaDeReloj(), []);

  const { ref, caraRef, sombraRef, visRef, idleRef, aparecioRef } = useDerivaLuciernaga(foco, {
    entrando, energia: energiaReal, reducedMotion, piso,
    cruce: cruce && !reducedMotion, saliendo, hora, tier,
  });

  // Microrrebote del toque (mismo patrón de reflow que AbejaEscena) + su
  // reacción-firma: el toque la pone a LEER la noche.
  const reboteRef = useRef(null);
  const [leyendo, setLeyendo] = useState(false);
  const leerTimer = useRef(null);
  useEffect(() => {
    if (reducedMotion || rebote === 0 || !reboteRef.current) return undefined;
    const el = reboteRef.current;
    el.removeAttribute('data-rebote');
    void el.offsetWidth; // fuerza reflow → reinicia el keyframe
    el.setAttribute('data-rebote', '1');
    setLeyendo(true);
    clearTimeout(leerTimer.current);
    leerTimer.current = setTimeout(() => setLeyendo(false), LEE_DURA_MS);
    const t = setTimeout(() => el.removeAttribute('data-rebote'), 640);
    return () => clearTimeout(t);
  }, [rebote, reducedMotion]);

  // LA LECTURA: cada ~9.2s (con jitter) se detiene a leer la noche un rato.
  // Estado discreto (un re-render cada tanto, jamás por frame). Gate RM.
  useEffect(() => {
    if (reducedMotion) return undefined;
    let viva = true;
    let timer;
    const ciclo = () => {
      if (!viva) return;
      timer = setTimeout(() => {
        if (!viva) return;
        setLeyendo(true);
        timer = setTimeout(() => {
          if (!viva) return;
          setLeyendo(false);
          ciclo();
        }, LEE_DURA_MS);
      }, LEE_CADA_MS + Math.random() * LEE_JITTER_MS);
    };
    ciclo();
    return () => { viva = false; clearTimeout(timer); };
  }, [reducedMotion]);
  useEffect(() => () => clearTimeout(leerTimer.current), []);

  const size = LUCIERNAGA_PRESENCIA.billboardBase + Math.round(energiaReal * LUCIERNAGA_PRESENCIA.billboardPorEnergia);
  const vivo = !reducedMotion;
  // LIP-SYNC: el cocuyo "habla" cuando el agente narra (única boca del mundo).
  const { visema } = useLipSync({ activo: vivo });
  const cruceVivo = cruce && !reducedMotion;
  // LA LINTERNA DIAGNOSTICA: alerta real de la finca → 'degradado' (titila
  // débil: el aviso). Sin alerta, la lectura periódica o del toque → 'leer'.
  const eco = hayAlerta ? 'degradado' : (leyendo && vivo ? 'leer' : null);
  return (
    <>
      <group ref={ref} position={[foco.x + ENTRA_DESDE.x, piso + PERCHA.y + ENTRA_DESDE.y, foco.z + 0.3]}>
        <Html center distanceFactor={LUCIERNAGA_PRESENCIA.distancia} zIndexRange={[40, 10]}>
          <div
            ref={visRef}
            className="mundo-abeja"
            /* hidden SOLO hasta que se enciende; después de aparecer, los
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
              {/* Capa del gesto (ladeo + idle + BRILLO en opacidad) —
                  imperativa por frame; propia para no pisar el volteo. */}
              <div ref={idleRef} style={{ transformOrigin: 'center center' }} data-creature={LUCIERNAGA_SLUG}>
                <div ref={caraRef} className="mundo-abeja__cara">
                  <Luciernaga
                    size={size}
                    animo={animoReal}
                    energia={energiaReal}
                    eco={eco}
                    clima={climaReal}
                    enso={ensoReal}
                    visema={vivo ? visema : null}
                    animated={vivo}
                    tier={tier}
                  />
                </div>
              </div>
            </div>
          </div>
        </Html>
      </group>
      {/* Su sombra: un susurro (es de luz, no de peso), tintada con la tinta
          de la casa. */}
      <SombraContacto
        refExt={sombraRef}
        pos={[foco.x + ENTRA_DESDE.x, piso + 0.03, foco.z + 0.3]}
        radio={SOMBRA.radio}
        color={LUCIERNAGA_TINTA}
        opacidad={SOMBRA.opacidad}
        orden={3}
      />
    </>
  );
}
