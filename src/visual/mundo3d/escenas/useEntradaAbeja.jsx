/*
 * useEntradaAbeja + AbejaEscena — LA COREOGRAFÍA COMPARTIDA de Angelita.
 *
 * El DR de mundos-3D pide que "la abeja baja y entra" viva UNA sola vez y la
 * herede toda escena-mundo (§4.4). Aquí está: extraída del `CompaneroAbeja` del
 * valle (Valle3D), generalizada para cualquier arquetipo. La ESCENA solo le pasa
 * el `foco` (posición del hotspot activo o el centro del diorama); el hook mueve
 * a Angelita con `lerp` hacia él, la hace flotar según su energía, y la voltea a
 * mirar hacia donde viaja. El CUERPO siempre es `<AbejaAngelita>` (la creature
 * de la librería): la escena POSEE la coreografía, la creature POSEE el cuerpo.
 *
 * Vive dentro de escenas/ (chunk perezoso `vendor-three`): importa @react-three
 * y three, así que NUNCA se importa desde el barrel base del framework.
 */
/* eslint-disable react-refresh/only-export-components -- este módulo (hook de
   coreografía + su componente de escena) se importa SIEMPRE perezoso dentro de
   un <Canvas> vía EscenaBase3D; no es hot-reload-sensible. Van juntos a propósito:
   la creature posee el cuerpo, la escena posee la coreografía (contrato del DR). */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { AbejaAngelita } from '../../creatures/AbejaAngelita.jsx';
import { ABEJA_PRESENCIA, ABEJA_TINTA } from '../../creatures/abejaIdentidad.js';
import { CRUCE_ATRAPA_MS, CRUCE_SUELTA_MS } from '../../creatures/AbejaTransicion.jsx';
import { useSalidaAbeja, resetSalidaAbeja } from '../../creatures/senalSalidaAbeja.js';
import { SombraContacto } from './SombraContacto.jsx';
import { reaccionDeFinca } from './reaccionFinca.js';
import useHaptics from '../useHaptics.js';

/* Vuelo neutro: cuando la escena aún no pasa `estadoFinca` (contrato viejo),
   la coreografía se comporta EXACTO como antes (todos los multiplicadores en 1). */
const VUELO_NEUTRO = { altura: 1, velocidad: 1, vagar: 1, tiembla: 0 };

/* LA IDENTIDAD COMPARTIDA (abejaIdentidad.js): percha, tamaño de billboard y
   sombra salen de la MISMA fuente que pinta la Angelita 2D del home — una sola
   abeja, no dos. La escena posee la coreografía; la creature, cuerpo e identidad. */
const PERCHA = ABEJA_PRESENCIA.percha;
const SOMBRA = ABEJA_PRESENCIA.sombra;

/* EL CRUCE 2D→3D (AbejaTransicion): el mesh nace OCULTO exactamente en el
   PUNTO DE ATRAPE — el píxel de pantalla donde la Angelita 2D del overlay se
   clava y desaparece (centro, 36% de alto: `.abeja-cruce__pos` en
   creatures.css) — espera el instante del ATRAPE y entonces aparece y baja en
   PICADA a su percha. Misma constante de tiempo que el overlay = una sola
   abeja cruzando de capa. Al VOLVER, el reverso: `avisarSalidaAbeja()` (señal
   del host) la manda de vuelta al mismo punto y se apaga en CRUCE_SUELTA_MS,
   donde el overlay 'volver' la retoma. El punto NO se estima con offsets a
   ojo: se DES-PROYECTA de la cámara real de la escena (NDC → mundo), así el
   empalme cae en el mismo píxel en cualquier arquetipo/zoom. */
const CRUCE_ATRAPA_S = CRUCE_ATRAPA_MS / 1000;
const CRUCE_SUELTA_S = CRUCE_SUELTA_MS / 1000;
const CRUCE_PICADA_S = 1.6; // ventana post-atrape con lerp reforzado (el clavado)
const CRUCE_EMPUJE = 2.6; // refuerzo del lerp durante la picada
const CRUCE_HUIDA = 0.24; // lerp de la salida (fuerte: la suelta es un suspiro)
/* NDC-y del punto de atrape = el `top: 36%` del overlay: 1 − 2·0.36. Si el CSS
   mueve el punto, mover ESTE número con él (una sola pareja de verdades). */
