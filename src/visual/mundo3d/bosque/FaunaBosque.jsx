/*
 * FaunaBosque — LA VIDA del Bosque Vivo. Un bosque sin bichos es un decorado.
 *
 * Tres capas de movimiento (el ojo necesita las tres):
 *   · LEJOS  — el CÓNDOR: una silueta oscura que planea en círculos sobre el
 *     filo de la niebla. Casi nunca aletea (los cóndores no aletean: planean).
 *   · MEDIO  — los VECINOS del páramo: los personajes rubber-hose de Chagra en
 *     SU casa — el oso andino al borde del arbolado, el colibrí chivito
 *     zumbando sobre el frailejonar, la rana arlequín en el musgo húmedo, el
 *     borugo crepuscular y el jaguar como aparecido de la niebla. Mismo patrón
 *     billboard del valle (composicionValle3D.VecinosDelValle): registro-driven
 *     contra CREATURES, franja horaria manda quién sale, presencia sin toques.
 *   · CERCA — MARIPOSAS revoloteando entre los frailejones y un puñado de
 *     ABEJAS sobre las flores: el zumbido visual del primer plano.
 *
 * Ritmo, no metrónomo: cada bicho lleva su fase y su velocidad propias (nada
 * parpadea al unísono). La franja del día sale de useCicloDia (?ciclo= para
 * fotografiar una hora exacta). Tier-safe: bajo = solo el oso y el colibrí,
 * quietos; medio = vecinos + cóndor + pocas mariposas; alto = todo.
 *
 * Cero assets, cero texturas: el cóndor, las mariposas y las abejas son
 * geometría mínima (planos y esferas), los vecinos son SVG en <Html>.
 * Importa three/@react-three → montar SOLO dentro del <Canvas> del bosque.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { CREATURES } from '../../creatures/index.js';
import useCicloDia from '../useCicloDia.js';

/* ── LOS VECINOS DEL PÁRAMO (puesta en escena, patrón VECINOS_VALLE) ──────
   Ubicaciones contra la cámara de reposo ([1.5, 2.3, 12.5] → [0, 3.2, 0]):
   todas a la vista del primer encuadre, ninguna tapando al Ent (el guardián
   manda; los vecinos acompañan desde el frailejonar y el borde del monte).
   `franjas` = cuándo sale (null = siempre): el borugo es crepuscular de
   verdad y el jaguar es un aparecido — verlo es un premio, no un mueble. */
const VECINOS_BOSQUE = [
  {
    slug: 'oso-andino',
    pos: [-3.7, 0.85, 3.0], // el borde del arbolado, asomado al claro
    px: 62,
    factor: 17, // el mayor: presencia de verdad, no miniatura
    franjas: null, // el oso ronda a toda hora
  },
  {
    slug: 'colibri',
    pos: [2.9, 1.7, 5.6], // zumbando sobre el frailejonar del frente
    px: 34,
    factor: 10,
    flota: true, // el colibrí no se posa: la percha le sube y baja
    franjas: null,
  },
  {
    slug: 'rana-andina',
    pos: [3.1, 0.32, 3.2], // el musgo húmedo, corrida del panel de la UI
    px: 24,
    factor: 8,
    franjas: null,
  },
  {
    slug: 'borugo',
    pos: [-4.9, 0.5, 4.4], // el matorral bajo, del lado del oso
    px: 36,
    factor: 10,
    franjas: ['atardecer', 'noche', 'amanecer'], // crepuscular real
  },
  {
    slug: 'jaguar',
    pos: [-6.8, 0.7, -4.8], // entre los árboles velados, lejos: el místico
    px: 44,
    factor: 15, // lejos pero con silueta: verlo tiene que sentirse
    mistico: true, // medio borrado por la niebla (opacidad y blur)
    franjas: ['amanecer', 'atardecer', 'noche'], // aparecido, no mueble
  },
];

/* En gama baja solo los dos emblemas, quietos: compañía sin costo. */
const VECINOS_TIER_BAJO = new Set(['oso-andino', 'colibri']);

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
 * Los vecinos del bosque: billboards <Html> aria-hidden, cero toques.
 * Registro-driven: un slug ausente en CREATURES no monta nada.
 */
function VecinosDelBosque({ tier, reducedMotion, franja }) {
  const flotantes = useRef([]);
  useFrame(({ clock }) => {
    // La percha del colibrí respira (el bicho no sabe quedarse quieto).
    const t = clock.getElapsedTime();
    for (const f of flotantes.current) {
      if (f) f.position.y = f.userData.y0 + Math.sin(t * 1.7 + f.userData.fase) * 0.16;
    }
  });
  let iFlota = 0;
  return (
    <group>
      {VECINOS_BOSQUE.map((vec) => {
        const reg = CREATURES[vec.slug];
        if (!reg?.Component) return null;
        if (tier === 'bajo' && !VECINOS_TIER_BAJO.has(vec.slug)) return null;
        // La franja decide quién está afuera (null = vive a toda hora).
        if (vec.franjas && franja && !vec.franjas.includes(franja)) return null;
        const Bicho = reg.Component;
        const flota = vec.flota && !reducedMotion;
        const idx = flota ? iFlota++ : -1;
        return (
          <group
            key={vec.slug}
            position={/** @type {[number, number, number]} */ (vec.pos)}
            ref={
              flota
                ? (el) => {
                    if (el) {
                      el.userData.y0 = vec.pos[1];
                      el.userData.fase = idx * 2.1;
                      flotantes.current[idx] = el;
                    }
                  }
                : undefined
            }
          >
            <Html center distanceFactor={vec.factor} zIndexRange={[6, 0]} pointerEvents="none">
              <div
                aria-hidden="true"
                data-vecino={vec.slug}
                style={vec.mistico ? ESTILO_MISTICO : ESTILO_CRITTER}
              >
                <Bicho size={vec.px} animated={!reducedMotion && tier !== 'bajo'} />
              </div>
            </Html>
          </group>
        );
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

/* ── LAS MARIPOSAS — la capa cercana ─────────────────────────────────────
   Revolotean entre los frailejones con rumbo propio (lissajous + fase): nada
   vuela en fila ni bate al unísono. Dos planos por bicha, aleteo de verdad. */
const MARIPOSAS = [
  { color: '#4aa3ff', centro: [2.4, 1.75, 4.4], rx: 1.6, rz: 1.2, v: 0.5, fase: 0.0 }, // la azul
  { color: '#b7a4ff', centro: [-2.0, 1.5, 5.2], rx: 1.3, rz: 1.5, v: 0.62, fase: 2.1 },
  { color: '#ffd75e', centro: [4.6, 1.35, 1.8], rx: 1.4, rz: 1.1, v: 0.44, fase: 4.2 },
  { color: '#7fc8ff', centro: [-4.6, 1.8, 1.4], rx: 1.7, rz: 1.3, v: 0.56, fase: 1.3 },
  { color: '#ffd75e', centro: [0.6, 1.6, 6.0], rx: 1.2, rz: 1.6, v: 0.68, fase: 3.3 },
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
  const nMariposas = tier === 'alto' ? 5 : tier === 'medio' ? 3 : 0;
  return (
    <group>
      <VecinosDelBosque tier={tier} reducedMotion={reducedMotion} franja={franja} />
      {tier !== 'bajo' && <CondorDeAltura reducedMotion={reducedMotion} />}
      {!reducedMotion && nMariposas > 0 && <MariposasDelParamo n={nMariposas} />}
      {!reducedMotion && tier === 'alto' && <AbejasDelFrailejonar />}
    </group>
  );
}
