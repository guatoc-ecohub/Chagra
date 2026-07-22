/*
 * FaunaBosque — LA VIDA del Bosque Vivo. Un bosque sin bichos es un decorado.
 *
 * EL REGISTRO (decisión del operador, 2026-07): la fauna EMBLEMÁTICA del
 * bosque — oso (el GUARDIÁN NEGRO; el café y el borugo están archivados y no
 * se surfacean), rana, colibrí, jaguar — va con los SVG rubber-hose de
 * `src/visual/creatures/` como billboards <Html>: son el estándar de calidad
 * de la casa. La fauna AMBIENTAL de fondo —
 * cóndor, venado en la niebla, bandada, quetzal fugaz, mariposas, abejas,
 * escarabajo, luciérnagas — sí es geometría mínima procedural (siluetas que
 * el fog completa). Hubo un intento de oso/rana procedurales: quedó jubilado
 * tras FAUNA_PROCEDURAL_JUBILADA (el SVG le gana a cualquier low-poly).
 *
 * Tres capas de movimiento (el ojo necesita las tres):
 *   · LEJOS  — el CÓNDOR planeando y los VISITANTES que la niebla trae y se
 *     lleva: un venado de páramo que cruza al fondo y se pierde, una bandada
 *     que levanta vuelo, un quetzal que atraviesa el claro como un cometa
 *     verde. La vida es aparición y desaparición, no un zoológico congelado.
 *   · MEDIO  — los VECINOS rubber-hose en SU casa, ya no muebles: un
 *     IDLE-CEREBRO local (el patrón useVidaIdle de PR #2482, adaptado) hojea
 *     el repertorio que cada bicho YA sabe hacer con un reloj con jitter —
 *     el oso PASEA unos pasos y vuelve (movimiento 3D real del billboard),
 *     resopla, se rasca, se sienta; el jaguar acecha y ruge en la niebla; el
 *     borugo olfatea y se acurruca; la rana pega su brinquito. Nunca el
 *     mismo gesto dos veces seguidas, nunca al unísono.
 *   · CERCA — MARIPOSAS (la Morpho azul manda) y ABEJAS sobre el frailejonar,
 *     el COLIBRÍ que llega a una flor, liba y se va a otra (y a veces se
 *     pierde un rato del cuadro), un ESCARABAJO arrastrándose por el musgo y
 *     LUCIÉRNAGAS al caer el sol.
 *
 * Ritmo, no metrónomo: cada bicho lleva su fase, su reloj y su jitter propios
 * (nada aparece ni parpadea al unísono, ningún ciclo se siente en loop). La
 * franja del día sale de useCicloDia (?ciclo= para fotografiar una hora).
 * Tier-safe: bajo = solo el oso y el colibrí, quietos; medio = vecinos vivos +
 * cóndor + visitantes + pocas mariposas; alto = todo. reducedMotion = nada
 * animado ni intermitente: fotograma digno.
 *
 * Cero assets, cero texturas: lo procedural es geometría mínima
 * (fusionarSeguro contra el null silencioso de mergeGeometries) y los vecinos
 * son SVG en <Html>. Importa three/@react-three → montar SOLO dentro del
 * <Canvas> del bosque.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { CREATURES } from '../../creatures/index.js';
import useCicloDia from '../useCicloDia.js';
import { fusionarSeguro } from './sombreadoVegetal.js';

const azar = (a, b) => a + Math.random() * (b - a);

/* ── EL IDLE-CEREBRO DEL BOSQUE (patrón useVidaIdle, PR #2482, local) ─────
   Un reloj con jitter: descanso (identidad) → gesto → descanso → otro
   gesto… Nunca repite el mismo gesto dos veces seguidas. El primer compás
   llega rápido (el bosque no arranca muerto) y `primero` deja fijar el
   gesto de apertura (el oso SIEMPRE abre paseando: se ve que está vivo).
   Gate `activo=false` (reduced-motion, tier bajo) = ni un timer vivo. */
function useRelojDeVida(vida, activo) {
  const [momento, setMomento] = useState(/** @type {string|null} */ (null));
  useEffect(() => {
    if (!vida || !activo) return undefined;
    let timer = 0;
    let ultimo = /** @type {string|null} */ (null);
    let esPrimera = true;
    const claves = Object.keys(vida.momentos);
    const descansa = () => {
      setMomento(null);
      timer = window.setTimeout(gesticula, azar(vida.descanso[0], vida.descanso[1]));
    };
    const gesticula = () => {
      let m = esPrimera && vida.primero ? vida.primero : claves[Math.floor(Math.random() * claves.length)];
      if (claves.length > 1) {
        while (m === ultimo) m = claves[Math.floor(Math.random() * claves.length)];
      }
      esPrimera = false;
      ultimo = m;
      setMomento(m);
      timer = window.setTimeout(descansa, vida.momentos[m].dur);
    };
    // Arranca al próximo tick, con un descanso CORTO de apertura: la vida
    // se nota en los primeros segundos, no al minuto.
    timer = window.setTimeout(gesticula, azar(1800, 4200));
    return () => {
      window.clearTimeout(timer);
      setMomento(null);
    };
  }, [vida, activo]);
  return momento;
}

/* ── FAUNA PROCEDURAL EMBLEMÁTICA — JUBILADA (2026-07) ───────────────────
   Hubo un oso de anteojos, una rana dardo y una danta en low-poly. El
   operador decidió: los emblemas van con los SVG rubber-hose de la casa
   (les ganan en encanto a cualquier polígono). El código queda tras este
   flag como referencia de los CICLOS de movimiento (paseo amortiguado,
   erguirse, brincos, asomarse), que sí sobreviven en los billboards. */
const FAUNA_PROCEDURAL_JUBILADA = true;

/* El oso procedural jubilado: pelaje negro-pardo, máscara crema, babero.
   Su idle-cerebro (pasear/olfatear/erguirse/mirar, todo amortiguado) migró
   conceptualmente al billboard VecinoVivo. */
const OSO = { pelaje: '#26211c', pata: '#1e1a16', mascara: '#d8c39a', nariz: '#141110' };
const OSO_POS = [-3.6, 0, 3.0]; // el borde del arbolado, asomado al claro
const OSO_RUMBO = [1.7, 0, 1.0]; // su paseo: hacia el claro y de vuelta
const OSO_YAW_BASE = -0.7; // en reposo queda en 3/4 hacia la cámara
const OSO_YAW_IDA = Math.atan2(-OSO_RUMBO[2], OSO_RUMBO[0]);
const VIDA_OSO = {
  primero: 'pasea', // abre caminando: lo primero que se ve es que VIVE
  descanso: [5000, 11000],
  momentos: {
    pasea: { dur: 9000 },
    olfatea: { dur: 4500 },
    seYergue: { dur: 5200 },
    mira: { dur: 3600 },
  },
};

function geomOsoTorso() {
  // pecho + panza + grupa: la mole, construida mirando +x.
  const pecho = new THREE.SphereGeometry(0.34, 8, 6);
  pecho.scale(1.1, 1, 0.95);
  pecho.translate(0.3, 0.1, 0);
  const panza = new THREE.SphereGeometry(0.38, 8, 6);
  panza.scale(1.25, 1, 1);
  panza.translate(-0.1, 0.02, 0);
  const grupa = new THREE.SphereGeometry(0.3, 7, 6);
  grupa.translate(-0.44, 0.04, 0);
  return fusionarSeguro([pecho, panza, grupa], 'oso-torso');
}

