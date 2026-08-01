/*
 * SierraCorteVertical — LA VISTA GLOBAL de la Sierra como una LÁMINA de geografía:
 * la montaña ESTÁTICA, cortada por la mitad, en una sola pantalla. Se lee de un
 * vistazo, como la página de un libro de escuela: abajo la base ancha al nivel
 * del mar, arriba el pico de hielo, y entre medio los PISOS TÉRMICOS apilados
 * como estratos de color. Cálido, templado, frío, páramo. La corona de hielo.
 *
 * ── POR QUÉ ESTÁTICA (decisión de arte) ─────────────────────────────────────────
 * La vista global anterior (galería en 3/4 con deriva de cámara, slider de clima
 * y árboles que migran) se veía bonita pero NO se entendía: demasiado que mirar,
 * demasiado que mover. La queja era justa. Aquí la montaña NO se mueve: un corte
 * fijo se lee como mapa —cálido abajo, frío arriba, nieve en la cima— en un
 * segundo. El movimiento vive al ENTRAR a un piso, no en la global.
 *
 * ── EL CORTE (los datos son del grafo) ─────────────────────────────────────────
 * Las cuatro bandas navegables y sus cortes salen de `pisosTermicos.js`
 * (fuente IDEAM/IGAC, 1 093 aristas GROWS_IN en el grafo):
 *     cálido    0–1000 m     templado 1000–2000 m
 *     frío      2000–3000 m  páramo   3000–4000 m
 * Encima, la CORONA (superpáramo + nival, hasta 5 775 m) es el pico de hielo:
 * no se navega, se mira. El ancho de cada estrato NO es decorativo: la montaña
 * se angosta hacia arriba, así que el cálido es una franja ANCHA junto al mar y
 * el páramo una cinta estrecha bajo la nieve. La forma cuenta la altitud.
 *
 * ── EL PÁRAMO ES ESPECIAL (por ley y por conservación) ──────────────────────────
 * El páramo no es "otra franja de colores". Es la corona: de aquí baja el agua
 * de todos los pisos de abajo, y en Colombia está protegido —no se siembra, no
 * se mina—. Se dice sin cartel: color frío y aparte de los verdes cultivables,
 * un VELO de luz y bruma, frailejones que lo guardan, y NINGÚN afordance de
 * "entrar a sembrar" como las bandas de abajo — su invitación es "aquí no se
 * siembra, se cuida". (El grafo aún no tiene la norma legal; la protección se
 * sostiene por diseño, no por una cita que no podemos respaldar.)
 *
 * ── LOS MUNDOS SON TRANSVERSALES ────────────────────────────────────────────────
 * El AGUA nace en el páramo y BAJA por el corte cruzando frío, templado y cálido
 * hasta el mar: la línea de agua que atraviesa toda la lámina dice, sin texto,
 * que el agua (y el suelo, y los polinizadores) están en TODOS los pisos. Los
 * mundos con piso propio (bosque vivo→páramo, café→templado) cuelgan de su banda.
 *
 * ── RENDIMIENTO (Android barato + Quadro M6000, gateado por tier) ───────────────
 * 100% procedural: perfil determinista, geometría construida a mano en arrays
 * (cero merge → cero trampa de `mergeGeometries` null). Materiales Lambert/Basic,
 * color por vértice; sin texturas, sin DEM, sin GLTF. El tier decide densidad de
 * frailejones, emblemas de piso, polinizadores. `reducedMotion` congela el agua.
 *
 * ── RESPETO (regla no negociable) ──────────────────────────────────────────────
 * La Sierra Nevada es territorio sagrado y habitado (Kogui, Arhuaco/Iku, Wiwa,
 * Kankuamo — el Corazón del Mundo, dentro de la Línea Negra). Se acredita SIEMPRE,
 * con sobriedad; cero iconografía ceremonial.
 *
 * ── EXPORTS ─────────────────────────────────────────────────────────────────────
 *   default SierraCorteVertical — escena con su <Canvas> + lámina anotada + crédito.
 *   named   SierraCorteDiorama  — grupo r3f puro para componer en otro <Canvas>.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { ATMOSFERA } from '../atmosferaMadre.js';
import { perfilDeTier } from '../deviceTier.js';
import { PISOS_TERMICOS, CUMBRE_SIERRA_M } from '../pisosTermicos.js';
import ArbolMayor from './ArbolMayor.jsx';
import { frailejonar, FRAILEJON } from './arbolesMayores.js';

/* ── Geometría del corte. Y=0 es el mar; Y=H_MONTE es la cima. El ANCHO de la
      montaña se angosta hacia arriba: base ancha, pico fino. La cara del corte
      vive en z≈0 (mirando a la cámara); el cuerpo del monte se revuelve hacia
      atrás (z<0). ── */
const H_MONTE = 9.2; // altura de la cima en unidades de mundo
const W_BASE = 6.7; // semi-ancho al nivel del mar
const W_PICO = 0.5; // semi-ancho en la cima (el filo de hielo)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/* Altitud (m) → altura de mundo (proporción REAL: 0 m al pie, 5 775 m a la cima). */
const yDeMetros = (m) => (clamp(m, 0, CUMBRE_SIERRA_M) / CUMBRE_SIERRA_M) * H_MONTE;
/* Perfil de la montaña: semi-ancho a una altura y. Cóncavo (silueta de macizo)
   con un leve ensanche en el pie (las faldas que tocan el mar). Determinista. */
