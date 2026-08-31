/*
 * JaguarBillboard — EL JAGUAR VIVO EN CUALQUIER ESCENA 3D DE SUELO.
 *
 * Hermano de tierra del `CondorBillboard`: el jaguar entra a un mundo 3D como
 * billboard `<Html>` de la lámina AUTO-TRAZADA a tinta (`creatures/JaguarTrazado`
 * — skin definitiva, operador 2026-08-24; el dibujo le gana a cualquier
 * low-poly). REUTILIZABLE: cualquier escena con `<Canvas>` lo monta (el claro,
 * el bosque, la vitrina del monte).
 *
 * LO QUE HACE DISTINTO A UN FELINO DE UN PÁJARO — y la razón de que esto no sea
 * una copia del cóndor con la Y pegada al suelo:
 *
 *  1. PISA. La Y no la elige el componente: la lee del terreno (`suelo`, número
 *     o función x,z→y). Un jaguar flotando dos dedos sobre la hierba arruina la
 *     escena entera, y es el error más fácil de cometer.
 *
 *  2. IMPONE POR EL TIEMPO, NO POR LA AMENAZA (regla del módulo `fauna/`: ni
 *     ternura boba ni villano). Su máquina de fases es lenta a propósito:
 *       · 'anda'    — cruza el claro con paso deliberado y pesado, siguiendo una
 *                     querencia (vuelve al centro si se aleja). No trota nunca.
 *       · 'observa' — SE DETIENE. Se queda quieto un rato largo mirando, y
 *                     sigue. Es la fase que da la presencia: el animal que se
 *                     para a mirarlo a usted y después se va como si nada.
 *       · 'acecha'  — avanza agazapado y lentísimo (el SVG recibe `acecha` y
 *                     sube los omóplatos, baja la testa). Raro, con cooldown.
 *     Nunca acecha a la cámara: el rumbo del acecho es el mismo de su paso.
 *
 *  3. AL VIRAR — DOS LENGUAJES. La lámina está dibujada mirando a un lado.
 *     · MÍSTICO: NO gira — se DESVANECE y REAPARECE (teletransporte
 *       espectral, solo opacity). En el instante invisible da un paso adelante
 *       en su nuevo rumbo y se materializa ya encarado hacia allá.
 *
 *  4. SOMBRA DE CONTACTO PEGADA. Una mancha cálida bajo las zarpas que lo ancla
 *     al piso (+1 draw call, opcional por `suelo`). La sombra del jaguar casi no
 *     se separa de él: camina, no vuela.
 *
 * Todo el gesto va por CSS transform sobre el nodo del billboard (mutación por
 * ref, cero re-renders) y la matemática es O(1) por frame.
 *
 * Tier-safe / reduced-motion: con `animated=false` queda QUIETO y digno en un
 * punto del claro (también congela el SVG y apaga la sombra móvil). Tier 'bajo'
 * poda el acecho.
 *
 * Importa three/@react-three → montar SOLO dentro de un <Canvas>.
 */
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';
import JaguarTrazado from '../../creatures/JaguarTrazado.jsx';

const azar = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* temporal reutilizado (cero alloc por frame) */
const _right = new Vector3();

const ESTILO_JAGUAR = {
  filter: 'drop-shadow(0 3px 4px rgba(28, 20, 11, 0.34))',
  pointerEvents: 'none',
  willChange: 'opacity',
};

/* Velocidades en unidades de mundo por segundo. El jaguar real camina con paso
   medido; acá el paso es LENTO a propósito y el acecho es la mitad de lento. */
const V_ANDA = 0.62;
const V_ACECHA = 0.24;

/**
 * @param {Object} props
 * @param {[number,number,number]} [props.centro=[0,0,0]] querencia del felino: el
 *   punto del claro al que siempre vuelve. La Y se ignora si hay `suelo`.
 * @param {number} [props.radio=6] radio del territorio que recorre.
 * @param {number|((x:number,z:number)=>number)} [props.suelo=0] Y del terreno
 *   (número o función x,z→y). ES LO QUE LO HACE PISAR: sin esto el jaguar flota.
 * @param {number} [props.alto=0]  levantada extra sobre el suelo (px de mundo)
 *   para compensar que el SVG trae aire bajo las zarpas.
 * @param {number} [props.px=132]  tamaño del SVG en px (nitidez del billboard).
 * @param {number} [props.factor=9] distanceFactor del <Html> (escala en mundo).
 * @param {boolean} [props.animated=true] false = quieto y digno (tier bajo / RM).
 * @param {string}  [props.tier]   device-tier ('bajo' poda acecho + sombra).
 * @param {boolean} [props.aparicion=true] compatibilidad histórica. El modo
 *   del jaguar es siempre místico.
 */
