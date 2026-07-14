/*
 * GaleriaSierraArboles — la VISTA GLOBAL de la Sierra como GALERÍA DE MUNDOS por
 * piso térmico. Uno se aleja del valle y ve la cordillera andina escalonada; cada
 * franja de altitud muestra su piso y RESALTA SU ÁRBOL MAYOR —el hito visual del
 * piso—: la queñua arriba en el páramo, el roble en el frío, el guayacán en el
 * templado, la ceiba abajo en el cálido. Desde cada árbol se entra a su mundo.
 *
 * ── LO QUE APORTA (sobre VistaGlobalSierra, que es el establishing del macizo) ──
 *   1. El ÁRBOL MAYOR por piso como ancla de navegación (ArbolMayor.jsx).
 *   2. Un SLIDER CLIMÁTICO hoy→2050 que muestra el CORRIMIENTO de los pisos: con
 *      el calentamiento las bandas suben, el páramo se contrae y la nieve retrocede
 *      (gradiente ~1.8 °C/100 m; DR cambio-climatico). Los árboles MIGRAN cuesta
 *      arriba con su piso. Sin alarmismo: "su área se reduce", no "se acaba".
 *   3. Fauna de fondo REALISTA (regla nueva: los secundarios NO van rubber-hose):
 *      el cóndor andino planea en círculos lentos sobre la nieve, alas fijas.
 *
 * ── RESPETO (regla no negociable) ──────────────────────────────────────────────
 * La Sierra Nevada es territorio sagrado y habitado (Kogui, Arhuaco/Iku, Wiwa,
 * Kankuamo — el Corazón del Mundo, dentro de la Línea Negra). Se acredita SIEMPRE,
 * con sobriedad; cero iconografía ceremonial. Los árboles son emblemas ecológicos
 * del piso, no adorno.
 *
 * ── RENDIMIENTO (gama baja + offline) ───────────────────────────────────────────
 * Monte 100% procedural (heightmap determinista, cero DEM/GLTF/HDR remoto). Un
 * material Lambert con colores por vértice (banding por altitud). El recoloreo por
 * clima ocurre SOLO al soltar el slider (no por frame). Presupuesto por `tier`
 * (perfilDeTier). `reducedMotion` congela cóndor, mecido y órbita.
 *
 * ── EXPORTS ─────────────────────────────────────────────────────────────────────
 *   default GaleriaSierraArboles — escena con su <Canvas> + slider + chrome + crédito.
 *   named   SierraArbolesDiorama — grupo r3f puro para componer en otro <Canvas>.
 *
 * Montar SOLO dentro de un <Canvas> (el named); el default trae el suyo.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { ATMOSFERA } from '../atmosferaMadre.js';
import { perfilDeTier } from '../deviceTier.js';
import { PISOS_TERMICOS } from '../pisosTermicos.js';
import ArbolMayor from './ArbolMayor.jsx';
import { arbolDePiso, frailejonar, FRAILEJON } from './arbolesMayores.js';

/* ── Geometría del monte (coords de mundo). X=E-O, Y=altura, Z=frente(cámara,−)→
      cumbre(+). El macizo mira a la cámara: su ladera sur es la GALERÍA. ── */
const CIMA = 6.2; // altura de la cumbre en unidades de mundo
const ANCHO = 24; // extensión E-O
const Z_FRENTE = -9; // pie de la ladera (más cerca de la cámara)
const Z_CUMBRE = 1.6; // latitud de la cumbre

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function gauss(wx, wz, cx, cz, sx, sz) {
  const dx = wx - cx, dz = wz - cz;
  return Math.exp(-((dx * dx) / (2 * sx * sx) + (dz * dz) / (2 * sz * sz)));
}
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.6 - wz * 1.2 + 2.1) * 0.28 +
    Math.sin(wx * 2.7 + wz * 2.1 + 4.7) * 0.16
  );
}
/* Altura del monte: rampa frente→cumbre + cumbre central + dos estribaciones,
   con crestas de ruido y desvanecido a los flancos. */
