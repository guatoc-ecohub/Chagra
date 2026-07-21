/*
 * ARRIERÍA DEL VALLE — la logística visible (el alma tipo Settlers/AoE).
 *
 * La mula de carga camina los SENDEROS existentes llevando la materia de la
 * finca: estiércol del potrero a la pila al amanecer, compost de la pila a
 * las eras en la mañana, la cosecha de la milpa y de la huerta a la casa por
 * la tarde. Va CARGADA a la ida (los bultos se VEN sobre la enjalma), se
 * PARA en el destino, suelta la carga (los bultos se desvanecen y en el
 * suelo CRECE una pila de entrega) y vuelve VACÍA. Al mediodía descansa a
 * la sombra; de noche está desaparejada en el potrero (no se dibuja).
 * El mapa franja → viaje vive en arrieriaRutas.js (datos puros) y Angelita
 * lo narra con `acarreoAhora()`.
 *
 * Por qué una mula y no un tercer campesino: el valle tiene EXACTAMENTE DOS
 * campesinos (decisión de dirección). La arriería es el flujo de materia
 * hecho animal de trabajo — coherente con la finca campesina real.
 *
 * Mismo lenguaje que los campesinos del valle: billboard `<Html>` barato,
 * SVG rubber-hose (tinta gruesa, patas de manguera, silueta mula: orejas
 * largas + enjalma), aria-hidden, cero toques. Las pilas de entrega son UNA
 * InstancedMesh de 3 conos low-poly (1 draw call). AUTOCONTENIDO: dibujo +
 * keyframes viven aquí; no toca Valle3D ni composicionValle3D.
 *
 * Props (mismo contrato que CampesinosValle):
 *   alturaDe(x, z) → y   posa la mula y las pilas en el terreno real
 *   franja               franja/clima del valle ('amanecer'…'noche' o piel
 *                        tipo 'lluvia'); null → reloj real del equipo
 *   tier                 'bajo' | 'medio' | 'alto' — la mula vive en todos
 *                        (1 billboard es el piso); las pilas de entrega
 *                        solo en medio/alto
 *   reducedMotion        true → plantada a media ruta con su carga, digna
 *                        (sin marcha); pilas a media entrega
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { horaDeReloj } from '../../visual/mundo3d/cielosHoraData.js';
import { normalizarFranja } from './campesinosFaenas.js';
import { ACARREO_POR_FRANJA, CARGAS_ACARREO } from './arrieriaRutas.js';

/* ── La tinta y la piel (mismo INK del kit rubber-hose) ─────────────────── */
const INK = '#2a1a0c';
const PARDO = '#8f7663'; // mula parda de trabajo
const PANZA = '#a89275';
const CRIN = '#3a2b1c';
const HOCICO = '#c9b299';
const ENJALMA_ROJO = '#a33b2e'; // la manta tejida del aparejo
const ENJALMA_VERDE = '#3f6b46';
const ENJALMA_CREMA = '#d9c27a';

/* ── CSS de la marcha — inyectado UNA vez ────────────────────────────────
   `av--anim` = hay animación (reducedMotion off). `av--anda` = está EN
   MARCHA: lo pone/quita el useFrame en las puntas de la ruta, así la mula
   se PARA de verdad a cargar y descargar (las patas no pedalean en el
   aire). Cola, orejas y vapor viven bajo av--anim a secas: una mula parada
   nunca está muerta. */
