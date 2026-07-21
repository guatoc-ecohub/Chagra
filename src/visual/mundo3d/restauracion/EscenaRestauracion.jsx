/*
 * EscenaRestauracion — el potrero volviéndose monte, a través del tiempo.
 *
 * Una ladera. Un año que se puede mover. Nada más.
 *
 * La cámara NO gira sola, y eso es a propósito. En las otras escenas el mundo se
 * pasea para lucirse; acá el que se mueve es el TIEMPO. Uno se para en el filo de
 * abajo de su lote —como quien llega a mirar la ladera— y desde ahí ve pasar
 * cincuenta años. Si la cámara también anduviera dando vueltas, el movimiento
 * dejaría de significar "está creciendo". Se puede arrastrar con el dedo si uno
 * quiere ver de otro lado, pero sola no se mueve. La tierra no se mueve: espera.
 *
 * TODO cuelga de una sola función: `dosel(anio)`, la sombra que hay arriba. De ahí
 * salen el sol que se apaga, la niebla que se instala, el suelo que se oscurece.
 * No son cinco escenas iluminadas a mano: es una consecuencia, calculada.
 *
 * El detalle que más me gusta: el año 50 aterriza EXACTO en la paleta del Bosque
 * Vivo (fondo #c3cfce, niebla #c9d3d1). No es coincidencia — es el mismo páramo.
 * Esta escena es de dónde VIENE aquel bosque. Al final del riel, uno ya está ahí.
 *
 * Importa three/@react-three → montar SOLO perezosa (lazy) desde el host.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import Ladera from './Ladera.jsx';
import AguaQueVuelve from './AguaQueVuelve.jsx';
import NieblaDelDosel from './NieblaDelDosel.jsx';
import AvesQueVuelven from './AvesQueVuelven.jsx';
import { sucDeTier } from './etapasSucesion.js';
import { dosel } from './tiempoSucesion.js';

/* -------------------------------------------------------------------------- */
/*  Los dos climas: el año 0 y el año 50                                       */
/* -------------------------------------------------------------------------- */

/*
 * El potrero pelado: sol CRUDO. Cielo lavado por la luz, aire seco y transparente
 * (se ve hasta el fondo), sombras duras. Un potrero de páramo al mediodía castiga.
 */
const CRUDO = {
  fondo: '#d9dcc9',
  niebla: '#d5d8c4',
  nieblaCerca: 26,
  nieblaLejos: 95,
  sol: '#fff4d6',
  solFuerza: 2.0,
  ambiente: '#cfc7a8',
  ambienteFuerza: 0.2,
  cielo: '#e8e6cf',
  suelo: '#8a6a45', // rebote de la tierra desnuda: caliente
  hemiFuerza: 0.5,
};

/*
 * El bosque hecho: luz fría, difusa, filtrada. Y la niebla que ya no se va.
 * Estos valores son LOS MISMOS de EscenaBosqueVivo — el año 50 de esta ladera es
 * literalmente la puerta de aquel mundo.
 */
const HUMEDO = {
  fondo: '#c3cfce',
  niebla: '#c9d3d1',
  nieblaCerca: 7,
  nieblaLejos: 32,
  sol: '#eef3f0',
  solFuerza: 0.8,
  ambiente: '#cdd7da',
  ambienteFuerza: 0.42,
  cielo: '#d7e2e4',
  suelo: '#3a3a2c', // rebote del mantillo: frío
  hemiFuerza: 0.95,
};

const mezclar = (a, b, t) => a + (b - a) * t;

/* -------------------------------------------------------------------------- */
/*  El reloj: la única variable de la pieza                                    */
/* -------------------------------------------------------------------------- */

/*
 * Lleva el año de la escena hacia el que pide la línea de tiempo, pero SUAVE. Sin
 * esto, soltar el deslizador en el año 50 haría aparecer un bosque de un golpe —
 * un truco de magia. Con esto, el monte CRECE hasta allá, aunque uno haya
 * arrastrado rápido. Lo que se ve nunca es un salto: siempre es un crecimiento.
 *
 * Con `reducedMotion` no hay suavizado (sería movimiento no pedido): el año se
 * pone donde toca y se pinta un cuadro a demanda.
 */