export default function JaguarBillboard({
  centro = [0, 0, 0],
  radio = 6,
  suelo = 0,
  alto = 0,
  px = 132,
  factor = 9,
  animated = true,
  tier,
}) {
  const grupo = useRef(/** @type {any} */ (null));
  const capa = useRef(/** @type {HTMLDivElement|null} */ (null));
  const sombra = useRef(/** @type {any} */ (null));
  /* La MARCHA va por estado por la misma razón: cambia cada varios segundos.
     Mientras el felino SE DESPLAZA (fases anda/acecha) el SVG recibe
     pose='camina' — el rig de PERFIL con ciclo de patas real (sin esto el
     billboard PATINA: se traslada con las patas quietas, el bug que reportó
     el operador). Parado a observar vuelve al frontal majestuoso ('anda'). */
  const [andando, setAndando] = useState(true);

  const yDe = (x, z) => (typeof suelo === 'function' ? suelo(x, z) : suelo);

  /* El PUNTO DE ENTRADA se calcula puro (useMemo), no leyendo un ref en el
     render: el render necesita la posición inicial para montar el grupo y la
     sombra, y leer `ref.current` ahí es justamente lo que React desaconseja.
     Del punto de entrada cuelga después el estado vivo, que sí es un ref. */
  const inicio = useMemo(() => {
    const ang = azar(0, Math.PI * 2);
    const x = centro[0] + Math.cos(ang) * radio * 0.55;
    const z = centro[2] + Math.sin(ang) * radio * 0.55;
    return { x, z, y: (typeof suelo === 'function' ? suelo(x, z) : suelo) + alto };
    // el claro no se re-siembra si cambia el tier: la entrada es de una vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const st = useRef(/** @type {any} */ (null));
  if (st.current === null) {
    st.current = {
      fase: 'anda',
      hasta: azar(6, 11),
      rumbo: azar(0, Math.PI * 2),
      x: inicio.x, z: inicio.z,
      px: inicio.x, pz: inicio.z,
      signo: undefined,       // rumbo proyectado a pantalla (-1|1): detecta el viraje
      fadeOp: 1, fadeT: 1, teleport: false, lastOp: '', // teletransporte espectral
      proxAcecho: azar(26, 55),
      dataAnda: true,
      init: false,
    };
  }

  useFrame(({ clock, camera }, delta) => {
    const g = grupo.current;
    if (!g || !animated) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(delta || 0.016, 0.1);
    const s = st.current;

    /* ── máquina de fases: anda → observa → anda, y de vez en cuando acecha ── */
    if (s.fase === 'anda' || s.fase === 'acecha') {
      const v = s.fase === 'acecha' ? V_ACECHA : V_ANDA;
      // deriva mínima del rumbo (nadie camina en línea de regla)…
      s.rumbo += Math.sin(t * 0.31) * 0.14 * dt;
      // …y si se sale del territorio, vira de vuelta a la querencia sin drama.
      const dCentro = Math.hypot(s.x - centro[0], s.z - centro[2]);
      if (dCentro > radio) {
        const haciaCasa = Math.atan2(centro[2] - s.z, centro[0] - s.x);
        let d = haciaCasa - s.rumbo;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        s.rumbo += d * Math.min(1, dt * 0.9);
      }
      s.x += Math.cos(s.rumbo) * v * dt;
      s.z += Math.sin(s.rumbo) * v * dt;
      if (t >= s.hasta) {
        // SE DETIENE A MIRAR: la fase que da la presencia (larga a propósito).
        s.fase = 'observa';
        s.hasta = t + azar(4.5, 9);
      }
    } else if (s.fase === 'observa') {
      if (t >= s.hasta) {
        const puedeAcechar = tier !== 'bajo' && t >= s.proxAcecho;
        // gira un poco antes de arrancar (no reanuda en la misma línea)
        s.rumbo += azar(-1.1, 1.1);
        if (puedeAcechar) {
          s.fase = 'acecha';
          s.hasta = t + azar(7, 12);
          s.proxAcecho = t + azar(45, 90);
        } else {
          s.fase = 'anda';
          s.hasta = t + azar(7, 13);
        }
      }
    }

    /* ── PISA: la Y sale del terreno, siempre ─────────────────────────────── */
    const y = yDe(s.x, s.z) + alto;
    g.position.set(s.x, y, s.z);

    /* ── VIRAJE: rumbo proyectado a pantalla ────────────────────────────────
       El trazado está dibujado mirando a un lado. Al cambiar de rumbo hay dos
       lenguajes según el modo:
        · MÍSTICO: el jaguar-espíritu NO gira — se DESVANECE y REAPARECE
          (teletransporte espectral). */
    if (!s.init) { s.px = s.x; s.pz = s.z; s.init = true; }
    const vx = (s.x - s.px) / dt;
    const vz = (s.z - s.pz) / dt;
    s.px = s.x; s.pz = s.z;
    let vira = false;
    if (Math.hypot(vx, vz) > 0.03) {
      _right.setFromMatrixColumn(camera.matrixWorld, 0);
      const proy = vx * _right.x + vz * _right.z;
      if (Math.abs(proy) > 0.02) {
        const signo = proy < 0 ? -1 : 1;
        if (s.signo !== undefined && signo !== s.signo) vira = true;
        s.signo = signo;
      }
    }

    const capaEl = capa.current;
    // El viraje siempre usa el lenguaje místico. El cuerpo no gira: se
    // disuelve, da un paso y reaparece con el nuevo rumbo.
    if (vira && !s.teleport && s.fadeT === 1) { s.teleport = true; s.fadeT = 0; }
    s.fadeOp += clamp(s.fadeT - s.fadeOp, -dt * 2.6, dt * 2.6);
    if (s.teleport && s.fadeOp < 0.06) {
      s.x += Math.cos(s.rumbo) * 0.55;
      s.z += Math.sin(s.rumbo) * 0.55;
      s.teleport = false;
      s.fadeT = 1;
    }
    if (capaEl) {
      const op = s.fadeOp.toFixed(2);
      if (op !== s.lastOp) { capaEl.style.opacity = op; s.lastOp = op; }
    }

    // ¿se está DESPLAZANDO? → marcha de perfil; ¿parado a observar? → frontal.
    const enMarcha = s.fase !== 'observa';
    if (enMarcha !== s.dataAnda) {
      s.dataAnda = enMarcha;
      setAndando(enMarcha);
    }

    /* ── SOMBRA DE CONTACTO pegada a las zarpas ────────────────────────────── */
    if (sombra.current) {
      sombra.current.position.set(s.x, yDe(s.x, s.z) + 0.04, s.z);
      // En modo místico la sombra se DISUELVE con el felino (si no, quedaría una
      // mancha flotando sobre el suelo mientras el espíritu está invisible).
      if (sombra.current.material) {
        sombra.current.material.opacity = 0.3 * s.fadeOp;
      }
    }
  });

  const conSombra = tier !== 'bajo';

  return (
    <>
      <group ref={grupo} position={[inicio.x, inicio.y, inicio.z]}>
        <Html center distanceFactor={factor} zIndexRange={[14, 0]} pointerEvents="none">
          <div ref={capa} aria-hidden="true" data-vecino="jaguar" style={ESTILO_JAGUAR}>
            {/* SKIN definitiva del jaguar (operador 2026-08-24): JaguarTrazado,
                la lámina auto-trazada a tinta. Su marcha de perfil ('caminando')
                y su idle vivo viven en jaguarHuesos.css. El teletransporte
                espectral lo maneja el useFrame de arriba sobre la
                opacidad de ESTE nodo — el skin no necesita saberlo. */}
            <JaguarTrazado
              size={px}
              estado={andando && animated ? 'caminando' : 'idle'}
              animated={animated}
              tier={tier}
              title="Jaguar"
            />
          </div>
        </Html>
      </group>
      {conSombra && (
        <mesh ref={sombra} position={[inicio.x, inicio.y - alto + 0.04, inicio.z]} rotation-x={-Math.PI / 2} renderOrder={2}>
          <circleGeometry args={[0.95, 22]} />
          <meshBasicMaterial
            /* sombra de contacto CÁLIDA (ley de la casa: bajo el sol andino ni
               la sombra es azul). */
            color="#1c140b"
            transparent
            opacity={0.3}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      )}
    </>
  );
}