const STYLE_ID = 'av-arrieria-valle';
const CSS = `
.av-mula { pointer-events: none; will-change: transform; }
.av-mula svg { display: block; overflow: visible; }
.av-g { transform-box: fill-box; }
.av-carga-slot { transition: opacity 0.45s ease; }

/* marcha: paso diagonal de mula (par a / par b a contratiempo) */
.av--anim.av--anda .av-pata-a { animation: avPata 0.72s ease-in-out infinite; }
.av--anim.av--anda .av-pata-b { animation: avPata 0.72s ease-in-out infinite; animation-delay: -0.36s; }
@keyframes avPata { 0%, 100% { transform: rotate(13deg); } 50% { transform: rotate(-13deg); } }
.av--anim.av--anda .av-marcha { animation: avMarcha 0.36s ease-in-out infinite; }
@keyframes avMarcha { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
.av--anim.av--anda .av-cabeza-anda { animation: avCabeza 0.72s ease-in-out infinite; }
@keyframes avCabeza { 0%, 100% { transform: rotate(2deg); } 50% { transform: rotate(-3deg); } }
/* los bultos amortiguan a contratiempo del lomo (follow-through) */
.av--anim.av--anda .av-carga { animation: avCarga 0.36s ease-in-out infinite; animation-delay: -0.09s; }
@keyframes avCarga { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-1.8deg); } }

/* vida de fondo (también parada): cola espantamoscas, oreja que gira */
.av--anim .av-cola { animation: avCola 1.9s ease-in-out infinite; }
@keyframes avCola { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(11deg); } }
.av--anim .av-oreja { animation: avOreja 5.4s ease-in-out infinite; }
@keyframes avOreja {
  0%, 86%, 100% { transform: rotate(0deg); }
  90% { transform: rotate(-20deg); }
  95% { transform: rotate(5deg); }
}
/* descanso del mediodía: la cabeza baja y tantea el pasto, despacio */
.av--anim .av-pasta { animation: avPasta 6.4s ease-in-out infinite; }
@keyframes avPasta { 0%, 100% { transform: rotate(14deg); } 50% { transform: rotate(21deg); } }
/* el vapor del compost vivo (mismo gesto que la pila de la biofábrica) */
.av--anim .av-vapor { animation: avVapor 4.2s ease-in-out infinite; }
@keyframes avVapor {
  0% { opacity: 0; transform: translateY(2px) scale(0.8); }
  30% { opacity: 0.5; }
  70% { opacity: 0.22; }
  100% { opacity: 0; transform: translateY(-6px) scale(1.15); }
}

@media (prefers-reduced-motion: reduce) {
  .av--anim * { animation: none !important; }
}
`;

function useEstiloArrieria() {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
    // Compartido entre instancias (~2KB): no se retira al desmontar.
  }, []);
}

/* ── Las cargas sobre la enjalma (una por tipo, legibles de lejos) ──────── */