function geomOsoCabeza() {
  const testa = new THREE.SphereGeometry(0.21, 8, 6);
  testa.scale(1.05, 1, 0.92);
  const orejaIzq = new THREE.SphereGeometry(0.07, 6, 5);
  orejaIzq.translate(0.0, 0.19, 0.13);
  const orejaDer = orejaIzq.clone();
  orejaDer.translate(0, 0, -0.26);
  return fusionarSeguro([testa, orejaIzq, orejaDer], 'oso-cabeza');
}

function OsoDeAnteojos({ vivo }) {
  const momento = useRelojDeVida(VIDA_OSO, vivo);
  const raiz = useRef(/** @type {any} */ (null));
  const torso = useRef(/** @type {any} */ (null));
  const cabeza = useRef(/** @type {any} */ (null));
  const patas = useRef(/** @type {any[]} */ ([])); // 0-1 delanteras, 2-3 traseras
  const anim = useRef({ x: 0, z: 0, yaw: OSO_YAW_BASE, swing: 0, torso: 0, cPitch: 0, cYaw: 0, t0: /** @type {number|null} */ (null) });
  const geoTorso = useMemo(() => geomOsoTorso(), []);
  const geoCabeza = useMemo(() => geomOsoCabeza(), []);

  useFrame(({ clock }, delta) => {
    const g = raiz.current;
    if (!g || !vivo) return;
    const t = clock.getElapsedTime();
    const k = 1 - Math.exp(-3.4 * (delta || 0.016)); // amortiguación de mole
    const A = anim.current;

    // EL PASEO: sale, da la vuelta a mitad de camino, regresa.
    let ox = 0;
    let oz = 0;
    let yaw = OSO_YAW_BASE;
    let swing = 0;
    if (momento === 'pasea') {
      if (A.t0 == null) A.t0 = t;
      const p = Math.min(1, (t - A.t0) / (VIDA_OSO.momentos.pasea.dur / 1000));
      const ida = Math.sin(p * Math.PI); // sale y VUELVE, suave en las puntas
      ox = OSO_RUMBO[0] * ida;
      oz = OSO_RUMBO[2] * ida;
      yaw = p < 0.5 ? OSO_YAW_IDA : OSO_YAW_IDA + Math.PI; // la vuelta real
      swing = ida;
    } else {
      A.t0 = null;
    }
    A.x += (ox - A.x) * k;
    A.z += (oz - A.z) * k;
    A.yaw += (yaw - A.yaw) * k;
    A.swing += (swing - A.swing) * k;
    const paso = t * 4.6; // el compás del andar pesado
    g.position.set(OSO_POS[0] + A.x, Math.abs(Math.sin(paso)) * 0.05 * A.swing, OSO_POS[2] + A.z);
    g.rotation.y = A.yaw;
    for (let i = 0; i < patas.current.length; i++) {
      const pt = patas.current[i];
      if (pt) pt.rotation.z = Math.sin(paso + (i % 2 ? Math.PI : 0)) * 0.5 * A.swing;
    }

    // ERGUIRSE (pivote en la cadera trasera) e inclinarse a OLFATEAR.
    const torsoObj = momento === 'seYergue' ? 0.95 : momento === 'olfatea' ? -0.14 : 0;
    A.torso += (torsoObj - A.torso) * k;
    if (torso.current) {
      torso.current.rotation.z = A.torso;
      torso.current.scale.y = 1 + Math.sin(t * 1.2) * 0.015; // la respiración
    }

    // LA CABEZA: baja a olfatear, compensa al erguirse, otea despacio.
    const pitchObj = momento === 'olfatea' ? -0.55 : momento === 'seYergue' ? -0.55 : momento === 'mira' ? 0.18 : 0;
    const yawCabObj = momento === 'olfatea'
      ? Math.sin(t * 1.9) * 0.35 // el husmeo, corto y curioso
      : (momento === 'mira' || momento === 'seYergue')
        ? Math.sin(t * 0.8) * 0.55 // el oteo, lento y ancho
        : 0;
    A.cPitch += (pitchObj - A.cPitch) * k;
    A.cYaw += (yawCabObj - A.cYaw) * (k * 1.6);
    if (cabeza.current) {
      cabeza.current.rotation.z = A.cPitch;
      cabeza.current.rotation.y = A.cYaw;
    }
  });

  const geoPata = useMemo(() => {
    const p = new THREE.CylinderGeometry(0.1, 0.085, 0.56, 6);
    p.translate(0, -0.28, 0); // pivote en la cadera: la pata columpia
    return p;
  }, []);

  return (
    <group ref={raiz} position={/** @type {[number,number,number]} */ (OSO_POS)} rotation={[0, OSO_YAW_BASE, 0]}>
      {/* patas traseras: plantadas en el mundo (no suben al erguirse) */}
      {[0.17, -0.17].map((pz, i) => (
        <mesh
          key={`tr-${i}`}
          geometry={geoPata}
          position={[-0.42, 0.55, pz]}
          ref={(el) => {
            patas.current[2 + i] = el;
          }}
        >
          <meshLambertMaterial color={OSO.pata} />
        </mesh>
      ))}
      {/* el torso pivota en la cadera trasera (erguirse de verdad) */}
      <group ref={torso} position={[-0.42, 0.55, 0]}>
        <group position={[0.42, 0.06, 0]}>
          <mesh geometry={geoTorso}>
            <meshLambertMaterial color={OSO.pelaje} />
          </mesh>
          {/* el babero crema del pecho (marca de oso de anteojos) */}
          <mesh position={[0.52, -0.08, 0]} scale={[0.55, 1, 0.8]}>
            <sphereGeometry args={[0.15, 7, 6]} />
            <meshLambertMaterial color={OSO.mascara} />
          </mesh>
          {/* patas delanteras (van con el torso: al erguirse quedan al aire) */}
          {[0.17, -0.17].map((pz, i) => (
            <mesh
              key={`de-${i}`}
              geometry={geoPata}
              position={[0.32, -0.06, pz]}
              ref={(el) => {
                patas.current[i] = el;
              }}
            >
              <meshLambertMaterial color={OSO.pata} />
            </mesh>
          ))}
          {/* LA CABEZA con la máscara de anteojos */}
          <group ref={cabeza} position={[0.66, 0.34, 0]}>
            <mesh geometry={geoCabeza}>
              <meshLambertMaterial color={OSO.pelaje} />
            </mesh>
            {/* el hocico crema */}
            <mesh position={[0.19, -0.05, 0]} scale={[1.15, 0.85, 0.9]}>
              <sphereGeometry args={[0.1, 7, 6]} />
              <meshLambertMaterial color={OSO.mascara} />
            </mesh>
            {/* la trufa */}
            <mesh position={[0.29, -0.03, 0]}>
              <sphereGeometry args={[0.038, 6, 5]} />
              <meshLambertMaterial color={OSO.nariz} />
            </mesh>
            {/* LOS ANTEOJOS: los dos parches crema alrededor de los ojos */}
            {[0.095, -0.095].map((pz, i) => (
              <mesh key={`ant-${i}`} position={[0.15, 0.065, pz]} scale={[0.55, 1, 1]}>
                <sphereGeometry args={[0.082, 6, 5]} />
                <meshLambertMaterial color={OSO.mascara} />
              </mesh>
            ))}
            {/* los ojos, dentro de los parches */}
            {[0.09, -0.09].map((pz, i) => (
              <mesh key={`ojo-${i}`} position={[0.205, 0.07, pz]}>
                <sphereGeometry args={[0.024, 5, 4]} />
                <meshLambertMaterial color="#0d0b0a" />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}

/* ── EL COLIBRÍ DEL FRAILEJONAR — llega, liba y se va (SVG rubber-hose) ──
   Ya no es una percha fija: tiene SUS flores. Liba en una (con su bamboleo
   de vuelo quieto), dispara el dardo hacia otra, y de vez en cuando se
   pierde del cuadro un rato (se desvanece rumbo al monte — la niebla no
   toca DOM, el fade lo hace el div) y vuelve por otra flor. Estado en refs
   (cero re-renders); en tier bajo / reduced-motion queda posado en su flor
   de siempre, digno. */
const FLORES_DEL_COLIBRI = [
  [2.9, 1.7, 5.6], // la de siempre, sobre el frailejonar del frente
  [-2.1, 1.45, 5.1], // la mata del otro costado
  [4.4, 1.4, 2.3], // la más alta, cerca del musgo
];
const PUERTA_DEL_MONTE = [10, 3.4, -2]; // por donde se pierde y regresa

function ColibriDelFrailejonar({ tier, reducedMotion }) {
  const reg = CREATURES.colibri;
  const vivo = !reducedMotion && tier !== 'bajo';
  const grupo = useRef(/** @type {any} */ (null));
  const capa = useRef(/** @type {HTMLDivElement|null} */ (null));
  const st = useRef({
    fase: 'liba', // liba → dardo → (liba | ausente → regreso)
    flor: 0,
    hasta: azar(6, 12),
    t0: 0,
    de: FLORES_DEL_COLIBRI[0],
    a: FLORES_DEL_COLIBRI[0],
    dur: 1,
  });

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g || !vivo) return;
    const t = clock.getElapsedTime();
    const s = st.current;
    if (s.fase === 'liba') {
      const f = FLORES_DEL_COLIBRI[s.flor];
      g.position.set(f[0], f[1] + Math.sin(t * 1.7) * 0.14, f[2]);
      if (t >= s.hasta) {
        // ¿A otra flor o a perderse un rato en el monte? (la ausencia es
        // lo que hace que volverlo a ver se sienta: 1 de cada 4 vuelos)
        const seVa = Math.random() < 0.25;
        const prox = seVa ? s.flor : (s.flor + 1 + Math.floor(Math.random() * (FLORES_DEL_COLIBRI.length - 1))) % FLORES_DEL_COLIBRI.length;
        s.de = [g.position.x, g.position.y, g.position.z];
        s.a = seVa ? PUERTA_DEL_MONTE : FLORES_DEL_COLIBRI[prox];
        s.flor = prox;
        s.fase = seVa ? 'seVa' : 'dardo';
        s.t0 = t;
        s.dur = seVa ? 1.6 : azar(0.8, 1.2);
      }
    } else if (s.fase === 'dardo' || s.fase === 'seVa' || s.fase === 'vuelve') {
      const p = Math.min(1, (t - s.t0) / s.dur);
      const e = 1 - (1 - p) * (1 - p); // arranque fulminante, llegada en freno
      const y = s.de[1] + (s.a[1] - s.de[1]) * e + Math.sin(p * Math.PI) * 0.5; // arco
      g.position.set(s.de[0] + (s.a[0] - s.de[0]) * e, y, s.de[2] + (s.a[2] - s.de[2]) * e);
      if (capa.current) {
        // Mira a donde va, y al perderse se desvanece en el aire.
        capa.current.style.transform = s.a[0] - s.de[0] < 0 ? 'scaleX(-1)' : '';
        if (s.fase === 'seVa') capa.current.style.opacity = String(1 - p * p);
        if (s.fase === 'vuelve') capa.current.style.opacity = String(Math.min(1, p * 1.6));
      }
      if (p >= 1) {
        if (s.fase === 'seVa') {
          s.fase = 'ausente';
          s.hasta = t + azar(7, 16);
        } else {
          s.fase = 'liba';
          s.hasta = t + azar(6, 14);
          if (capa.current) capa.current.style.opacity = '1';
        }
      }
    } else if (s.fase === 'ausente' && t >= s.hasta) {
      // Regresa por CUALQUIER flor, desde el monte: nunca el mismo compás.
      s.flor = Math.floor(Math.random() * FLORES_DEL_COLIBRI.length);
      s.de = PUERTA_DEL_MONTE;
      s.a = FLORES_DEL_COLIBRI[s.flor];
      s.fase = 'vuelve';
      s.t0 = t;
      s.dur = 1.6;
    }
  });

  if (!reg?.Component) return null;
  const Bicho = reg.Component;
  return (
    <group ref={grupo} position={/** @type {[number, number, number]} */ (FLORES_DEL_COLIBRI[0])}>
      <Html center distanceFactor={10} zIndexRange={[6, 0]} pointerEvents="none">
        <div ref={capa} aria-hidden="true" data-vecino="colibri" style={ESTILO_CRITTER}>
          <Bicho size={34} animated={vivo} />
        </div>
      </Html>
    </group>
  );
}

/* ── LA RANA DARDO procedural — jubilada (FAUNA_PROCEDURAL_JUBILADA) ─────
   El emblema va con el SVG RanaAndina en VECINOS_BOSQUE. Queda el ciclo
   del brinco territorial (parábola corta con giro) como referencia. */
const RANA_CASA = [3.15, 0, 3.2];

function RanaDardo({ vivo }) {
  const grupo = useRef(/** @type {any} */ (null));
  const st = useRef({ fase: 'quieta', hasta: azar(4, 10), t0: 0, de: [RANA_CASA[0], RANA_CASA[2]], a: [RANA_CASA[0], RANA_CASA[2]] });
  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g || !vivo) return;
    const t = clock.getElapsedTime();
    const s = st.current;
    if (s.fase === 'quieta') {
      g.scale.y = 1 + Math.max(0, Math.sin(t * 2.6)) * 0.08; // el pulso de garganta
      if (t >= s.hasta) {
        // brinca dentro de SU territorio (nunca lejos del musgo)
        const ang = Math.random() * Math.PI * 2;
        const r = azar(0.2, 0.45);
        const nx = RANA_CASA[0] + Math.cos(ang) * r * 0.6;
        const nz = RANA_CASA[2] + Math.sin(ang) * r * 0.6;
        s.de = [g.position.x, g.position.z];
        s.a = [nx, nz];
        s.fase = 'brinca';
        s.t0 = t;
        g.rotation.y = Math.atan2(-(nz - s.de[1]), nx - s.de[0]);
      }
    } else {
      const p = Math.min(1, (t - s.t0) / 0.42);
      g.position.set(
        s.de[0] + (s.a[0] - s.de[0]) * p,
        Math.sin(p * Math.PI) * 0.22, // la parábola del brinco
        s.de[1] + (s.a[1] - s.de[1]) * p,
      );
      if (p >= 1) {
        s.fase = 'quieta';
        s.hasta = t + azar(7, 18);
      }
    }
  });
  return (
    <group ref={grupo} position={/** @type {[number,number,number]} */ (RANA_CASA)} rotation={[0, -0.6, 0]}>
      <mesh position={[0, 0.05, 0]} scale={[1.3, 0.85, 1]}>
        <sphereGeometry args={[0.07, 7, 6]} />
        <meshLambertMaterial color="#ff5f2a" />
      </mesh>
      <mesh position={[0.07, 0.08, 0]}>
        <sphereGeometry args={[0.045, 6, 5]} />
        <meshLambertMaterial color="#ff6f33" />
      </mesh>
      {/* los ojazos negros de rana dardo */}
      {[0.035, -0.035].map((pz, i) => (
        <mesh key={i} position={[0.1, 0.11, pz]}>
          <sphereGeometry args={[0.016, 5, 4]} />
          <meshLambertMaterial color="#141110" />
        </mesh>
      ))}
      {/* las ancas recogidas */}
      {[0.055, -0.055].map((pz, i) => (
        <mesh key={i} position={[-0.05, 0.035, pz]} scale={[1.4, 0.8, 0.7]}>
          <sphereGeometry args={[0.038, 5, 4]} />
          <meshLambertMaterial color="#d34a1f" />
        </mesh>
      ))}
    </group>
  );
}