function semiAncho(y) {
  const f = clamp(y / H_MONTE, 0, 1);
  const cuerpo = Math.pow(1 - f, 0.74);
  const falda = Math.exp(-f * 7.5) * 0.14; // el pie se abre hacia el mar
  const hombro = Math.exp(-((f - 0.34) * (f - 0.34)) / 0.02) * 0.06; // un hombro sutil
  return W_PICO + (W_BASE - W_PICO) * (cuerpo + falda + hombro);
}

/* ── Las bandas navegables (los cuatro pisos con mundo) tomadas del grafo. La
      CORONA (superpáramo + nival) es el hielo: se ve, no se entra. `colorCara`
      es la paleta-póster del corte: cálido→frío en un gradiente legible, con el
      páramo en AZUL-ACERO —frío y aparte de los verdes cultivables— para que la
      banda protegida se distinga sola. `color` (dato del grafo) tiñe el borde de
      su tarjeta. ── */
const IDS_NAVEGABLES = ['calido', 'templado', 'frio', 'paramo'];
const COLOR_CARA = {
  calido: '#c99a3f', // dorado de tierra caliente
  templado: '#6f9e3f', // verde de bosque húmedo
  frio: '#3d8c76', // verde-agua del bosque de niebla
  paramo: '#6f94a3', // azul-acero: la banda fría y protegida
};
const BANDAS = IDS_NAVEGABLES.map((id) => {
  const p = PISOS_TERMICOS.find((x) => x.id === id);
  return {
    id,
    nombre: p.nombre,
    min: p.min,
    max: p.max,
    color: new THREE.Color(p.color),
    colorCara: new THREE.Color(COLOR_CARA[id]),
    cultivable: p.cultivable,
    mundos: p.mundos,
    y0: yDeMetros(p.min),
    y1: yDeMetros(p.max),
  };
});
const PARAMO = BANDAS.find((b) => b.id === 'paramo');
const CORONA_M0 = PARAMO.max; // desde el techo del páramo hacia arriba: hielo
const Y_CORONA0 = yDeMetros(CORONA_M0);

const COL_NIEVE = new THREE.Color('#f4f8fa');
const COL_HIELO = new THREE.Color('#b7cdd6');
const COL_ROCA = new THREE.Color('#6f645a');

/* ── La CARA DEL CORTE: la lámina. Cada banda es una franja de color limpio,
      con un dedo de gradiente (más clara arriba) para que tenga cuerpo sin
      ruido. Se construye a mano en arrays (cero merge). Una geo por banda para
      poder clicarla. ── */
