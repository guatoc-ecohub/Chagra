/*
 * fondoParamo — LA INMENSIDAD del páramo definitivo (2026-07-22).
 *
 * Es el fondo que el operador salvó del páramo viejo (MundoParamo3D, pasada 4):
 * *"le da un toque de inmensidad muy bueno"*. Se porta aquí ADAPTADO al mundo
 * del bosque vivo, que tiene ciclo de día real (useCicloDia): cada pieza deriva
 * sus colores de la franja horaria en curso, con la misma gramática de
 * perspectiva aérea de la pasada 4 (todo lo lejano se dibuja SIN fog y con el
 * lavado hacia el color del aire ya horneado — si lo dejáramos al fog, la bruma
 * se lo comería entero y volvería la caja de leche).
 *
 * Las piezas (todas procedurales, cero assets):
 *   · BÓVEDA: el cielo enorme con degradé (horizonte pálido → cenit hondo) y el
 *     lóbulo de resplandor alrededor del sol velado.
 *   · CORDILLERA: cuatro anillos de cuchillas a distancias crecientes, cada
 *     capa más lavada hacia el aire — "esto sigue y sigue".
 *   · MAR DE NUBES: el banco de lana que se mira HACIA ABAJO por la abra — la
 *     prueba física de que uno está a 3.500 m.
 *   · FALDA: la meseta no termina en la maqueta; sigue, se despeña por el
 *     hombro de la montaña (la ABRA de bosqueTakeA) y se hunde en la nube.
 *   · FRAILEJONAL DEL HORIZONTE: la colonia no se acaba donde acaba la maqueta —
 *     la repetición hasta donde el ojo alcanza es lo que dice "FRAILEJONAL".
 *   · SOL VELADO: la mancha pálida tras la niebla, en la MISMA dirección que la
 *     luz direccional de la franja (fuente visible = luz con origen).
 *
 * Montar dentro del <Canvas> de EscenaBosqueVivo. Tier-safe: los conteos bajan
 * con el tier; las geometrías se reconstruyen SOLO al cambiar de franja.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CIELOS_HORA, mezclaHex } from '../cielosHoraData.js';
import { crearRng } from '../particulasData.js';
import { alturaBosque } from './bosqueTakeA.geom.js';
import { geomFrailejon } from './floraParamo.geom.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/* Ruido determinista (hash de senos): la misma falda siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/* ── LA PALETA DE LA LEJANÍA, POR FRANJA ──────────────────────────────────────
      La pasada 4 derivaba estos colores de una atmósfera fija (bruma fría). El
      páramo definitivo amanece y anochece, así que se derivan de CIELOS_HORA:
      misma gramática (cuchilla = ancla oscura de valor, horizonte = el aire
      acostado, cenit hondo de 3.500 m), colores de la hora. */
const FRIO = '#b7c9d6'; // el azul-plata de la niebla altoandina
const AZUL_HONDO = '#8ba0b4'; // el fondo frío de las cuchillas lejanas
const LECHOSA = '#eef2ef'; // la lana de nube / la bruma lechosa
const TINTA = '#1d2836'; // el peso del cenit a 3.500 m (menos aire encima)

function paletaFondo(franja) {
  const p = CIELOS_HORA[franja] || CIELOS_HORA.manana;
  const sombra = mezclaHex(p.sombra || '#3a3a44', '#242f39', 0.5);
  const horizonte = mezclaHex(mezclaHex(p.fondo, LECHOSA, 0.45), FRIO, 0.25);
  return {
    p,
    horizonte,
    // El velo de la perspectiva aérea: hacia donde se lavan las cuchillas
    // lejanas. MÁS AZUL que el horizonte (el aire acostado azulea), no gris.
    aireAzul: mezclaHex(horizonte, FRIO, 0.55),
    cenit: mezclaHex(p.cielo, mezclaHex(AZUL_HONDO, TINTA, 0.6), 0.62),
    // La cuchilla cercana: oscura pero NO tinta plana — contra el cielo pálido
    // el negro lee cartulina; este arranca ya empujado hacia el azul del aire.
    cuchilla: mezclaHex(mezclaHex('#4a5260', sombra, 0.5), AZUL_HONDO, 0.28),
    resplandor: mezclaHex(LECHOSA, p.luz, 0.4),
    nube: mezclaHex(LECHOSA, p.cielo, 0.16),
    nubeHonda: mezclaHex(p.niebla, sombra, 0.62),
  };
}