/* ── EL QUETZAL FUGAZ — el cometa verde del claro ────────────────────────
   El del referente, pero en vuelo: cada tanto ATRAVIESA el claro a media
   altura — cuerpo esmeralda, pecho rojo, la cola larguísima ondulando
   detrás — y se pierde entre los árboles. Verlo completo dura segundos:
   esa es la gracia. Gama alta. */
function QuetzalFugaz() {
  const grupo = useRef(/** @type {any} */ (null));
  const alas = useRef(/** @type {any[]} */ ([]));
  const cola = useRef(/** @type {any} */ (null));
  const st = useRef({ activo: false, prox: 20, t0: 0, dur: 7, dir: 1 });
  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const s = st.current;
    if (!s.activo) {
      g.visible = false;
      if (t >= s.prox) {
        s.activo = true;
        s.t0 = t;
        s.dir = Math.random() < 0.5 ? -1 : 1;
        s.dur = azar(6, 8);
      }
      return;
    }
    const p = (t - s.t0) / s.dur;
    if (p >= 1) {
      s.activo = false;
      s.prox = t + azar(48, 105);
      g.visible = false;
      return;
    }
    g.visible = true;
    // vuelo ondulante de trogón: sube y cae entre aleteos
    g.position.set(
      (-14 + 28 * p) * s.dir,
      4.7 + Math.sin(p * Math.PI * 5) * 0.4,
      -3.2 + p * 1.2,
    );
    g.rotation.y = s.dir === 1 ? 0 : Math.PI;
    g.rotation.z = Math.cos(p * Math.PI * 5) * 0.18 * s.dir;
    const flap = Math.sin(t * 9) * 0.7;
    if (alas.current[0]) alas.current[0].rotation.x = flap;
    if (alas.current[1]) alas.current[1].rotation.x = -flap;
    if (cola.current) cola.current.rotation.z = 0.25 + Math.sin(t * 3.1) * 0.12;
  });
  return (
    <group ref={grupo} visible={false}>
      {/* El esmeralda es un ACENTO iridiscente legítimo (como el oro aposemático
          o la barba del colibrí), pero el GLOW propio no: ningún animal del
          elenco se autoilumina con emissive plano — la única iridiscencia
          sancionada es la barba del colibrí, dirigida por ángulo (×0.5). El
          cometa lo hacen la MOTION fugaz + la luz dorada de la escena, no un
          neón verde. Antes: emissive="#073d20" en cuerpo y cabeza. */}
      <mesh scale={[1.4, 1, 1]}>
        <sphereGeometry args={[0.1, 7, 6]} />
        <meshLambertMaterial color="#1fa05a" />
      </mesh>
      {/* el pecho rojo */}
      <mesh position={[0.06, -0.06, 0]} scale={[1, 0.9, 0.85]}>
        <sphereGeometry args={[0.07, 6, 5]} />
        <meshLambertMaterial color="#d0342c" />
      </mesh>
      <mesh position={[0.12, 0.06, 0]}>
        <sphereGeometry args={[0.06, 6, 5]} />
        <meshLambertMaterial color="#23b565" />
      </mesh>
      <mesh position={[0.18, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.018, 0.05, 4]} />
        <meshLambertMaterial color="#e8c23a" />
      </mesh>
      {/* LA COLA: la serpentina esmeralda (la firma del quetzal) */}
      <group ref={cola} position={[-0.12, -0.02, 0]}>
        <mesh position={[-0.34, -0.08, 0]} rotation={[0, 0, 0.25]}>
          <planeGeometry args={[0.72, 0.05]} />
          <meshLambertMaterial color="#17864b" side={2} />
        </mesh>
        <mesh position={[-0.3, -0.12, 0.015]} rotation={[0, 0, 0.35]}>
          <planeGeometry args={[0.6, 0.035]} />
          <meshLambertMaterial color="#1fa05a" side={2} />
        </mesh>
      </group>
      {/* las alas */}
      {[1, -1].map((lado, i) => (
        <group
          key={lado}
          scale={[1, 1, lado]}
          ref={(el) => {
            alas.current[i] = el;
          }}
        >
          <mesh position={[0, 0.03, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.14, 0.22]} />
            <meshLambertMaterial color="#136e3d" side={2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── LOS VECINOS DEL PÁRAMO (puesta en escena, patrón VECINOS_VALLE) ──────
   Los SVG rubber-hose de la casa, en SU casa. Ubicaciones contra la cámara
   de reposo ([1.5, 2.3, 12.5] → [0, 3.2, 0]): todas a la vista del primer
   encuadre, ninguna tapando al Ent (el guardián manda; los vecinos
   acompañan desde el frailejonar y el borde del monte). `franjas` = cuándo
   sale (null = siempre). `vida` = su repertorio de gestos (los que el bicho
   YA sabe hacer: props opt-in de su componente) y el compás de su reloj.
   `paseo` = hasta dónde camina y vuelve (movimiento 3D real del billboard,
   con su rumbo y su compás propios — nunca en fila ni al unísono). */
const VECINOS_BOSQUE = [
  {
    slug: 'rana-andina',
    pos: [3.1, 0.32, 3.2],
    px: 24,
    factor: 8,
    franjas: null,
    vida: {
      descanso: [11000, 24000],
      momentos: {
        brinca: { dur: 1700, props: { pose: 'celebra' } },
        reposo: { dur: 4600, props: { pose: 'reposo' } },
      },
    },
  },
  {
    /* EL OSO — el GUARDIÁN NEGRO de la luna (OsoGuardian, la dirección vigente
       del oso de anteojos; el café está archivado y NO vuelve). Vive en el
       borde del arbolado, asomado al claro — nunca al pie del Ent: el guardián
       del bosque manda el centro. Abre paseando (se ve que está VIVO), resopla
       su vaho de páramo, se remece el peso y reposa.

       NOTA de puesta en escena (operador, 2026-07): aquí vivía la danta a
       billboard grande en pleno centro del claro — a ese tamaño su silueta
       parada leía como el oso café archivado flotando frente al Ent. La danta
       sigue en el elenco (vitrina, páramo); esta escena se compone sin ella. */
    slug: 'oso-guardian',
    pos: [-3.6, 0.34, 3.2],
    px: 64,
    factor: 15,
    franjas: null,
    vida: {
      primero: 'pasea',
      descanso: [5000, 11000],
      momentos: {
        pasea: { dur: 9000, props: { pose: 'anda' }, paseo: [1.7, 0, 1.0] },
        resopla: { dur: 4500, props: { resopla: true } },
        seAcomoda: { dur: 5200, props: { rasca: true } },
        reposo: { dur: 4600, props: { pose: 'reposo' } },
      },
    },
  },
  {
    slug: 'jaguar',
    pos: [-6.8, 0.7, -4.8],
    px: 44,
    factor: 15,
    mistico: true,
    franjas: ['amanecer', 'atardecer', 'noche'],
    vida: {
      primero: 'acecha',
      descanso: [14000, 30000],
      momentos: {
        acecha: { dur: 6000, props: { acecha: true } },
        ruge: { dur: 2600, props: { ruge: true } },
      },
    },
  },
];

/* En tier bajo solo queda el oso, quieto (el colibrí va aparte): el slug DEBE
   ser uno del roster de arriba — apuntaba al 'oso-andino' archivado y el tier
   bajo se quedaba sin un solo vecino. */
const VECINOS_TIER_BAJO = new Set(['oso-guardian']);

const ESTILO_CRITTER = {
  filter: 'drop-shadow(0 2px 3px rgba(25, 32, 28, 0.35))',
  pointerEvents: 'none',
};
const ESTILO_MISTICO = {
  ...ESTILO_CRITTER,
  opacity: 0.5,
  filter: 'blur(1.1px) drop-shadow(0 2px 3px rgba(25, 32, 28, 0.3))',
};

/**
 * UN vecino con su idle-cerebro: el reloj elige el momento, el momento se
 * traduce a los props que el bicho YA sabe (resopla/rasca/acecha/olfatea/
 * pose…), y si el momento trae `paseo` el billboard CAMINA en el 3D: sale
 * unos pasos con su bamboleo de pisada, da la vuelta (flip del SVG) y
 * regresa a su puesto. Billboard <Html> aria-hidden, cero toques.
 */
function VecinoVivo({ vec, vivo }) {
  const reg = CREATURES[vec.slug];
  const momento = useRelojDeVida(vec.vida, vivo && !!vec.vida);
  const grupo = useRef(/** @type {any} */ (null));
  const capa = useRef(/** @type {HTMLDivElement|null} */ (null));
  const paseo = useRef(/** @type {{t0: number|null, dur: number, rumbo: number[]}|null} */ (null));

  const momentoCfg = momento && vec.vida ? vec.vida.momentos[momento] : null;
  useEffect(() => {
    paseo.current = momentoCfg?.paseo
      ? { t0: null, dur: momentoCfg.dur / 1000, rumbo: momentoCfg.paseo }
      : null;
  }, [momentoCfg]);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g) return;
    const pw = paseo.current;
    if (pw) {
      const t = clock.getElapsedTime();
      if (pw.t0 == null) pw.t0 = t;
      const p = Math.min(1, (t - pw.t0) / pw.dur);
      const ida = Math.sin(p * Math.PI);
      g.position.set(
        vec.pos[0] + pw.rumbo[0] * ida,
        vec.pos[1] + Math.abs(Math.sin(t * 4.4)) * 0.05,
        vec.pos[2] + pw.rumbo[2] * ida,
      );
      if (capa.current) capa.current.style.transform = p > 0.5 ? 'scaleX(-1)' : '';
    } else if (g.position.x !== vec.pos[0] || g.position.y !== vec.pos[1]) {
      g.position.set(vec.pos[0], vec.pos[1], vec.pos[2]);
      if (capa.current) capa.current.style.transform = '';
    }
  });

  if (!reg?.Component) return null;
  const Bicho = reg.Component;
  return (
    <group ref={grupo} position={/** @type {[number, number, number]} */ (vec.pos)}>
      <Html center distanceFactor={vec.factor} zIndexRange={[6, 0]} pointerEvents="none">
        <div
          ref={capa}
          aria-hidden="true"
          data-vecino={vec.slug}
          data-momento={momento ?? undefined}
          style={vec.mistico ? ESTILO_MISTICO : ESTILO_CRITTER}
        >
          <Bicho size={vec.px} animated={vivo} {...(momentoCfg?.props ?? null)} />
        </div>
      </Html>
    </group>
  );
}

/** Los vecinos del bosque, cada uno con su reloj de vida propio. */
function VecinosDelBosque({ tier, reducedMotion, franja }) {
  const vivo = !reducedMotion && tier !== 'bajo';
  return (
    <group>
      {VECINOS_BOSQUE.map((vec) => {
        if (tier === 'bajo' && !VECINOS_TIER_BAJO.has(vec.slug)) return null;
        if (vec.franjas && franja && !vec.franjas.includes(franja)) return null;
        return <VecinoVivo key={vec.slug} vec={vec} vivo={vivo} />;
      })}
    </group>
  );
}

/* ── EL CÓNDOR — la capa lejana ──────────────────────────────────────────
   Silueta oscura de alas planas en V leve que ORBITA el claro por encima de
   los árboles, dentro de la niebla (el fog lo come y lo devuelve: aparece y
   se pierde solo, sin código extra). Tres mallas, un solo bicho. */
function CondorDeAltura({ reducedMotion }) {
  const ave = useRef(null);
  const alaIzq = useRef(null);
  const alaDer = useRef(null);
  useFrame(({ clock }) => {
    if (!ave.current) return;
    const t = clock.getElapsedTime();
    const a = t * 0.09 + 3.4; // una vuelta cada ~70 s: paciencia de cóndor
    const r = 14 + Math.sin(t * 0.05) * 2;
    ave.current.position.set(Math.cos(a) * r, 11.2 + Math.sin(t * 0.21) * 0.8, Math.sin(a) * r);
    ave.current.rotation.y = -a; // el pico hacia donde vuela (tangente)
    ave.current.rotation.z = 0.14 + Math.sin(t * 0.13) * 0.08; // banqueo suave
    // Casi nunca aletea: dos golpes de ala cada tanto, el resto plancha.
    const rafaga = Math.max(0, Math.sin(t * 0.23) - 0.86) * 7;
    const aleteo = Math.sin(t * 9) * 0.35 * rafaga;
    if (alaIzq.current) alaIzq.current.rotation.z = 0.12 + aleteo;
    if (alaDer.current) alaDer.current.rotation.z = -0.12 - aleteo;
  });
  return (
    <group ref={ave} position={reducedMotion ? [-9, 11, -8] : [14, 11.2, 0]}>
      {/* cuerpo con el collar blanco insinuado */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <coneGeometry args={[0.22, 1.1, 5]} />
        <meshLambertMaterial color="#23262a" />
      </mesh>
      <mesh position={[0, 0.1, 0.32]}>
        <sphereGeometry args={[0.13, 6, 5]} />
        <meshLambertMaterial color="#d8d4c8" />
      </mesh>
      {/* alas planas de puntas digitadas (cajas finas: silueta, no plumaje) */}
      <mesh ref={alaIzq} position={[0, 0.06, 0]}>
        <boxGeometry args={[3.6, 0.045, 0.7]} />
        <meshLambertMaterial color="#1d2023" />
      </mesh>
      <mesh ref={alaDer} position={[0, 0.06, 0]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[3.6, 0.045, 0.7]} />
        <meshLambertMaterial color="#1d2023" />
      </mesh>
    </group>
  );
}

/* ── EL VENADO DE PÁRAMO — el visitante que la niebla trae ───────────────
   Un soche (venado colorado andino) que CRUZA el fondo del claro al trote,
   entra por un costado, se pierde por el otro, y no vuelve en un buen rato.
   El fog hace la mitad del arte: aparece de la nada y en la nada se
   disuelve. Cuerpo en UNA geometría (fusionarSeguro); las patas van aparte
   porque trotan. Primer cruce a los ~6 s: la vida se nota pronto. */
function geomVenadoCuerpo() {
  const cuerpo = new THREE.SphereGeometry(0.42, 8, 6);
  cuerpo.scale(1.5, 0.95, 0.72);
  cuerpo.translate(0, 1.02, 0);
  const cuello = new THREE.CylinderGeometry(0.1, 0.15, 0.62, 6);
  cuello.rotateZ(-0.7);
  cuello.translate(0.62, 1.4, 0);
  const cabeza = new THREE.SphereGeometry(0.15, 7, 6);
  cabeza.scale(1.25, 1, 0.85);
  cabeza.translate(0.85, 1.66, 0);
  const hocico = new THREE.ConeGeometry(0.08, 0.24, 5);
  hocico.rotateZ(-Math.PI / 2);
  hocico.translate(1.06, 1.6, 0);
  const orejaIzq = new THREE.ConeGeometry(0.05, 0.2, 4);
  orejaIzq.rotateZ(0.35);
  orejaIzq.translate(0.76, 1.86, 0.08);
  const orejaDer = orejaIzq.clone();
  orejaDer.translate(0, 0, -0.16);
  const cola = new THREE.SphereGeometry(0.09, 5, 4);
  cola.translate(-0.62, 1.14, 0);
  return fusionarSeguro([cuerpo, cuello, cabeza, hocico, orejaIzq, orejaDer, cola], 'venado-paramo');
}

function VenadoCruzante() {
  const grupo = useRef(/** @type {any} */ (null));
  const patas = useRef(/** @type {any[]} */ ([]));
  const st = useRef({ activo: false, prox: 6, t0: 0, dur: 16, dir: 1 });
  const geoCuerpo = useMemo(() => geomVenadoCuerpo(), []);
  const geoPata = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.045, 0.032, 0.72, 5);
    g.translate(0, -0.36, 0); // pivote en la cadera: la pata COLUMPIA
    return g;
  }, []);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const s = st.current;
    if (!s.activo) {
      g.visible = false;
      if (t >= s.prox) {
        s.activo = true;
        s.t0 = t;
        s.dir = Math.random() < 0.5 ? -1 : 1; // cada cruce por SU lado
        s.dur = azar(14, 18);
      }
      return;
    }
    const p = (t - s.t0) / s.dur;
    if (p >= 1) {
      s.activo = false;
      s.prox = t + azar(38, 80); // no vuelve en un buen rato: verlo es suerte
      g.visible = false;
      return;
    }
    g.visible = true;
    const paso = t * 5.6; // el compás del trote
    g.position.set((-17 + 34 * p) * s.dir, Math.abs(Math.sin(paso)) * 0.07, -9.6);
    g.rotation.y = s.dir === 1 ? 0 : Math.PI;
    for (let i = 0; i < patas.current.length; i++) {
      const pt = patas.current[i];
      if (pt) pt.rotation.z = Math.sin(paso + (i % 2 ? Math.PI : 0)) * 0.5;
    }
  });

  return (
    <group ref={grupo} visible={false}>
      <mesh geometry={geoCuerpo}>
        <meshLambertMaterial color="#6d5138" />
      </mesh>
      {/* las cuatro patas, alternadas al trote (pares diagonales) */}
      {[
        [0.42, 1.0, 0.16],
        [0.42, 1.0, -0.16],
        [-0.42, 1.0, 0.16],
        [-0.42, 1.0, -0.16],
      ].map((pos, i) => (
        <mesh
          key={i}
          geometry={geoPata}
          position={/** @type {[number, number, number]} */ (pos)}
          ref={(el) => {
            patas.current[i] = el;
          }}
        >
          <meshLambertMaterial color="#5d4530" />
        </mesh>
      ))}
    </group>
  );
}

