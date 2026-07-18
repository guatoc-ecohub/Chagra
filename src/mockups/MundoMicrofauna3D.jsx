/*
 * MundoMicrofauna3D — el MUNDO TOCABLE de la micro-fauna del suelo: una vitrina
 * inmersiva, como mirar por un microscopio la película de agua de un suelo sano.
 * El usuario EXPLORA con el dedo la vida diminuta que sostiene la huerta: toca un
 * ser vivo —el colémbolo, el ácaro, la lombriz, el nematodo, el tardígrado, el
 * protozoo, la red de micorrizas o las bacterias— y la cámara SE ACERCA y le
 * cuenta su oficio: descomponer, airear, nutrir, cazar plagas, el "internet del
 * bosque". Hacer visible lo invisible del suelo vivo.
 *
 * ESTA ESCENA ES AUTOCONTENIDA: dibuja su propio corte de suelo y TODA su fauna
 * como geometría nueva (rubber-hose andino: cuerpos redondos, ojos grandes,
 * squash & stretch, translúcidos como se ven al microscopio). No depende de otros
 * mundos ni edita nada del framework: `atmosferaMadre`, `deviceTier` y
 * `ParticulasAmbientales` se consumen tal cual. La ruta la cablea Opus en App.jsx.
 *
 * El elenco, a su PROFUNDIDAD real: colémbolo y ácaro en la hojarasca; lombriz,
 * nematodo, tardígrado y protozoo en la tierra negra y su película de agua;
 * micorrizas y bacterias en el subsuelo, entre las raíces. Seis eran los
 * "personajes" curados; ahora son ocho: el TARDÍGRADO (oso de agua) y el PROTOZOO
 * (paramecio) completan la vida microscópica que casi nadie llega a ver.
 *
 * FRUGAL POR CONTRATO (DR §6, igual que el resto del framework): SOLO
 * `meshLambert`/`meshBasic`, sin sombras; los cuerpos son esferas y cilindros
 * simples; las bacterias van INSTANCIADAS (un draw call). Todo se degrada por
 * `tier` y con `reducedMotion` NO corre animación: el frameloop pasa a demanda, la
 * escena queda en una pose quieta agradable y la cámara SALTA al foco (sin viaje)
 * para respetar la preferencia de calma. PRNG determinista (mismo corte siempre).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, AdaptiveDpr } from '@react-three/drei';
import { ATMOSFERA } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';

/* ── Paleta local del microcosmos (cálida andina + translúcidos de microscopio) */
const PAL = {
  litter: '#7d8a3e', // hojarasca verde
  litterAlt: '#96a44e', // hojarasca al sol
  humus: '#3c2a1b', // la tierra negra, viva
  humusAlt: '#4a3625',
  mineral: '#7c5836', // subsuelo mineral, ocre
  mineralAlt: '#8f6a44',
  raiz: '#c9a86a', // raíces claras
  piedra: '#9a8b74',
  agua: '#bfe0e6', // la película de agua donde nada la micro-vida
  colembolo: '#b7a9ef', // lavanda del colémbolo
  colemboloVientre: '#efeaff',
  acaro: '#d76a52', // rojo-teja del ácaro
  acaroPata: '#3a2418',
  lombriz: '#e8a58f', // rosa de la lombriz
  lombrizAnillo: '#f3cdbf', // el clitelo (la banda clara)
  nematodo: '#cfeee0', // verde-agua translúcido
  tardigrado: '#bcd3a3', // musgo-ámbar translúcido del oso de agua
  tardigradoGarra: '#8a7a4a',
  protozoo: '#c7e6ec', // celeste translúcido del paramecio
  protozooCilio: '#eaf7fa',
  vacuola: '#e79a6a', // la vacuola alimenticia (un punto cálido dentro)
  hifa: '#f2ece0', // hifas de micorriza
  hifaOro: '#ffd27a', // el pulso dorado de la red
  nodo: '#ffe6a8',
  hongo: '#e7c9a0', // sombrerito de hongo
  ojoBlanco: '#fbf6ec',
  ojoPupila: '#241a12',
};

/* PRNG determinista (mismo corte siempre, sin azar por frame). */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* Presupuesto de vida por tier (equipo humilde → menos partículas y menos cilios). */
const PRESUPUESTO = {
  alto: { bacterias: 130, cilios: 26, hifaDirs: 3, hifaProf: 3, polvo: 1 },
  medio: { bacterias: 80, cilios: 18, hifaDirs: 2, hifaProf: 3, polvo: 1 },
  bajo: { bacterias: 34, cilios: 12, hifaDirs: 1, hifaProf: 2, polvo: 0 },
};
const presupuesto = (tier) => PRESUPUESTO[tier] || PRESUPUESTO.alto;

/* ── EL ELENCO DEL SUELO ──────────────────────────────────────────────────────
 * Cada ser vivo con su ancla (dónde vive en el corte), su color de halo y la
 * copia educativa en "usted" cordial colombiano. Datos de módulo (no se exportan)
 * para que el archivo solo exporte el componente (react-refresh). */
