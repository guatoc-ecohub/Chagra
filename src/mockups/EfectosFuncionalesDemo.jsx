/*
 * EfectosFuncionalesDemo — demo de EFECTOS FUNCIONALES de la infraestructura
 * (FASE 3 del audit game-dev 3D): que las construcciones de la finca HAGAN algo
 * visible, no solo decoren. Tres antes/después que el usuario dispara:
 *
 *   1. INVERNADERO → microclima: al prenderlo, adentro el aire se entibia
 *      (tinte cálido + vaho) y las matas se adelantan con un brote rubber-hose
 *      (overshoot y asentada); afuera sigue el frío con su neblina baja.
 *   2. ALMACÉN → la cosecha lo llena: cada "recoger la cosecha" manda tres
 *      sacos en parábola (estirados en vuelo, conservando volumen) hasta el
 *      portón; el arrume crece por capas y el medidor de llenado sube.
 *   3. RESERVORIO → el agua responde al clima: un aguacero (gotas + cielo
 *      plomizo) sube el nivel; la sequía (cielo recalentado + pasto reseco)
 *      lo baja.
 *
 * Escena demo SELF-CONTAINED con su propio <Canvas frameloop="demand">: no toca
 * App.jsx ni las escenas de producción (la ruta la cablea el registro aparte).
 * REUSA SIN EDITAR: la hora dorada de atmosferaMadre (ATMOSFERA/PALETA/mezclar),
 * los presets de cielosHoraData (el cielo del aguacero es el relleno lavanda del
 * amanecer; el de la sequía, la luz blanca del mediodía), el device-tiering real
 * (decidirTier/perfilDeTier), el PRNG determinista de particulasData (crearRng —
 * cero Math.random en render), el kit ParticulasAmbientales (polen ambiental y
 * el vaho del microclima) y las piezas InvernaderoTunel/AlmacenBodega de
 * piezasInfra (importadas tal cual; el reservorio es propio porque su nivel de
 * agua debe ANIMARSE, y el disco del TanqueAgua del catálogo es fijo).
 *
 * FRUGALIDAD bajo frameloop="demand": nada corre por frame en reposo. Cada
 * transición se auto-sostiene con invalidate() dentro de su useFrame y SUELTA el
 * loop al asentarse; con reducedMotion los valores saltan directo al estado
 * final en un solo cuadro. Solo meshLambert/meshBasic, sin shadow-map, geometría
 * procedural y conteos por tier. Copy en español de Colombia, en "usted".
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ATMOSFERA, PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { decidirTier, permite3D, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { crearRng } from '../visual/mundo3d/particulasData.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import {
  InvernaderoTunel,
  AlmacenBodega,
} from '../visual/mundo3d/infraestructura/piezasInfra.jsx';

/* ── Dirección de arte local (derivada de la madre, nunca inventada) ───────── */

const COLOR_SUELO = mezclar(PALETA.follajeClaro, PALETA.tierraClara, 0.5);
const COLOR_LLUVIA_GOTA = mezclar(PALETA.agua, ATMOSFERA.relleno, 0.5);
const NEBLINA_FRIA = mezclar(ATMOSFERA.niebla, CIELOS_HORA.amanecer.relleno, 0.5);
const PASTO_SECO = '#b8a35f'; // el mismo reseco de los efectos de vida del catálogo

/* El cielo del demo: base = hora dorada; el aguacero lo entinta hacia el
   relleno lavanda del amanecer y la sequía hacia la luz dura del mediodía. */
const CIELO_BASE = new THREE.Color(ATMOSFERA.fondo);
const CIELO_LLUVIA = new THREE.Color(mezclar(ATMOSFERA.fondo, CIELOS_HORA.amanecer.relleno, 0.55));
const CIELO_SEQUIA = new THREE.Color(mezclar(ATMOSFERA.fondo, CIELOS_HORA.mediodia.luz, 0.6));

/* ── Helpers puros (rubber-hose) ───────────────────────────────────────────── */

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const suave = (t) => t * t * (3 - 2 * t); // smoothstep: arranca y llega sin golpe