/* Dirección del sol de la franja, llevada LEJOS (donde se dibuja la mancha). */
function solLejos(p, dist = 300) {
  const [x, y, z] = p.solPos;
  const L = Math.hypot(x, y, z) || 1;
  // Elevación mínima: la mancha nunca se entierra tras la falda.
  const ny = Math.max(y / L, 0.1);
  return [(x / L) * dist, ny * dist, (z / L) * dist];
}

/* ── LA BÓVEDA ──────────────────────────────────────────────────────────────── */
function construirBoveda(radio, pal) {
  const geo = new THREE.SphereGeometry(radio, 30, 20);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const cCenit = new THREE.Color(pal.cenit);
  const cHorizonte = new THREE.Color(pal.horizonte);
  const cResplandor = new THREE.Color(pal.resplandor);
  const c = new THREE.Color();
  const solN = new THREE.Vector3(...pal.p.solPos).normalize();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    // El degradé tiene que CABER en el cuadro: el peso del cielo se baja hasta
    // donde el ojo lo va a encontrar (cámara casi a nivel → ~20° de elevación).
    c.copy(cHorizonte).lerp(cCenit, smoothstep(-0.01, 0.34, v.y) ** 0.9);
    // El lóbulo del sol velado, ESTRECHO (abierto lava el cielo entero).
    const haciaSol = clamp(v.dot(solN), 0, 1);
    c.lerp(cResplandor, haciaSol ** 5.5 * (0.8 - smoothstep(0.1, 0.8, v.y) * 0.3));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

function BovedaParamo({ pal }) {
  const geo = useMemo(() => construirBoveda(380, pal), [pal]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} renderOrder={-100} frustumCulled={false}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
}

/* ── LA CORDILLERA QUE NO SE ACABA ──────────────────────────────────────────
      Las capas se escalonan en altura aparente (el macizo lejano es el grande)
      y se plantan LEJOS, con el pie hundido: un macizo se ve desde un páramo
      con el valle —y su nube— delante, no pegado a la nariz. */
const CORDILLERA = [
  { r: 88, base: -8, alto: 14.0, picos: 20, semilla: 11, aire: 0.12 },
  { r: 140, base: -11, alto: 24.0, picos: 16, semilla: 29, aire: 0.38 },
  { r: 200, base: -14, alto: 36.0, picos: 12, semilla: 47, aire: 0.58 },
  { r: 258, base: -17, alto: 46.0, picos: 10, semilla: 71, aire: 0.74 },
];
function construirCuchillas(capa, pal, segs = 150) {
  const { r, base, alto, picos: nPicos, semilla, aire } = capa;
  const rng = crearRng(semilla);
  // Cada pico con DOS pendientes distintas (nada de isósceles) y, a veces,
  // un hombro a media ladera: la cresta rota de un macizo real.
  const picos = Array.from({ length: nPicos }, () => ({
    a: rng() * Math.PI * 2,
    wIzq: 0.03 + rng() * 0.11,
    wDer: 0.03 + rng() * 0.11,
    h: 0.5 + rng() * 0.8,
    hombro: rng() < 0.55 ? 0.3 + rng() * 0.45 : 0,
  }));
  const perfil = (a) => {
    let h = 0.3 + 0.14 * Math.sin(a * 3.1 + semilla) + 0.09 * Math.sin(a * 6.7 - semilla * 0.3)
      + 0.09 * Math.sin(a * 14.3 + semilla * 2.1) + 0.05 * Math.sin(a * 23.7 - semilla)
      // el dentado fino: la cresta nunca es una recta entre pico y pico
      + 0.035 * Math.sin(a * 37.3 + semilla * 1.7) + 0.02 * Math.sin(a * 53.9 - semilla * 0.7);
    for (const p of picos) {
      let d = a - p.a;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      const w = d < 0 ? p.wIzq : p.wDer; // flanco izquierdo ≠ flanco derecho
      h += p.h * Math.exp(-(d * d) / (2 * w * w));
      if (p.hombro) {
        const dh = d - p.wDer * 2.1; // la repisa corrida ladera abajo
        h += p.h * p.hombro * 0.5 * Math.exp(-(dh * dh) / (2 * (p.wDer * 1.5) ** 2));
      }
    }
    return Math.max(0.08, h) * alto;
  };
  const pos = [];
  const col = [];
  // PERSPECTIVA AÉREA de verdad: cada capa más lejana se lava MÁS hacia el
  // aire azul (más clara y más azul), y el PIE de cada capa va más velado que
  // la cresta (hay más aire acostado por delante). Antes era al revés: la
  // falda salía más oscura y las cuatro capas leían el mismo gris de cartulina.
  const cCresta = new THREE.Color(mezclaHex(pal.cuchilla, pal.aireAzul, aire));
  const cFalda = new THREE.Color(mezclaHex(pal.cuchilla, pal.aireAzul, Math.min(1, aire + 0.26)));
  // La ladera que mira al sol se enciende apenas: el modelado que separa un
  // macizo de un triángulo plano. Las capas hondas casi no (el aire aplana).
  const cLuz = new THREE.Color(mezclaHex(mezclaHex(pal.cuchilla, pal.aireAzul, aire), pal.resplandor, 0.34));
  const aSol = Math.atan2(pal.p.solPos[0], -pal.p.solPos[2]);
  const cSeg = new THREE.Color();
  const empujar = (x, y, z, c) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); };
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const x0 = Math.sin(a0) * r, z0 = -Math.cos(a0) * r;
    const x1 = Math.sin(a1) * r, z1 = -Math.cos(a1) * r;
    const h0 = base + perfil(a0), h1 = base + perfil(a1);
    const luz = Math.max(0, Math.cos((a0 + a1) / 2 - aSol)) * (1 - aire) * 0.6;
    cSeg.copy(cCresta).lerp(cLuz, luz);
    // Dos triángulos por segmento, sin índice (el gotcha de mergeGeometries no
    // muerde donde nunca hay índice que mezclar).
    empujar(x0, base - 13, z0, cFalda); empujar(x1, base - 13, z1, cFalda); empujar(x0, h0, z0, cSeg);
    empujar(x1, base - 13, z1, cFalda); empujar(x1, h1, z1, cSeg); empujar(x0, h0, z0, cSeg);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  return g;
}
function Cordillera({ pal }) {
  const geos = useMemo(() => CORDILLERA.map((c) => construirCuchillas(c, pal)), [pal]);
  useLayoutEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} renderOrder={-90 + i} frustumCulled={false}>
          {/* SÍ escribe profundidad: así el mar de nubes se mete DELANTE de las
              cuchillas lejanas y DETRÁS de las cercanas, como un mar de verdad. */}
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ── EL MAR DE NUBES ────────────────────────────────────────────────────────
      A esta altura las nubes no están arriba: están ABAJO, llenando el valle
      hasta el filo de las cuchillas. Se mira por la abra, hacia abajo. */
