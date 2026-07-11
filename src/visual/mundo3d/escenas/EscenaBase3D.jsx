/*
 * EscenaBase3D — el ANDAMIAJE 3D compartido por todos los arquetipos de escena.
 *
 * El DR (§4.4, §6) pide que cada arquetipo sea SOLO su diorama; el resto (Canvas,
 * luz frugal, cámara, hotspots, la abeja) se hereda. Aquí vive ese resto: un
 * `<Canvas>` austero (DPR ≤ 1.5, SIN sombras, `frameloop` a demanda si hay
 * reduced-motion), la ATMÓSFERA-MADRE compartida con el valle (misma paleta
 * de clima, mismo sol direccional, misma niebla — `atmosferaMadre.js`, para
 * que pasar del valle a un mundo no "aplane" el look), `OrbitControls`
 * acotado, los `hotspots` como botones-billboard accesibles que re-rutean a
 * vistas 2D reales, y Angelita con su coreografía compartida. El arquetipo
 * pasa su geometría como `children`.
 *
 * Post-proceso: SOLO un bloom sutil en tier 'alto' (gate estricto: medio/bajo
 * ni descargan el chunk; `reducedMotion` también lo apaga). El resto de tiers
 * conserva el render directo de siempre.
 *
 * CONTRATO uniforme (idéntico para cutaway/flujo/recinto/estratos):
 *   { params, hotspots, entrada, tinte, reducedMotion, onHotspot, onSalir,
 *     animo, energia, cielo?, camara?, children }
 */
import { Suspense, lazy, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { AbejaEscena } from './useEntradaAbeja.jsx';
import { decidirTier } from '../deviceTier.js';
import {
  armonizarCielo, nieblaDiorama, bloomMadre, SOL_POSICION,
} from '../atmosferaMadre.js';

/* El bloom es perezoso: tier medio/bajo jamás pagan sus bytes. */
const BloomSutil = lazy(() => import('./BloomSutil.jsx'));

function Contenido({
  params, hotspots, entrada, tinte, reducedMotion, onHotspot, cielo, climaId, bloomOn,
  animo, energia, children,
}) {
  const controls = useRef(null);
  const [activo, setActivo] = useState(null);
  const zoom = entrada?.zoom ?? 6.5;
  const acento = (tinte && tinte[0]) || '#3f8f4e';
  const centro = entrada?.centro || [0, (params?.alto ?? 1.1) * 0.5, 0];

  /* La atmósfera-madre: el cielo propio del arquetipo, armonizado con el
     clima del valle (misma hora, misma temperatura de luz, misma niebla). */
  const atm = useMemo(() => armonizarCielo(cielo, climaId), [cielo, climaId]);
  const fog = useMemo(() => nieblaDiorama(zoom, atm), [zoom, atm]);

  // foco = el hotspot activo (o el centro del diorama). Barato: un Vector3 por
  // render; la abeja lo persigue con `lerp` en useEntradaAbeja.
  const hAct = activo && hotspots ? hotspots.find((x) => x.id === activo) : null;
  const p = hAct ? hAct.pos : centro;
  const foco = new THREE.Vector3(p[0], p[1], p[2]);

  return (
    <>
      <color attach="background" args={[atm.fondo]} />
      <fog attach="fog" args={[fog.color, fog.near, fog.far]} />
      {/* Los mismos ratios de luz del valle (hemisferio/ambiente/sol) con el
          sol en la MISMA dirección — sin sombras: modelado, no costo. */}
      <hemisphereLight intensity={0.55 * atm.intensidad} color={atm.cieloLuz} groundColor={atm.suelo} />
      <ambientLight intensity={0.35 * atm.intensidad} color={atm.luz} />
      <directionalLight position={SOL_POSICION} intensity={0.6 * atm.intensidad} color={atm.luz} />

      {children}

      {bloomOn && <BloomSutil {...bloomMadre(climaId)} />}

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

      <AbejaEscena foco={foco} entrando animo={animo} energia={energia} reducedMotion={reducedMotion} />

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
  onHotspot, cielo, animo = 'sereno', energia = 1, camara, children,
}) {
  const [listo, setListo] = useState(false);
  /* El tier se decide UNA vez por montaje (misma fuente que el host). Gate
     estricto del bloom: solo 'alto' y sin reduced-motion. */
  const [tier] = useState(() => decidirTier().tier);
  const bloomOn = tier === 'alto' && !reducedMotion;
  /* La MISMA cadena de clima que EscenaValle: coherencia valle ↔ mundo. */
  const climaId = params?.clima || entrada?.clima || 'soleado';
  const zoom = entrada?.zoom ?? 6.5;
  const cam = camara || { position: [zoom * 0.55, zoom * 0.5, zoom], fov: 42 };
  return (
    <Canvas
      className={`mundo-canvas${listo ? ' mundo-canvas--listo' : ''}`}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
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
          climaId={climaId}
          bloomOn={bloomOn}
          animo={animo}
          energia={energia}
        >
          {children}
        </Contenido>
      </Suspense>
    </Canvas>
  );
}