/* ease-out-back: llega, se pasa tantico y asienta (overshoot rubber-hose). */
function reboteSuave(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/* ── Constantes de cada diorama ────────────────────────────────────────────── */

const INV_DIMS = { largo: 6.4, ancho: 3.6, alto: 2.1 };
const AREA_VAHO = /** @type {[number, number, number]} */ ([4.6, 1.3, 2.2]);
const DUR_CRECIDA = 0.9; // segundos del brote de las matas

const BODEGA_DIMS = { largo: 6, ancho: 4, alto: 2.6 };
const MAX_COSECHAS = 4;
const DUR_SACO = 1.25;
const ESCALON_SACO = 0.22;
const DUR_VUELO = DUR_SACO + 2 * ESCALON_SACO;
const ALTURA_ARCO = 2.1;
/* De dónde salen los sacos (la huertica al pie de la bodega). */
const ORIGENES_SACO = /** @type {[number, number, number][]} */ ([
  [-4.0, 0, 2.2],
  [-4.5, 0, 2.7],
  [-3.7, 0, 2.95],
]);
/* La capa 1 aterriza donde AlmacenBodega (frugal) pinta su propio arrume:
   puestos [-1.35,-1.9,-1.6]×fx (fx = largo/8 = 0.75) corridos W/2 = 2 en z. */
const FX_ARRUME = Math.min(1, BODEGA_DIMS.largo / 8);
const DESTINOS_PIEZA = [
  [-1.35 * FX_ARRUME, 0, 2.5],
  [-1.9 * FX_ARRUME, 0, 2.62],
  [-1.6 * FX_ARRUME, 0, 3.02],
];
/* Las capas 2..4 arrumadas al otro lado del portón (suben de a 0.5). */
const CAPAS_PROPIAS = [
  [
    [0.78, 0, 2.5],
    [1.38, 0, 2.64],
    [1.02, 0, 3.0],
  ],
  [
    [0.86, 0.5, 2.6],
    [1.28, 0.5, 2.86],
    [1.05, 0.5, 2.4],
  ],
  [
    [0.95, 1.0, 2.62],
    [1.16, 1.0, 2.86],
    [1.06, 0.98, 2.44],
  ],
];
const ALTO_MEDIDOR = 1.5;

const R_TANQUE = 1.7;
const H_TANQUE = 1.6;
const NIVEL_INICIAL = 0.45;
const PASO_NIVEL = 0.28;
const NIVEL_MAX = 0.95;
const NIVEL_MIN = 0.06;
const NIVEL_SECO = 0.3; // por debajo, el pasto de alrededor se resecó
const ALTO_LLUVIA = 6; // techo de la nube de gotas

/* ── Ladrillos low-poly compartidos ────────────────────────────────────────── */

/* Un costal de fique amarrado (panza + ñudo), gemelo del Saco del catálogo —
   propio porque la pieza no lo exporta y aquí además VIAJA. */
function CuerpoSaco({ tono = 0 }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} scale={[1, 1.15, 1]}>
        <sphereGeometry args={[0.26, 7, 6]} />
        <meshLambertMaterial color={tono % 2 ? '#c9b487' : '#d8c9a5'} flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.08, 6, 5]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
    </group>
  );
}

/* Una matica cónica (la unidad de verde del framework). */
function Matica({ pos, alto, radio = 0.11, color }) {
  return (
    <mesh position={[pos[0], pos[1] + alto / 2, pos[2]]}>
      <coneGeometry args={[radio, alto, 5]} />
      <meshLambertMaterial color={color} flatShading />
    </mesh>
  );
}

/* El piso del demo: un disco de pasto cálido bajo todas las escenas. */
function SueloDemo() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <circleGeometry args={[11, 40]} />
      <meshLambertMaterial color={COLOR_SUELO} />
    </mesh>
  );
}

/* ── 1. INVERNADERO: el microclima ─────────────────────────────────────────── */

