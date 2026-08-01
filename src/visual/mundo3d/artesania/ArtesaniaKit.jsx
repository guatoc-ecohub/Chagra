/*
 * ArtesaniaKit — las piezas del taller listas para montar en cualquier mundo.
 *
 * Componentes R3F finos sobre las fábricas de `geometriasArtesania.js` y las
 * recetas de `materialesArtesania.js`. La idea: que un mundo pida "una cerca",
 * "un marco", "un panel" y reciba algo que se ve HECHO A MANO — sin conocer
 * las tres reglas que lo logran (ya vienen adentro).
 *
 *   <CuerdaFique>    — la soga trenzada que cuelga entre dos puntos.
 *   <PosteGuadua>    — el poste con nudos, hincado con su desplome.
 *   <CercaTejida>    — postes + sogas: la cerca campesina en dos props.
 *   <MarcoTelar>     — el marco de varas cruzadas y amarradas (portales,
 *                      cuadros, bordes de panel — regla 2 en las esquinas).
 *   <PanelArtesanal> — tela tejida + marco + guarda: el contenedor/letrero
 *                      de la casa (metele children y ya es UI de mundo).
 *   <VasijaChamba>   — la loza negra bruñida (siluetas del 2D, torneadas).
 *   <CanastoAndino>  — el canasto de rollo con su sarga de fique.
 *
 * Contrato de siempre: `perfil` es `perfilDeTier(tier)` — sin él degrada a
 * Lambert (gama media/baja). Memoización + dispose adentro; nada por frame.
 * Esto vive FUERA del chunk base: montalo solo desde escenas 3D (escenas/).
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { rngArtesania } from '../artesaniaAndina.js';
import { MANO } from './tramaAndina.js';
import {
  crearCuerdaFique,
  crearCuerdasFique,
  crearGuadua,
  crearAmarra,
  crearVasijaAmano,
  crearCanastoEspiral,
} from './geometriasArtesania.js';
import { crearMaterialArtesania } from './materialesArtesania.js';

/* Memoiza una geometría y la libera al desmontar. */
function useGeo(fabrica, deps) {
  const geo = useMemo(fabrica, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

/* Memoiza un material de taller y lo libera al desmontar (las texturas son
   compartidas del caché: material.dispose() no las toca). */
function useMatTaller(nombre, perfil, extra, mapa) {
  const mat = useMemo(
    () => crearMaterialArtesania(nombre, perfil, extra, mapa),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nombre, perfil, JSON.stringify(extra), JSON.stringify(mapa)],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}

/* ------------------------------------------------------------------ */
/* CUERDA — el conector visual de la casa (la pista del grafo, con     */
/* cuerpo). Puntos en el espacio del padre; la comba ya viene puesta.  */
/* ------------------------------------------------------------------ */
export function CuerdaFique({
  de = [0, 0.8, 0],
  a = [1.4, 0.8, 0],
  comba = MANO.vencimientoCuerda,
  radio = 0.035,
  hebras = 2,
  seed = 7,
  perfil = {},
  color,
}) {
  const geo = useGeo(
    () => crearCuerdaFique({ de, a, comba, radio, hebras, seed }),
    [...de, ...a, comba, radio, hebras, seed],
  );
  const mat = useMatTaller('fique', perfil, color ? { color } : {});
  return <mesh geometry={geo} material={mat} />;
}

/* ------------------------------------------------------------------ */
/* POSTE — guadua hincada. El desplome (regla 1) es una rotación       */
/* seeded: cada poste se ladea PARA SU LADO, siempre el mismo.         */
/* ------------------------------------------------------------------ */
export function PosteGuadua({
  alto = 1.2,
  radio = 0.045,
  seed = 7,
  perfil = {},
  conAmarra = false, // la lazada en la cabeza (si algo se ata ahí)
  position = [0, 0, 0],
}) {
  const geo = useGeo(() => crearGuadua({ alto, radio, seed }), [alto, radio, seed]);
  const geoAmarra = useGeo(
    () => (conAmarra ? crearAmarra({ radio, seed }) : new THREE.BufferGeometry()),
    [conAmarra, radio, seed],
  );
  const mat = useMatTaller('guadua', perfil);
  const matFique = useMatTaller('fique', perfil);
  const desplome = useMemo(() => {
    const r = rngArtesania(seed + 3);
    return [(r() - 0.5) * 2 * MANO.inclinacionPoste, r() * Math.PI * 2, (r() - 0.5) * 2 * MANO.inclinacionPoste];
  }, [seed]);
  return (
    <group position={position} rotation={desplome}>
      <mesh geometry={geo} material={mat} />
      {conAmarra && <mesh geometry={geoAmarra} material={matFique} position={[0, alto * 0.88, 0]} />}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* CERCA — postes de guadua + sogas de fique que cuelgan entre ellos.  */
/* La cerca campesina completa en dos props (largo, postes). Costo:    */
/* 1 geometría de poste compartida + TODAS las sogas fundidas en una   */
/* sola malla → 2 draw calls + n meshes de poste baratos.              */
/* Corre a lo largo de +X desde el origen del grupo.                   */
/* ------------------------------------------------------------------ */
export function CercaTejida({
  largo = 4,
  alto = 0.95,
  postes = 4,
  cuerdas = 2, // hiladas de soga (1–3)
  seed = 7,
  perfil = {},
  ...props
}) {
  const paso = largo / Math.max(1, postes - 1);
  const geoPoste = useGeo(
    () => crearGuadua({ alto, radio: 0.042, seed }),
    [alto, seed],
  );
  const geoSogas = useGeo(() => {
    const alturas = [];
    for (let c = 0; c < cuerdas; c += 1) {
      alturas.push(alto * (0.9 - c * (0.55 / Math.max(1, cuerdas))));
    }
    const tendidas = [];
    for (let i = 0; i < postes - 1; i += 1) {
      for (const hy of alturas) {
        tendidas.push({ de: [i * paso, hy, 0], a: [(i + 1) * paso, hy, 0], seed: seed + i * 31 + Math.round(hy * 97) });
      }
    }
    return crearCuerdasFique(tendidas, { radio: 0.026, tramos: 12, radial: 4 });
  }, [largo, alto, postes, cuerdas, seed, paso]);
  const matGuadua = useMatTaller('guadua', perfil);
  const matFique = useMatTaller('fique', perfil);
  const desplomes = useMemo(() => {
    const r = rngArtesania(seed + 11);
    return Array.from({ length: postes }, () => [
      (r() - 0.5) * 2 * MANO.inclinacionPoste,
      r() * Math.PI * 2,
      (r() - 0.5) * 2 * MANO.inclinacionPoste,
    ]);
  }, [postes, seed]);
  return (
    <group {...props}>
      {desplomes.map((rot, i) => (
        <mesh
          key={i}
          geometry={geoPoste}
          material={matGuadua}
          position={[i * paso, 0, 0]}
          rotation={rot}
        />
      ))}
      <mesh geometry={geoSogas} material={matFique} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* MARCO — cuatro varas de guadua CRUZADAS (se pasan de la esquina,    */
/* regla 2) y amarradas con fique en cada unión. Centrado en el        */
/* origen, parado en el plano XY (de frente a +Z): listo para          */
/* enmarcar un panel, un portal, un cuadro del mundo.                  */
/* ------------------------------------------------------------------ */
export function MarcoTelar({
  ancho = 1.6,
  alto = 1,
  grosor = 0.04,
  seed = 7,
  perfil = {},
  conAmarras = true,
  ...props
}) {
  const cruce = MANO.cruceMarco * Math.min(ancho, alto) + grosor * 2;
  const geoV = useGeo(() => {
    const g = crearGuadua({ alto: alto + cruce * 2, radio: grosor, seed });
    g.translate(0, -(alto + cruce * 2) / 2, 0);
    return g;
  }, [alto, cruce, grosor, seed]);
  const geoH = useGeo(() => {
    const g = crearGuadua({ alto: ancho + cruce * 2, radio: grosor, seed: seed + 5 });
    g.translate(0, -(ancho + cruce * 2) / 2, 0);
    return g;
  }, [ancho, cruce, grosor, seed]);
  const geoAmarra = useGeo(() => {
    const g = crearAmarra({ radio: grosor * 1.3, grosor: grosor * 0.32, seed });
    g.rotateX(Math.PI / 2); // la lazada abraza el cruce (eje Z, hacia cámara)
    return g;
  }, [grosor, seed]);
  const matGuadua = useMatTaller('guadua', perfil);
  const matFique = useMatTaller('fique', perfil);
  const mx = ancho / 2;
  const my = alto / 2;
  /* las varas horizontales van APENAS adelante: se ve que están montadas
     una sobre otra, como en un marco amarrado de verdad */
  const zH = grosor * 0.9;
  return (
    <group {...props}>
      <mesh geometry={geoV} material={matGuadua} position={[-mx, 0, 0]} />
      <mesh geometry={geoV} material={matGuadua} position={[mx, 0, 0]} />
      <mesh geometry={geoH} material={matGuadua} position={[0, my, zH]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={geoH} material={matGuadua} position={[0, -my, zH]} rotation={[0, 0, Math.PI / 2]} />
      {conAmarras && [[-mx, my], [mx, my], [-mx, -my], [mx, -my]].map(([x, y], i) => (
        <mesh key={i} geometry={geoAmarra} material={matFique} position={[x, y, zH / 2]} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* PANEL — tela tejida + marco amarrado + guarda de acentos abajo.     */
/* EL contenedor de la casa: letreros, tarjetas de mundo, fondos de    */
/* hotspot. Los children se montan apenas adelante de la tela.         */
/* ------------------------------------------------------------------ */
export function PanelArtesanal({
  ancho = 1.6,
  alto = 1,
  seed = 7,
  perfil = {},
  conGuarda = true,
  children,
  ...props
}) {
  const matTela = useMatTaller(
    'tejido',
    perfil,
    { side: THREE.DoubleSide },
    { repetir: [Math.max(1, Math.round(ancho * 5)), Math.max(1, Math.round(alto * 5))] },
  );
  const matGuarda = useMatTaller(
    'guarda',
    perfil,
    { side: THREE.DoubleSide },
    { repetir: [Math.max(1, Math.round(ancho * 1.5)), 1] },
  );
  const altoGuarda = Math.min(0.14, alto * 0.16);
  return (
    <group {...props}>
      <mesh>
        <planeGeometry args={[ancho, alto]} />
        <primitive object={matTela} attach="material" />
      </mesh>
      {conGuarda && (
        <mesh position={[0, -alto / 2 + altoGuarda * 0.85, 0.004]}>
          <planeGeometry args={[ancho * 0.97, altoGuarda]} />
          <primitive object={matGuarda} attach="material" />
        </mesh>
      )}
      <MarcoTelar ancho={ancho} alto={alto} seed={seed} perfil={perfil} />
      {children && <group position={[0, 0, 0.02]}>{children}</group>}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* VASIJA — loza negra ahumada (o barro crudo con receta='barro').     */
/* `nombre` es cualquier silueta del 2D: 'vasija', 'mojon', 'telar'…   */
/* ------------------------------------------------------------------ */
export function VasijaChamba({
  nombre = 'vasija',
  alto = 0.5,
  seed = 7,
  perfil = {},
  receta = 'chamba',
  ...props
}) {
  const geo = useGeo(() => crearVasijaAmano(nombre, { alto, seed }), [nombre, alto, seed]);
  const mat = useMatTaller(receta, perfil);
  return <mesh geometry={geo} material={mat} {...props} />;
}

/* ------------------------------------------------------------------ */
/* CANASTO — cestería de rollo con su sarga de fique.                  */
/* ------------------------------------------------------------------ */
export function CanastoAndino({
  alto = 0.45,
  radio = 0.38,
  vueltas = 7,
  seed = 7,
  perfil = {},
  ...props
}) {
  const geo = useGeo(
    () => crearCanastoEspiral({ alto, radio, vueltas, seed }),
    [alto, radio, vueltas, seed],
  );
  const mat = useMatTaller('fique', perfil, { side: THREE.DoubleSide }, { repetir: [3, 2] });
  return <mesh geometry={geo} material={mat} {...props} />;
}
