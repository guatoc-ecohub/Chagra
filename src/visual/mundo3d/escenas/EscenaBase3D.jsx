/*
 * EscenaBase3D — el ANDAMIAJE 3D compartido por todos los arquetipos de escena.
 *
 * El DR (§4.4, §6) pide que cada arquetipo sea SOLO su diorama; el resto (Canvas,
 * luz, atmósfera, cámara, hotspots, la abeja) se hereda. Aquí vive ese resto: un
 * `<Canvas>` austero (DPR ≤ 1.5, SIN shadow-maps, SIN post-proceso, `frameloop`
 * a demanda si hay reduced-motion), la ATMÓSFERA DE HORA DORADA compartida con
 * el valle (auditoría 3D B5/B6: sol direccional cálido + relleno frío tenue +
 * niebla sutil + sombras de contacto falsas — forma y peso sin pagar sombras
 * reales), `OrbitControls` acotado, los `hotspots` como botones-billboard
 * accesibles que re-rutean a vistas 2D reales, y Angelita con su coreografía
 * compartida. El arquetipo pasa su geometría como `children`.
 *
 * CONTRATO uniforme (idéntico para cutaway/flujo/recinto/estratos):
 *   { params, hotspots, entrada, tinte, reducedMotion, onHotspot, onSalir,
 *     animo, energia, cielo?, camara?, piso?, children }
 *
 * `cielo` del arquetipo ya NO reemplaza la atmósfera: se MEZCLA hacia la paleta
 * dorada del valle (cohesión valle↔mundo — entrar debe sentirse como acercarse,
 * no como abrir otra app). `piso` (y del suelo, default 0) posa la alfombra y
 * las sombras de contacto; solo cutaway lo necesita (su bloque centra en 0).
 */
import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { AbejaEscena } from './useEntradaAbeja.jsx';
import { SombraContacto } from './SombraContacto.jsx';

/* Cielo cálido "acuarela" por defecto (la estética heredada del valle). El
   arquetipo puede pasar su propio `cielo` para teñir su ambiente. */
const CIELO_DEFAULT = { fondo: '#ece0c7', cielo: '#f5e9d2', suelo: '#b49873', intensidad: 1 };

/* La hora dorada del valle (CLIMAS.dorada de valleData): la atmósfera base que
   TODOS los mundos heredan. El `cielo` propio del arquetipo solo la tiñe. */
const ATMOSFERA = {
  fondo: '#f2d9a8', // fondo cálido de tarde
  cielo: '#f7c66b', // domo dorado (hemisferio, arriba)
  suelo: '#8a6b4a', // rebote tierra (hemisferio, abajo)
  luz: '#ffd79a', // el sol bajo, dorado (direccional principal)
  relleno: '#9db8d9', // relleno frío de cielo abierto (direccional opuesta, tenue)
  niebla: '#f0c98d', // la niebla dorada del valle
  sombra: '#3a2a18', // tinte de las sombras de contacto
};

/* Mezcla dos hex hacia `t` (0 = a, 1 = b). Barato y memoizado por quien llama. */
function mezclar(a, b, t) {
  return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
}