function MarDeNubes({ n, pal, reducedMotion }) {
  const alto = useRef(null);
  const hondo = useRef(null);
  const giro = useRef(null);
  const sitios = useMemo(() => {
    const rng = crearRng(577);
    return Array.from({ length: n }, () => {
      const a = rng() * Math.PI * 2;
      const r = 40 + rng() * rng() * 160;
      return {
        x: Math.sin(a) * r,
        z: -Math.cos(a) * r,
        // Justo por debajo de la línea del horizonte: un mar por DEBAJO, no un
        // cielo nublado corriente.
        y: -2.6 + rng() * 3.0,
        ancho: 16 + rng() * 32,
        grueso: 2.6 + rng() * 4.2,
        fondo: 12 + rng() * 24,
        giro: rng() * Math.PI,
        claro: rng(),
      };
    });
  }, [n]);
  useLayoutEffect(() => {
    const ma = alto.current, mh = hondo.current;
    if (!ma || !mh) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const cNube = new THREE.Color(pal.nube);
    const cSol = new THREE.Color(pal.resplandor);
    const cHondo = new THREE.Color(pal.nubeHonda);
    const solN = new THREE.Vector3(...pal.p.solPos).normalize();
    const dir = new THREE.Vector3();
    sitios.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(0, s.giro, 0);
      dummy.scale.set(s.ancho, s.grueso, s.fondo);
      dummy.updateMatrix();
      ma.setMatrixAt(i, dummy.matrix);
      // Las nubes del lado del sol se encienden; las opuestas quedan hondas.
      dir.set(s.x, 6, s.z).normalize();
      tinte.copy(cNube).lerp(cSol, clamp(dir.dot(solN), 0, 1) ** 1.2 * 0.85);
      ma.setColorAt(i, tinte);
      // El VIENTRE en sombra es lo que hace visible al mar (contraste).
      dummy.position.set(s.x, s.y - s.grueso * 0.72, s.z);
      dummy.scale.set(s.ancho * 1.12, s.grueso * 0.82, s.fondo * 1.12);
      dummy.updateMatrix();
      mh.setMatrixAt(i, dummy.matrix);
      tinte.copy(cHondo).lerp(cNube, 0.06 + s.claro * 0.14);
      mh.setColorAt(i, tinte);
    });
    ma.instanceMatrix.needsUpdate = true;
    mh.instanceMatrix.needsUpdate = true;
    if (ma.instanceColor) ma.instanceColor.needsUpdate = true;
    if (mh.instanceColor) mh.instanceColor.needsUpdate = true;
  }, [sitios, pal]);
  useFrame(({ clock }) => {
    // El banco entero rota a la velocidad de un mar, no de una cortina de humo.
    if (!reducedMotion && giro.current) giro.current.rotation.y = clock.elapsedTime * 0.0055;
  });
  return (
    <group ref={giro}>
      {/* El color va por INSTANCIA (`setColorAt`): la esfera no trae atributo
          de color y pedir `vertexColors` la dejaría negra. */}
      <instancedMesh ref={hondo} args={[undefined, undefined, sitios.length]} frustumCulled={false} renderOrder={-81}>
        <sphereGeometry args={[0.5, 9, 6]} />
        <meshBasicMaterial fog={false} />
      </instancedMesh>
      <instancedMesh ref={alto} args={[undefined, undefined, sitios.length]} frustumCulled={false} renderOrder={-80}>
        <sphereGeometry args={[0.5, 9, 6]} />
        <meshBasicMaterial fog={false} />
      </instancedMesh>
    </group>
  );
}