const ORGANISMOS = [
  {
    id: 'colembolo',
    emoji: '✨',
    nombre: 'Colémbolo',
    oficio: 'El saltarín que recicla',
    texto:
      'Diminuto y saltarín: bajo la panza guarda un resorte con el que brinca lejos del peligro. Mastica hongos y hojarasca en pedacitos cada vez más pequeños y así apura la descomposición, para que otros terminen de convertirla en tierra buena.',
    anchor: [-1.7, 0.92, 1.16],
    color: '#b7a9ef',
    fase: 0.0,
    halo: 0.22,
    hit: 0.4,
    pinY: 0.46,
  },
  {
    id: 'tardigrado',
    emoji: '🐻',
    nombre: 'Tardígrado',
    oficio: 'El oso de agua indestructible',
    texto:
      'Gordito y lento, camina con ocho paticas de peluche por la película de agua que envuelve al suelo. Es el ser más resistente que se conoce: si el suelo se seca, se encoge y se duerme (criptobiosis) y así aguanta años, hasta el frío y el vacío. Come jugos de musgos y de otras diminutas criaturas.',
    anchor: [-0.05, 0.98, 1.18],
    color: '#bcd3a3',
    fase: 0.5,
    halo: 0.26,
    hit: 0.46,
    pinY: 0.48,
  },
  {
    id: 'acaro',
    emoji: '🕷️',
    nombre: 'Ácaro del suelo',
    oficio: 'El vigilante de ocho patas',
    texto:
      'Con sus ocho paticas recorre la hojarasca cazando y desmenuzando. Controla las plaguitas pequeñas y reparte la materia orgánica por todo el suelo. Casi nadie lo ve, pero es un guardián que trabaja sin descanso.',
    anchor: [-1.05, 0.55, 1.2],
    color: '#d76a52',
    fase: 0.9,
    halo: 0.24,
    hit: 0.42,
    pinY: 0.42,
  },
  {
    id: 'nematodo',
    emoji: '〰️',
    nombre: 'Nematodo benéfico',
    oficio: 'El aliado casi invisible',
    texto:
      'Un gusanito transparente, más fino que un pelo. Los buenos se comen bacterias y hongos y, al hacerlo, liberan nutrientes para las raíces; otros persiguen larvas de plagas bajo tierra. Tan pequeño que no se ve, y tan útil para la huerta.',
    anchor: [1.55, 0.6, 1.14],
    color: '#bfe6d8',
    fase: 2.4,
    halo: 0.26,
    hit: 0.46,
    pinY: 0.44,
  },
  {
    id: 'lombriz',
    emoji: '🪱',
    nombre: 'Lombriz de tierra',
    oficio: 'La ingeniera del suelo',
    texto:
      'Se come la tierra y las hojas viejas y las devuelve convertidas en abono negro y fértil. Al abrir sus túneles deja entrar el aire y el agua: cada lombriz es un arado vivo que nunca descansa. Donde hay lombrices, el suelo está sano.',
    anchor: [0.5, 0.16, 1.24],
    color: '#e8a58f',
    fase: 1.7,
    halo: 0.34,
    hit: 0.55,
    pinY: 0.5,
  },
  {
    id: 'protozoo',
    emoji: '💧',
    nombre: 'Protozoo',
    oficio: 'El nadador de la gota',
    texto:
      'Una sola célula que nada en la película de agua remando con miles de pelitos (cilios). Se traga bacterias por montones y, al hacerlo, suelta nutrientes que la raíz aprovecha al instante. Donde el suelo está húmedo y vivo, hay un mundo entero de protozoos girando en cada gota.',
    anchor: [1.3, -0.12, 1.12],
    color: '#c7e6ec',
    fase: 3.4,
    halo: 0.28,
    hit: 0.48,
    pinY: 0.44,
  },
  {
    id: 'micorrizas',
    emoji: '🍄',
    nombre: 'Micorrizas',
    oficio: 'El internet del bosque',
    texto:
      'Son hilos de hongo (hifas) que se enredan con las raíces y se extienden como una red dorada bajo tierra. Le llevan agua y minerales a la planta y, a cambio, reciben su azúcar. Por esta red las plantas hasta se avisan y se comparten alimento entre vecinas.',
    anchor: [-1.05, -0.5, 0.72],
    color: '#ffd27a',
    fase: 3.1,
    halo: 0.4,
    hit: 0.62,
    pinY: 0.42,
  },
  {
    id: 'bacterias',
    emoji: '🦠',
    nombre: 'Bacterias',
    oficio: 'Las cocineras invisibles',
    texto:
      'Son tan pequeñas que millones caben en una cucharada de tierra. Transforman la materia muerta en alimento que la planta sí puede comer, y algunas capturan el nitrógeno del aire para abonar el suelo. Sin ellas, nada volvería a nacer.',
    anchor: [0.35, -0.55, 0.8],
    color: '#ffdf9a',
    fase: 3.8,
    halo: 0.36,
    hit: 0.55,
    pinY: 0.4,
  },
];

/* La vista general y el encuadre de cada ser vivo. */
const VISTA_GENERAL = { pos: /** @type {[number, number, number]} */ ([3.7, 2.5, 5.7]), target: [0, 0.1, 0.5] };
function vistaDe(org) {
  if (!org) return VISTA_GENERAL;
  const [x, y, z] = org.anchor;
  return { pos: [x * 0.45 + 1.3, y + 1.05, z + 2.35], target: [x, y + 0.02, z] };
}

/* ── Ojo rubber-hose (blanco grande + pupila oscura). NO recursivo. ─────────── */
function Ojo({ pos = [0, 0, 0], r = 0.04 }) {
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[r, 10, 8]} />
        <meshBasicMaterial color={PAL.ojoBlanco} />
      </mesh>
      <mesh position={[0, 0, r * 0.72]}>
        <sphereGeometry args={[r * 0.46, 8, 6]} />
        <meshBasicMaterial color={PAL.ojoPupila} />
      </mesh>
    </group>
  );
}

/* ── EL CORTE DE SUELO (fondo): hojarasca verde arriba, tierra negra, subsuelo
      ocre; raíces que bajan, piedritas y hojas caídas. Redondeado, low-poly. ── */