function alturaMonte(wx, wz) {
  const s = clamp((wz - Z_FRENTE) / (Z_CUMBRE - Z_FRENTE), 0, 1);
  let h = Math.pow(s, 1.15) * CIMA * 0.5;
  h += gauss(wx, wz, 0, 0.9, 4.6, 3.6) * CIMA * 0.52; // cumbre central nevada
  h += gauss(wx, wz, -7, -1.2, 3.2, 3.0) * CIMA * 0.24; // estribo occidental
  h += gauss(wx, wz, 7, -1.0, 3.2, 3.0) * CIMA * 0.22; // estribo oriental
  h += ruido(wx, wz) * CIMA * 0.05 * s;
  h *= smoothstep(ANCHO / 2, ANCHO / 2 - 3, Math.abs(wx)); // faldas a los lados
  return Math.max(0, h);
}

/* ── Pisos térmicos como BANDAS de color por fracción de altura (0..1). El orden
      es de abajo (cálido) a arriba (nival). Con el clima, los umbrales SUBEN. ── */
const BANDAS = [
  { id: 'calido', top: 0.16, c: new THREE.Color('#8fa646'), factor: 1.0 },
  { id: 'templado', top: 0.34, c: new THREE.Color('#5e9e43'), factor: 1.05 },
  { id: 'frio', top: 0.52, c: new THREE.Color('#3f7050'), factor: 1.5 }, // sube rápido → aprieta el páramo
  { id: 'paramo', top: 0.7, c: new THREE.Color('#9c8f5a'), factor: 0.9 },
  { id: 'superparamo', top: 0.84, c: new THREE.Color('#7c8375'), factor: 0.7 },
  { id: 'nival', top: Infinity, c: new THREE.Color('#e9eef2'), factor: 0.0 },
];
const NIEVE = new THREE.Color('#f2f6fa');
const SNOWLINE_BASE = 0.8;
const SUBIDA_MAX = 0.14; // en 2050 los pisos trepan ~14% del monte

/* El umbral superior de una banda, desplazado por el clima `d` (0=hoy, 1=2050). */
function topDesplazado(banda, d) {
  if (!Number.isFinite(banda.top)) return Infinity;
  return clamp(banda.top + d * SUBIDA_MAX * banda.factor, 0, 0.97);
}
/* Color del monte en una fracción de altura `yf`, según el clima `d`. */
function colorMonte(yf, d, out) {
  const snow = clamp(SNOWLINE_BASE + d * SUBIDA_MAX * 1.1, 0, 0.95);
  if (yf >= snow) {
    const t = smoothstep(snow - 0.03, snow + 0.03, yf);
    return out.lerpColors(BANDAS[4].c, NIEVE, t);
  }
  let i = 0;
  while (i < BANDAS.length - 1 && yf > topDesplazado(BANDAS[i], d)) i++;
  if (i === 0) return out.copy(BANDAS[0].c);
  const borde = topDesplazado(BANDAS[i - 1], d);
  const t = smoothstep(borde - 0.05, borde + 0.05, yf);
  return out.lerpColors(BANDAS[i - 1].c, BANDAS[i].c, t);
}

/* Fracción de altura del centro de cada banda (para posar su árbol mayor). Sube
   con el clima igual que los umbrales de la banda. */
const CENTROS = {
  calido: { base: 0.09, factor: 1.0, x: -6.5 },
  templado: { base: 0.26, factor: 1.05, x: -2.4 },
  frio: { base: 0.44, factor: 1.2, x: 2.4 },
  paramo: { base: 0.61, factor: 1.0, x: 6.4 },
};
/* Punto de la LADERA FRONTAL donde una fracción de altura se posa, a una X dada.
   Busca en el frente (z creciente) el z cuya altura iguala el objetivo. */