function geoBandaCara(y0, y1, color, pasos = 12) {
  const arr = [];
  const cols = [];
  const base = color;
  const sombra = base.clone().multiplyScalar(0.82);
  const luz = base.clone().lerp(new THREE.Color('#ffffff'), 0.14);
  const cAbajo = sombra;
  const cArriba = luz;
  const tmp = new THREE.Color();
  const push = (x, y, ty) => {
    arr.push(x, y, 0);
    tmp.copy(cAbajo).lerp(cArriba, ty);
    cols.push(tmp.r, tmp.g, tmp.b);
  };
  for (let i = 0; i < pasos; i++) {
    const ya = y0 + ((y1 - y0) * i) / pasos;
    const yb = y0 + ((y1 - y0) * (i + 1)) / pasos;
    const wa = semiAncho(ya);
    const wb = semiAncho(yb);
    const ta = i / pasos;
    const tb = (i + 1) / pasos;
    // dos triángulos del trapecio (izq a der): -wa,ya / wa,ya / wb,yb / -wb,yb
    push(-wa, ya, ta); push(wa, ya, ta); push(wb, yb, tb);
    push(-wa, ya, ta); push(wb, yb, tb); push(-wb, yb, tb);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
  g.computeVertexNormals();
  return g;
}

/* La corona de hielo de la cara (de Y_CORONA0 a la cima): blanco con un roce de
   roca en los filos y azul-hielo en la base de la nieve. */
function geoCoronaCara(pasos = 14) {
  const arr = [];
  const cols = [];
  const y0 = Y_CORONA0;
  const y1 = H_MONTE;
  const tmp = new THREE.Color();
  const push = (x, y) => {
    const f = clamp((y - y0) / (y1 - y0), 0, 1);
    const w = semiAncho(y) || 1;
    const borde = Math.abs(x) / w; // 0 centro, 1 filo
    arr.push(x, y, 0);
    tmp.copy(COL_HIELO).lerp(COL_NIEVE, smoothstep(0.05, 0.34, f));
    // roca desnuda: base de la corona + filos empinados + unas vetas verticales.
    // Da PESO y forma al pico — sin roca es niebla, no hielo.
    const veta = smoothstep(0.55, 0.72, Math.abs(Math.sin(x * 2.6 + 1.1))) * (1 - f) * 0.3;
    const roca = smoothstep(0.34, 0, f) * 0.75 + borde * borde * (1 - f) * 0.55 + veta;
    tmp.lerp(COL_ROCA, clamp(roca, 0, 0.82));
    cols.push(tmp.r, tmp.g, tmp.b);
  };
  for (let i = 0; i < pasos; i++) {
    const ya = y0 + ((y1 - y0) * i) / pasos;
    const yb = y0 + ((y1 - y0) * (i + 1)) / pasos;
    const wa = semiAncho(ya);
    const wb = semiAncho(yb);
    push(-wa, ya); push(wa, ya); push(wb, yb);
    push(-wa, ya); push(wb, yb); push(-wb, yb);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
  g.computeVertexNormals();
  return g;
}

/* ── El CONTORNO del corte: un trazo oscuro y fino que sigue la silueta del
      monte (mar→cima, ambos flancos). Es lo que convierte una mancha pálida en
      una MONTAÑA dibujada: define el pico de hielo contra el cielo y le da el
      aire de lámina de libro. ── */
function geoContorno(pasos = 70, grosor = 0.07) {
  const arr = [];
  const lado = (s) => {
    for (let i = 0; i < pasos; i++) {
      const ya = (H_MONTE * i) / pasos;
      const yb = (H_MONTE * (i + 1)) / pasos;
      const xa = s * semiAncho(ya);
      const xb = s * semiAncho(yb);
      const xao = xa + s * grosor;
      const xbo = xb + s * grosor;
      arr.push(xa, ya, 0, xao, ya, 0, xbo, yb, 0);
      arr.push(xa, ya, 0, xbo, yb, 0, xb, yb, 0);
    }
  };
  lado(1); lado(-1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3));
  return g;
}

/* ── El CUERPO del monte tras el corte: media montaña revuelta hacia atrás
      (z<0). Le da volumen a la lámina —desde el ligero ángulo de cámara se ve
      la ladera curva y nevada por detrás—, así el corte se lee como una montaña
      REAL partida, no como un gráfico de torta. Colores apagados (la cara viva
      manda) y sombreado Lambert. ── */
function geoCuerpoMonte(pasosY = 46, pasosA = 16) {
  const arr = [];
  const cols = [];
  const tmp = new THREE.Color();
  const colorEnY = (y) => {
    const f = clamp(y / H_MONTE, 0, 1);
    if (y >= Y_CORONA0) {
      const g = clamp((y - Y_CORONA0) / (H_MONTE - Y_CORONA0), 0, 1);
      return tmp.copy(COL_HIELO).lerp(COL_NIEVE, smoothstep(0.1, 0.7, g));
    }
    // mezcla de la banda correspondiente, apagada
    let b = BANDAS[0];
    for (const bb of BANDAS) if (y >= bb.y0) b = bb;
    return tmp.copy(b.color).multiplyScalar(0.72).lerp(new THREE.Color('#4a4433'), 0.12 * (1 - f));
  };
  // media vuelta hacia atrás: ángulo a en [0,PI] → x=w·cos(a), z=-w·sin(a)
  const punto = (y, a) => {
    const w = semiAncho(y);
    return [w * Math.cos(a), y, -w * Math.sin(a) * 0.62]; // z aplastado: monte no tan hondo
  };
  /** @param {number[]} p @param {THREE.Color} c */
  const emit = (p, c) => { arr.push(p[0], p[1], p[2]); cols.push(c.r, c.g, c.b); };
  for (let iy = 0; iy < pasosY; iy++) {
    const ya = (H_MONTE * iy) / pasosY;
    const yb = (H_MONTE * (iy + 1)) / pasosY;
    const ca = colorEnY(ya).clone();
    const cb = colorEnY(yb).clone();
    for (let ia = 0; ia < pasosA; ia++) {
      const a0 = (Math.PI * ia) / pasosA;
      const a1 = (Math.PI * (ia + 1)) / pasosA;
      const p00 = punto(ya, a0), p01 = punto(ya, a1);
      const p10 = punto(yb, a0), p11 = punto(yb, a1);
      emit(p00, ca); emit(p01, ca); emit(p11, cb);
      emit(p00, ca); emit(p11, cb); emit(p10, cb);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
  g.computeVertexNormals();
  return g;
}

/* ── El mar Caribe al pie: la Sierra es la montaña litoral más alta del mundo,
      y ese contraste ES su silueta. Lámina estática con degradado por vértice y
      una línea de espuma donde toca la falda. ── */
function Mar() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(46, 22, 1, 3);
    g.rotateX(-Math.PI / 2);
    g.translate(0, -0.02, -6);
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const hondo = new THREE.Color('#4f8791');
    const orilla = new THREE.Color('#9ec7b6');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = clamp((pos.getZ(i) + 17) / 22, 0, 1);
      c.lerpColors(hondo, orilla, t * t);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      <mesh geometry={geo}>
        <meshBasicMaterial vertexColors />
      </mesh>
      <mesh position={[0, 0.03, 4.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2 * W_BASE + 1.2, 0.5]} />
        <meshBasicMaterial color="#f3ead6" transparent opacity={0.7} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ── El VELO del páramo: bruma luminosa que corona la banda protegida. No es
      otra franja: es luz y silencio. Un plano suave, translúcido, que respira
      apenas (o quieto con reducedMotion). Es la firma de "aquí no se siembra". ── */
function VeloParamo({ reducedMotion }) {
  const grupo = useRef(null);
  const yc = (PARAMO.y0 + PARAMO.y1) / 2;
  const w = semiAncho(yc);
  useFrame((st) => {
    if (reducedMotion || !grupo.current) return;
    const t = st.clock.elapsedTime;
    grupo.current.children.forEach((ch, i) => {
      ch.position.x = (i - 1) * w * 0.55 + Math.sin(t * 0.11 + i * 2.0) * 0.5;
      // @ts-ignore material opacity
      ch.material.opacity = 0.1 + Math.sin(t * 0.18 + i) * 0.04;
    });
  });
  // bruma baja y contenida, apenas sobre la banda protegida: un aliento de luz,
  // no un lavado. Es la firma de "aquí no se siembra, se cuida".
  return (
    <group ref={grupo} position={[0, PARAMO.y1 - 0.25, 0.4]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[(i - 1) * w * 0.55, 0, 0]}>
          <planeGeometry args={[w * 1.05, (PARAMO.y1 - PARAMO.y0) * 0.7]} />
          <meshBasicMaterial color="#eaf4f6" transparent opacity={0.11} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ── El AGUA que nace en el páramo y BAJA por el corte hasta el mar. Es el alma
      de la pieza: una vena de agua que cruza frío, templado y cálido —lo
      transversal hecho visible—. Cauce fijo (una cinta azul fina) + gotas que
      descienden (quietas con reducedMotion). ── */
function AguaQueBaja({ tier, reducedMotion }) {
  const curva = useMemo(() => {
    const yTop = PARAMO.y1 - 0.15;
    const pts = [];
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const y = yTop * (1 - t) + (-0.05) * t;
      // serpentea en x, más amplio abajo (el río se abre)
      const amp = 0.25 + t * 0.9;
      const x = Math.sin(t * Math.PI * 3.2 + 0.6) * amp - 0.4;
      pts.push(new THREE.Vector3(x, y, 0.12 + t * 0.05));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, []);
  const geoCauce = useMemo(() => new THREE.TubeGeometry(curva, 48, 0.055, 6, false), [curva]);
  useEffect(() => () => geoCauce.dispose(), [geoCauce]);

  const nGotas = tier === 'alto' ? 7 : tier === 'medio' ? 4 : 2;
  const gotas = useRef(null);
  const fases = useMemo(
    () => Array.from({ length: nGotas }, (_, i) => i / nGotas),
    [nGotas],
  );
  useFrame((st) => {
    if (reducedMotion || !gotas.current) return;
    const t = st.clock.elapsedTime;
    gotas.current.children.forEach((ch, i) => {
      const u = (fases[i] + t * 0.14) % 1;
      const p = curva.getPointAt(1 - u); // de arriba (u→0) hacia abajo
      ch.position.set(p.x, p.y, p.z + 0.03);
      const s = 0.5 + 0.5 * Math.sin(u * Math.PI); // brilla en el medio del viaje
      ch.scale.setScalar(0.6 + s * 0.6);
    });
  });
  return (
    <group>
      {/* nacedero: un manantial claro en el páramo */}
      <mesh position={[curva.getPointAt(1).x, curva.getPointAt(1).y, 0.14]}>
        <circleGeometry args={[0.16, 18]} />
        <meshBasicMaterial color="#cfeaf0" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      {/* el cauce */}
      <mesh geometry={geoCauce}>
        <meshBasicMaterial color="#7cc3d6" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      {/* las gotas que descienden */}
      <group ref={gotas}>
        {fases.map((_, i) => (
          <mesh key={i} position={[0, PARAMO.y1, 0.16]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshBasicMaterial color="#eaffff" transparent opacity={0.92} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ── Los frailejones que GUARDAN el páramo: tronco columnar, roseta lanuda y
      flor. Se posan en la cornisa de la banda de páramo, en frente de la cara.
      Baratos, a mano, tier-gated. Son la vida-firma del piso protegido. ── */
function FrailejonesParamo({ cuantos }) {
  const items = useMemo(() => {
    const yc = (PARAMO.y0 + PARAMO.y1) / 2;
    const w = semiAncho(yc);
    const base = frailejonar(cuantos, w * 0.8, 11);
    return base.map((f, i) => {
      const x = clamp(f.pos[0] * 0.9, -w * 0.85, w * 0.85);
      return { ...f, world: [x, PARAMO.y0 + 0.02, 0.42 + (i % 2) * 0.14] };
    });
  }, [cuantos]);
  return (
    <group>
      {items.map((f, i) => (
        <group key={i} position={/** @type {[number,number,number]} */ (f.world)} rotation={[0, f.giro, 0]} scale={0.7}>
          <mesh position={[0, f.alto / 2, 0]}>
            <cylinderGeometry args={[0.05, 0.07, f.alto, 6]} />
            <meshLambertMaterial color={FRAILEJON.tronco} flatShading />
          </mesh>
          <mesh position={[0, f.alto, 0]}>
            <sphereGeometry args={[0.13, 7, 5]} />
            <meshLambertMaterial color={FRAILEJON.roseta} flatShading />
          </mesh>
          <mesh position={[0, f.alto + 0.09, 0]}>
            <sphereGeometry args={[0.045, 6, 5]} />
            <meshLambertMaterial color={FRAILEJON.flor} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Mapa piso→arquetipo de árbol emblema (catálogo arbolesMayores). */
const EMBLEMA_TIPO = { calido: 'ceiba', templado: 'guayacan', frio: 'roble', paramo: 'quenua' };

/* ── El EMBLEMA de cada piso navegable: su árbol mayor (los que ya mejoraron:
      ramificación y sombreado horneado — eso se salva), posado en la cornisa
      frontal de su banda. Pequeño: la cara del corte manda; el árbol es el
      guiño de "este piso es un mundo al que se entra". ── */
function EmblemaPiso({ banda, tier, reducedMotion }) {
  const yc = banda.y0;
  const w = semiAncho((banda.y0 + banda.y1) / 2);
  const escala = banda.id === 'paramo' ? 0.34 : 0.3;
  const blobs = tier === 'alto' ? 4 : 3;
  return (
    <group position={[-w * 0.55, yc + 0.02, 0.5]}>
      <ArbolMayor
        tipo={EMBLEMA_TIPO[banda.id]}
        escala={escala}
        reducedMotion={reducedMotion}
        semilla={banda.id.length + banda.min * 0.001}
        blobs={blobs}
        flat={tier === 'alto'}
      />
    </group>
  );
}

/* ── Polinizadores: puntos de vida que DERIVAN cruzando las bandas —lo
      transversal, otra vez: la abeja no conoce de pisos—. Solo en tier alto y
      con movimiento. ── */
function Polinizadores({ cuantos, reducedMotion }) {
  const grupo = useRef(null);
  const semillas = useMemo(
    () => Array.from({ length: cuantos }, (_, i) => ({
      x: (Math.sin(i * 2.3) * 0.5) * W_BASE * 0.8,
      y: 0.6 + (i / cuantos) * (H_MONTE - 1.4),
      f: i * 1.7,
    })),
    [cuantos],
  );
  useFrame((st) => {
    if (reducedMotion || !grupo.current) return;
    const t = st.clock.elapsedTime;
    grupo.current.children.forEach((ch, i) => {
      const s = semillas[i];
      ch.position.x = s.x + Math.sin(t * 0.5 + s.f) * 1.4;
      ch.position.y = s.y + Math.sin(t * 0.8 + s.f * 1.3) * 0.4;
    });
  });
  return (
    <group ref={grupo}>
      {semillas.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, 0.6]}>
          <sphereGeometry args={[0.035, 6, 5]} />
          <meshBasicMaterial color="#ffd772" />
        </mesh>
      ))}
    </group>
  );
}

/* ── La cara del corte: las cuatro bandas navegables + la corona de hielo. Cada
      banda navegable es clicable (entra a su mundo) y se ilumina al pasar el
      dedo/cursor. La corona NO se clica: se mira. ── */
function CaraCorte({ tier, activo, setActivo, pisoUsuario, onEntrar }) {
  const geosBanda = useMemo(
    () => BANDAS.map((b) => geoBandaCara(b.y0, b.y1, b.colorCara)),
    [],
  );
  const geoCorona = useMemo(() => geoCoronaCara(), []);
  const geoBorde = useMemo(() => geoContorno(), []);
  useEffect(() => () => {
    geosBanda.forEach((g) => g.dispose());
    geoCorona.dispose();
    geoBorde.dispose();
  }, [geosBanda, geoCorona, geoBorde]);

  return (
    <group>
      {/* corona de hielo (no navegable) */}
      <mesh geometry={geoCorona}>
        <meshBasicMaterial vertexColors />
      </mesh>

      {/* el trazo del corte: define la silueta contra el cielo */}
      <mesh geometry={geoBorde} position={[0, 0, 0.03]}>
        <meshBasicMaterial color="#3a2a18" transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {/* separadores finos entre estratos: el filo del corte, como una lámina de
          geología. Uno por techo de banda (1000, 2000, 3000 m) + la línea de
          nieve al pie de la corona. */}
      {[BANDAS[0].y1, BANDAS[1].y1, BANDAS[2].y1].map((y, i) => (
        <mesh key={i} position={[0, y, 0.015]}>
          <planeGeometry args={[2 * semiAncho(y), 0.028]} />
          <meshBasicMaterial color="#33240f" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[0, Y_CORONA0, 0.02]}>
        <planeGeometry args={[2 * semiAncho(Y_CORONA0), 0.06]} />
        <meshBasicMaterial color="#fbfdfe" transparent opacity={0.92} depthWrite={false} />
      </mesh>

      {BANDAS.map((b, i) => {
        const suyo = pisoUsuario === b.id;
        const vivo = activo === b.id;
        const protegido = !b.cultivable;
        return (
          <group key={b.id}>
            <mesh
              geometry={geosBanda[i]}
              onClick={(e) => { e.stopPropagation(); onEntrar?.(b.id); }}
              onPointerOver={(e) => { e.stopPropagation(); setActivo(b.id); document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { setActivo(null); document.body.style.cursor = ''; }}
            >
              <meshBasicMaterial vertexColors transparent opacity={vivo ? 1 : 0.98} />
            </mesh>
            {/* realce al pasar el dedo: un halo cálido (o frío, en el páramo) */}
            {vivo && (
              <mesh position={[0, (b.y0 + b.y1) / 2, 0.02]}>
                <planeGeometry args={[2 * semiAncho((b.y0 + b.y1) / 2) + 0.1, b.y1 - b.y0]} />
                <meshBasicMaterial
                  color={protegido ? '#dff1f4' : '#fff3d6'}
                  transparent
                  opacity={0.22}
                  depthWrite={false}
                />
              </mesh>
            )}
            {/* la línea de "su piso" */}
            {suyo && (
              <mesh position={[0, b.y0 + 0.015, 0.03]}>
                <planeGeometry args={[2 * semiAncho(b.y0), 0.045]} />
                <meshBasicMaterial color="#ffd88a" transparent opacity={0.9} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/* Luces suaves: la lámina es casi frontal, así que domina un relleno parejo con
   un roce direccional para que el cuerpo del monte y los árboles tengan volumen. */
function LucesLamina() {
  return (
    <>
      <hemisphereLight intensity={0.9} color={ATMOSFERA.cielo} groundColor={ATMOSFERA.suelo} />
      <ambientLight intensity={0.45} color="#fff3dc" />
      <directionalLight position={[-6, 9, 8]} intensity={1.05} color={ATMOSFERA.luz} />
      <directionalLight position={[7, 4, 5]} intensity={0.35} color={ATMOSFERA.relleno} />
    </>
  );
}

/* Cielo cálido de fondo (degradado por vértice, cero textura). */
function CieloFondo() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(60, 20, 12);
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const alto = new THREE.Color('#a6bcca'); // más hondo arriba: la nieve resalta
    const bajo = new THREE.Color('#f6ead2');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = clamp(pos.getY(i) / 60 + 0.3, 0, 1);
      c.lerpColors(bajo, alto, t);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}

/**
 * SierraCorteDiorama — el grupo r3f puro de la lámina (para componer en un
 * <Canvas> propio). Cielo, mar, cuerpo del monte, cara del corte con sus bandas,
 * corona de hielo, velo y frailejones del páramo, el agua que baja, emblemas de
 * piso y polinizadores. Estático: cero deriva de cámara.
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']
 * @param {boolean} [props.reducedMotion=false]
 * @param {string}  [props.pisoUsuario]   piso a resaltar (opcional).
 * @param {string|null} [props.activo]    banda resaltada por hover (controlado).
 * @param {(id:string|null)=>void} [props.setActivo]
 * @param {(pisoId:string)=>void} [props.onEntrarPiso]
 * @param {boolean} [props.luces=true]
 */
export function SierraCorteDiorama({
  tier = 'alto',
  reducedMotion = false,
  pisoUsuario,
  activo = null,
  setActivo = () => {},
  onEntrarPiso,
  luces = true,
}) {
  const geoCuerpo = useMemo(() => geoCuerpoMonte(), []);
  useEffect(() => () => geoCuerpo.dispose(), [geoCuerpo]);

  const frailejones = tier === 'alto' ? 9 : tier === 'medio' ? 5 : 0;
  const conEmblemas = tier === 'alto' || tier === 'medio';
  const polinizadores = tier === 'alto' ? 6 : 0;

  return (
    <>
      <color attach="background" args={[ATMOSFERA.fondo]} />
      {luces && <LucesLamina />}
      <CieloFondo />
      <Mar />

      {/* el cuerpo del monte tras el corte (volumen) */}
      <mesh geometry={geoCuerpo} position={[0, 0, -0.03]}>
        <meshLambertMaterial vertexColors flatShading={tier === 'alto'} />
      </mesh>

      {/* la cara del corte: la lámina navegable */}
      <CaraCorte
        tier={tier}
        activo={activo}
        setActivo={setActivo}
        pisoUsuario={pisoUsuario}
        onEntrar={onEntrarPiso}
      />

      {/* el páramo, especial: velo, guardianes, y el agua que de aquí baja */}
      <VeloParamo reducedMotion={reducedMotion} />
      {frailejones > 0 && <FrailejonesParamo cuantos={frailejones} />}
      <AguaQueBaja tier={tier} reducedMotion={reducedMotion} />

      {/* el emblema de cada piso navegable (su árbol mayor) */}
      {conEmblemas && BANDAS.map((b) => (
        <EmblemaPiso key={b.id} banda={b} tier={tier} reducedMotion={reducedMotion} />
      ))}

      {/* polinizadores derivando entre pisos (transversal) */}
      {polinizadores > 0 && <Polinizadores cuantos={polinizadores} reducedMotion={reducedMotion} />}
    </>
  );
}

/* ── Estilos de la lámina: marfil cálido, anotaciones al costado como en un
      plano de geografía, la banda protegida con su chip aparte. ── */
const CSS = `
.scorte-root { position: relative; width: 100%; height: 100dvh; min-height: 360px; overflow: hidden; background: ${ATMOSFERA.fondo}; }
.scorte-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
.scorte-canvas--lista { opacity: 1; }
.scorte-vineta { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(125% 108% at 42% 44%, transparent 60%, rgba(48,34,18,0.22) 100%); }
.scorte-chrome { position: absolute; inset: 0; pointer-events: none; }
.scorte-titulo { position: absolute; top: 0; left: 0; margin: 0; padding: 0.95rem 1rem 0; color: #33240f; text-shadow: 0 1px 4px rgba(255,246,224,0.85); font: 700 clamp(1.1rem, 3.3vw, 1.42rem)/1.2 system-ui, sans-serif; }
.scorte-titulo__cejilla { display: block; font: 600 0.64rem/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.16em; color: #8a5a1f; margin-bottom: 0.3rem; }
.scorte-titulo small { display: block; font: 500 0.8rem/1.35 system-ui, sans-serif; opacity: 0.82; margin-top: 0.18rem; max-width: 26rem; }

/* eje de altitud a la izquierda */
.scorte-eje { position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; justify-content: space-between; height: min(66vh, 460px); pointer-events: none; }
.scorte-eje__cota { font: 600 0.6rem/1 system-ui, sans-serif; color: #5a4326; text-shadow: 0 1px 3px rgba(255,246,224,0.85); white-space: nowrap; }

/* anotaciones de banda a la derecha (la leyenda ES la montaña; esto la nombra) */
.scorte-bandas { position: absolute; right: 0.7rem; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 0.4rem; max-width: min(46vw, 15rem); pointer-events: auto; }
.scorte-banda { display: block; width: 100%; text-align: left; border: none; cursor: pointer; padding: 0.4rem 0.6rem; border-radius: 0.6rem; background: rgba(255,248,233,0.9); box-shadow: 0 2px 8px rgba(60,42,24,0.2); transition: box-shadow 0.2s ease, transform 0.2s ease; border-left: 4px solid var(--c, #b5763a); }
.scorte-banda:hover, .scorte-banda:focus-visible, .scorte-banda--vivo { outline: none; box-shadow: 0 6px 16px rgba(60,42,24,0.3); transform: translateX(-3px); }
.scorte-banda__nombre { display: flex; align-items: baseline; gap: 0.4rem; font: 700 0.86rem/1.1 system-ui, sans-serif; color: #33240f; }
.scorte-banda__cota { font: 600 0.62rem/1 system-ui, sans-serif; color: #8a6a3a; font-variant-numeric: tabular-nums; }
.scorte-banda__mundo { display: block; font: 500 0.66rem/1.25 system-ui, sans-serif; color: #5a4326; margin-top: 0.12rem; }
.scorte-banda__cta { display: inline-block; margin-top: 0.2rem; font: 700 0.58rem/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.06em; color: #fff8e9; background: #b5763a; padding: 0.2rem 0.46rem; border-radius: 99px; }
.scorte-banda__mio { font: 700 0.54rem/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.07em; color: #8a5a1f; }

/* el páramo: chip aparte, frío, protegido — NO el botón cálido de "entrar a sembrar" */
.scorte-banda--paramo { border-left-color: #7fa6b2; background: linear-gradient(180deg, rgba(233,244,247,0.96), rgba(255,248,233,0.9)); }
.scorte-banda--paramo .scorte-banda__cta { background: #6f97a3; }
.scorte-banda__protegido { display: inline-flex; align-items: center; gap: 0.28rem; margin-top: 0.2rem; font: 700 0.56rem/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.06em; color: #3f6570; }
.scorte-banda__protegido::before { content: ''; width: 0.5rem; height: 0.5rem; border-radius: 50%; background: radial-gradient(circle, #cfeaf0, #6f97a3); box-shadow: 0 0 6px rgba(111,151,163,0.8); }
.scorte-banda__agua { display: block; font: italic 500 0.64rem/1.25 Georgia, serif; color: #3f6570; margin-top: 0.14rem; }

.scorte-pie { position: absolute; bottom: 0; left: 0; right: 0; display: flex; justify-content: center; padding: 0 0.85rem 0.75rem; pointer-events: none; }
.scorte-pie p { margin: 0; max-width: 40rem; text-align: center; padding: 0.42rem 0.85rem; border-radius: 0.7rem; background: rgba(24,16,7,0.5); backdrop-filter: blur(3px); color: #f4ecdd; font: 500 0.72rem/1.4 system-ui, sans-serif; }
@media (max-width: 560px) {
  .scorte-eje { display: none; }
  .scorte-bandas { max-width: 11.5rem; gap: 0.28rem; }
  .scorte-banda__mundo { display: none; }
}
@media (prefers-reduced-motion: reduce) { .scorte-canvas { transition: none; } }
`;

/* Texto del mundo-ancla de cada banda (el que cuelga de su piso). */
const MUNDO_ANCLA = {
  calido: 'La milpa, los frutales y el corral',
  templado: 'El café bajo sombra y el semillero',
  frio: 'La papa, la huerta y el bosque de niebla',
  paramo: 'El bosque de queñua y los frailejones',
};

/**
 * SierraCorteVertical — la vista global montable con su propio <Canvas>. La
 * Sierra estática, cortada por la mitad, leída como una lámina: eje de altitud a
 * la izquierda, bandas anotadas a la derecha (clicables → entran a su mundo), la
 * banda de páramo aparte como piso protegido, y el crédito a los cuatro pueblos.
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']
 * @param {boolean} [props.reducedMotion=false]
 * @param {string}  [props.pisoUsuario]  piso de la finca a resaltar (opcional).
 * @param {(pisoId:string)=>void} [props.onEntrarPiso]
 * @param {string}  [props.className]
 * @param {(view:string, data?:any)=>void} [props.onNavigate]  inyectada por el shell de prod.
 */
export default function SierraCorteVertical({
  tier = 'alto',
  reducedMotion = false,
  pisoUsuario,
  onEntrarPiso,
  className = '',
  onNavigate = undefined,
}) {
  const entrarPiso = onEntrarPiso
    ?? (onNavigate ? (pisoId) => onNavigate('montana_mundos', { piso: pisoId }) : undefined);
  const [listo, setListo] = useState(false);
  const [activo, setActivo] = useState(/** @type {string|null} */ (null));
  const perfil = perfilDeTier(tier);

  // Bandas de arriba (páramo) hacia abajo (cálido) para que la columna espeje la
  // montaña: el páramo, la corona, queda arriba.
  const bandasArribaAbajo = [...BANDAS].reverse();

  return (
    <section
      className={`scorte-root${className ? ` ${className}` : ''}`}
      data-tier={tier}
      aria-label="La Sierra Nevada cortada por la mitad: los pisos térmicos del mar a la nieve, cada banda entra a su mundo"
    >
      <style>{CSS}</style>
      <Canvas
        className={`scorte-canvas${listo ? ' scorte-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [0, H_MONTE * 0.5, 23.5], fov: 34 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={({ camera }) => { camera.lookAt(0, H_MONTE * 0.46, 0); setListo(true); }}
      >
        <SierraCorteDiorama
          tier={tier}
          reducedMotion={reducedMotion}
          pisoUsuario={pisoUsuario}
          activo={activo}
          setActivo={setActivo}
          onEntrarPiso={entrarPiso}
        />
      </Canvas>
      <div className="scorte-vineta" aria-hidden="true" />

      <div className="scorte-chrome">
        <h2 className="scorte-titulo">
          <span className="scorte-titulo__cejilla">Sierra Nevada de Santa Marta</span>
          La Sierra, del mar a la nieve
          <small>Cada franja es un piso térmico. Toque un piso para entrar a su mundo.</small>
        </h2>

        {/* eje de altitud (la forma de la montaña ya lo dice; esto lo cifra) */}
        <div className="scorte-eje" aria-hidden="true">
          <span className="scorte-eje__cota">5&nbsp;775 m · nieve</span>
          <span className="scorte-eje__cota">3&nbsp;000 m</span>
          <span className="scorte-eje__cota">2&nbsp;000 m</span>
          <span className="scorte-eje__cota">1&nbsp;000 m</span>
          <span className="scorte-eje__cota">0 m · mar</span>
        </div>

        {/* anotaciones de banda: la leyenda que nombra la montaña */}
        <div className="scorte-bandas" role="group" aria-label="Pisos térmicos, del páramo al mar">
          {bandasArribaAbajo.map((b) => {
            const protegido = !b.cultivable;
            const suyo = pisoUsuario === b.id;
            return (
              <button
                key={b.id}
                type="button"
                className={`scorte-banda${protegido ? ' scorte-banda--paramo' : ''}${activo === b.id ? ' scorte-banda--vivo' : ''}`}
                style={{ '--c': `#${b.color.getHexString()}` }}
                onClick={() => entrarPiso?.(b.id)}
                onMouseEnter={() => setActivo(b.id)}
                onMouseLeave={() => setActivo(null)}
                aria-label={`Entrar al piso ${b.nombre}, ${b.min} a ${b.max} metros${protegido ? ', páramo protegido' : ''}${suyo ? ' (su piso)' : ''}`}
              >
                <span className="scorte-banda__nombre">
                  {b.nombre}
                  <span className="scorte-banda__cota">{b.min}–{b.max} m</span>
                  {suyo && <span className="scorte-banda__mio">· su piso</span>}
                </span>
                <span className="scorte-banda__mundo">{MUNDO_ANCLA[b.id]}</span>
                {protegido ? (
                  <>
                    <span className="scorte-banda__protegido">Páramo · se cuida, no se siembra</span>
                    <span className="scorte-banda__agua">De aquí baja el agua de toda la Sierra.</span>
                    <span className="scorte-banda__cta">Conocer el páramo</span>
                  </>
                ) : (
                  <span className="scorte-banda__cta">Toque para entrar</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="scorte-pie">
          <p role="contentinfo">
            Territorio ancestral y sagrado de los pueblos Kogui, Arhuaco (Iku),
            Wiwa y Kankuamo — el Corazón del Mundo, dentro de la Línea Negra.
            Representado con respeto.
          </p>
        </div>
      </div>
    </section>
  );
}