const CRUCE_NDC_Y = 0.28;
/* A qué profundidad (fracción de la distancia cámara→foco) vive el punto de
   cruce sobre ese rayo de pantalla: cerca de la cámara para que el billboard
   (que escala por distancia) nazca GRANDE como la 2D y encoja al clavarse. */
const CRUCE_HONDO = 0.5;

/* Temporales reutilizados por frame (cero alloc en el loop). */
const _punto = new THREE.Vector3();
const _dest = new THREE.Vector3();

/* El punto de cruce en coordenadas de MUNDO: des-proyecta el píxel del overlay
   (NDC x=0, y=CRUCE_NDC_Y) a un rayo de cámara y toma el punto del rayo a
   CRUCE_HONDO de la distancia cámara→foco. */
function puntoDeCruce(camera, foco, out) {
  out.set(0, CRUCE_NDC_Y, 0.5).unproject(camera);
  out.sub(camera.position).normalize();
  return out.multiplyScalar(camera.position.distanceTo(foco) * CRUCE_HONDO)
    .add(camera.position);
}

/**
 * Devuelve `{ ref, caraRef, sombraRef, visRef }` para colgar del `<group>` de
 * la abeja, de su cara (para el volteo), de su sombra de contacto (el blob que
 * la sigue por el piso — auditoría 3D: la abeja no debe volar "a la deriva") y
 * del billboard DOM (la visibilidad del cruce). Corre `useFrame` (debe usarse
 * DENTRO de un `<Canvas>`).
 *
 * @param {THREE.Vector3} foco  a dónde va la abeja (hotspot activo o centro).
 * @param {object} [opts]
 * @param {boolean} [opts.entrando=true]  entrando = se posa junto al foco; si no, ronda.
 * @param {number}  [opts.energia=1]      0..1 — vivacidad del vuelo (de la salud real).
 * @param {boolean} [opts.reducedMotion=false]  congela el vaivén a un fotograma.
 * @param {number}  [opts.piso=0]  y del suelo donde se proyecta la sombra.
 * @param {object}  [opts.vuelo]  modificadores de reaccionDeFinca: mojada vuela
 *   más bajo/lento, sed baja a buscar agua, comiendo tiembla mordisqueando.
 *   `{ altura, velocidad, vagar, tiembla }` — multiplicadores (1 = vuelo normal).
 * @param {boolean} [opts.cruce=false]  el CRUCE 2D→3D: nace oculta en el punto
 *   de atrape (des-proyectado de la cámara), aparece en CRUCE_ATRAPA_MS
 *   (cuando la 2D del overlay se apaga) y baja en picada a su percha. `visRef`
 *   (devuelto) debe colgarse del billboard DOM para que la ocultación llegue
 *   al <Html> (drei no hereda la visibilidad del group al portal DOM).
 * @param {boolean} [opts.saliendo=false]  el reverso 3D→2D: vuela al punto de
 *   suelta y se apaga en CRUCE_SUELTA_MS (el overlay 'volver' la retoma ahí).
 */