function CorteSuelo() {
  const ANCHO = 4.6;
  const PROF = 2.0;
  const capas = [
    { y: 0.86, h: 0.28, c: PAL.litter, cAlt: PAL.litterAlt }, // hojarasca
    { y: 0.3, h: 0.9, c: PAL.humus, cAlt: PAL.humusAlt }, // tierra negra
    { y: -0.7, h: 1.1, c: PAL.mineral, cAlt: PAL.mineralAlt }, // subsuelo mineral
  ];
  const piedras = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 7 }, () => ({
      p: [(r() - 0.5) * (ANCHO - 0.8), -0.4 - r() * 1.0, 0.9 + r() * 0.14],
      s: 0.08 + r() * 0.1,
      rot: [r() * 3, r() * 3, r() * 3],
    }));
  }, []);
  const hojas = useMemo(() => {
    const r = rng(213);
    return Array.from({ length: 9 }, (_, i) => ({
      p: [(r() - 0.5) * (ANCHO - 0.5), 1.0 + r() * 0.03, 0.5 - r() * 1.2],
      rot: r() * 3.14,
      s: 0.13 + r() * 0.08,
      c: i % 2 ? PAL.litter : '#9a8a3a',
    }));
  }, []);
  const raices = useMemo(() => {
    const r = rng(41);
    return Array.from({ length: 4 }, (_, i) => ({
      x: -1.4 + i * 0.95 + (r() - 0.5) * 0.3,
      largo: 1.1 + r() * 0.9,
      tilt: (r() - 0.5) * 0.5,
    }));
  }, []);
  return (
    <group position={[0, 0.1, 0]}>
      {/* las capas del corte (la cara frontal es lo que se lee) */}
      {capas.map((cp, i) => (
        <group key={i}>
          <mesh position={[0, cp.y, -PROF / 2 + 0.05]}>
            <boxGeometry args={[ANCHO, cp.h, PROF]} />
            <meshLambertMaterial color={cp.c} flatShading />
          </mesh>
          {/* franja frontal con tono al sol, para dar relieve al corte */}
          <mesh position={[0, cp.y, 0.52]}>
            <boxGeometry args={[ANCHO, cp.h * 0.96, 0.08]} />
            <meshLambertMaterial color={cp.cAlt} flatShading />
          </mesh>
        </group>
      ))}
      {/* raíces que bajan desde la hojarasca */}
      {raices.map((rz, i) => (
        <mesh key={`r-${i}`} position={[rz.x, 0.4, 0.5]} rotation={[0, 0, rz.tilt]}>
          <cylinderGeometry args={[0.02, 0.06, rz.largo, 6]} />
          <meshLambertMaterial color={PAL.raiz} flatShading />
        </mesh>
      ))}
      {/* piedritas del subsuelo */}
      {piedras.map((pz, i) => (
        <mesh key={`p-${i}`} position={pz.p} rotation={pz.rot} scale={pz.s}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color={PAL.piedra} flatShading />
        </mesh>
      ))}
      {/* hojas caídas sobre la superficie */}
      {hojas.map((hz, i) => (
        <mesh key={`h-${i}`} position={hz.p} rotation={[-Math.PI / 2 + 0.1, 0, hz.rot]} scale={hz.s}>
          <circleGeometry args={[1, 5]} />
          <meshLambertMaterial color={hz.c} flatShading side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* ── PELÍCULA DE AGUA: lentes translúcidas donde nada la micro-vida (el brillo
      del suelo húmedo y sano, la "gota" del microscopio). ──────────────────── */
function PeliculaAgua({ reducedMotion }) {
  const refs = useRef([]);
  const lentes = useMemo(
    () => [
      { p: [0.2, 0.2, 1.02], s: [1.9, 1.0, 1], fase: 0 },
      { p: [1.2, -0.1, 0.98], s: [1.0, 0.7, 1], fase: 1.4 },
      { p: [-0.9, 0.5, 1.0], s: [0.9, 0.6, 1], fase: 2.7 },
    ],
    [],
  );
  useFrame((st) => {
    if (reducedMotion) return;
    const t = st.clock.elapsedTime;
    for (let i = 0; i < refs.current.length; i++) {
      const m = refs.current[i];
      if (m) m.material.opacity = 0.1 + 0.05 * Math.sin(t * 0.8 + lentes[i].fase);
    }
  });
  return (
    <group>
      {lentes.map((l, i) => (
        <mesh key={i} position={l.p} scale={l.s} ref={(el) => { refs.current[i] = el; }}>
          <circleGeometry args={[0.5, 24]} />
          <meshBasicMaterial
            color={PAL.agua}
            transparent
            opacity={0.12}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── COLÉMBOLO: cuerpo ovalado lavanda, ojos grandes, antenas, furca (resorte).
      Da brinquitos suaves (con reducedMotion queda posado). ─────────────────── */
function Colembolo({ base, reducedMotion }) {
  const cuerpo = useRef(null);
  useFrame((st) => {
    if (reducedMotion || !cuerpo.current) return;
    const t = st.clock.elapsedTime * 1.4;
    const salto = Math.max(0, Math.sin(t)) ** 4; // brinco esporádico
    cuerpo.current.position.y = base[1] + salto * 0.18;
    cuerpo.current.rotation.z = Math.sin(t * 0.7) * 0.08;
  });
  return (
    <group ref={cuerpo} position={base}>
      {/* cuerpo */}
      <mesh scale={[1.25, 0.9, 1]}>
        <sphereGeometry args={[0.13, 14, 12]} />
        <meshLambertMaterial color={PAL.colembolo} flatShading />
      </mesh>
      {/* vientre claro */}
      <mesh position={[0, -0.04, 0.08]} scale={[0.9, 0.6, 0.7]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshLambertMaterial color={PAL.colemboloVientre} flatShading />
      </mesh>
      <Ojo pos={[0.06, 0.05, 0.12]} r={0.045} />
      <Ojo pos={[-0.06, 0.05, 0.12]} r={0.045} />
      {/* antenas */}
      {[0.06, -0.06].map((sx, i) => (
        <mesh key={i} position={[sx, 0.14, 0.06]} rotation={[0.4, 0, sx > 0 ? 0.5 : -0.5]}>
          <cylinderGeometry args={[0.007, 0.007, 0.16, 4]} />
          <meshBasicMaterial color={PAL.colemboloVientre} />
        </mesh>
      ))}
      {/* furca: el resorte bajo el abdomen */}
      <mesh position={[0, -0.08, -0.1]} rotation={[0.7, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.012, 0.18, 5]} />
        <meshBasicMaterial color={PAL.colembolo} />
      </mesh>
    </group>
  );
}

/* ── ÁCARO: cuerpo redondo teja + 8 patas + ojos. Camina lento, patas ondulan. */
function Acaro({ base, reducedMotion }) {
  const cuerpo = useRef(null);
  const patas = useRef([]);
  const patasDef = useMemo(
    () => Array.from({ length: 8 }, (_, i) => ({ lado: i < 4 ? 1 : -1, ang: ((i % 4) - 1.5) * 0.5 })),
    [],
  );
  useFrame((st) => {
    if (reducedMotion || !cuerpo.current) return;
    const a = st.clock.elapsedTime * 0.4;
    cuerpo.current.position.x = base[0] + Math.cos(a) * 0.22;
    cuerpo.current.position.y = base[1] + Math.abs(Math.sin(a * 3)) * 0.015;
    cuerpo.current.rotation.y = Math.sin(a) * 0.5;
    for (let i = 0; i < patas.current.length; i++) {
      const p = patas.current[i];
      if (p) p.rotation.x = Math.sin(st.clock.elapsedTime * 7 + i * 1.1) * 0.3;
    }
  });
  return (
    <group ref={cuerpo} position={base}>
      <mesh>
        <sphereGeometry args={[0.13, 14, 12]} />
        <meshLambertMaterial color={PAL.acaro} flatShading />
      </mesh>
      <mesh position={[0, 0.02, 0.1]} scale={[0.7, 0.6, 0.7]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshLambertMaterial color="#a3402d" flatShading />
      </mesh>
      <Ojo pos={[0.045, 0.06, 0.12]} r={0.028} />
      <Ojo pos={[-0.045, 0.06, 0.12]} r={0.028} />
      {patasDef.map((pt, i) => (
        <group key={i} position={[0.1 * pt.lado, -0.02, 0.02 * (i % 4 - 1.5)]} rotation={[0, 0, pt.ang * pt.lado]}>
          <group ref={(el) => { patas.current[i] = el; }}>
            <mesh position={[0.1 * pt.lado, -0.02, 0]} rotation={[0, 0, pt.lado * 0.6]}>
              <cylinderGeometry args={[0.009, 0.006, 0.2, 4]} />
              <meshBasicMaterial color={PAL.acaroPata} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ── LOMBRIZ: cadena de esferas rosa en curva suave, con clitelo (banda clara) y
      onda peristáltica; carita amable en la cabeza. ─────────────────────────── */
function Lombriz({ base, reducedMotion }) {
  const segs = useRef([]);
  const puntos = useMemo(() => {
    const n = 11;
    return Array.from({ length: n }, (_, i) => {
      const u = i / (n - 1);
      return {
        x: -0.5 + u * 1.0,
        y: Math.sin(u * Math.PI * 1.3) * 0.14,
        r: 0.075 * (0.5 + Math.sin(u * Math.PI) * 0.7),
        clitelo: u > 0.32 && u < 0.46,
      };
    });
  }, []);
  useFrame((st) => {
    if (reducedMotion) return;
    const t = st.clock.elapsedTime * 2.2;
    for (let i = 0; i < segs.current.length; i++) {
      const g = segs.current[i];
      if (!g) continue;
      const w = 1 + Math.sin(t - i * 0.5) * 0.14; // onda peristáltica
      g.scale.set(w, 2 - w, 2 - w);
      g.position.y = puntos[i].y + Math.sin(t * 0.5 - i * 0.4) * 0.02;
    }
  });
  return (
    <group position={base} rotation={[0, 0.2, 0]}>
      {puntos.map((p, i) => (
        <group key={i} ref={(el) => { segs.current[i] = el; }} position={[p.x, p.y, 0]}>
          <mesh>
            <sphereGeometry args={[p.r, 10, 8]} />
            <meshLambertMaterial color={p.clitelo ? PAL.lombrizAnillo : PAL.lombriz} flatShading />
          </mesh>
          {i === 0 && (
            <>
              <Ojo pos={[0.03, 0.03, p.r * 0.85]} r={0.022} />
              <Ojo pos={[-0.03, 0.03, p.r * 0.85]} r={0.022} />
            </>
          )}
        </group>
      ))}
    </group>
  );
}

/* ── NEMATODO benéfico: gusanito translúcido, cadena de esferas que ondula como
      nadando en la película de agua; ojos grandes. ─────────────────────────── */
function Nematodo({ base, reducedMotion }) {
  const segs = useRef([]);
  const puntos = useMemo(() => {
    const n = 9;
    return Array.from({ length: n }, (_, i) => {
      const u = i / (n - 1);
      return { x: -0.34 + u * 0.68, y: Math.sin(u * Math.PI * 1.6) * 0.08, r: 0.03 + 0.018 * Math.sin(u * Math.PI) + (i === 0 ? 0.012 : 0) };
    });
  }, []);
  useFrame((st) => {
    if (reducedMotion) return;
    const t = st.clock.elapsedTime * 3.0;
    for (let i = 0; i < segs.current.length; i++) {
      const g = segs.current[i];
      if (!g) continue;
      g.position.y = puntos[i].y + Math.sin(t - i * 0.6) * 0.03;
      g.position.z = Math.cos(t - i * 0.6) * 0.02;
    }
  });
  return (
    <group position={base} rotation={[0, -0.5, 0]}>
      {puntos.map((p, i) => (
        <group key={i} ref={(el) => { segs.current[i] = el; }} position={[p.x, p.y, 0]}>
          <mesh>
            <sphereGeometry args={[p.r, 8, 8]} />
            <meshLambertMaterial color={PAL.nematodo} transparent opacity={0.74} flatShading />
          </mesh>
          {i === 0 && (
            <>
              <Ojo pos={[0.02, 0.03, p.r * 0.7]} r={0.014} />
              <Ojo pos={[-0.03, 0.03, p.r * 0.66]} r={0.014} />
            </>
          )}
        </group>
      ))}
    </group>
  );
}

/* ── TARDÍGRADO (oso de agua): barril translúcido de segmentos, 4 pares de patas
      rechonchas con garritas, cabeza con hocico tubular y ojitos. Camina lento y
      cabecea (con reducedMotion queda posado). El personaje adorable. ───────── */
function Tardigrado({ base, reducedMotion }) {
  const cuerpo = useRef(null);
  const patas = useRef([]);
  const segmentos = useMemo(
    () => [
      { x: -0.2, r: 0.1 }, // cabeza
      { x: -0.06, r: 0.14 },
      { x: 0.1, r: 0.15 },
      { x: 0.26, r: 0.14 },
      { x: 0.4, r: 0.11 }, // cola
    ],
    [],
  );
  // 4 pares de patas, a lo largo del cuerpo (x), a cada lado (z ±)
  const patasDef = useMemo(() => {
    const xs = [-0.05, 0.08, 0.21, 0.34];
    const out = [];
    xs.forEach((x, i) => { out.push({ x, lado: 1, i }); out.push({ x, lado: -1, i }); });
    return out;
  }, []);
  useFrame((st) => {
    if (reducedMotion || !cuerpo.current) return;
    const t = st.clock.elapsedTime;
    cuerpo.current.position.y = base[1] + Math.sin(t * 1.6) * 0.02;
    cuerpo.current.rotation.z = Math.sin(t * 0.8) * 0.05;
    for (let i = 0; i < patas.current.length; i++) {
      const p = patas.current[i];
      if (p) p.rotation.z = Math.sin(t * 3 - patasDef[i].i * 0.9) * 0.4;
    }
  });
  return (
    <group ref={cuerpo} position={base} rotation={[0, -0.35, 0]}>
      {/* cuerpo segmentado, translúcido */}
      {segmentos.map((s, i) => (
        <mesh key={i} position={[s.x, 0, 0]}>
          <sphereGeometry args={[s.r, 12, 10]} />
          <meshLambertMaterial color={PAL.tardigrado} transparent opacity={0.82} flatShading />
        </mesh>
      ))}
      {/* hocico tubular (la boca succionadora) */}
      <mesh position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.05, 0.08, 8]} />
        <meshLambertMaterial color={PAL.tardigrado} transparent opacity={0.85} flatShading />
      </mesh>
      {/* ojitos de puntito */}
      <mesh position={[-0.2, 0.06, 0.07]}>
        <sphereGeometry args={[0.018, 8, 6]} />
        <meshBasicMaterial color={PAL.ojoPupila} />
      </mesh>
      <mesh position={[-0.2, 0.06, -0.07]}>
        <sphereGeometry args={[0.018, 8, 6]} />
        <meshBasicMaterial color={PAL.ojoPupila} />
      </mesh>
      {/* 8 patas rechonchas con garritas */}
      {patasDef.map((pt, i) => (
        <group key={i} position={[pt.x, -0.08, pt.lado * 0.1]}>
          <group ref={(el) => { patas.current[i] = el; }}>
            <mesh position={[0, -0.05, 0]}>
              <cylinderGeometry args={[0.035, 0.028, 0.11, 7]} />
              <meshLambertMaterial color={PAL.tardigrado} transparent opacity={0.85} flatShading />
            </mesh>
            {/* garritas */}
            {[-0.012, 0.012].map((gz, k) => (
              <mesh key={k} position={[0, -0.11, gz]} rotation={[0, 0, 0.2]}>
                <coneGeometry args={[0.008, 0.03, 5]} />
                <meshBasicMaterial color={PAL.tardigradoGarra} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

/* ── PROTOZOO (paramecio): zapatilla translúcida con una franja de cilios que
      baten, una vacuola alimenticia dentro y una contráctil; nada y gira. ───── */
function Protozoo({ base, nCilios, reducedMotion }) {
  const cuerpo = useRef(null);
  const cilios = useRef([]);
  const ciliosDef = useMemo(() => {
    const r = rng(53);
    return Array.from({ length: nCilios }, (_, i) => {
      const u = i / nCilios;
      const ang = u * Math.PI * 2;
      // en la silueta de la zapatilla (elipse achatada)
      return {
        x: Math.cos(ang) * 0.26,
        y: Math.sin(ang) * 0.14,
        rotZ: ang - Math.PI / 2,
        fase: r() * 6.28,
      };
    });
  }, [nCilios]);
  const vacuola = useRef(null);
  useFrame((st) => {
    if (reducedMotion) return;
    const t = st.clock.elapsedTime;
    if (cuerpo.current) {
      cuerpo.current.position.x = base[0] + Math.sin(t * 0.5) * 0.14;
      cuerpo.current.position.y = base[1] + Math.cos(t * 0.4) * 0.08;
      cuerpo.current.rotation.z = t * 0.5;
    }
    for (let i = 0; i < cilios.current.length; i++) {
      const c = cilios.current[i];
      if (c) c.rotation.z = ciliosDef[i].rotZ + Math.sin(t * 9 + ciliosDef[i].fase) * 0.5;
    }
    if (vacuola.current) vacuola.current.scale.setScalar(0.8 + 0.25 * Math.sin(t * 2));
  });
  return (
    <group ref={cuerpo} position={base}>
      {/* el cuerpo: elipsoide achatado translúcido (la zapatilla) */}
      <mesh scale={[1.5, 0.85, 0.7]}>
        <sphereGeometry args={[0.19, 16, 12]} />
        <meshLambertMaterial color={PAL.protozoo} transparent opacity={0.5} flatShading />
      </mesh>
      {/* macronúcleo tenue */}
      <mesh position={[-0.05, 0, 0]} scale={[1.1, 0.8, 0.8]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshLambertMaterial color="#a9d4dc" transparent opacity={0.55} flatShading />
      </mesh>
      {/* vacuola alimenticia (un punto cálido que late) */}
      <mesh position={[0.12, 0.02, 0.04]} ref={vacuola}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshBasicMaterial color={PAL.vacuola} toneMapped={false} />
      </mesh>
      {/* los cilios que baten alrededor */}
      {ciliosDef.map((c, i) => (
        <group key={i} position={[c.x, c.y, 0]} ref={(el) => { cilios.current[i] = el; }} rotation={[0, 0, c.rotZ]}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.004, 0.002, 0.1, 4]} />
            <meshBasicMaterial color={PAL.protozooCilio} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── MICORRIZAS: red de hifas (el "internet del bosque") con pulso dorado, nodos
      titilantes y un par de sombreritos de hongo asomando. ─────────────────── */
function generarHifas(seed, dirsN, maxDepth) {
  const r = rng(seed);
  const up = new THREE.Vector3(0, 1, 0);
  const segs = [];
  const nodos = [];
  function ramificar(origen, dir, largo, depth) {
    const d = dir.clone().normalize();
    const fin = origen.clone().addScaledVector(d, largo);
    const q = new THREE.Quaternion().setFromUnitVectors(up, d);
    const mid = origen.clone().add(fin).multiplyScalar(0.5);
    segs.push({ pos: [mid.x, mid.y, mid.z], quat: [q.x, q.y, q.z, q.w], largo, depth });
    nodos.push({ pos: [fin.x, fin.y, fin.z], depth });
    if (depth >= maxDepth) return;
    const hijos = depth < 1 ? 2 : r() < 0.72 ? 2 : 1;
    for (let k = 0; k < hijos; k++) {
      const nd = d
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), (r() - 0.5) * 1.5)
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), (r() - 0.5) * 0.9);
      ramificar(fin, nd, largo * (0.68 + r() * 0.16), depth + 1);
    }
  }
  const hub = new THREE.Vector3(-1.0, -0.5, 0.55);
  const arranques = [
    new THREE.Vector3(-0.85, 0.35, 0.05),
    new THREE.Vector3(0.95, 0.15, 0.05),
    new THREE.Vector3(0.1, -0.8, 0.15),
  ].slice(0, dirsN);
  arranques.forEach((a) => ramificar(hub, a, 0.55, 0));
  return { segs, nodos, hub: [hub.x, hub.y, hub.z] };
}

function Micorrizas({ seed = 17, dirsN = 3, maxDepth = 3, reducedMotion }) {
  const { segs, nodos, hub } = useMemo(() => generarHifas(seed, dirsN, maxDepth), [seed, dirsN, maxDepth]);
  const mats = useRef([]);
  const nodoRefs = useRef([]);
  const colBase = useMemo(() => new THREE.Color(PAL.hifa), []);
  const colOro = useMemo(() => new THREE.Color(PAL.hifaOro), []);
  const hongos = useMemo(
    () => [
      { p: [-1.35, 0.02, 0.9], s: 0.9 },
      { p: [-0.7, -0.08, 0.95], s: 0.7 },
    ],
    [],
  );
  useFrame((st) => {
    if (reducedMotion) return;
    const t = st.clock.elapsedTime * 2;
    for (let i = 0; i < mats.current.length; i++) {
      const m = mats.current[i];
      if (!m) continue;
      const glow = 0.5 + 0.5 * Math.sin(t - segs[i].depth * 0.9 - i * 0.05);
      m.color.copy(colBase).lerp(colOro, glow * 0.85);
    }
    for (let i = 0; i < nodoRefs.current.length; i++) {
      const n = nodoRefs.current[i];
      if (n) n.scale.setScalar(0.7 + 0.3 * Math.sin(t * 1.5 - nodos[i].depth));
    }
  });
  return (
    <group>
      {segs.map((s, i) => (
        <mesh key={`h-${i}`} position={s.pos} quaternion={s.quat} scale={[1, s.largo, 1]}>
          <cylinderGeometry args={[0.012, 0.012, 1, 4]} />
          <meshBasicMaterial ref={(el) => { mats.current[i] = el; }} color={PAL.hifa} />
        </mesh>
      ))}
      {nodos.map((n, i) => (
        <mesh key={`n-${i}`} position={n.pos} ref={(el) => { nodoRefs.current[i] = el; }}>
          <sphereGeometry args={[0.026, 8, 8]} />
          <meshBasicMaterial color={PAL.nodo} />
        </mesh>
      ))}
      <mesh position={/** @type {[number, number, number]} */ (hub)}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshBasicMaterial color={PAL.hifaOro} />
      </mesh>
      {/* sombreritos de hongo asomando entre las hifas */}
      {hongos.map((h, i) => (
        <group key={`f-${i}`} position={h.p} scale={h.s}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.02, 0.025, 0.12, 6]} />
            <meshLambertMaterial color="#efe7d2" flatShading />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.06, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color={PAL.hongo} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── BACTERIAS: puntos de vida (instancedMesh) que titilan y derivan; algunas
      alargadas (bacilos), otras redondas (cocos). Bokeh cálido. ────────────── */
function Bacterias({ cantidad, hub = [0.35, -0.55, 0.8], reducedMotion }) {
  const ref = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const datos = useMemo(() => {
    const r = rng(211);
    const tonos = ['#ffd98a', '#a8e6a0', '#ffb3a0', '#f4e2a0', '#c9e0ff'];
    return Array.from({ length: cantidad }, () => {
      const cerca = r() < 0.55;
      const base = cerca
        ? [hub[0] + (r() - 0.5) * 2.0, hub[1] + (r() - 0.5) * 1.4 + 0.3, 0.9 - r() * 0.35]
        : [(r() - 0.5) * 3.6, 0.7 - r() * 1.7, 0.95 - r() * 0.4];
      const bacilo = r() < 0.4;
      return {
        base,
        r: 0.012 + r() * 0.02,
        alarga: bacilo ? 1.8 + r() * 1.2 : 1,
        fase: r() * Math.PI * 2,
        vel: 0.6 + r() * 0.9,
        color: new THREE.Color(tonos[Math.floor(r() * tonos.length)]),
      };
    });
  }, [cantidad, hub]);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    datos.forEach((d, i) => {
      dummy.position.set(d.base[0], d.base[1], d.base[2]);
      dummy.scale.set(d.r * d.alarga, d.r, d.r);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, d.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [datos, dummy]);

  useFrame((st) => {
    if (reducedMotion || !ref.current) return;
    const t = st.clock.elapsedTime;
    for (let i = 0; i < datos.length; i++) {
      const d = datos[i];
      const tw = 0.55 + 0.45 * Math.sin(t * 3 * d.vel + d.fase);
      dummy.position.set(
        d.base[0] + Math.sin(t * 0.4 * d.vel + d.fase) * 0.03,
        d.base[1] + Math.cos(t * 0.35 * d.vel + d.fase) * 0.03,
        d.base[2],
      );
      const e = d.r * (0.6 + tw);
      dummy.scale.set(e * d.alarga, e, e);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cantidad]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/* ── MARCADOR tocable: halo rubber-hose que respira + esfera-objetivo generosa
      e invisible para el dedo. El pulso vive en useFrame. ──────────────────── */
function Marcador({ org, seleccionado, resaltado, reducedMotion, onSeleccion, onHover }) {
  const halo = useRef(null);
  useFrame((st) => {
    if (reducedMotion || !halo.current) return;
    const t = st.clock.elapsedTime;
    const base = seleccionado ? 0.42 : resaltado ? 0.34 : 0.2;
    const pulso = 0.5 + 0.5 * Math.sin(t * 2.2 + org.fase);
    halo.current.material.opacity = base + pulso * (seleccionado ? 0.16 : 0.1);
    halo.current.scale.setScalar(1 + pulso * (seleccionado ? 0.12 : 0.06));
  });
  const opBase = seleccionado ? 0.42 : resaltado ? 0.32 : 0.16;
  return (
    <group position={org.anchor}>
      <mesh ref={halo}>
        <sphereGeometry args={[org.halo, 16, 16]} />
        <meshBasicMaterial
          color={org.color}
          transparent
          opacity={opBase}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh
        onPointerDown={(e) => { e.stopPropagation(); onSeleccion(org.id); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(org.id); }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[org.hit, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ── RIEL DE CÁMARA: lleva la cámara (y el objetivo) al encuadre pedido. En
      reducedMotion salta de una; `invalidate()` mantiene vivo el frameloop. ── */
function CameraRig({ vista, reducedMotion }) {
  const controls = /** @type {import('three/examples/jsm/controls/OrbitControls.js').OrbitControls|null} */ (useThree((s) => s.controls));
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const destino = useMemo(
    () => ({ pos: new THREE.Vector3(...vista.pos), target: new THREE.Vector3(...vista.target) }),
    [vista],
  );
  const activo = useRef(true);
  useEffect(() => {
    activo.current = true;
    invalidate();
  }, [destino, invalidate]);
  useFrame(() => {
    if (!activo.current || !controls) return;
    const a = reducedMotion ? 1 : 0.09;
    camera.position.lerp(destino.pos, a);
    controls.target.lerp(destino.target, a);
    controls.update();
    const cerca =
      camera.position.distanceTo(destino.pos) < 0.02 && controls.target.distanceTo(destino.target) < 0.02;
    if (reducedMotion || cerca) {
      camera.position.copy(destino.pos);
      controls.target.copy(destino.target);
      controls.update();
      activo.current = false;
    } else {
      invalidate();
    }
  });
  return null;
}

/* ── La escena 3D (dentro del Canvas): corte de suelo + agua + todo el elenco ── */
function EscenaMicro({ tier, reducedMotion, focus, hover, onSeleccion, onHover }) {
  const P = useMemo(() => presupuesto(tier), [tier]);
  const anc = (id) => ORGANISMOS.find((o) => o.id === id).anchor;
  return (
    <>
      <color attach="background" args={[ATMOSFERA.fondo]} />
      <hemisphereLight intensity={1.0} color={ATMOSFERA.cielo} groundColor={ATMOSFERA.suelo} />
      <ambientLight intensity={0.45} color="#fff2d6" />
      <directionalLight position={[3, 5, 4]} intensity={0.5} color={ATMOSFERA.luz} />
      <directionalLight position={[-4, 2, 2]} intensity={0.18} color="#cfe0ff" />

      {/* el corte de suelo y su película de agua (fondo nuevo, autocontenido) */}
      <CorteSuelo />
      <PeliculaAgua reducedMotion={reducedMotion} />

      {/* el subsuelo vivo: red de micorrizas + bacterias */}
      <Micorrizas seed={17} dirsN={P.hifaDirs} maxDepth={P.hifaProf} reducedMotion={reducedMotion} />
      <Bacterias cantidad={P.bacterias} reducedMotion={reducedMotion} />

      {/* el elenco tocable (cada cuerpo en su ancla) */}
      <Colembolo base={anc('colembolo')} reducedMotion={reducedMotion} />
      <Tardigrado base={anc('tardigrado')} reducedMotion={reducedMotion} />
      <Acaro base={anc('acaro')} reducedMotion={reducedMotion} />
      <Nematodo base={anc('nematodo')} reducedMotion={reducedMotion} />
      <Lombriz base={anc('lombriz')} reducedMotion={reducedMotion} />
      <Protozoo base={anc('protozoo')} nCilios={P.cilios} reducedMotion={reducedMotion} />

      {ORGANISMOS.map((org) => (
        <Marcador
          key={org.id}
          org={org}
          seleccionado={focus === org.id}
          resaltado={hover === org.id}
          reducedMotion={reducedMotion}
          onSeleccion={onSeleccion}
          onHover={onHover}
        />
      ))}

      {/* nombres flotantes: píldoras grandes para el dedo (solo en vista general) */}
      {focus === null &&
        ORGANISMOS.map((org) => (
          <Html
            key={org.id}
            position={[org.anchor[0], org.anchor[1] + org.pinY, org.anchor[2]]}
            center
            zIndexRange={[16, 0]}
          >
            <button
              type="button"
              className={`mm-pin${hover === org.id ? ' mm-pin--hot' : ''}`}
              onClick={() => onSeleccion(org.id)}
              onPointerOver={() => onHover(org.id)}
              onPointerOut={() => onHover(null)}
            >
              <span className="mm-pin__emoji" aria-hidden="true">{org.emoji}</span>
              <span className="mm-pin__txt">{org.nombre}</span>
            </button>
          </Html>
        ))}

      {/* el aire del suelo: polvo dorado en suspensión (kit del framework) */}
      {P.polvo > 0 && (
        <ParticulasAmbientales
          tipo="polvo"
          tier={tier}
          reducedMotion={reducedMotion}
          position={[0, 0.4, 1.0]}
          area={[4.4, 2.6, 2.2]}
          semilla={31}
        />
      )}
    </>
  );
}

/* Estilos de ESTA vitrina (chrome DOM sobre el Canvas). Paleta cálida andina,
   "usted" cordial; legible en claro y oscuro. La viñeta de lente da el aire de
   "mirar por el microscopio". */
const CSS_MICRO = `
.mm-root { position: relative; width: 100%; height: 100dvh; min-height: 340px; overflow: hidden; background: ${ATMOSFERA.fondo}; touch-action: none; }
.mm-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.mm-canvas--lista { opacity: 1; }
.mm-lente { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(130% 100% at 50% 44%, rgba(28,18,8,0) 58%, rgba(28,18,8,0.22) 100%); }
.mm-vineta { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.5s ease; background: radial-gradient(120% 90% at 50% 42%, rgba(28,18,8,0) 46%, rgba(28,18,8,0.36) 100%); }
.mm-vineta--on { opacity: 1; }
.mm-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.mm-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #3a2a15; text-shadow: 0 1px 8px rgba(255,244,214,0.72); font: 700 1.2rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.mm-titulo small { display: block; font: 500 0.82rem/1.35 system-ui, sans-serif; opacity: 0.84; margin-top: 0.15rem; }
.mm-abajo { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 0 0.75rem 0.85rem; }
.mm-card { pointer-events: auto; margin: 0; max-width: 34rem; width: 100%; text-align: left; padding: 0.7rem 0.95rem 0.85rem; border-radius: 0.9rem; background: rgba(46,32,16,0.82); backdrop-filter: blur(4px); color: #fbf3e2; box-shadow: 0 6px 22px rgba(28,18,8,0.4); border: 1px solid rgba(255,214,138,0.28); }
.mm-card__head { display: flex; align-items: center; gap: 0.55rem; margin-bottom: 0.3rem; }
.mm-card__emoji { font-size: 1.7rem; line-height: 1; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4)); }
.mm-card__nombre { margin: 0; font: 800 1.08rem/1.1 system-ui, sans-serif; color: #ffe9c2; }
.mm-card__oficio { margin: 0.08rem 0 0; font: 600 0.82rem/1.15 system-ui, sans-serif; color: #ffd27a; }
.mm-card__texto { margin: 0.2rem 0 0.6rem; font: 500 0.86rem/1.5 system-ui, sans-serif; color: #f4e6cf; }
.mm-volver { appearance: none; border: 1px solid rgba(255,214,138,0.45); border-radius: 999px; padding: 0.4rem 0.95rem; background: rgba(255,247,228,0.14); color: #ffe9c2; font: 700 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; transition: background 0.2s ease, border-color 0.2s ease; }
.mm-volver:hover, .mm-volver:focus-visible { background: rgba(255,247,228,0.26); border-color: rgba(255,214,138,0.8); outline: none; }
.mm-chips { pointer-events: auto; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; max-width: 42rem; }
.mm-chip { display: inline-flex; align-items: center; gap: 0.32rem; appearance: none; border: 1px solid rgba(58,42,21,0.35); border-radius: 999px; padding: 0.34rem 0.7rem; background: rgba(255,247,228,0.86); color: #533a17; font: 600 0.78rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease; }
.mm-chip:hover, .mm-chip:focus-visible { background: rgba(255,255,255,0.96); border-color: rgba(58,42,21,0.6); outline: none; transform: translateY(-1px); }
.mm-chip--activo { background: #4a2f1a; color: #ffe9c2; border-color: rgba(255,214,138,0.7); }
.mm-chip__emoji { font-size: 1rem; line-height: 1; }
.mm-pin { display: inline-flex; align-items: center; gap: 0.28em; white-space: nowrap; pointer-events: auto; appearance: none; padding: 0.2em 0.62em; border-radius: 999px; font: 700 13px/1.1 system-ui, sans-serif; color: #4a2f1a; background: rgba(255,249,234,0.94); border: 1.5px solid rgba(122,84,46,0.4); box-shadow: 0 2px 8px rgba(74,47,26,0.22); cursor: pointer; user-select: none; transition: transform 0.12s ease, background 0.18s ease, border-color 0.18s ease; }
.mm-pin:hover, .mm-pin--hot, .mm-pin:focus-visible { transform: translateY(-2px) scale(1.04); background: #fff; border-color: rgba(122,84,46,0.7); outline: none; }
.mm-pin__emoji { font-size: 1.12em; line-height: 1; }
@media (prefers-color-scheme: dark) {
  .mm-titulo { color: #f4e6cf; text-shadow: 0 1px 10px rgba(0,0,0,0.5); }
  .mm-chip { background: rgba(58,40,24,0.9); color: #f4e6cf; border-color: rgba(255,214,138,0.35); }
  .mm-chip:hover, .mm-chip:focus-visible { background: rgba(74,52,30,0.98); }
  .mm-pin { color: #f4e6cf; background: rgba(58,40,24,0.92); border-color: rgba(255,214,138,0.4); }
  .mm-pin:hover, .mm-pin--hot, .mm-pin:focus-visible { background: rgba(74,52,30,1); }
}
@media (prefers-reduced-motion: reduce) {
  .mm-canvas, .mm-vineta, .mm-pin, .mm-chip, .mm-volver { transition: none; }
}
`;

const COPY_INTRO =
  'Bajo sus pies hay una ciudad diminuta y llena de vida. Toque cualquiera de estos seres —o su nombre— para acercarse y conocer qué hace por el suelo, por la planta y por usted.';

/**
 * MundoMicrofauna3D — el mundo tocable de la micro-fauna del suelo, con su propio
 * `<Canvas>`. Sin lógica de negocio: es una vitrina educativa. El `tier` y la
 * preferencia de calma se detectan aquí (mockup standalone), igual que sus pares.
 * La ruta la cablea Opus en App.jsx (este archivo NO lo toca).
 */
export default function MundoMicrofauna3D() {
  const [listo, setListo] = useState(false);
  const [focus, setFocus] = useState(null); // id del organismo enfocado, o null
  const [hover, setHover] = useState(null);
  const { tier, reducedMotion } = useMemo(() => decidirTier(), []);
  const perfil = perfilDeTier(tier);

  const orgSel = useMemo(() => ORGANISMOS.find((o) => o.id === focus) || null, [focus]);
  const vista = useMemo(() => vistaDe(orgSel), [orgSel]);

  return (
    <section
      className="mm-root"
      data-tier={tier}
      aria-label="El mundo tocable de la micro-fauna del suelo: toque cada ser vivo para conocer su oficio"
    >
      <style>{CSS_MICRO}</style>
      <Canvas
        className={`mm-canvas${listo ? ' mm-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: VISTA_GENERAL.pos, fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaMicro
          tier={tier}
          reducedMotion={reducedMotion}
          focus={focus}
          hover={hover}
          onSeleccion={setFocus}
          onHover={setHover}
        />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={2.2}
          maxDistance={9}
          minPolarAngle={0.35}
          maxPolarAngle={1.46}
          enableDamping
          dampingFactor={0.09}
          autoRotate={!reducedMotion && focus === null}
          autoRotateSpeed={0.24}
        />
        <CameraRig vista={vista} reducedMotion={reducedMotion} />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="mm-lente" aria-hidden="true" />
      <div className={`mm-vineta${focus ? ' mm-vineta--on' : ''}`} aria-hidden="true" />

      <div className="mm-chrome">
        <h2 className="mm-titulo">
          El mundo tocable del suelo
          <small>Toque cada ser vivo y descubra su oficio en la vida de la huerta</small>
        </h2>

        <div className="mm-abajo">
          {orgSel ? (
            <article className="mm-card" role="status" aria-live="polite">
              <div className="mm-card__head">
                <span className="mm-card__emoji" aria-hidden="true">{orgSel.emoji}</span>
                <div>
                  <h3 className="mm-card__nombre">{orgSel.nombre}</h3>
                  <p className="mm-card__oficio">{orgSel.oficio}</p>
                </div>
              </div>
              <p className="mm-card__texto">{orgSel.texto}</p>
              <button type="button" className="mm-volver" onClick={() => setFocus(null)}>
                Volver a la vista general
              </button>
            </article>
          ) : (
            <article className="mm-card" role="status">
              <p className="mm-card__texto" style={{ margin: 0 }}>{COPY_INTRO}</p>
            </article>
          )}

          <div className="mm-chips" role="group" aria-label="Elegir un ser vivo del suelo">
            {ORGANISMOS.map((org) => (
              <button
                key={org.id}
                type="button"
                className={`mm-chip${focus === org.id ? ' mm-chip--activo' : ''}`}
                aria-pressed={focus === org.id}
                onClick={() => setFocus((v) => (v === org.id ? null : org.id))}
                onPointerOver={() => setHover(org.id)}
                onPointerOut={() => setHover(null)}
              >
                <span className="mm-chip__emoji" aria-hidden="true">{org.emoji}</span>
                {org.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