/** Dos bultos oscuros amarrados: estiércol o compost (con su vapor). */
function CargaBultos({ color, conVapor = false }) {
  return (
    <g>
      <ellipse cx="-5" cy="-15.5" rx="3.6" ry="3" fill={color} stroke={INK} strokeWidth="1" />
      <ellipse cx="2.8" cy="-16" rx="4" ry="3.3" fill={color} stroke={INK} strokeWidth="1" />
      {/* los amarres */}
      <path d="M -8 -15 Q -5 -13.2 -1.8 -14.6 M -1 -15.6 Q 2.6 -13.6 6.4 -15.2" stroke={INK} strokeWidth="0.7" fill="none" />
      {conVapor && (
        <g className="av-g av-vapor">
          <path d="M -4.5 -19 q -1 -2 0.3 -3.8 M 3 -19.8 q 1 -1.8 -0.2 -3.4" stroke="#cfd8cf" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

/** Canasto de bejuco con la cosecha asomando. */
function CargaCanasto({ frutos }) {
  return (
    <g>
      <path d="M -5.4 -19 L 4.6 -19 L 3.2 -12.8 L -4 -12.8 Z" fill="#b98a4e" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M -4.9 -17 L 4.1 -17 M -4.4 -14.9 L 3.6 -14.9 M -2.6 -18.8 L -2.9 -13 M 0 -18.8 L 0 -13 M 2.4 -18.8 L 2.1 -13" stroke="#7a5427" strokeWidth="0.6" />
      {frutos}
    </g>
  );
}

/** Mazorcas amarillas con su capacho: la cosecha de la milpa. */
function FrutosMaiz() {
  return (
    <g>
      <ellipse cx="-2.8" cy="-19.8" rx="2.4" ry="1.3" fill="#e8c04a" stroke={INK} strokeWidth="0.6" transform="rotate(-18 -2.8 -19.8)" />
      <ellipse cx="1.6" cy="-20.2" rx="2.5" ry="1.3" fill="#d9a53a" stroke={INK} strokeWidth="0.6" transform="rotate(12 1.6 -20.2)" />
      <path d="M -5 -19.4 q -1.6 -0.8 -2.2 -2 M 4 -20 q 1.4 -1 1.7 -2.4" stroke="#5d7a3a" strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** Tomates y hoja verde: la cosecha de la huerta. */
function FrutosHortaliza() {
  return (
    <g>
      <circle cx="-2.6" cy="-19.8" r="1.5" fill="#c0392b" stroke={INK} strokeWidth="0.5" />
      <circle cx="0.6" cy="-20.4" r="1.4" fill="#e67e22" stroke={INK} strokeWidth="0.5" />
      <circle cx="3" cy="-19.6" r="1.3" fill="#c0392b" stroke={INK} strokeWidth="0.5" />
      <path d="M -4.6 -19.6 q -1.4 -1.4 -1.2 -3 q 1.6 0.4 2.2 1.8" fill="#5d7a3a" stroke={INK} strokeWidth="0.5" />
    </g>
  );
}

const CARGAS_SVG = {
  estiercol: <CargaBultos color="#4a3a24" />,
  compost: <CargaBultos color="#3d2e1c" conVapor />,
  maiz: <CargaCanasto frutos={<FrutosMaiz />} />,
  hortaliza: <CargaCanasto frutos={<FrutosHortaliza />} />,
};

/* ── LA MULA (perfil, mira a +X; viewBox -30 -26 60 46, suelo y=18) ─────── */

/** Pata de manguera con pezuña; el par lejano va apenas más hundido. */
function Pata({ x, clase, lejos = false }) {
  const px = x + (lejos ? 0.9 : 0);
  return (
    <g className={`av-g ${clase}`} style={{ transformOrigin: '50% 6%' }}>
      <path d={`M ${px} 1 L ${px + 0.4} 15`} stroke={INK} strokeWidth={lejos ? 2.1 : 2.5} fill="none" strokeLinecap="round" opacity={lejos ? 0.82 : 1} />
      <ellipse cx={px + 0.6} cy="16.3" rx="2" ry="1.1" fill="#241c14" stroke={INK} strokeWidth="0.7" />
    </g>
  );
}

/**
 * La mula entera. `pose`: 'marcha' (cabeza al frente, nod de paso) o
 * 'descanso' (cabeza baja tanteando el pasto). `carga`: clave de
 * CARGAS_ACARREO o null (enjalma sola = vuelve vacía). `cargaRef` recibe el
 * <g> del bulto para que el useFrame lo prenda/apague al cargar/descargar.
 */
function MulaSvg({ pose = 'marcha', carga = null, cargaRef = null }) {
  const descansa = pose === 'descanso';
  return (
    <g>
      {/* sombra de contacto: asienta el billboard en el suelo */}
      <ellipse cx="0" cy="17.4" rx="16" ry="2" fill="#1e2a1a" opacity="0.14" />
      {/* par lejano de patas (diagonal b) */}
      <Pata x={-10} clase="av-pata-b" lejos />
      <Pata x={11.6} clase="av-pata-b" lejos />
      {/* la cola espantamoscas */}
      <g className="av-g av-cola" style={{ transformOrigin: '80% 10%' }}>
        <path d="M -15.5 -6 Q -19 0 -18 6.5" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <ellipse cx="-18" cy="7.6" rx="1.7" ry="2.2" fill={CRIN} stroke={INK} strokeWidth="0.7" />
      </g>
      {/* cuerpo: barril de mula con panza clara */}
      <g className="av-g av-marcha">
        <ellipse cx="-1" cy="-3" rx="15" ry="8.2" fill={PARDO} stroke={INK} strokeWidth="1.3" />
        <ellipse cx="-1" cy="0.6" rx="11.5" ry="4.6" fill={PANZA} opacity="0.75" />
        {/* la ENJALMA: manta tejida + cincha (siempre puesta: mula de trabajo) */}
        <g>
          <path d="M -8.5 -11.6 L 6.5 -11.6 Q 8 -8 6.5 -4.6 L -8.5 -4.6 Q -10 -8 -8.5 -11.6 Z" fill={ENJALMA_ROJO} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M -8.9 -9.4 L 6.9 -9.4" stroke={ENJALMA_VERDE} strokeWidth="1.7" />
          <path d="M -8.8 -6.6 L 6.8 -6.6" stroke={ENJALMA_CREMA} strokeWidth="1.2" />
          <path d="M -1 -4.6 L -1 4.6" stroke="#5c4630" strokeWidth="1.2" />
        </g>
        {/* LA CARGA: visible a la ida, se desvanece al descargar (cargaRef) */}
        {carga && CARGAS_SVG[carga] && (
          <g ref={cargaRef} className="av-carga-slot" style={{ opacity: 1 }}>
            <g className="av-g av-carga" style={{ transformOrigin: '50% 100%' }}>
              {CARGAS_SVG[carga]}
            </g>
          </g>
        )}
        {/* cuello + cabeza: pivota en la base del cuello */}
        <g
          className={`av-g ${descansa ? 'av-pasta' : 'av-cabeza-anda'}`}
          style={{ transformOrigin: '30% 85%' }}
          transform={descansa ? 'rotate(16)' : undefined}
        >
          <path d="M 8 -9.5 Q 13.5 -11.5 15.5 -18 L 20.5 -15.5 Q 17 -8.5 13.5 -4.5 Q 10 -6.5 8 -9.5 Z" fill={PARDO} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
          {/* la crin corta de mula por el filo del cuello */}
          <path d="M 9 -10.5 Q 13 -12.5 15 -17.5" stroke={CRIN} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* cabeza con hocico largo */}
          <g>
            <circle cx="18.6" cy="-16.6" r="3.4" fill={PARDO} stroke={INK} strokeWidth="1.1" />
            <ellipse cx="23" cy="-14.8" rx="4.4" ry="2.5" fill={PARDO} stroke={INK} strokeWidth="1.1" transform="rotate(-14 23 -14.8)" />
            <ellipse cx="25.4" cy="-14.2" rx="1.9" ry="1.6" fill={HOCICO} stroke={INK} strokeWidth="0.8" />
            <circle cx="25.8" cy="-14.6" r="0.4" fill={INK} />
            {/* el ojo de tinta con brillo (la firma rubber-hose) */}
            <ellipse cx="19.4" cy="-17.2" rx="0.95" ry="1.4" fill={INK} />
            <circle cx="19.1" cy="-17.7" r="0.32" fill="#fff" opacity="0.9" />
            {/* LAS OREJAS LARGAS: la silueta que dice "mula" desde lejos */}
            <g className="av-g av-oreja" style={{ transformOrigin: '50% 95%' }}>
              <ellipse cx="16.6" cy="-23.5" rx="1.25" ry="3.8" fill={PARDO} stroke={INK} strokeWidth="1" transform="rotate(-14 16.6 -23.5)" />
              <ellipse cx="16.9" cy="-22.6" rx="0.5" ry="2.2" fill={HOCICO} opacity="0.7" transform="rotate(-14 16.9 -22.6)" />
            </g>
            <ellipse cx="20" cy="-23.2" rx="1.2" ry="3.6" fill={PARDO} stroke={INK} strokeWidth="1" transform="rotate(10 20 -23.2)" />
          </g>
        </g>
      </g>
      {/* par cercano de patas (diagonal a) — delante del cuerpo */}
      <Pata x={-12.4} clase="av-pata-a" />
      <Pata x={9} clase="av-pata-a" />
    </g>
  );
}

/* ── Billboard (mismo contrato que CampesinoBillboard) ──────────────────── */
function MulaBillboard({ def, pose, carga, animated, anda, rootRef = null, flipRef = null, cargaRef = null }) {
  const w = def.px;
  const h = Math.round(def.px * 0.78); // viewBox 60×46
  return (
    <Html center distanceFactor={def.factor} zIndexRange={[6, 0]} pointerEvents="none">
      <div
        ref={rootRef}
        className={`valle-critter av-mula ${animated ? 'av--anim' : ''} ${animated && anda ? 'av--anda' : ''}`}
        data-arrieria={carga ?? pose}
        aria-hidden="true"
      >
        <div ref={flipRef} style={{ width: w, height: h }}>
          <svg viewBox="-30 -26 60 46" width={w} height={h}>
            <MulaSvg pose={pose} carga={carga} cargaRef={cargaRef} />
          </svg>
        </div>
      </div>
    </Html>
  );
}

/* Polilínea por longitud de arco (mismo patrón que CampesinosValle;
   copiado para mantener el módulo autocontenido). */
function prepararRuta(puntos) {
  const largos = [0];
  for (let i = 1; i < puntos.length; i++) {
    const dx = puntos[i][0] - puntos[i - 1][0];
    const dz = puntos[i][1] - puntos[i - 1][1];
    largos.push(largos[i - 1] + Math.hypot(dx, dz));
  }
  return { puntos, largos, total: largos[largos.length - 1] || 1 };
}

function puntoEnRuta(ruta, s) {
  const d = s * ruta.total;
  let i = 1;
  while (i < ruta.largos.length - 1 && ruta.largos[i] < d) i++;
  const d0 = ruta.largos[i - 1];
  const seg = ruta.largos[i] - d0 || 1;
  const t = (d - d0) / seg;
  const [x0, z0] = ruta.puntos[i - 1];
  const [x1, z1] = ruta.puntos[i];
  return { x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, dx: x1 - x0 };
}

/* Desfases de las pilas de entrega alrededor del punto de destino. */
const PILA_OFFSETS = [
  [0.32, 0.22],
  [-0.14, 0.38],
  [0.1, -0.18],
];

/**
 * La mula EN VIAJE: ping-pong por la ruta con meseta en las puntas — llega,
 * se PARA (av--anda off), la carga se desvanece, una pila CRECE en el
 * destino, y arranca de vuelta vacía. Al volver al origen la carga reaparece.
 */
function MulaEnViaje({ def, alturaDe, reducedMotion, conPilas }) {
  const grupo = useRef(null);
  const root = useRef(null);
  const flip = useRef(null);
  const cargaEl = useRef(null);
  const pilas = useRef(null);
  const reloj = useRef(0);
  const cicloPrev = useRef(0);
  const entregas = useRef(reducedMotion ? 2 : 0);
  const pilasSucias = useRef(true);
  const colocado = useRef(false);
  const ruta = useMemo(() => prepararRuta(def.ruta), [def.ruta]);
  const util = useMemo(() => ({ o: new THREE.Object3D() }), []);
  const destino = def.ruta[def.ruta.length - 1];

  useFrame((_, delta) => {
    if (!grupo.current) return;
    if (reducedMotion && colocado.current) return;
    const dt = reducedMotion ? 0 : Math.min(delta, 0.1);
    // reloj en "tramos": 1 unidad = un sentido completo de la ruta
    reloj.current += dt * (def.velocidad / ruta.total);
    const ciclo = reducedMotion ? 0.5 : reloj.current % 2;
    // meseta del 8% en cada punta: el cargue/descargue se VE quieto
    const u = ciclo < 1 ? ciclo : 2 - ciclo;
    const s = Math.min(1, Math.max(0, (u - 0.08) / 0.84));
    const se = s * s * (3 - 2 * s);
    const { x, z, dx } = puntoEnRuta(ruta, se);
    const y = (alturaDe ? alturaDe(x, z) : 0) + (def.dy ?? 0.5);
    grupo.current.position.set(x, y, z);

    const anda = !reducedMotion && s > 0.02 && s < 0.98;
    if (root.current) root.current.classList.toggle('av--anda', anda);
    if (flip.current && anda) {
      const dir = (ciclo < 1 ? dx : -dx) >= 0 ? 1 : -1;
      flip.current.style.transform = `scaleX(${dir})`;
    }
    // cargada a la ida, vacía a la vuelta (la transición CSS la desvanece)
    if (cargaEl.current) cargaEl.current.style.opacity = ciclo < 1 ? '1' : '0';
    // una ENTREGA cada vez que remata la ida: la pila del destino crece
    if (cicloPrev.current < 1 && ciclo >= 1) {
      entregas.current = Math.min(PILA_OFFSETS.length, entregas.current + 1);
      pilasSucias.current = true;
    }
    cicloPrev.current = ciclo;

    if (pilas.current && pilasSucias.current) {
      const { o } = util;
      for (let i = 0; i < PILA_OFFSETS.length; i++) {
        const px = destino[0] + PILA_OFFSETS[i][0];
        const pz = destino[1] + PILA_OFFSETS[i][1];
        o.position.set(px, (alturaDe ? alturaDe(px, pz) : 0) + 0.09, pz);
        o.rotation.set(0, i * 2.1, 0);
        o.scale.setScalar(i < entregas.current ? 0.85 + i * 0.12 : 0.0001);
        o.updateMatrix();
        pilas.current.setMatrixAt(i, o.matrix);
      }
      pilas.current.instanceMatrix.needsUpdate = true;
      pilasSucias.current = false;
    }
    colocado.current = true;
  });

  // Posición inicial (antes del primer frame): el arranque de la ruta.
  const p0 = puntoEnRuta(ruta, reducedMotion ? 0.5 : 0);
  const y0 = (alturaDe ? alturaDe(p0.x, p0.z) : 0) + (def.dy ?? 0.5);
  const colorPila = CARGAS_ACARREO[def.carga]?.pila ?? '#4a3a24';

  return (
    <group>
      <group ref={grupo} position={[p0.x, y0, p0.z]}>
        <MulaBillboard
          def={def}
          pose="marcha"
          carga={def.carga}
          animated={!reducedMotion}
          anda={!reducedMotion}
          rootRef={root}
          flipRef={flip}
          cargaRef={cargaEl}
        />
      </group>
      {/* las pilas de entrega: lo acarreado SE ACUMULA en el destino */}
      {conPilas && (
        <instancedMesh
          key={`pilas-${def.carga}`}
          ref={pilas}
          args={[undefined, undefined, PILA_OFFSETS.length]}
          frustumCulled={false}
        >
          <coneGeometry args={[0.17, 0.2, 6]} />
          <meshLambertMaterial color={colorPila} />
        </instancedMesh>
      )}
    </group>
  );
}

/** La mula al MEDIODÍA: aparejada a la sombra, cabeza al pasto, cola viva. */
function MulaDescansa({ def, alturaDe, reducedMotion }) {
  const [x, z] = def.punto;
  const y = (alturaDe ? alturaDe(x, z) : 0) + (def.dy ?? 0.5);
  return (
    <group position={[x, y, z]}>
      <MulaBillboard def={def} pose="descanso" carga={null} animated={!reducedMotion} anda={false} />
    </group>
  );
}

/* Franja del campo: manda la de la escena; sin prop, el reloj real con
   chequeo suave por minuto (mismo patrón que CampesinosValle). */
function useFranjaCampo(franjaProp) {
  const [deReloj, setDeReloj] = useState(() => horaDeReloj());
  useEffect(() => {
    if (franjaProp) return undefined;
    const id = setInterval(() => {
      setDeReloj((prev) => {
        const f = horaDeReloj();
        return f === prev ? prev : f;
      });
    }, 60000);
    return () => clearInterval(id);
  }, [franjaProp]);
  return normalizarFranja(franjaProp) ?? deReloj;
}

/**
 * <ArrieriaValle> — la logística visible del valle: la mula de carga
 * moviendo la materia de la finca por los senderos, según la hora del campo.
 *
 * @param {Object} props
 * @param {(x:number, z:number) => number} props.alturaDe  y del terreno
 * @param {string|null} [props.franja=null]  franja/clima de la escena;
 *   null → reloj real
 * @param {'bajo'|'medio'|'alto'} [props.tier='alto']  pilas de entrega solo
 *   en medio/alto; la mula vive en todos los tiers
 * @param {boolean} [props.reducedMotion=false]
 */
export function ArrieriaValle({ alturaDe, tier = 'alto', reducedMotion = false, franja = null }) {
  useEstiloArrieria();
  const franjaCampo = useFranjaCampo(franja);
  const def = ACARREO_POR_FRANJA[franjaCampo] ?? ACARREO_POR_FRANJA.manana;
  if (def.visible === false) return null; // desaparejada: la noche es de descanso
  if (def.descansa) {
    return <MulaDescansa def={def} alturaDe={alturaDe} reducedMotion={reducedMotion} />;
  }
  return (
    <MulaEnViaje
      key={`viaje-${franjaCampo}`} // franja nueva → viaje nuevo, pilas en cero
      def={def}
      alturaDe={alturaDe}
      reducedMotion={reducedMotion}
      conPilas={tier !== 'bajo'}
    />
  );
}

export default ArrieriaValle;