/* ── LA BANDADA — los pájaros que levantan vuelo ─────────────────────────
   Seis siluetas chicas que salen de detrás del arbolado, suben en diagonal
   cruzando el cielo del claro y se pierden. Cada una con su fase de aleteo
   y su puesto en la V desordenada (nada vuela en fila perfecta). */
const AVES_BANDADA = [0, 1, 2, 3, 4, 5].map((i) => ({
  atras: i * 0.55 + (i % 2) * 0.3, // qué tan rezagada va
  lado: (i % 2 ? 1 : -1) * (0.35 + i * 0.22), // su brazo de la V
  alto: (i % 3) * 0.24,
  fase: i * 1.7,
  flap: 5.5 + (i % 3) * 1.1,
}));

function BandadaDeAves() {
  const grupo = useRef(/** @type {any} */ (null));
  const aves = useRef(/** @type {any[]} */ ([]));
  const st = useRef({ activo: false, prox: 14, t0: 0, dur: 11, dir: 1 });

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const s = st.current;
    if (!s.activo) {
      g.visible = false;
      if (t >= s.prox) {
        s.activo = true;
        s.t0 = t;
        s.dir = Math.random() < 0.5 ? -1 : 1;
        s.dur = azar(9.5, 12.5);
      }
      return;
    }
    const p = (t - s.t0) / s.dur;
    if (p >= 1) {
      s.activo = false;
      s.prox = t + azar(42, 90);
      g.visible = false;
      return;
    }
    g.visible = true;
    for (let i = 0; i < aves.current.length; i++) {
      const ave = aves.current[i];
      const a = AVES_BANDADA[i];
      if (!ave || !a) continue;
      // El despegue: arranca bajo tras los árboles y GANA cielo en diagonal.
      const pi = Math.max(0, Math.min(1, p - a.atras * 0.035));
      const x = (-13 + 26 * pi) * s.dir - a.atras * 0.8 * s.dir;
      const y = 2.6 + pi * 5.8 + a.alto + Math.sin(t * 2.1 + a.fase) * 0.18;
      const z = -8.5 + pi * 4.2 + a.lado;
      ave.position.set(x, y, z);
      ave.rotation.y = s.dir === 1 ? 0 : Math.PI;
      // el aleteo, cada una a su compás
      const flap = Math.sin(t * a.flap + a.fase) * 0.75;
      if (ave.children[0]) ave.children[0].rotation.x = flap;
      if (ave.children[1]) ave.children[1].rotation.x = -flap;
    }
  });

  return (
    <group ref={grupo} visible={false}>
      {AVES_BANDADA.map((a, i) => (
        <group
          key={i}
          ref={(el) => {
            aves.current[i] = el;
          }}
        >
          {/* dos alas HORIZONTALES con bisagra en el cuerpo (rotan en x =
              baten de verdad; el plano vive acostado y extendido hacia
              afuera para que el pivote quede en el lomo, como la mariposa) */}
          {[1, -1].map((lado) => (
            <group key={lado} scale={[1, 1, lado]}>
              <mesh position={[0, 0, 0.16]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.16, 0.3]} />
                <meshBasicMaterial color="#2b2f2e" side={2} />
              </mesh>
            </group>
          ))}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.045, 0.22, 4]} />
            <meshBasicMaterial color="#23262a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── LA DANTA DE PÁRAMO procedural — jubilada (FAUNA_PROCEDURAL_JUBILADA)
   El operador quiere la danta pero como SVG de la casa (TODO aparte, no
   existe todavía). Queda el CICLO de asomarse (smoothstep) / olfatear /
   meterse como referencia para cuando llegue su componente. */
function geomDantaCuerpo() {
  const mole = new THREE.SphereGeometry(0.5, 8, 6);
  mole.scale(1.55, 1.0, 0.85);
  mole.translate(0, 0.78, 0);
  const grupa = new THREE.SphereGeometry(0.4, 7, 5);
  grupa.translate(-0.55, 0.82, 0);
  const patas = [];
  for (const [px, pz] of [[0.42, 0.18], [0.42, -0.18], [-0.48, 0.18], [-0.48, -0.18]]) {
    const pata = new THREE.CylinderGeometry(0.09, 0.075, 0.55, 5);
    pata.translate(px, 0.28, pz);
    patas.push(pata);
  }
  return fusionarSeguro([mole, grupa, ...patas], 'danta-paramo');
}

function geomDantaCabeza() {
  const testa = new THREE.SphereGeometry(0.26, 7, 6);
  testa.scale(1.2, 1, 0.85);
  const trompa = new THREE.CylinderGeometry(0.07, 0.1, 0.34, 5);
  trompa.rotateZ(1.9); // la trompita cuelga hacia adelante-abajo
  trompa.translate(0.32, -0.08, 0);
  const orejaIzq = new THREE.SphereGeometry(0.07, 5, 4);
  orejaIzq.translate(-0.08, 0.24, 0.14);
  const orejaDer = orejaIzq.clone();
  orejaDer.translate(0, 0, -0.28);
  return fusionarSeguro([testa, trompa, orejaIzq, orejaDer], 'danta-cabeza');
}

function DantaAsomada() {
  const grupo = useRef(/** @type {any} */ (null));
  const cabeza = useRef(/** @type {any} */ (null));
  const st = useRef({ fase: 'oculta', prox: 24, t0: 0, hasta: 0 });
  const geoCuerpo = useMemo(() => geomDantaCuerpo(), []);
  const geoCabeza = useMemo(() => geomDantaCabeza(), []);
  const GUARIDA = [8.2, 0, -5.2]; // el borde del arbolado, lado derecho
  const ASOMO = 1.5; // cuánto saca el cuerpo hacia el claro

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const s = st.current;
    if (s.fase === 'oculta') {
      g.visible = false;
      if (t >= s.prox) {
        s.fase = 'asoma';
        s.t0 = t;
      }
      return;
    }
    g.visible = true;
    if (s.fase === 'asoma') {
      const p = Math.min(1, (t - s.t0) / 2.2);
      const e = p * p * (3 - 2 * p); // smoothstep: pisa despacio
      g.position.set(GUARIDA[0] - ASOMO * e, 0, GUARIDA[2] + 0.4 * e);
      g.scale.setScalar(0.25 + 0.75 * Math.min(1, p * 2.5)); // sale de la sombra
      if (p >= 1) {
        s.fase = 'olfatea';
        s.t0 = t;
        s.hasta = t + azar(5, 9);
      }
    } else if (s.fase === 'olfatea') {
      // la trompita trabaja: cabeceo curioso, sin moverse del borde
      if (cabeza.current) {
        cabeza.current.rotation.z = Math.sin(t * 1.9) * 0.16;
        cabeza.current.rotation.y = Math.sin(t * 0.7) * 0.35;
      }
      if (t >= s.hasta) {
        s.fase = 'seMete';
        s.t0 = t;
      }
    } else if (s.fase === 'seMete') {
      const p = Math.min(1, (t - s.t0) / 1.8);
      const e = 1 - (1 - p) * (1 - p);
      g.position.set(GUARIDA[0] - ASOMO * (1 - e), 0, GUARIDA[2] + 0.4 * (1 - e));
      g.scale.setScalar(1 - 0.75 * Math.max(0, (p - 0.6) * 2.5));
      if (p >= 1) {
        s.fase = 'oculta';
        s.prox = t + azar(55, 120); // tímida de verdad
      }
    }
  });

  return (
    <group ref={grupo} visible={false} rotation={[0, Math.PI + 0.5, 0]}>
      <mesh geometry={geoCuerpo}>
        <meshLambertMaterial color="#413a32" />
      </mesh>
      <group ref={cabeza} position={[0.78, 0.92, 0]}>
        <mesh geometry={geoCabeza}>
          <meshLambertMaterial color="#4a423a" />
        </mesh>
        {/* los cachetes claros de la danta de páramo */}
        <mesh position={[0.05, -0.06, 0.18]}>
          <sphereGeometry args={[0.08, 5, 4]} />
          <meshLambertMaterial color="#b8aa92" />
        </mesh>
        <mesh position={[0.05, -0.06, -0.18]}>
          <sphereGeometry args={[0.08, 5, 4]} />
          <meshLambertMaterial color="#b8aa92" />
        </mesh>
      </group>
    </group>
  );
}