/* ── LA FALDA: la meseta que sigue y SE DESPEÑA ─────────────────────────────
      El anillo sale del cuadro de la maqueta (tam 64 → borde 32), copia su
      cota en la costura (alturaBosque) y se desploma por el hombro de la
      montaña hacia el mar de nubes. La caída pesa MÁS en la abra (donde la
      pared del anfiteatro se abrió) y menos donde la pared sigue en pie. */
const FALDA_R0 = 26, FALDA_R1 = 150;
const faldaRadio = (t) => FALDA_R0 + (FALDA_R1 - FALDA_R0) * t ** 2.4;
function faldaAltura(t, wx, wz) {
  const caida = -38 * smoothstep(0.22, 0.66, t) ** 1.2;
  const m = smoothstep(0.0, 0.3, t);
  const propia = 1.2 + caida + ruido(wx * 0.09, wz * 0.09) * (0.5 + t * 7) * m;
  // La COSTURA: cerca, la falda ES la meseta (misma cota, menos un palmo para
  // que las dos mallas no peleen el z); lejos, manda la fórmula propia.
  return (alturaBosque(wx, wz) - 0.12) * (1 - m) + propia * m;
}
function construirFalda(pal, anillos = 18, segs = 92) {
  const pos = new Float32Array((anillos + 1) * (segs + 1) * 3);
  const col = new Float32Array((anillos + 1) * (segs + 1) * 3);
  // El filo lleva la familia del suelo rico del páramo (paja + pasto-musgo):
  // si arranca en otro tono se ve el escalón de color en la costura.
  const cFilo = new THREE.Color(mezclaHex('#99905a', '#5f6d43', 0.4));
  const cRoca = new THREE.Color('#867e6d');
  const cAire = new THREE.Color(mezclaHex(pal.cuchilla, pal.horizonte, 0.42));
  const c = new THREE.Color();
  let p = 0;
  for (let ia = 0; ia <= anillos; ia++) {
    const t = ia / anillos;
    const r = faldaRadio(t);
    for (let is = 0; is <= segs; is++) {
      const a = (is / segs) * Math.PI * 2;
      const wx = Math.sin(a) * r, wz = -Math.cos(a) * r;
      pos[p] = wx; pos[p + 1] = faldaAltura(t, wx, wz); pos[p + 2] = wz;
      c.copy(cFilo).lerp(cRoca, smoothstep(0.05, 0.45, t));
      c.lerp(cAire, smoothstep(0.2, 0.85, t) * 0.9); // la ladera se hunde en el aire
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  const nx = segs + 1;
  for (let ia = 0; ia < anillos; ia++) {
    for (let is = 0; is < segs; is++) {
      const a = ia * nx + is, b = a + 1, d = a + nx, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  const plano = g.toNonIndexed();
  g.dispose();
  plano.computeVertexNormals();
  return plano;
}
function FaldaParamo({ pal }) {
  const geo = useMemo(() => construirFalda(pal), [pal]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} renderOrder={-70} frustumCulled={false}>
      {/* CON fog, a diferencia del resto de la lejanía: la falda es SUELO y
          tiene que empalmar sin costura con la meseta y disolverse en la misma
          bruma. La cordillera y las nubes van sin fog porque están MÁS ALLÁ. */}
      <meshLambertMaterial vertexColors flatShading />
    </mesh>
  );
}

/* ── EL FRAILEJONAL DEL HORIZONTE ───────────────────────────────────────────
      Un segundo rodal instanciado sobre la falda — la MISMA silueta firmada
      del taller (geomFrailejon: tallo con enagua + roseta plateada), reusada,
      no duplicada — que se pierde en la bruma. Es la diferencia entre "hay
      frailejones" y "esto es un FRAILEJONAL". */
const CAM_REPOSO = [12.0, 17.6]; // (x, z) del puesto de cámara: nadie se para en el lente
function FrailejonalHorizonte({ n, q }) {
  const ref = useRef(null);
  const geo = useMemo(() => geomFrailejon({ flor: false, q: Math.min(q, 0.5), edad: 0.72 }, 883), [q]);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), []);
  const sitios = useMemo(() => {
    const rng = crearRng(881);
    const lista = [];
    let intentos = 0;
    while (lista.length < n && intentos < n * 8) {
      intentos += 1;
      const a = rng() * Math.PI * 2;
      // Por PASO de la falda (no por radio): la cota sale de la misma fórmula
      // que la malla y ninguna planta queda flotando ni enterrada.
      const t = 0.14 + rng() * rng() * 0.5;
      const r = faldaRadio(t);
      const wx = Math.sin(a) * r, wz = -Math.cos(a) * r;
      if (Math.hypot(wx - CAM_REPOSO[0], wz - CAM_REPOSO[1]) < 16) continue;
      const y = faldaAltura(t, wx, wz);
      if (y < -3.2) continue; // en el despeñadero ya no crece frailejón
      lista.push({ wx, wz, y, esc: 0.7 + rng() * 0.9, giro: rng() * Math.PI * 2, ladeo: (rng() - 0.5) * 0.22 });
    }
    return lista;
  }, [n]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !sitios.length) return;
    const dummy = new THREE.Object3D();
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y, s.wz);
      dummy.rotation.set(s.ladeo, s.giro, 0);
      dummy.scale.setScalar(s.esc);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [sitios]);
  useLayoutEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  if (!sitios.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, sitios.length]} frustumCulled={false} />;
}