export function useEntradaAbeja(foco, {
  entrando = true, energia = 1, reducedMotion = false, piso = 0, vuelo = VUELO_NEUTRO,
  cruce = false, saliendo = false,
} = {}) {
  const ref = useRef(null);
  const caraRef = useRef(null);
  const sombraRef = useRef(null);
  const visRef = useRef(null);
  const nacioEn = useRef(null); // reloj del primer frame (ancla del cruce)
  // Fase del cruce de entrada: 'oculta' (pre-atrape) → 'picada' → 'no'.
  // Se decide UNA vez al nacer: si el mesh ya vive, cambiar props no re-cruza.
  const fase = useRef(cruce && !reducedMotion ? 'oculta' : 'no');
  const salioEn = useRef(null); // reloj del inicio de la salida
  const prevX = useRef(foco.x);
  // Visibilidad del billboard DOM + su sombra (el <Html> de drei es un portal:
  // no hereda `group.visible`, así que se apaga a mano por estilo).
  const ponVis = (visible) => {
    if (visRef.current) visRef.current.style.visibility = visible ? '' : 'hidden';
    if (sombraRef.current) sombraRef.current.visible = visible;
  };
  // Háptica de "posarse" (DR-3D-HAPTICA): UNA sola vez por foco, al cruzar el
  // umbral de llegada. El foco solo cambia por tap del usuario (hotspot) o al
  // montar la escena (que nace de un tap para entrar al mundo) → gesto-derivado.
  const haptics = useHaptics({ reducedMotion });
  const posadaEn = useRef(null); // el foco ya celebrado (no repetir por frame)
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    if (nacioEn.current === null) nacioEn.current = t;
    const vida = t - nacioEn.current;

    // ── SALIDA (cruce 3D→2D): la señal del host la manda de vuelta al punto de
    //    suelta (el mismo píxel del overlay, des-proyectado de la cámara VIVA —
    //    si el usuario orbitó, igual cae donde el 2D brota) y se apaga en
    //    CRUCE_SUELTA_S. Con reduced-motion no hay viaje: el host corta en seco
    //    y este mesh muere con la escena, visible hasta el final.
    if (saliendo && !reducedMotion) {
      if (fase.current === 'oculta') { ponVis(false); return; } // salió antes de nacer
      if (salioEn.current === null) salioEn.current = t;
      if (t - salioEn.current >= CRUCE_SUELTA_S) { ponVis(false); return; }
      puntoDeCruce(state.camera, foco, _punto);
      ref.current.position.lerp(_punto, CRUCE_HUIDA);
      return; // sin vagar ni sombra: es un suspiro de 180 ms hacia la cámara
    }
    salioEn.current = null;

    // ── ENTRADA (cruce 2D→3D): oculta y CLAVADA en el punto de atrape hasta el
    //    instante exacto en que la 2D del overlay se apaga (CRUCE_ATRAPA_S desde
    //    el montaje de la escena — el mismo ancla del overlay, que el host monta
    //    con AlMontarEscena); entonces aparece y cae en PICADA (lerp reforzado)
    //    hacia su percha de siempre. Una sola abeja cruzando de capa.
    if (fase.current === 'oculta') {
      puntoDeCruce(state.camera, foco, _punto);
      ref.current.position.copy(_punto);
      if (vida < CRUCE_ATRAPA_S) { ponVis(false); return; }
      fase.current = 'picada';
      ponVis(true);
    } else if (fase.current === 'picada' && vida >= CRUCE_ATRAPA_S + CRUCE_PICADA_S) {
      fase.current = 'no';
    }
    const empuje = fase.current === 'picada' ? CRUCE_EMPUJE : 1;
    // El estado de la finca modula el vuelo: mojada pesa (baja/lenta), sed baja a
    // buscar agua, comiendo tiembla mordisqueando. Multiplicadores de reaccionDeFinca.
    const mAltura = vuelo?.altura ?? 1;
    const mVel = vuelo?.velocidad ?? 1;
    const mVagar = vuelo?.vagar ?? 1;
    const tiembla = reducedMotion ? 0 : (vuelo?.tiembla ?? 0);
    const brio = (0.35 + 0.65 * energia) * mVel; // la energía y el clima animan el vuelo
    // Bob IRREGULAR (Miss-Minutes): el vaivén base respira sobre otra onda más
    // lenta — nunca el mismo compás, la flotada se siente decidida, no de reloj.
    const bob = reducedMotion
      ? 0
      : Math.sin(t * (1.6 + brio)) * (0.06 + 0.12 * brio) * (1 + 0.3 * Math.sin(t * 0.73));
    // Temblor de sed/mordisco: sacudida rápida y corta (nervio, no vaivén).
    const tembleque = tiembla ? Math.sin(t * 13) * tiembla : 0;
    // ARREBATO curioso: casi siempre 0; cada ~26 s la ventana del seno abre ~2 s
    // y Angelita se escora de lado a fisgonear (double-take de vuelo) y vuelve.
    // Suave por construcción (es el pico de un seno) — chispa, no epilepsia.
    const arrebato = reducedMotion ? 0 : Math.max(0, Math.sin(t * 0.24) - 0.94) * 6 * mVagar;
    // Al reposo deriva VAGABUNDA: tres ondas co-primas (nunca repite el mismo
    // óvalo — ronda viva, impredecible). Al entrar se posa junto al lugar, con
    // apenas un resto de arrebato (fisgonea sin soltar su percha).
    const vagarX = reducedMotion || entrando
      ? 0
      : (Math.sin(t * 0.55) * 0.42 + Math.sin(t * 1.37) * 0.13 + Math.sin(t * 0.19) * 0.22) * mVagar;
    const vagarZ = reducedMotion || entrando
      ? 0
      : (Math.cos(t * 0.55) * 0.3 + Math.sin(t * 0.83 + 1.7) * 0.14) * mVagar;
    // La altura sobre el foco se atenúa con `mAltura` (mojada/sed vuelan más bajo).
    // La percha y la altura de ronda son de la IDENTIDAD compartida (abejaIdentidad).
    const alto = (entrando ? PERCHA.y : ABEJA_PRESENCIA.rondaAltura) * mAltura;
    const dest = _dest.set(
      foco.x + (entrando ? PERCHA.x : 0.35 + vagarX) + tembleque + arrebato * (entrando ? 0.3 : 1),
      foco.y + alto + bob + tembleque * 0.5 + arrebato * 0.18,
      foco.z + (entrando ? PERCHA.z : 0.55 + vagarZ),
    );
    ref.current.position.lerp(dest, (entrando ? 0.06 : 0.05) * mVel * empuje);
    // Angelita se posa: al cruzar el umbral de llegada al foco, un roce háptico
    // (una vez por foco — el ref evita repetir por frame; el gate del hook
    // apaga todo con reduced-motion, pref 'off' o sin soporte).
    if (entrando && posadaEn.current !== foco && ref.current.position.distanceTo(dest) < 0.3) {
      posadaEn.current = foco;
      haptics.abeja();
    }
    if (caraRef.current) {
      const vx = ref.current.position.x - prevX.current;
      if (Math.abs(vx) > 0.0015) caraRef.current.style.transform = `scaleX(${vx < 0 ? -1 : 1})`;
      prevX.current = ref.current.position.x;
    }
    // La sombra de contacto la sigue por el piso: más alto vuela, más ancha y
    // más tenue (peso visual sin shadow-maps). Mismo frame, cero loops extra.
    if (sombraRef.current) {
      const pos = ref.current.position;
      const h = Math.max(0, pos.y - piso);
      sombraRef.current.position.set(pos.x, piso + 0.03, pos.z);
      sombraRef.current.scale.setScalar(1 + h * SOMBRA.ensanchaPorAltura);
      sombraRef.current.material.opacity = Math.max(SOMBRA.opacidadMin, SOMBRA.opacidadBase - h * SOMBRA.atenuaPorAltura);
    }
  });
  return { ref, caraRef, sombraRef, visRef };
}

