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
import { Suspense, lazy, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { AbejaEscena } from './useEntradaAbeja.jsx';
import CamaraDirector from './CamaraDirector.jsx';
import { SombraContacto } from './SombraContacto.jsx';
import { ESTADO_FINCA_MUESTRA } from './reaccionFinca.js';
import useHaptics from '../useHaptics.js';
/* La dirección de arte compartida (hora dorada + cielos por familia) vive en
   un módulo propio: los arquetipos eligen su CIELOS.<familia>, esta base la
   mezcla hacia ATMOSFERA. Una sola fuente, cero hexes sueltos. */
import { ATMOSFERA, mezclarCielo } from '../atmosferaMadre.js';
import CapaVivaMundo from '../CapaVivaMundo.jsx';

/* El bloom sutil de la hora dorada: chunk LAZY con gate ESTRICTO
   `tier === 'alto' && !reducedMotion` — medio y bajo NI LO DESCARGAN
   (el import dinámico solo dispara cuando el elemento llega a renderizarse). */
const BloomSutil = lazy(() => import('./BloomSutil.jsx'));

function Contenido({
  params, hotspots, entrada, tinte, reducedMotion, onHotspot, cielo, animo, energia, piso = 0,
  frugal = false, tier = 'alto', hablando = false, focoId = null, focoToken = 0,
  estadoFinca = ESTADO_FINCA_MUESTRA, hayAlerta = false, camaraInicial,
  children,
}) {
  const controls = useRef(null);
  const [activo, setActivo] = useState(null);
  // `rebote`: cada toque de hotspot lo incrementa → Angelita da un microrrebote
  // (carácter de compañera, ref. el zorro de Ori / el ganso de Untitled Goose).
  const [rebote, setRebote] = useState(0);
  // Háptica del tap (DR-3D-HAPTICA): un tick seco al tocar un hotspot —
  // "toqué algo vivo, respondió". Gate triple interno; no-op en iOS.
  const haptics = useHaptics({ reducedMotion });
  const zoom = entrada?.zoom ?? 6.5;
  const acento = (tinte && tinte[0]) || '#3f8f4e';
  const centro = entrada?.centro || /** @type {[number, number, number]} */ ([0, (params?.alto ?? 1.1) * 0.5, 0]);

  // La atmósfera del mundo: su `cielo` propio MEZCLADO 60% hacia la hora dorada
  // del valle (B6 — hoy entrar a un mundo "aplana" porque cada escena fija un
  // cielo frío propio). La receta vive AHORA en atmosferaMadre (mezclarCielo):
  // ley exportada, mismo resultado aquí y en cualquier consumidor futuro.
  // Memoizado: THREE.Color solo cuando cambia el cielo.
  const c = useMemo(() => mezclarCielo(cielo), [cielo]);

  // foco = el hotspot activo (o el centro del diorama). Memoizado (auditoría
  // B11: antes era un Vector3 nuevo POR RENDER — basura de GC en el hilo
  // caliente); la abeja lo persigue con `lerp` en useEntradaAbeja.
  const hAct = activo && hotspots ? hotspots.find((x) => x.id === activo) : null;
  const [px, py, pz] = hAct ? hAct.pos : centro;
  const foco = useMemo(() => new THREE.Vector3(px, py, pz), [px, py, pz]);

  // ── EL LAZO agente→escena (spec S1): un `focoId` externo (un pedido de voz/
  //    texto ya resuelto contra los hotspots) MUEVE el foco y RESALTA ese punto,
  //    igual que un toque —el foco es el mismo que la abeja persigue. `focoToken`
  //    sube por cada comando, así "muéstreme las trampas" dicho dos veces vuelve
  //    a enfocar y re-dispara el pulso (halo). `resaltado` marca el punto pulsante.
  //    Patrón "ajustar estado en el render" (React docs: derivar de un cambio de
  //    prop SIN efecto — nada de synchronizar sistemas externos aquí).
  const [resaltado, setResaltado] = useState({ id: null, token: 0 });
  const [tokenPrev, setTokenPrev] = useState(focoToken);
  if (focoToken !== tokenPrev) {
    setTokenPrev(focoToken);
    if (focoId) {
      setActivo(focoId);
      setRebote((n) => n + 1); // microrrebote de Angelita, como en el toque
      setResaltado({ id: focoId, token: focoToken });
    }
  }

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

      {/* CAPA VIVA: partículas de ambiente + momentos del dato real (nace/cosecha/
          vende) + feedback del hotspot activo. Compone lo construido en la ola 3D;
          manejada por estadoFinca (useFincaViva). Anti-fabricación: sin dato, capa
          tranquila. Gates internos por tier/reducedMotion. */}
      <CapaVivaMundo
        estadoFinca={estadoFinca}
        hotspots={hotspots}
        hotspotActivoId={activo}
        mundoId={params?.id || params?.tipo || 'valle'}
        tier={tier}
        reducedMotion={reducedMotion}
      />

      {(hotspots || []).map((h) => {
        const esComando = resaltado.id === h.id;
        return (
          <group key={h.id} position={h.pos}>
            <Html center distanceFactor={zoom + 2} zIndexRange={[30, 0]}>
              <button
                type="button"
                className={`mundo-hotspot${activo === h.id ? ' mundo-hotspot--activo' : ''}${esComando ? ' mundo-hotspot--comando' : ''}`}
                style={{ '--hs-tinte': acento }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.tap();
                  setActivo(h.id);
                  setRebote((n) => n + 1);
                  setResaltado({ id: null, token: 0 }); // el toque toma el mando: sin halo de voz
                  onHotspot?.(h.view, h.data);
                }}
                aria-label={h.label}
              >
                {/* Halo de VOZ: el pulso que confirma "la escena te oyó". Se
                    RE-MONTA por `focoToken` (key) → re-dispara la animación cada
                    comando; reduced-motion lo deja quieto (CSS). */}
                {esComando && !frugal && (
                  <span key={resaltado.token} className="mundo-hotspot__halo" aria-hidden="true" />
                )}
                <span className="mundo-hotspot__emoji" aria-hidden="true">{h.emoji}</span>
                <span className="mundo-hotspot__txt">{h.label}</span>
              </button>
            </Html>
          </group>
        );
      })}

      {/* Angelita: una sola por mundo (la del footer se oculta dentro). `entrando`
          vive AHORA en si hay hotspot activo — con foco se posa junto a la puerta,
          sin foco RONDA (idle propio, ya no un fotograma clavado). `hablando` la
          hace pulsar cuando el agente narra; `rebote` es el microrrebote del toque. */}
      <AbejaEscena
        foco={foco}
        entrando={!!activo}
        hablando={hablando}
        rebote={rebote}
        animo={animo}
        energia={energia}
        estadoFinca={estadoFinca}
        hayAlerta={hayAlerta}
        reducedMotion={reducedMotion}
        piso={piso}
        tier={tier}
      />

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
      {/* La CÁMARA DE DIRECTOR (FASE 4): establishing shot al entrar (dolly con
          arco + FOV que se asienta, coreografiado con el velo del viaje) y un
          encuadre que respira apenas. La `mirada` arranca un pelín sobre el
          corazón del diorama y baja al target de siempre (tilt-down de revelado);
          la pose final es EXACTA a la de hoy. Inerte con reduced-motion o en el
          perfil mínimo (gama baja forzada a 3D): ahí la cámara queda simple. */}
      <CamaraDirector
        controls={controls}
        reposo={camaraInicial.position}
        mirada={[centro[0], centro[1] + zoom * 0.12, centro[2]]}
        duracion={2.1}
        respiro={zoom * 0.005}
        activa={!reducedMotion && !frugal}
      />
      <AdaptiveDpr pixelated />
      {/* Bloom SUTIL solo donde sobra GPU: tier alto sin reduced-motion. El
          gate es estricto a propósito (contrato de costo del DR de gama baja):
          medio/bajo no montan el pase NI descargan su chunk, y reduced-motion
          tampoco (su frameloop 'demand' no le debe un composer a nadie). */}
      {tier === 'alto' && !reducedMotion && (
        <Suspense fallback={null}>
          <BloomSutil />
        </Suspense>
      )}
    </>
  );
}