/* ── EL SOL VELADO ──────────────────────────────────────────────────────────
      La mancha pálida tras la niebla, dibujada EXACTO donde la franja pone su
      luz direccional: lo que el ojo ve como fuente es de verdad la fuente. De
      noche se apaga (mandan las estrellas del kit). */
const VELO_FRANJA = { amanecer: 0.8, manana: 0.72, mediodia: 0.55, tarde: 0.72, atardecer: 0.85, noche: 0 };
function SolVelado({ pal, franja }) {
  const pos = useMemo(() => solLejos(pal.p), [pal]);
  const k = VELO_FRANJA[franja] ?? 0.6;
  if (!k) return null;
  return (
    <group position={/** @type {[number, number, number]} */ (pos)} renderOrder={-85}>
      <mesh>
        <circleGeometry args={[13, 40]} />
        <meshBasicMaterial color={LECHOSA} transparent opacity={0.72 * k} depthWrite={false} fog={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.6]}>
        <circleGeometry args={[30, 40]} />
        <meshBasicMaterial color={pal.resplandor} transparent opacity={0.24 * k} depthWrite={false} fog={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -1.2]}>
        <circleGeometry args={[58, 40]} />
        <meshBasicMaterial color={pal.horizonte} transparent opacity={0.12 * k} depthWrite={false} fog={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * El fondo de inmensidad del páramo definitivo. Montar dentro del <Canvas>.
 * Mira hacia la ABRA (bosqueTakeA): por ahí se despeña la falda y se ve el mar.
 * @param {{franja: string, tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function FondoParamo({ franja, tier = 'alto', reducedMotion = false }) {
  const pal = useMemo(() => paletaFondo(franja), [franja]);
  const nNubes = tier === 'alto' ? 46 : tier === 'medio' ? 28 : 14;
  const nHorizonte = tier === 'alto' ? 64 : tier === 'medio' ? 36 : 0;
  const q = tier === 'alto' ? 0.5 : 0.42;
  return (
    <group>
      <BovedaParamo pal={pal} />
      <SolVelado pal={pal} franja={franja} />
      <Cordillera pal={pal} />
      <MarDeNubes n={nNubes} pal={pal} reducedMotion={reducedMotion} />
      <FaldaParamo pal={pal} />
      {nHorizonte > 0 && <FrailejonalHorizonte n={nHorizonte} q={q} />}
    </group>
  );
}