function Contenido({
  params, hotspots, entrada, tinte, reducedMotion, onHotspot, cielo, animo, energia, piso = 0,
  frugal = false,
  children,
}) {
  const controls = useRef(null);
  const [activo, setActivo] = useState(null);
  const zoom = entrada?.zoom ?? 6.5;
  const acento = (tinte && tinte[0]) || '#3f8f4e';
  const centro = entrada?.centro || [0, (params?.alto ?? 1.1) * 0.5, 0];

  // La atmósfera del mundo: su `cielo` propio MEZCLADO 60% hacia la hora dorada
  // del valle (B6 — hoy entrar a un mundo "aplana" porque cada escena fija un
  // cielo frío propio). Memoizado: THREE.Color solo cuando cambia el cielo.
  const c = useMemo(() => {
    const propio = cielo || CIELO_DEFAULT;
    return {
      fondo: mezclar(propio.fondo, ATMOSFERA.fondo, 0.6),
      cielo: mezclar(propio.cielo, ATMOSFERA.cielo, 0.6),
      suelo: mezclar(propio.suelo, ATMOSFERA.suelo, 0.6),
      niebla: mezclar(propio.fondo, ATMOSFERA.niebla, 0.7),
      alfombra: mezclar(propio.suelo, ATMOSFERA.suelo, 0.5),
      intensidad: propio.intensidad ?? 1,
    };
  }, [cielo]);

  // foco = el hotspot activo (o el centro del diorama). Memoizado (auditoría
  // B11: antes era un Vector3 nuevo POR RENDER — basura de GC en el hilo
  // caliente); la abeja lo persigue con `lerp` en useEntradaAbeja.
  const hAct = activo && hotspots ? hotspots.find((x) => x.id === activo) : null;
  const p = hAct ? hAct.pos : centro;
  const foco = useMemo(() => new THREE.Vector3(p[0], p[1], p[2]), [p[0], p[1], p[2]]);

  return (
    <>
      <color attach="background" args={[c.fondo]} />
      {/* Niebla sutil: profundidad atmosférica sin lavar el diorama (arranca
          detrás de él y se funde con la niebla dorada del valle). Se paga por
          fragmento → en el perfil mínimo (tier bajo forzado a 3D) se apaga. */}
      {!frugal && <fog attach="fog" args={[c.niebla, zoom * 1.4, zoom * 4.6]} />}
      <hemisphereLight intensity={0.55 * c.intensidad} color={c.cielo} groundColor={c.suelo} />
      <ambientLight intensity={0.28 * c.intensidad} color={ATMOSFERA.luz} />
      {/* El sol de la hora dorada — MISMA dirección que el valle ([6,9,4]) para
          que el lenguaje de sombreado no cambie al entrar. Sin castShadow:
          Lambert + sombras de contacto falsas dan la forma, gratis. */}
      <directionalLight position={[6, 9, 4]} intensity={0.9 * c.intensidad} color={ATMOSFERA.luz} />
      {/* Relleno frío tenue desde el lado opuesto: despega los volúmenes del
          fondo cálido sin matar el contraste (clave del look claymation). */}
      <directionalLight position={[-5, 4, -6]} intensity={0.22} color={ATMOSFERA.relleno} />

      {/* La alfombra de suelo + el anillo de contacto: posan el diorama en un
          piso en vez de dejarlo a la deriva sobre el color de fondo. Son dos
          planos transparentes grandes (overdraw) → fuera en el perfil mínimo. */}
      {!frugal && (
        <>
          <SombraContacto
            pos={[0, piso + 0.008, 0]}
            radio={zoom * 0.68}
            color={c.alfombra}
            opacidad={0.5}
            orden={1}
          />
          <SombraContacto
            pos={[0, piso + 0.02, 0]}
            radio={zoom * 0.4}
            color={ATMOSFERA.sombra}
            opacidad={0.3}
            orden={2}
          />
        </>
      )}

      {children}

      {(hotspots || []).map((h) => (
        <group key={h.id} position={h.pos}>
          <Html center distanceFactor={zoom + 2} zIndexRange={[30, 0]}>
            <button
              type="button"
              className={`mundo-hotspot${activo === h.id ? ' mundo-hotspot--activo' : ''}`}
              style={{ '--hs-tinte': acento }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setActivo(h.id);
                onHotspot?.(h.view, h.data);
              }}
              aria-label={h.label}
            >
              <span className="mundo-hotspot__emoji" aria-hidden="true">{h.emoji}</span>
              <span className="mundo-hotspot__txt">{h.label}</span>
            </button>
          </Html>
        </group>
      ))}

      <AbejaEscena foco={foco} entrando animo={animo} energia={energia} reducedMotion={reducedMotion} piso={piso} />

      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={zoom * 0.7}
        maxDistance={zoom * 2.6}
        minPolarAngle={0.35}
        maxPolarAngle={1.35}
        enableDamping
        dampingFactor={0.09}
        autoRotate={!reducedMotion && !activo}
        autoRotateSpeed={0.25}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

export default function EscenaBase3D({
  params, hotspots, entrada, tinte, reducedMotion,
  onHotspot, cielo, animo = 'sereno', energia = 1, camara, piso = 0, tier = 'alto', children,
}) {
  const [listo, setListo] = useState(false);
  const zoom = entrada?.zoom ?? 6.5;
  const cam = camara || { position: [zoom * 0.55, zoom * 0.5, zoom], fov: 42 };
  /* Device-tiering (DR-3D-PERF-GAMABAJA §2): el andamiaje ya es frugal por
     contrato (sin sombras, Lambert); lo que gradúa el tier son los píxeles
     (DPR/antialias) y, en el perfil mínimo, la niebla y las alfombras. */
  const frugal = tier === 'bajo';
  const dpr = tier === 'alto' ? [1, 1.5] : tier === 'medio' ? [1, 1.3] : 1;
  return (
    <Canvas
      className={`mundo-canvas${listo ? ' mundo-canvas--listo' : ''}`}
      dpr={dpr}
      gl={{ antialias: tier === 'alto', powerPreference: 'high-performance' }}
      camera={cam}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Suspense fallback={null}>
        <Contenido
          params={params}
          hotspots={hotspots}
          entrada={entrada}
          tinte={tinte}
          reducedMotion={reducedMotion}
          onHotspot={onHotspot}
          cielo={cielo}
          animo={animo}
          energia={energia}
          piso={piso}
          frugal={frugal}
        >
          {children}
        </Contenido>
      </Suspense>
    </Canvas>
  );
}