function anclaLadera(wx, fraccion, d, factor) {
  const yObj = clamp(fraccion + d * SUBIDA_MAX * factor, 0, 0.92) * CIMA;
  let mejorZ = Z_FRENTE + 0.5, mejor = 1e9;
  for (let z = Z_FRENTE + 0.4; z <= Z_CUMBRE + 0.5; z += 0.12) {
    const dd = Math.abs(alturaMonte(wx, z) - yObj);
    if (dd < mejor) { mejor = dd; mejorZ = z; }
  }
  return [wx, alturaMonte(wx, mejorZ), mejorZ];
}

/* ── Terreno: geometría fija; el color se recalcula al mover el clima. ── */
function useMonte(segmentos, plano, d) {
  const geo = useMemo(() => {
    const nx = segmentos + 1;
    const nz = segmentos + 1;
    const pos = new Float32Array(nx * nz * 3);
    const col = new Float32Array(nx * nz * 3);
    let p = 0;
    for (let iz = 0; iz < nz; iz++) {
      const wz = Z_FRENTE + ((Z_CUMBRE + 3 - Z_FRENTE) * iz) / segmentos;
      for (let ix = 0; ix < nx; ix++) {
        const wx = -ANCHO / 2 + (ANCHO * ix) / segmentos;
        const y = alturaMonte(wx, wz);
        pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
        p += 3;
      }
    }
    const idx = [];
    for (let iz = 0; iz < segmentos; iz++) {
      for (let ix = 0; ix < segmentos; ix++) {
        const a = iz * nx + ix, b = a + 1, c = a + nx, e = c + 1;
        idx.push(a, c, b, b, c, e);
      }
    }
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    if (plano) g = g.toNonIndexed();
    g.computeVertexNormals();
    return g;
  }, [segmentos, plano]);

  // Recoloreo por clima: solo cuando `d` cambia de paso (no por frame).
  useEffect(() => {
    const posAttr = geo.getAttribute('position');
    const colAttr = geo.getAttribute('color');
    const c = new THREE.Color();
    for (let i = 0; i < posAttr.count; i++) {
      const yf = posAttr.getY(i) / CIMA;
      colorMonte(yf, d, c);
      colAttr.setXYZ(i, c.r, c.g, c.b);
    }
    colAttr.needsUpdate = true;
  }, [geo, d]);

  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

/* ── El cóndor andino: fauna de fondo REALISTA (no rubber-hose). Cuerpo negro,
      gorguera blanca, parches blancos en el dorso del ala, cabeza desnuda rojiza.
      Planea en círculos LENTOS sobre la nieve, alas casi fijas en leve diedro y
      primarias abiertas como dedos. `reducedMotion` lo deja quieto en planeo. ── */
function CondorAndino({ radio = 6, altura = 6.4, fase = 0, reducedMotion, escala = 1 }) {
  const orbita = useRef(null);
  const cuerpo = useRef(null);
  useFrame((st) => {
    if (reducedMotion) return;
    const t = st.clock.elapsedTime;
    if (orbita.current) orbita.current.rotation.y = fase + t * 0.11; // giro amplio y lento
    if (cuerpo.current) cuerpo.current.position.y = Math.sin(t * 0.35 + fase) * 0.25; // planeo que respira
  });
  const negro = '#1c1a1e';
  const blanco = '#efece4';
  return (
    <group ref={orbita} position={[0, altura, -1]} rotation={[0, fase, 0]}>
      {/* el cóndor, en el borde del círculo, mirando la tangente (+Z), banqueado
          hacia adentro del giro (roll fijo, como un planeador realista) */}
      <group ref={cuerpo} position={[radio, 0, 0]} rotation={[0, 0, -0.22]} scale={escala}>
        {/* cuerpo alargado */}
        <mesh scale={[0.16, 0.16, 0.5]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshLambertMaterial color={negro} />
        </mesh>
        {/* gorguera blanca en la base del cuello */}
        <mesh position={[0, 0.03, 0.34]} scale={[0.17, 0.12, 0.12]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshLambertMaterial color={blanco} />
        </mesh>
        {/* cabeza desnuda rojiza */}
        <mesh position={[0, 0.05, 0.5]} scale={[0.09, 0.09, 0.12]}>
          <sphereGeometry args={[1, 7, 6]} />
          <meshLambertMaterial color="#a9663f" />
        </mesh>
        {/* alas: dos planos anchos barridos, en leve diedro; parche blanco arriba
            y tres "dedos" (primarias) en la punta */}
        {[-1, 1].map((lado) => (
          <group key={lado} rotation={[0, 0, lado * 0.14]}>
            <mesh position={[lado * 0.62, 0.01, -0.02]} rotation={[0, lado * -0.28, 0]}>
              <boxGeometry args={[1.15, 0.03, 0.42]} />
              <meshLambertMaterial color={negro} />
            </mesh>
            {/* parche blanco del dorso del ala */}
            <mesh position={[lado * 0.5, 0.03, -0.02]} rotation={[0, lado * -0.28, 0]}>
              <boxGeometry args={[0.7, 0.02, 0.2]} />
              <meshLambertMaterial color={blanco} />
            </mesh>
            {/* primarias abiertas: dedos en la punta del ala */}
            {[0, 1, 2].map((k) => (
              <mesh
                key={k}
                position={[lado * (1.12 + k * 0.06), 0.01, -0.14 + k * 0.1]}
                rotation={[0, lado * -0.28, lado * (0.1 + k * 0.05)]}
              >
                <boxGeometry args={[0.22, 0.02, 0.06]} />
                <meshLambertMaterial color={negro} />
              </mesh>
            ))}
          </group>
        ))}
        {/* cola corta en cuña */}
        <mesh position={[0, 0, -0.42]} scale={[0.14, 0.02, 0.2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshLambertMaterial color={negro} />
        </mesh>
      </group>
    </group>
  );
}

/* Los frailejones del páramo, alrededor de la queñua: tronco columnar + roseta
   lanuda plateada + flor amarilla. Baratos, instanciados a mano (~pocos). */
function Frailejones({ centro, cuantos }) {
  const items = useMemo(() => {
    const base = frailejonar(cuantos, 2.2, 7);
    return base.map((f) => {
      const wx = centro[0] + f.pos[0];
      const wz = centro[2] + f.pos[2];
      return { ...f, world: [wx, alturaMonte(wx, wz), wz] };
    });
  }, [centro, cuantos]);
  return (
    <group>
      {items.map((f, i) => (
        <group key={i} position={f.world} rotation={[0, f.giro, 0]}>
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

/* El árbol mayor de un piso, posado en su banda, con rótulo y HITBOX clicable
   (entra a su mundo). El rótulo trae nombre común + científico + rasgo. */
function HeroArbol({ pisoId, d, tier, reducedMotion, onEntrar, resaltado }) {
  const cfg = CENTROS[pisoId];
  const def = arbolDePiso(pisoId);
  const piso = PISOS_TERMICOS.find((p) => p.id === pisoId);
  const ancla = useMemo(
    () => anclaLadera(cfg.x, cfg.base, d, cfg.factor),
    [cfg, d],
  );
  if (!def || !piso) return null;
  const blobs = tier === 'alto' ? undefined : tier === 'medio' ? 4 : 3;
  const escala = tier === 'bajo' ? 0.85 : 1;
  return (
    <group
      position={ancla}
      onClick={(e) => { e.stopPropagation(); onEntrar?.(pisoId); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      {/* hitbox transparente (opacity 0, no `visible=false`: así SÍ recibe el
          raycast): facilita el toque del árbol en pantallas chicas */}
      <mesh position={[0, def.alto * 0.6, 0]}>
        <cylinderGeometry args={[def.alto * 0.7, def.alto * 0.7, def.alto * 1.4, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <ArbolMayor
        tipo={tipoDeArbol(pisoId)}
        escala={escala}
        reducedMotion={reducedMotion}
        semilla={pisoId.length + cfg.x}
        blobs={blobs}
        flat={tier === 'alto'}
      />
      {/* anillo sutil de "aquí está su árbol mayor" cuando es el piso del usuario */}
      {resaltado && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[def.alto * 0.55, def.alto * 0.72, 28]} />
          <meshBasicMaterial color="#ffdf9c" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      )}
      <Html
        center
        position={[0, def.alto * 1.25, 0]}
        distanceFactor={16}
        zIndexRange={[30, 10]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="gsierra-rotulo" aria-hidden="true">
          <span className="gsierra-rotulo__piso">{piso.nombre}</span>
          <span className="gsierra-rotulo__arbol">{def.nombre}</span>
          <em className="gsierra-rotulo__cient">{def.cientifico}</em>
        </div>
      </Html>
    </group>
  );
}

/* Mapa piso→arquetipo de árbol (la clave del catálogo arbolesMayores). */
function tipoDeArbol(pisoId) {
  return { paramo: 'quenua', frio: 'roble', templado: 'guayacan', calido: 'ceiba' }[pisoId] || 'roble';
}

/* Cordillera de fondo: dos crestas hazy que dan profundidad tras el macizo. */
function CordilleraFondo() {
  return (
    <group>
      {[
        { x: -8, z: 5, s: [10, 3.4, 5], c: '#b9c0c9' },
        { x: 6, z: 6, s: [12, 4.0, 5], c: '#aeb7c2' },
        { x: -1, z: 8, s: [16, 5.2, 6], c: '#c3cad3' },
      ].map((r, i) => (
        <mesh key={i} position={[r.x, 0, r.z]} scale={r.s}>
          <sphereGeometry args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshLambertMaterial color={r.c} />
        </mesh>
      ))}
    </group>
  );
}

function LucesDoradas() {
  return (
    <>
      <hemisphereLight intensity={0.85} color={ATMOSFERA.cielo} groundColor={ATMOSFERA.suelo} />
      <ambientLight intensity={0.34} color="#fff1d6" />
      <directionalLight position={[-11, 8, 4]} intensity={1.25} color={ATMOSFERA.luz} />
      <directionalLight position={[9, 5, -6]} intensity={0.3} color={ATMOSFERA.relleno} />
    </>
  );
}

function SolDorado() {
  return (
    <group position={[-13, 5.6, 6]}>
      <mesh>
        <circleGeometry args={[1.2, 32]} />
        <meshBasicMaterial color="#fff2cf" transparent opacity={0.98} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[2.4, 32]} />
        <meshBasicMaterial color="#ffd98f" transparent opacity={0.36} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * SierraArbolesDiorama — el grupo r3f puro de la galería (para componer dentro de
 * un <Canvas> propio). Trae monte, cordillera de fondo, sol, árboles mayores,
 * frailejones y cóndores; luces y crédito por props.
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']
 * @param {boolean} [props.reducedMotion=false]
 * @param {number}  [props.clima=0]        0=hoy … 1=2050 (corrimiento de pisos).
 * @param {string}  [props.pisoUsuario]    piso a resaltar (opcional).
 * @param {(pisoId:string)=>void} [props.onEntrarPiso]  navegar al mundo del piso.
 * @param {boolean} [props.luces=true]
 * @param {boolean} [props.atmosfera=true]
 */
export function SierraArbolesDiorama({
  tier = 'alto',
  reducedMotion = false,
  clima = 0,
  pisoUsuario,
  onEntrarPiso,
  luces = true,
  atmosfera = true,
}) {
  const perfil = perfilDeTier(tier);
  // el clima se cuantiza a pasos para no recolorear el monte en cada píxel del slider
  const d = Math.round(clamp(clima, 0, 1) * 20) / 20;
  const geo = useMonte(perfil.segmentosTerreno, perfil.flatShading, d);
  const condores = tier === 'alto' ? 2 : tier === 'medio' ? 1 : 0;
  const frailejones = tier === 'alto' ? 16 : tier === 'medio' ? 9 : 0;

  const anclaParamo = useMemo(
    () => anclaLadera(CENTROS.paramo.x, CENTROS.paramo.base, d, CENTROS.paramo.factor),
    [d],
  );

  return (
    <>
      {atmosfera && <color attach="background" args={[ATMOSFERA.fondo]} />}
      {atmosfera && perfil.fog && <fogExp2 attach="fog" args={[ATMOSFERA.niebla, 0.03]} />}
      {luces && <LucesDoradas />}
      <SolDorado />
      <CordilleraFondo />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* frailejonar del páramo, junto a la queñua */}
      {frailejones > 0 && <Frailejones centro={anclaParamo} cuantos={frailejones} />}

      {/* el ÁRBOL MAYOR de cada piso, resaltado y clicable */}
      {['calido', 'templado', 'frio', 'paramo'].map((pid) => (
        <HeroArbol
          key={pid}
          pisoId={pid}
          d={d}
          tier={tier}
          reducedMotion={reducedMotion}
          onEntrar={onEntrarPiso}
          resaltado={pisoUsuario === pid}
        />
      ))}

      {/* el cóndor andino, planeando sobre la nieve (fauna realista) */}
      {Array.from({ length: condores }).map((_, i) => (
        <CondorAndino
          key={i}
          radio={5.5 + i * 1.6}
          altura={6.6 + i * 0.5}
          fase={i * 2.3}
          reducedMotion={reducedMotion}
          escala={1 - i * 0.15}
        />
      ))}
    </>
  );
}

/* Estilos de la galería (viven aquí: son de ESTA escena). Familia visual de
   VistaGlobalSierra: marfil cálido, rótulos redondeados, pie sobrio. */
const CSS = `
.gsierra-root { position: relative; width: 100%; height: 100dvh; min-height: 340px; overflow: hidden; background: ${ATMOSFERA.fondo}; }
.gsierra-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
.gsierra-canvas--lista { opacity: 1; }
.gsierra-rotulo { display: flex; flex-direction: column; align-items: center; gap: 0.05rem; padding: 0.22rem 0.55rem; border-radius: 0.6rem; background: rgba(255,248,233,0.9); box-shadow: 0 2px 8px rgba(60,42,24,0.22); white-space: nowrap; }
.gsierra-rotulo__piso { font: 600 0.62rem/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.06em; color: #8a6a3a; }
.gsierra-rotulo__arbol { font: 700 0.9rem/1.1 system-ui, sans-serif; color: #33240f; }
.gsierra-rotulo__cient { font: italic 500 0.68rem/1.1 Georgia, serif; color: #5a4326; opacity: 0.85; }
.gsierra-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.gsierra-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #3a2a18; text-shadow: 0 1px 4px rgba(255,246,224,0.85); font: 700 1.18rem/1.2 system-ui, sans-serif; }
.gsierra-titulo small { display: block; font: 500 0.82rem/1.3 system-ui, sans-serif; opacity: 0.78; margin-top: 0.15rem; }
.gsierra-abajo { display: flex; flex-direction: column; gap: 0.55rem; padding: 0 0.85rem 0.85rem; }
.gsierra-clima { pointer-events: auto; align-self: stretch; max-width: 34rem; margin: 0 auto; width: 100%; padding: 0.6rem 0.85rem; border-radius: 0.8rem; background: rgba(255,248,233,0.86); backdrop-filter: blur(3px); box-shadow: 0 4px 16px rgba(60,42,24,0.18); }
.gsierra-clima__fila { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; margin-bottom: 0.3rem; }
.gsierra-clima__label { font: 600 0.78rem/1.1 system-ui, sans-serif; color: #3a2a18; }
.gsierra-clima__anio { font: 700 1.05rem/1 system-ui, sans-serif; color: #8a5a1f; font-variant-numeric: tabular-nums; }
.gsierra-clima input[type=range] { width: 100%; accent-color: #b5763a; }
.gsierra-clima__nota { margin: 0.25rem 0 0; font: 500 0.72rem/1.35 system-ui, sans-serif; color: #4a3720; opacity: 0.9; }
.gsierra-pie { pointer-events: none; display: flex; justify-content: center; }
.gsierra-pie p { margin: 0; max-width: 42rem; text-align: center; padding: 0.42rem 0.85rem; border-radius: 0.7rem; background: rgba(24,16,7,0.5); backdrop-filter: blur(3px); color: #f4ecdd; font: 500 0.74rem/1.4 system-ui, sans-serif; }
@media (prefers-reduced-motion: reduce) { .gsierra-canvas { transition: none; } }
`;

/**
 * GaleriaSierraArboles — la vista global montable con su propio <Canvas>. Trae la
 * cámara de establishing, la órbita acotada al frente del macizo, el título, el
 * SLIDER CLIMÁTICO hoy→2050 y el pie de crédito a los cuatro pueblos.
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']
 * @param {boolean} [props.reducedMotion=false]
 * @param {string}  [props.pisoUsuario]  piso de la finca a resaltar (opcional).
 * @param {(pisoId:string)=>void} [props.onEntrarPiso]  navegar al mundo del piso.
 * @param {string}  [props.className]
 */
export default function GaleriaSierraArboles({
  tier = 'alto',
  reducedMotion = false,
  pisoUsuario,
  onEntrarPiso,
  className = '',
}) {
  const [listo, setListo] = useState(false);
  const [clima, setClima] = useState(0);
  const perfil = perfilDeTier(tier);
  const anio = Math.round(2026 + clima * 24); // hoy(2026) → 2050

  return (
    <section
      className={`gsierra-root${className ? ` ${className}` : ''}`}
      data-tier={tier}
      aria-label="Vista global de la Sierra: galería de mundos por piso térmico, con el árbol mayor de cada piso"
    >
      <style>{CSS}</style>
      <Canvas
        className={`gsierra-canvas${listo ? ' gsierra-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [0, 4.6, 15.5], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <SierraArbolesDiorama
          tier={tier}
          reducedMotion={reducedMotion}
          clima={clima}
          pisoUsuario={pisoUsuario}
          onEntrarPiso={onEntrarPiso}
        />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={10}
          maxDistance={19}
          target={[0, 3, -1.5]}
          minPolarAngle={0.95}
          maxPolarAngle={1.42}
          minAzimuthAngle={-0.55}
          maxAzimuthAngle={0.55}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.08}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="gsierra-chrome">
        <h2 className="gsierra-titulo">
          La Sierra por pisos térmicos
          <small>Cada piso y su árbol mayor: de la ceiba abajo a la queñua del páramo</small>
        </h2>

        <div className="gsierra-abajo">
          {/* SLIDER CLIMÁTICO: el corrimiento de los pisos hoy→2050 */}
          <div className="gsierra-clima">
            <div className="gsierra-clima__fila">
              <span className="gsierra-clima__label">El clima que viene</span>
              <span className="gsierra-clima__anio" aria-live="polite">
                {anio <= 2026 ? 'Hoy' : anio}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={clima}
              onChange={(e) => setClima(Number(e.target.value))}
              aria-label={`Año de proyección climática: ${anio}. Deslice para ver cómo suben los pisos térmicos.`}
            />
            <p className="gsierra-clima__nota">
              {clima < 0.06
                ? 'Los pisos térmicos hoy. Deslice hacia 2050 para ver cómo el calor los empuja cuesta arriba.'
                : `Con el calentamiento, cada piso trepa la montaña: el páramo reduce su área y la nieve retrocede. Los árboles migran buscando su clima.`}
            </p>
          </div>

          <div className="gsierra-pie">
            <p role="contentinfo">
              Territorio ancestral y sagrado de los pueblos Kogui, Arhuaco (Iku),
              Wiwa y Kankuamo — el Corazón del Mundo, dentro de la Línea Negra.
              Representado con respeto; su uso público requiere consulta con las
              comunidades.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