function EscenaInvernadero({ prendido, tier, reducedMotion }) {
  const invalidate = useThree((s) => s.invalidate);
  const grupoMatas = useRef(null);
  const crecida = useRef(prendido ? 1 : 0); // progreso lineal 0..1 del brote
  const frugal = tier !== 'alto';

  /* Siembra determinista: matas adentro (sobre las camas de la pieza, z=±W·0.22)
     y afuera (al frío, más chicas y oscuras). */
  const matas = useMemo(() => {
    const rng = crearRng(41);
    const zs = [-INV_DIMS.ancho * 0.22, INV_DIMS.ancho * 0.22];
    const cols = frugal ? 5 : 7;
    const adentro = [];
    zs.forEach((z, zi) => {
      for (let i = 0; i < cols; i++) {
        const x = -2.7 + i * (5.4 / (cols - 1));
        adentro.push({
          pos: [x + (rng() - 0.5) * 0.18, 0, z + (rng() - 0.5) * 0.14],
          alto: 0.3 + rng() * 0.14,
          color: (i + zi) % 2 ? PALETA.follajeClaro : PALETA.follaje,
        });
      }
    });
    const afuera = [];
    for (let i = 0; i < cols; i++) {
      const x = -2.6 + i * (5.2 / (cols - 1));
      afuera.push({
        pos: [x + (rng() - 0.5) * 0.3, 0, 2.85 + (rng() - 0.5) * 0.5],
        alto: 0.18 + rng() * 0.09,
        color: i % 2 ? PALETA.follajeOscuro : PALETA.follaje,
      });
    }
    return { adentro, afuera };
  }, [frugal]);

  /* El estado funcional de la pieza: con `vida` el túnel enseña su aire cálido
     y su condensación (las matas adelantadas las pone ESTA escena, animadas).
     frugal={false} fijo: es la única construcción del diorama y el microclima
     necesita sus camas y su neblina para leerse. */
  const vida = useMemo(
    () => (prendido ? { microclima: { activo: true, matas: false } } : null),
    [prendido],
  );

  useEffect(() => {
    invalidate();
  }, [prendido, invalidate]);

  /* El brote: progreso lineal amortiguado hacia prendido/apagado; la escala
     pasa por ease-out-back (se pasa tantico y asienta). Auto-sostiene el
     frameloop="demand" con invalidate() SOLO mientras se mueve. */
  useFrame((_, delta) => {
    const g = grupoMatas.current;
    if (!g) return;
    const objetivo = prendido ? 1 : 0;
    if (reducedMotion) {
      crecida.current = objetivo;
    } else {
      const dif = objetivo - crecida.current;
      const paso = Math.min(Math.abs(dif), Math.min(delta, 0.05) / DUR_CRECIDA);
      crecida.current += Math.sign(dif) * paso;
    }
    const e = reboteSuave(clamp01(crecida.current));
    g.scale.set(0.84 + e * 0.16, 0.72 + e * 0.58, 0.84 + e * 0.16);
    if (!reducedMotion && Math.abs(objetivo - crecida.current) > 1e-4) invalidate();
  });

  return (
    <group>
      <InvernaderoTunel dims={INV_DIMS} frugal={false} vida={vida} />

      {/* matas adentro: crecen (pivote en la boca de la cama, y=0.24) */}
      <group position={[0, 0.24, 0]} ref={grupoMatas}>
        {matas.adentro.map((m, i) => (
          <Matica key={i} pos={m.pos} alto={m.alto} color={m.color} />
        ))}
      </group>

      {/* matas afuera: al frío, quietas y chiquitas — el contraste del efecto */}
      {matas.afuera.map((m, i) => (
        <Matica key={i} pos={m.pos} alto={m.alto} radio={0.09} color={m.color} />
      ))}

      {/* la neblina fría de afuera, siempre presente (el páramo no perdona) */}
      {[
        [-3.6, 0.32, 2.1, 0],
        [3.3, 0.3, 2.7, 0.8],
        [-2.6, 0.3, -2.9, 1.7],
        [3.6, 0.38, -2.3, 2.5],
      ].map(([x, y, z, rot], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, rot, 0]} scale={[1.7, 0.45, 1.1]}>
          <sphereGeometry args={[0.8, 7, 5]} />
          <meshLambertMaterial
            color={NEBLINA_FRIA}
            transparent
            opacity={0.2}
            depthWrite={false}
            flatShading
          />
        </mesh>
      ))}

      {/* el vaho dorado del microclima (solo prendido; congela en reposo) */}
      {prendido && tier !== 'bajo' && (
        <ParticulasAmbientales
          tipo="polvo"
          position={[0, 0.35, 0]}
          rotation={[0, 0, 0]}
          area={AREA_VAHO}
          densidad={0.8}
          tier={tier}
          reducedMotion={reducedMotion}
          semilla={23}
        />
      )}
    </group>
  );
}

/* ── 2. ALMACÉN: la cosecha lo llena ───────────────────────────────────────── */