function Reloj({ anioRef, objetivo, reducedMotion }) {
  const { invalidate } = useThree();

  useEffect(() => {
    if (!reducedMotion) return;
    anioRef.current = objetivo;
    invalidate();
  }, [objetivo, reducedMotion, anioRef, invalidate]);

  useFrame((_, dt) => {
    if (reducedMotion) return;
    const d = objetivo - anioRef.current;
    if (Math.abs(d) < 0.002) {
      anioRef.current = objetivo;
      return;
    }
    anioRef.current += d * Math.min(1, dt * 3.4);
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  La atmósfera: el sol que se apaga porque creció el monte                   */
/* -------------------------------------------------------------------------- */

function Atmosfera({ anioRef, perfil }) {
  const { scene } = useThree();
  const sol = useRef(null);
  const amb = useRef(null);
  const hemi = useRef(null);

  const c = useMemo(
    () => ({
      fondo0: new THREE.Color(CRUDO.fondo),
      fondo1: new THREE.Color(HUMEDO.fondo),
      niebla0: new THREE.Color(CRUDO.niebla),
      niebla1: new THREE.Color(HUMEDO.niebla),
      sol0: new THREE.Color(CRUDO.sol),
      sol1: new THREE.Color(HUMEDO.sol),
      amb0: new THREE.Color(CRUDO.ambiente),
      amb1: new THREE.Color(HUMEDO.ambiente),
      cielo0: new THREE.Color(CRUDO.cielo),
      cielo1: new THREE.Color(HUMEDO.cielo),
      suelo0: new THREE.Color(CRUDO.suelo),
      suelo1: new THREE.Color(HUMEDO.suelo),
      fondo: new THREE.Color(CRUDO.fondo),
    }),
    [],
  );

  useLayoutEffect(() => {
    scene.background = c.fondo;
    if (perfil.fog) scene.fog = new THREE.Fog(CRUDO.niebla, CRUDO.nieblaCerca, CRUDO.nieblaLejos);
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene, c, perfil.fog]);

  useFrame(() => {
    const d = dosel(anioRef.current);

    c.fondo.copy(c.fondo0).lerp(c.fondo1, d);
    if (scene.fog && 'near' in scene.fog) {
      const f = /** @type {THREE.Fog} */ (scene.fog);
      f.color.copy(c.niebla0).lerp(c.niebla1, d);
      f.near = mezclar(CRUDO.nieblaCerca, HUMEDO.nieblaCerca, d);
      f.far = mezclar(CRUDO.nieblaLejos, HUMEDO.nieblaLejos, d);
    }
    if (sol.current) {
      sol.current.intensity = mezclar(CRUDO.solFuerza, HUMEDO.solFuerza, d);
      sol.current.color.copy(c.sol0).lerp(c.sol1, d);
    }
    if (amb.current) {
      amb.current.intensity = mezclar(CRUDO.ambienteFuerza, HUMEDO.ambienteFuerza, d);
      amb.current.color.copy(c.amb0).lerp(c.amb1, d);
    }
    if (hemi.current) {
      hemi.current.intensity = mezclar(CRUDO.hemiFuerza, HUMEDO.hemiFuerza, d);
      hemi.current.color.copy(c.cielo0).lerp(c.cielo1, d);
      hemi.current.groundColor.copy(c.suelo0).lerp(c.suelo1, d);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} intensity={CRUDO.hemiFuerza} color={CRUDO.cielo} groundColor={CRUDO.suelo} />
      <ambientLight ref={amb} intensity={CRUDO.ambienteFuerza} color={CRUDO.ambiente} />
      {/* El sol. Va bajo a propósito: en el año 0 tira la sombra LARGA del árbol
          que sobrevivió sobre la tierra pelada — el retrato del potrero. */}
      <directionalLight
        ref={sol}
        position={[8, 9, 7]}
        intensity={CRUDO.solFuerza}
        color={CRUDO.sol}
        castShadow={perfil.sombras}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0012}
      />
      {/* Contraluz frío: despega el monte de la niebla del fondo. */}
      <directionalLight position={[-6, 5, -8]} intensity={0.32} color="#b9cdd6" />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  El diorama                                                                 */
/* -------------------------------------------------------------------------- */

function Diorama({ anioRef, anio, tier, reducedMotion }) {
  const perfil = perfilDeTier(tier);
  const conteos = sucDeTier(tier);

  return (
    <>
      {/* Primero el reloj: pone el año antes de que nadie lo lea. */}
      <Reloj anioRef={anioRef} objetivo={anio} reducedMotion={reducedMotion} />
      <Atmosfera anioRef={anioRef} perfil={perfil} />

      {/* La ladera entera: suelo, cárcavas, barreras, pioneras, bosque. */}
      <Ladera anioRef={anioRef} tier={tier} />

      {/* El nacimiento y la quebrada. */}
      <AguaQueVuelve anioRef={anioRef} tier={tier} reducedMotion={reducedMotion} />

      {/* La niebla, hija del dosel. */}
      {conteos.niebla > 0 && perfil.fog && (
        <NieblaDelDosel anioRef={anioRef} n={conteos.niebla} reducedMotion={reducedMotion} />
      )}

      {/* La fauna, hija de todo lo anterior. */}
      {conteos.ave > 0 && (
        <AvesQueVuelven anioRef={anioRef} n={conteos.ave} reducedMotion={reducedMotion} />
      )}

      {/*
        Sin autoRotate: acá el que corre es el tiempo, no la cámara. Uno se para
        en el filo de abajo del lote y mira para arriba. Se puede girar con el
        dedo, pero sola no se mueve.
      */}
      <OrbitControls
        makeDefault
        target={[0, 1.8, -3]}
        enablePan={false}
        enableZoom
        minDistance={8}
        maxDistance={26}
        minPolarAngle={0.5}
        maxPolarAngle={1.44}
        enableDamping
        dampingFactor={0.08}
        autoRotate={false}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * La ladera restaurándose. Montar SOLO perezosa (lazy).
 * @param {{
 *   anio?: number,
 *   tier?: 'alto'|'medio'|'bajo',
 *   reducedMotion?: boolean,
 * }} props
 */
export default function EscenaRestauracion({ anio = 0, tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  // El año vive en un ref, NO en estado de React: cambia hasta 60 veces por
  // segundo y no puede estar re-renderizando el árbol. La escena lo lee sola.
  const anioRef = useRef(anio);

  // La cámara arranca donde se para el que llega a ver el lote.
  const camara = useMemo(
    () => ({ position: /** @type {[number, number, number]} */ ([4.5, 4.2, 11]), fov: 46 }),
    [],
  );

  return (
    <Canvas
      className={`rest-canvas${listo ? ' rest-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={camara}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama anioRef={anioRef} anio={anio} tier={tier} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