/**
 * Angelita ya montada en una escena: usa `useEntradaAbeja` para la coreografía y
 * dibuja el cuerpo (`AbejaAngelita`) como billboard `<Html>`. Es la ÚNICA abeja
 * dentro de un mundo (la del footer se oculta): por eso REFLEJA EL HABLA —pulsa
 * cuando el agente narra (`hablando`)— y da un microrrebote al tocar un hotspot
 * (`rebote`, un contador que sube por toque). Tres transformaciones en tres capas
 * DOM que no se pisan: pulso (raíz), rebote (medio), volteo scaleX (cara, que el
 * useFrame maneja imperativo). Cualquier arquetipo la coloca con
 * `<AbejaEscena foco=… animo=… energia=… hablando=… rebote=… reducedMotion=… />`.
 */
export function AbejaEscena({
  foco, entrando = true, animo = 'sereno', energia = 1, reducedMotion = false, piso = 0,
  hablando = false, rebote = 0,
  // Device-tier (DR-3D-PERF-GAMABAJA): gradúa el rubber-hose del cuerpo — en
  // 'bajo' Angelita apaga el idle continuo (boil + follow-through) y conserva
  // el aleteo + los estados reactivos. La escena lo hereda del host <Mundo>.
  tier = 'alto',
  // El CRUCE 2D→3D corre por defecto: toda escena-mundo nace con Angelita
  // clavándose desde la capa 2D (y aun sin el overlay cableado, la entrada en
  // picada se sostiene sola). `cruce={false}` para montajes sin viaje
  // (storybook, catálogo). Reduced-motion lo apaga por dentro (aparece ya).
  cruce = true,
  // ── EL ESTADO REAL DE LA FINCA (auditoría §5b) ─────────────────────────────
  //    Angelita SIEMPRE refleja tu realidad: llueve→mojada, Niño/sequía→sed,
  //    cosecha→come de eso, ánimo por salud. Interfaz LIMPIA; hoy MUESTRA, codex
  //    cabla el dato real con useFincaViva. Si NO se pasa, la abeja usa el
  //    `animo`/`energia` sueltos de siempre (contrato viejo intacto).
  estadoFinca = null, hayAlerta = false,
}) {
  // La señal de SALIDA del host (avisarSalidaAbeja): cruza el reconciler de r3f
  // vía store externo. Al montar se limpia (la señal es de la escena ANTERIOR);
  // al desmontar también, para no dejar el flag prendido entre mundos.
  const saliendo = useSalidaAbeja();
  useEffect(() => {
    resetSalidaAbeja();
    return resetSalidaAbeja;
  }, []);
  const cruceVivo = cruce && !reducedMotion;
  // La CAPA de reacción (pura, desacoplada de la especie): del estado real sale
  // el ánimo, la energía, y el repertorio (mojada/sed/comiendo) + modificadores
  // de vuelo. Con estadoFinca manda la reacción; sin él, el contrato viejo.
  const reaccion = useMemo(
    () => (estadoFinca ? reaccionDeFinca(estadoFinca, { hayAlerta }) : null),
    [estadoFinca, hayAlerta],
  );
  const animoReal = reaccion?.animo ?? animo;
  const energiaReal = reaccion?.energia ?? energia;
  const mojada = reaccion?.mojada ?? false;
  const sed = reaccion?.sed ?? false;
  const comiendo = reaccion?.comiendo ?? false;
  const { ref, caraRef, sombraRef, visRef } = useEntradaAbeja(foco, {
    entrando, energia: energiaReal, reducedMotion, piso, vuelo: reaccion?.vuelo,
    cruce: cruceVivo, saliendo,
  });
  // Microrrebote: cada toque de hotspot sube `rebote`; reiniciamos la animación
  // CSS (quitar → reflow → poner) para que dispare aun en toques seguidos. El
  // gate reduced-motion la deja quieta.
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
  // El tamaño con el que Angelita ocupa el mundo sale de su IDENTIDAD (la misma
  // fuente que la 2D del home): base + ganancia por energía real de la finca.
  const size = ABEJA_PRESENCIA.billboardBase + Math.round(energiaReal * ABEJA_PRESENCIA.billboardPorEnergia);
  const vivo = !reducedMotion;
  return (
    <>
      <group ref={ref} position={[foco.x + PERCHA.x, foco.y + PERCHA.y, foco.z + PERCHA.z]}>
        <Html center distanceFactor={ABEJA_PRESENCIA.distancia} zIndexRange={[40, 10]}>
          {/* Reacción al estado real, también en el wrapper (brillo mojado,
              temblor sediento, bamboleo de mordisco — rubber-hose). Gate RM.
              `visRef` + visibility inicial: con cruce, el billboard nace oculto
              (el estilo inline evita el flash del portal antes del primer
              useFrame; después el hook lo maneja imperativo). */}
          <div
            ref={visRef}
            className="mundo-abeja"
            style={cruceVivo ? { visibility: 'hidden' } : undefined}
            aria-hidden="true"
            data-hablando={hablando && vivo ? '1' : undefined}
            data-mojada={mojada && vivo ? '1' : undefined}
            data-sed={sed && vivo ? '1' : undefined}
            data-comiendo={comiendo && vivo ? '1' : undefined}
          >
            <div ref={reboteRef} className="mundo-abeja__rebote">
              <div ref={caraRef} className="mundo-abeja__cara">
                <AbejaAngelita
                  size={size}
                  animo={animoReal}
                  energia={energiaReal}
                  mojada={mojada}
                  sed={sed}
                  comiendo={comiendo}
                  animated={vivo}
                  tier={tier}
                />
              </div>
            </div>
          </div>
        </Html>
      </group>
      {/* Su sombra: hermana (NO hija) del group — vive en el piso, no vuela.
          Tintada con la MISMA tinta cálida del contorno rubber-hose (identidad):
          hasta la sombra de Angelita está dibujada con su propia línea. */}
      <SombraContacto
        refExt={sombraRef}
        pos={[foco.x + PERCHA.x, piso + 0.03, foco.z + PERCHA.z]}
        radio={SOMBRA.radio}
        color={ABEJA_TINTA}
        opacidad={SOMBRA.opacidad}
        orden={3}
      />
    </>
  );
}