function EscenaAlmacen({ guardadas, volando, alAterrizar, reducedMotion }) {
  const invalidate = useThree((s) => s.invalidate);
  const sacosVuelo = useRef([]);
  const arranque = useRef(null);
  const terminado = useRef(false);
  const medidor = useRef(null);
  const llenado = useRef(guardadas / MAX_COSECHAS);

  /* La huertica de donde sale la cosecha (matas deterministas). */
  const huerta = useMemo(() => {
    const rng = crearRng(67);
    return Array.from({ length: 8 }, (_, i) => ({
      pos: [-4.6 + (i % 4) * 0.5 + (rng() - 0.5) * 0.16, 0.16, 1.9 + Math.floor(i / 4) * 0.55],
      alto: 0.26 + rng() * 0.12,
      color: i % 2 ? PALETA.follajeClaro : PALETA.follaje,
    }));
  }, []);

  /* La pieza en frugal a propósito: su arrume "con cosecha" es el modesto de 3
     costales (el de 5 + huacales chocaría con las capas que arruma esta escena)
     y reducedMotion=true le apaga el brote propio — la animación la pone el
     VIAJE de los sacos de aquí. */
  const vida = useMemo(() => (guardadas > 0 ? { cosecha: {} } : null), [guardadas]);

  /* A qué capa aterriza el vuelo en curso. */
  const destinos = guardadas === 0 ? DESTINOS_PIEZA : CAPAS_PROPIAS[Math.min(guardadas - 1, 2)];

  useEffect(() => {
    if (volando) {
      arranque.current = null;
      terminado.current = false;
    }
    invalidate();
  }, [volando, guardadas, invalidate]);

  useFrame(({ clock }, delta) => {
    let activo = false;

    /* El medidor de llenado sube amortiguado hacia guardadas/MAX. */
    const m = medidor.current;
    if (m) {
      const objetivo = guardadas / MAX_COSECHAS;
      const dif = objetivo - llenado.current;
      if (reducedMotion) {
        llenado.current = objetivo;
      } else if (Math.abs(dif) > 0.003) {
        llenado.current += dif * Math.min(1, Math.min(delta, 0.05) * 3.2);
        activo = true;
      } else {
        llenado.current = objetivo;
      }
      const ll = Math.max(0.001, llenado.current);
      m.scale.y = ll;
      m.position.y = 0.12 + (ALTO_MEDIDOR * ll) / 2;
    }

    /* El vuelo de los tres sacos: parábola con estirada que conserva volumen. */
    if (volando) {
      if (arranque.current == null) arranque.current = clock.elapsedTime;
      const t = reducedMotion ? DUR_VUELO : clock.elapsedTime - arranque.current;
      for (let i = 0; i < 3; i++) {
        const g = sacosVuelo.current[i];
        if (!g) continue;
        const ti = clamp01((t - i * ESCALON_SACO) / DUR_SACO);
        const e = suave(ti);
        const o = ORIGENES_SACO[i];
        const d = destinos[i];
        g.position.set(
          o[0] + (d[0] - o[0]) * e,
          o[1] + (d[1] - o[1]) * e + Math.sin(Math.PI * e) * ALTURA_ARCO,
          o[2] + (d[2] - o[2]) * e,
        );
        const sy = 1 + 0.35 * Math.sin(Math.PI * e);
        const sxz = 1 / Math.sqrt(sy);
        g.scale.set(sxz, sy, sxz);
      }
      if (t >= DUR_VUELO) {
        if (!terminado.current) {
          terminado.current = true;
          alAterrizar();
        }
      } else {
        activo = true;
      }
    }

    if (activo && !reducedMotion) invalidate();
  });

  return (
    <group>
      <AlmacenBodega dims={BODEGA_DIMS} frugal reducedMotion vida={vida} />

      {/* la huertica de origen */}
      <mesh position={[-4.15, 0.08, 2.15]}>
        <boxGeometry args={[2.1, 0.16, 1.5]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>
      {huerta.map((m, i) => (
        <Matica key={i} pos={m.pos} alto={m.alto} radio={0.09} color={m.color} />
      ))}

      {/* las capas YA guardadas (la 1ª la pinta la pieza vía `vida`) */}
      {CAPAS_PROPIAS.slice(0, Math.max(0, guardadas - 1)).map((capa, c) =>
        capa.map((p, i) => (
          <group key={`${c}:${i}`} position={/** @type {[number, number, number]} */ (p)}>
            <CuerpoSaco tono={c + i} />
          </group>
        )),
      )}

      {/* los sacos EN VUELO (solo durante la transición) */}
      {volando &&
        [0, 1, 2].map((i) => (
          <group
            key={i}
          position={/** @type {[number, number, number]} */ (ORIGENES_SACO[i])}
            ref={(el) => {
              sacosVuelo.current[i] = el;
            }}
          >
            <CuerpoSaco tono={i} />
          </group>
        ))}

      {/* el medidor de llenado junto a la bodega (marco de madera + ámbar) */}
      <group position={[3.55, 0, 1.2]}>
        <mesh position={[0, (ALTO_MEDIDOR + 0.24) / 2, 0]}>
          <boxGeometry args={[0.5, ALTO_MEDIDOR + 0.24, 0.16]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
        <mesh position={[0, (ALTO_MEDIDOR + 0.2) / 2 + 0.02, 0.02]}>
          <boxGeometry args={[0.34, ALTO_MEDIDOR + 0.04, 0.16]} />
          <meshLambertMaterial color={PALETA.cal} flatShading />
        </mesh>
        <mesh ref={medidor} position={[0, 0.12, 0.06]}>
          <boxGeometry args={[0.3, ALTO_MEDIDOR, 0.12]} />
          <meshBasicMaterial color={PALETA.ambar} />
        </mesh>
      </group>
    </group>
  );
}

/* ── 3. RESERVORIO: la lluvia y la sequía ──────────────────────────────────── */

/* Gotas de aguacero: UN THREE.Points determinista que cae y recircula. Solo
   monta mientras dura el evento, así su invalidate() no vive de gratis. */
function LluviaDemo({ n, reducedMotion }) {
  const invalidate = useThree((s) => s.invalidate);
  const puntos = useRef(null);

  const datos = useMemo(() => {
    const rng = crearRng(97);
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      pos[j] = (rng() - 0.5) * 9;
      pos[j + 1] = 0.4 + rng() * ALTO_LLUVIA;
      pos[j + 2] = (rng() - 0.5) * 9;
      vel[i] = 6.5 + rng() * 2.5;
    }
    return { pos, vel };
  }, [n]);

  useFrame((_, delta) => {
    if (reducedMotion || !puntos.current) return;
    const dt = Math.min(delta, 0.06);
    const geo = puntos.current.geometry;
    const p = geo.attributes.position.array;
    for (let i = 0; i < datos.vel.length; i++) {
      const j = i * 3 + 1;
      p[j] -= datos.vel[i] * dt;
      if (p[j] < 0.15) p[j] += ALTO_LLUVIA;
    }
    geo.attributes.position.needsUpdate = true;
    invalidate();
  });

  return (
    <points ref={puntos} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[datos.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={COLOR_LLUVIA_GOTA}
        size={0.07}
        transparent
        opacity={0.65}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function EscenaReservorio({ objetivoNivel, evento, alTerminar, tier, reducedMotion }) {
  const invalidate = useThree((s) => s.invalidate);
  const escena = useThree((s) => s.scene);
  const agua = useRef(null);
  const nivel = useRef(objetivoNivel);
  const seg = tier === 'alto' ? 22 : 14;
  const seca = objetivoNivel <= NIVEL_SECO;
  const nGotas = tier === 'alto' ? 220 : tier === 'medio' ? 120 : 60;

  useEffect(() => {
    invalidate();
  }, [objetivoNivel, evento, invalidate]);

  /* Al desmontar la escena, el cielo vuelve a la hora dorada (el fondo del
     Canvas es una instancia compartida que este animador entinta). */
  useEffect(
    () => () => {
      const bg = escena.background;
      if (bg instanceof THREE.Color) bg.copy(CIELO_BASE);
    },
    [escena],
  );

  useFrame((estado, delta) => {
    let activo = false;
    const dt = Math.min(delta, 0.05);

    /* El nivel del agua, amortiguado hacia su objetivo. */
    const dif = objetivoNivel - nivel.current;
    if (reducedMotion) {
      nivel.current = objetivoNivel;
    } else if (Math.abs(dif) > 0.002) {
      nivel.current += dif * Math.min(1, dt * 1.4);
      activo = true;
    } else {
      nivel.current = objetivoNivel;
    }
    if (agua.current) {
      agua.current.position.y = 0.14 + nivel.current * (H_TANQUE - 0.3);
    }

    /* El cielo se entinta según el evento (y vuelve solo al asentarse). */
    const bg = estado.scene.background;
    if (bg instanceof THREE.Color) {
      const objetivoCielo =
        evento === 'lluvia' ? CIELO_LLUVIA : evento === 'sequia' ? CIELO_SEQUIA : CIELO_BASE;
      if (!bg.equals(objetivoCielo)) {
        if (reducedMotion) {
          bg.copy(objetivoCielo);
        } else {
          bg.lerp(objetivoCielo, Math.min(1, dt * 2.2));
          const cerca =
            Math.abs(bg.r - objetivoCielo.r) +
              Math.abs(bg.g - objetivoCielo.g) +
              Math.abs(bg.b - objetivoCielo.b) <
            0.012;
          if (cerca) bg.copy(objetivoCielo);
          else activo = true;
        }
      }
    }

    /* El evento termina cuando el nivel llegó (las gotas paran con él). */
    if (evento && Math.abs(objetivoNivel - nivel.current) <= 0.002) alTerminar();

    if (activo && !reducedMotion) invalidate();
  });

  return (
    <group>
      {/* poyo + pared de piedra del reservorio (boca abierta: el agua se ve) */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[R_TANQUE * 1.08, R_TANQUE * 1.14, 0.12, seg]} />
        <meshLambertMaterial color={PALETA.concreto} flatShading />
      </mesh>
      <mesh position={[0, H_TANQUE / 2, 0]}>
        <cylinderGeometry args={[R_TANQUE, R_TANQUE, H_TANQUE, seg, 1, true]} />
        <meshLambertMaterial color={PALETA.piedra} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* el fondo del tanque (que la sequía no deje ver el pasto de abajo) */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[R_TANQUE * 0.96, R_TANQUE * 0.96, 0.05, seg]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>

      {/* EL AGUA: el disco cuyo nivel sube y baja (el efecto funcional) */}
      <mesh ref={agua} position={[0, 0.14 + objetivoNivel * (H_TANQUE - 0.3), 0]}>
        <cylinderGeometry args={[R_TANQUE * 0.92, R_TANQUE * 0.92, 0.07, seg]} />
        <meshLambertMaterial color={PALETA.agua} flatShading />
      </mesh>

      {/* marcas de nivel por fuera (para leer cuánto lleva) */}
      {[0.3, 0.6, 0.9].map((f) => (
        <mesh key={f} position={[R_TANQUE + 0.02, 0.14 + f * (H_TANQUE - 0.3), 0]}>
          <boxGeometry args={[0.06, 0.05, 0.34]} />
          <meshLambertMaterial color={PALETA.cal} flatShading />
        </mesh>
      ))}

      {/* la tubería en L que trae el agua (guiño al TanqueAgua del catálogo) */}
      <group>
        <mesh position={[R_TANQUE + 0.18, H_TANQUE * 0.92, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.6, 6]} />
          <meshLambertMaterial color={PALETA.lamina} flatShading />
        </mesh>
        <mesh position={[R_TANQUE + 0.45, H_TANQUE * 0.48, 0]}>
          <cylinderGeometry args={[0.06, 0.06, H_TANQUE * 0.92, 6]} />
          <meshLambertMaterial color={PALETA.lamina} flatShading />
        </mesh>
      </group>

      {/* en sequía honda, el pasto de alrededor amanece reseco */}
      {seca &&
        [
          [2.7, 0.03, 1.5, 0],
          [-2.5, 0.03, 1.9, 0.7],
          [2.3, 0.03, -2.1, 1.4],
          [-2.7, 0.03, -1.5, 2.1],
        ].map(([x, y, z, rot], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0, rot, 0]}>
            <boxGeometry args={[1.15, 0.05, 0.6]} />
            <meshLambertMaterial color={PASTO_SECO} flatShading />
          </mesh>
        ))}

      {/* el aguacero (solo mientras dura el evento) */}
      {evento === 'lluvia' && <LluviaDemo n={nGotas} reducedMotion={reducedMotion} />}
    </group>
  );
}

/* ── La página del demo ────────────────────────────────────────────────────── */

const EFECTOS = [
  { id: 'invernadero', emoji: '🌱', label: 'Ver el invernadero' },
  { id: 'almacen', emoji: '📦', label: 'Ver el almacén' },
  { id: 'reservorio', emoji: '💧', label: 'Ver el reservorio' },
];

const CSS = `
.efdemo { max-width: 860px; margin: 0 auto; padding: 16px 12px 40px; font-family: system-ui, -apple-system, sans-serif; color: #3a2a18; background: linear-gradient(#f7ecd6, #f2e3c4); min-height: 100vh; box-sizing: border-box; }
.efdemo__kicker { margin: 0; font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; color: #8a6a44; }
.efdemo h1 { margin: 4px 0 8px; font-size: 1.5rem; }
.efdemo__lema { margin: 0 0 14px; font-size: 0.95rem; line-height: 1.45; color: #5a4326; }
.efdemo__selector { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.efdemo__btn { border: 2px solid #7a5a38; background: #fff8ea; color: #3a2a18; border-radius: 999px; padding: 8px 14px; font-size: 0.9rem; cursor: pointer; transition: background 0.15s, transform 0.1s; }
.efdemo__btn:hover:not(:disabled) { background: #f6e8c8; }
.efdemo__btn:active:not(:disabled) { transform: scale(0.96); }
.efdemo__btn.is-on { background: #d9a13b; border-color: #a9741f; color: #2e2216; }
.efdemo__btn:disabled { opacity: 0.45; cursor: default; }
.efdemo__btn--accion { background: #e8f0d8; border-color: #5f8a3f; }
.efdemo__btn--accion:hover:not(:disabled) { background: #dcebc4; }
.efdemo__btn--reinicio { border-style: dashed; }
.efdemo__stage { position: relative; width: 100%; aspect-ratio: 4 / 3; max-height: 62vh; border-radius: 14px; overflow: hidden; border: 2px solid #c9ab7a; background: #f2d9a8; }
.efdemo__stage canvas { touch-action: none; }
.efdemo__panel { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 12px; }
.efdemo__estado { flex: 1 1 240px; margin: 0; font-size: 0.92rem; line-height: 1.4; color: #4a3a22; }
.efdemo__nota { margin: 10px 0 0; font-size: 0.8rem; color: #8a6a44; }
.efdemo__ficha { padding: 28px 18px; text-align: center; font-size: 0.95rem; line-height: 1.5; color: #5a4326; }
@media (min-width: 640px) { .efdemo { padding: 24px 20px 48px; } .efdemo h1 { font-size: 1.8rem; } }
`;

function EfectosFuncionalesDemo() {
  /* Device-tiering REAL del framework (una vez): tier + preferencia de calma. */
  const decision = useMemo(() => decidirTier(), []);
  const { tier, reducedMotion } = decision;
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  const puede3D = permite3D(tier);

  const [efecto, setEfecto] = useState('invernadero');
  const [reinicio, setReinicio] = useState(0);

  /* Estado LÓGICO de cada efecto (lo visual amortigua hacia esto). */
  const [prendido, setPrendido] = useState(false);
  const [guardadas, setGuardadas] = useState(0);
  const [volando, setVolando] = useState(false);
  const [agua, setAgua] = useState(NIVEL_INICIAL);
  const [evento, setEvento] = useState(null); // 'lluvia' | 'sequia' | null

  const alAterrizar = useCallback(() => {
    setGuardadas((g) => Math.min(MAX_COSECHAS, g + 1));
    setVolando(false);
  }, []);
  const finEvento = useCallback(() => setEvento(null), []);

  const recogerCosecha = () => {
    if (volando || guardadas >= MAX_COSECHAS) return;
    if (reducedMotion) setGuardadas((g) => Math.min(MAX_COSECHAS, g + 1));
    else setVolando(true);
  };
  const caerAguacero = () => {
    if (evento || agua >= NIVEL_MAX) return;
    setAgua((a) => Math.min(NIVEL_MAX, a + PASO_NIVEL));
    setEvento('lluvia');
  };
  const apretarSequia = () => {
    if (evento || agua <= NIVEL_MIN) return;
    setAgua((a) => Math.max(NIVEL_MIN, a - PASO_NIVEL));
    setEvento('sequia');
  };
  const empezarDeNuevo = () => {
    setPrendido(false);
    setGuardadas(0);
    setVolando(false);
    setAgua(NIVEL_INICIAL);
    setEvento(null);
    setReinicio((r) => r + 1);
  };

  const estadoTexto =
    efecto === 'invernadero'
      ? prendido
        ? 'Adentro el aire está tibio y las matas van adelantadas; afuera sigue el frío con su neblina.'
        : 'Invernadero apagado: adentro y afuera hace el mismo frío de páramo.'
      : efecto === 'almacen'
        ? volando
          ? 'La cosecha va en camino a la bodega…'
          : guardadas >= MAX_COSECHAS
            ? 'La bodega quedó llena: ya no cabe más cosecha.'
            : `La bodega va en ${guardadas} de ${MAX_COSECHAS} cosechas guardadas.`
        : evento === 'lluvia'
          ? 'Está cayendo el aguacero: el agua va subiendo.'
          : evento === 'sequia'
            ? 'Aprieta la sequía: el agua va bajando.'
            : `El agua va por el ${Math.round(agua * 100)} % del reservorio.`;

  return (
    <main className="efdemo">
      <style>{CSS}</style>
      <header>
        <p className="efdemo__kicker">Los mundos de su finca · demo de efectos funcionales</p>
        <h1>La infraestructura trabaja</h1>
        <p className="efdemo__lema">
          Aquí las construcciones no son adorno: prenda el invernadero y sienta el
          microclima, recoja la cosecha y vea llenarse la bodega, deje caer un
          aguacero y mire subir el agua del reservorio.
        </p>
      </header>

      <nav className="efdemo__selector" aria-label="Elija qué efecto ver">
        {EFECTOS.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`efdemo__btn${efecto === e.id ? ' is-on' : ''}`}
            onClick={() => setEfecto(e.id)}
            aria-pressed={efecto === e.id}
          >
            <span aria-hidden="true">{e.emoji}</span> {e.label}
          </button>
        ))}
        <button
          type="button"
          className="efdemo__btn efdemo__btn--reinicio"
          onClick={empezarDeNuevo}
        >
          ↺ Empezar de nuevo
        </button>
      </nav>

      <section className="efdemo__stage" aria-label="El diorama de la finca">
        {puede3D ? (
          <Suspense fallback={<div className="efdemo__ficha">Preparando el diorama…</div>}>
            <Canvas
              frameloop="demand"
              dpr={perfil.dpr}
              gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
              camera={{ position: [6.8, 5.4, 9.4], fov: 44 }}
            >
              <color attach="background" args={[ATMOSFERA.fondo]} />
              {perfil.fog && <fog attach="fog" args={[ATMOSFERA.niebla, 18, 46]} />}
              <hemisphereLight
                intensity={0.6}
                color={ATMOSFERA.cielo}
                groundColor={ATMOSFERA.suelo}
              />
              <ambientLight intensity={0.3} color={ATMOSFERA.luz} />
              <directionalLight position={[6, 9, 4]} intensity={0.95} color={ATMOSFERA.luz} />
              <directionalLight position={[-5, 4, -6]} intensity={0.22} color={ATMOSFERA.relleno} />
              <SueloDemo />
              <ParticulasAmbientales
                tipo="polen"
                tier={tier}
                reducedMotion={reducedMotion}
                densidad={0.5}
                semilla={13}
              />
              {efecto === 'invernadero' && (
                <EscenaInvernadero
                  key={`inv:${reinicio}`}
                  prendido={prendido}
                  tier={tier}
                  reducedMotion={reducedMotion}
                />
              )}
              {efecto === 'almacen' && (
                <EscenaAlmacen
                  key={`alm:${reinicio}`}
                  guardadas={guardadas}
                  volando={volando}
                  alAterrizar={alAterrizar}
                  reducedMotion={reducedMotion}
                />
              )}
              {efecto === 'reservorio' && (
                <EscenaReservorio
                  key={`res:${reinicio}`}
                  objetivoNivel={agua}
                  evento={evento}
                  alTerminar={finEvento}
                  tier={tier}
                  reducedMotion={reducedMotion}
                />
              )}
              <OrbitControls
                makeDefault
                target={[0, 0.9, 0]}
                enablePan={false}
                enableZoom
                minDistance={5}
                maxDistance={22}
                minPolarAngle={0.25}
                maxPolarAngle={1.4}
              />
            </Canvas>
          </Suspense>
        ) : (
          <div className="efdemo__ficha">
            Este equipo no alcanza para el diorama 3D. La demo de efectos
            funcionales necesita un teléfono o computador con más aliento — la
            finca real se ve igual de bien en su ficha 2D.
          </div>
        )}
      </section>

      <div className="efdemo__panel">
        {efecto === 'invernadero' && (
          <button
            type="button"
            className="efdemo__btn efdemo__btn--accion"
            onClick={() => setPrendido((p) => !p)}
            aria-pressed={prendido}
          >
            {prendido ? '🌙 Apagar el invernadero' : '🌡️ Prender el invernadero'}
          </button>
        )}
        {efecto === 'almacen' && (
          <button
            type="button"
            className="efdemo__btn efdemo__btn--accion"
            onClick={recogerCosecha}
            disabled={volando || guardadas >= MAX_COSECHAS}
          >
            🧺 Recoger la cosecha
          </button>
        )}
        {efecto === 'reservorio' && (
          <>
            <button
              type="button"
              className="efdemo__btn efdemo__btn--accion"
              onClick={caerAguacero}
              disabled={!!evento || agua >= NIVEL_MAX}
            >
              ☔ Que caiga un aguacero
            </button>
            <button
              type="button"
              className="efdemo__btn efdemo__btn--accion"
              onClick={apretarSequia}
              disabled={!!evento || agua <= NIVEL_MIN}
            >
              ☀️ Que apriete la sequía
            </button>
          </>
        )}
        <p className="efdemo__estado" aria-live="polite">
          {estadoTexto}
        </p>
      </div>

      <p className="efdemo__nota">
        Puede girar el diorama con el dedo. Todo pasa en este equipo: nada se
        guarda ni se manda a ninguna parte.
        {reducedMotion
          ? ' Con «menos movimiento» activado, los cambios se muestran de una vez, sin animación.'
          : ''}
      </p>
    </main>
  );
}

export default EfectosFuncionalesDemo;