/* ── EL ESCARABAJO DEL MUSGO — lo que se mueve a los pies ────────────────
   Un cucarrón oscuro que se arrastra por el parche de musgo con andar de
   verdad: avanza, se detiene a pensar sus cosas, sigue. Dos esferas y un
   reloj; la vida chiquita que uno ve solo si mira. Gama alta. */
function EscarabajoDelMusgo() {
  const cuerpo = useRef(/** @type {any} */ (null));
  const CENTRO = [2.0, 0, 3.15];
  const R = 0.55;
  useFrame(({ clock }) => {
    const g = cuerpo.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    // Avanza SOLO cuando su ánimo se lo pide (stop-and-go, nada de órbita
    // de reloj): la integral de un pulso suave hace el camino a tirones.
    const animo = Math.max(0, Math.sin(t * 0.34) + 0.15);
    const ang = t * 0.11 + Math.sin(t * 0.34) * 0.5 * animo;
    g.position.set(CENTRO[0] + Math.cos(ang) * R, 0.045, CENTRO[2] + Math.sin(ang) * R);
    g.rotation.y = -ang; // mira por donde anda
    // el tanteo de las antenas (cabeceo mínimo)
    g.rotation.z = Math.sin(t * 5.2) * 0.05 * animo;
  });
  return (
    <group ref={cuerpo}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.055, 6, 5]} />
        <meshLambertMaterial color="#2c2a20" />
      </mesh>
      <mesh position={[0, 0.01, 0.05]}>
        <sphereGeometry args={[0.032, 5, 4]} />
        <meshLambertMaterial color="#1f1d16" />
      </mesh>
    </group>
  );
}