export default function EscenaBase3D({
  params, hotspots, entrada, tinte, reducedMotion,
  onHotspot, cielo, animo = 'sereno', energia = 1, camara, piso = 0, tier = 'alto',
  hablando = false, focoId = null, focoToken = 0,
  /* El estado REAL de la finca (auditoría §5b): Angelita SIEMPRE lo refleja.
     Hoy MUESTRA (reaccionFinca); codex lo cabla con useFincaViva sin tocar
     esta interfaz. `hayAlerta` la pone atenta si hay algo del día pendiente. */
  estadoFinca = ESTADO_FINCA_MUESTRA, hayAlerta = false, children,
}) {
  const [listo, setListo] = useState(false);
  const zoom = entrada?.zoom ?? 6.5;
  const cam = camara || { position: [zoom * 0.55, zoom * 0.5, zoom], fov: 42 };
  /* Device-tiering (DR-3D-PERF-GAMABAJA §2): el andamiaje ya es frugal por
     contrato (sin sombras, Lambert); lo que gradúa el tier son los píxeles
     (DPR/antialias) y, en el perfil mínimo, la niebla y las alfombras. */
  const frugal = tier === 'bajo';
  const dpr = tier === 'alto' ? /** @type {[number, number]} */ ([1, 1.5]) : tier === 'medio' ? /** @type {[number, number]} */ ([1, 1.3]) : 1;
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
          tier={tier}
          hablando={hablando}
          focoId={focoId}
          focoToken={focoToken}
          estadoFinca={estadoFinca}
          hayAlerta={hayAlerta}
          camaraInicial={cam}
        >
          {children}
        </Contenido>
      </Suspense>
    </Canvas>
  );
}