/* ── LAS LUCIÉRNAGAS — la vida de cuando cae el sol ──────────────────────
   Al atardecer y de noche el sotobosque se enciende: siete motas cálidas
   que derivan despacio y RESPIRAN luz cada una a su compás (pulso propio,
   jamás en coro). De día no existen. */
const LUCIERNAGAS = [
  { ancla: [-2.6, 0.9, 2.2], w: 0.9, fase: 0.0 },
  { ancla: [3.6, 1.2, 1.4], w: 1.3, fase: 1.8 },
  { ancla: [-4.2, 0.7, 3.6], w: 1.1, fase: 3.1 },
  { ancla: [1.2, 1.5, 4.6], w: 0.8, fase: 4.4 },
  { ancla: [-1.4, 1.1, 5.2], w: 1.4, fase: 2.3 },
  { ancla: [4.8, 0.8, 3.0], w: 1.0, fase: 5.2 },
  { ancla: [-5.4, 1.3, 0.8], w: 1.2, fase: 0.9 },
];

function Luciernagas() {
  const motas = useRef(/** @type {any[]} */ ([]));
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (let i = 0; i < LUCIERNAGAS.length; i++) {
      const m = motas.current[i];
      const l = LUCIERNAGAS[i];
      if (!m) continue;
      m.position.set(
        l.ancla[0] + Math.sin(t * 0.31 * l.w + l.fase) * 0.5,
        l.ancla[1] + Math.sin(t * 0.47 * l.w + l.fase * 2) * 0.3,
        l.ancla[2] + Math.cos(t * 0.23 * l.w + l.fase) * 0.5,
      );
      // la respiración de la luz: se apaga DE VERDAD entre pulso y pulso
      const brillo = Math.max(0, Math.sin(t * l.w + l.fase));
      m.material.opacity = 0.1 + brillo * brillo * 0.9;
    }
  });
  return (
    <group>
      {LUCIERNAGAS.map((l, i) => (
        <mesh
          key={i}
          position={/** @type {[number, number, number]} */ (l.ancla)}
          ref={(el) => {
            motas.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.028, 5, 4]} />
          <meshBasicMaterial color="#ffdf8a" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* ── LAS MARIPOSAS — la capa cercana ─────────────────────────────────────
   Revolotean entre los frailejones con rumbo propio (lissajous + fase): nada
   vuela en fila ni bate al unísono. Dos planos por bicha, aleteo de verdad.
   La PRIMERA es la Morpho azul del referente: más grande que todas, la
   protagonista del primer plano. */
const MARIPOSAS = [
  { color: '#2e7ef0', centro: [2.4, 1.75, 4.4], rx: 1.6, rz: 1.2, v: 0.5, fase: 0.0, esc: 1.7 }, // LA MORPHO
  { color: '#b7a4ff', centro: [-2.0, 1.5, 5.2], rx: 1.3, rz: 1.5, v: 0.62, fase: 2.1 },
  { color: '#ffd75e', centro: [4.6, 1.35, 1.8], rx: 1.4, rz: 1.1, v: 0.44, fase: 4.2 },
  { color: '#7fc8ff', centro: [-4.6, 1.8, 1.4], rx: 1.7, rz: 1.3, v: 0.56, fase: 1.3 },
  { color: '#ffd75e', centro: [0.6, 1.6, 6.0], rx: 1.2, rz: 1.6, v: 0.68, fase: 3.3 },
  { color: '#e88fb0', centro: [-3.4, 1.35, 3.4], rx: 1.5, rz: 1.2, v: 0.52, fase: 5.1 }, // la rosada
  { color: '#9fd6a8', centro: [3.8, 1.9, 3.6], rx: 1.3, rz: 1.4, v: 0.47, fase: 0.8 },
  { color: '#4aa3ff', centro: [-0.9, 1.4, 4.2], rx: 1.8, rz: 1.0, v: 0.6, fase: 2.9 },
];

function MariposasDelParamo({ n }) {
  const cuerpos = useRef([]);
  const bichas = useMemo(() => MARIPOSAS.slice(0, n), [n]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (let i = 0; i < cuerpos.current.length; i++) {
      const g = cuerpos.current[i];
      const m = bichas[i];
      if (!g || !m) continue;
      const w = t * m.v + m.fase;
      const x = m.centro[0] + Math.sin(w) * m.rx;
      const z = m.centro[2] + Math.sin(w * 1.31 + 1.2) * m.rz;
      const y = m.centro[1] + Math.sin(w * 2.3) * 0.22 + Math.sin(t * 7 + m.fase) * 0.045;
      // El rumbo sale del propio camino (derivada): la bicha mira a donde va.
      const dx = Math.cos(w) * m.rx * m.v;
      const dz = Math.cos(w * 1.31 + 1.2) * m.rz * m.v * 1.31;
      g.position.set(x, y, z);
      g.rotation.y = Math.atan2(dx, dz);
      // Banqueo: se ladea en las curvas — vista desde arriba deja de ser
      // un papelito plano y se le ve el cuerpo de bicho.
      g.rotation.z = Math.sin(w * 0.9) * 0.35;
      // Aleteo: cada una a su compás (7.5–10 Hz aprox, fase propia). Las alas
      // pasan más tiempo ARRIBA en V (así se leen mariposa, no confeti).
      const flap = Math.sin(t * (7.5 + i * 0.9) + m.fase) * 0.85 + 0.55;
      if (g.children[0]) g.children[0].rotation.z = flap;
      if (g.children[1]) g.children[1].rotation.z = -flap;
    }
  });
  return (
    <group>
      {bichas.map((m, i) => (
        <group
          key={i}
          position={/** @type {[number, number, number]} */ (m.centro)}
          scale={m.esc ?? 1}
          ref={(el) => {
            cuerpos.current[i] = el;
          }}
        >
          {/* Dos alas HORIZONTALES con bisagra en el cuerpo (el grupo rota en
              z = el ala sube y baja de verdad; el plano vive acostado en XZ y
              extendido hacia afuera para que el pivote quede en el lomo). */}
          {[1, -1].map((lado) => (
            <group key={lado} scale={[lado, 1, 1]}>
              <mesh position={[0.11, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.2, 0.13]} />
                <meshBasicMaterial color={m.color} side={2} transparent opacity={0.92} />
              </mesh>
            </group>
          ))}
          {/* el cuerpito: la línea oscura entre las alas */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.016, 0.14, 4]} />
            <meshBasicMaterial color="#3a3428" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── LAS ABEJAS DEL FRAILEJONAR — el zumbido del primer plano ────────────
   Tres puntos ámbar orbitando las flores, cada uno a su velocidad. */
const ABEJAS = [
  { anclaje: [2.9, 1.05, 4.7], r: 0.34, v: 2.6, fase: 0 },
  { anclaje: [3.3, 0.9, 4.3], r: 0.28, v: 3.4, fase: 2.4 },
  { anclaje: [2.5, 0.8, 4.1], r: 0.4, v: 2.1, fase: 4.6 },
];

function AbejasDelFrailejonar() {
  const puntos = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (let i = 0; i < ABEJAS.length; i++) {
      const p = puntos.current[i];
      const b = ABEJAS[i];
      if (!p) continue;
      const w = t * b.v + b.fase;
      p.position.set(
        b.anclaje[0] + Math.cos(w) * b.r,
        b.anclaje[1] + Math.sin(t * 3.1 + b.fase) * 0.09,
        b.anclaje[2] + Math.sin(w) * b.r,
      );
    }
  });
  return (
    <group>
      {ABEJAS.map((b, i) => (
        <mesh
          key={i}
          position={/** @type {[number, number, number]} */ (b.anclaje)}
          ref={(el) => {
            puntos.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.038, 6, 5]} />
          <meshBasicMaterial color="#e8b13a" />
        </mesh>
      ))}
    </group>
  );
}

/**
 * TODA la fauna del Bosque Vivo, gateada por tier y reduced-motion.
 * Montar dentro del <Canvas> del bosque (usa hooks de r3f).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function FaunaBosque({ tier = 'alto', reducedMotion = false }) {
  const { franja } = useCicloDia({ reducedMotion });
  const nMariposas = tier === 'alto' ? 8 : tier === 'medio' ? 4 : 0;
  const conVida = !reducedMotion && tier !== 'bajo'; // lo intermitente ES movimiento
  const anochece = franja === 'atardecer' || franja === 'noche';
  return (
    <group>
      {/* los emblemas rubber-hose en su casa, con idle-cerebro */}
      <VecinosDelBosque tier={tier} reducedMotion={reducedMotion} franja={franja} />
      <ColibriDelFrailejonar tier={tier} reducedMotion={reducedMotion} />
      {tier !== 'bajo' && <CondorDeAltura reducedMotion={reducedMotion} />}
      {/* la fauna procedural emblemática, jubilada: los SVG ganaron */}
      {!FAUNA_PROCEDURAL_JUBILADA && (
        <>
          <OsoDeAnteojos vivo={conVida} />
          <RanaDardo vivo={conVida} />
          {conVida && tier === 'alto' && <DantaAsomada />}
        </>
      )}
      {/* los que van y vienen: el bosque nunca muestra todo lo que tiene */}
      {conVida && <VenadoCruzante />}
      {conVida && <BandadaDeAves />}
      {conVida && tier === 'alto' && <QuetzalFugaz />}
      {conVida && tier === 'alto' && <EscarabajoDelMusgo />}
      {conVida && anochece && <Luciernagas />}
      {!reducedMotion && nMariposas > 0 && <MariposasDelParamo n={nMariposas} />}
      {!reducedMotion && tier === 'alto' && <AbejasDelFrailejonar />}
    </group>
  );
}
