/*
 * EscenaBase3D — el ANDAMIAJE 3D compartido por todos los arquetipos de escena.
 *
 * El DR (§4.4, §6) pide que cada arquetipo sea SOLO su diorama; el resto (Canvas,
 * luz, atmósfera, cámara, hotspots, la abeja) se hereda. Aquí vive ese resto: un
 * `<Canvas>` austero (DPR ≤ 1.5, SIN shadow-maps, SIN post-proceso, `frameloop`
 * a demanda si hay reduced-motion), la ATMÓSFERA DE LA FRANJA DEL DÍA compartida
 * con el valle (ciclo diurno vivo: la madre de la mezcla es el preset de la hora
 * real — auditoría 3D B5/B6: sol direccional + relleno frío tenue + niebla sutil
 * + sombras de contacto falsas), `OrbitControls` acotado, los `hotspots` como botones-billboard
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
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { CompaiEscena } from './CompaiEscena.jsx';
import CamaraDirector from './CamaraDirector.jsx';
import { SombraContacto } from './SombraContacto.jsx';
import { ESTADO_FINCA_MUESTRA } from './reaccionFinca.js';
import useHaptics from '../useHaptics.js';
import MonitorRendimiento, {
  detectarTierInicial,
  presupuestoDeTier,
} from '../usePerformanceMonitor.jsx';
/* La dirección de arte compartida (cielos por familia + receta de mezcla) vive
   en un módulo propio: los arquetipos eligen su CIELOS.<familia>, esta base la
   mezcla hacia la MADRE de la franja. Una sola fuente, cero hexes sueltos. */
import { mezclarCielo } from '../atmosferaMadre.js';
/* CICLO DIURNO VIVO: la madre ya no es la hora dorada clavada — es el preset
   de la FRANJA REAL del día (cielosHoraData, vía el reloj de useCicloDia). El
   mundo amanece, atardece y anochece CON el valle; el arquetipo no se entera. */
import useCicloDia from '../useCicloDia.js';
import { presetDeHora } from '../cielosHoraData.js';
import { perfilDeTier } from '../deviceTier.js';
import CapaVivaMundo from '../CapaVivaMundo.jsx';
/* HUD de FPS conmutable (dev/campo): lee el instrumento de usePerformanceMonitor
   y lo muestra. DOM, fuera del <Canvas>. Apagado por defecto (return null). */
import HudRendimiento from '../HudRendimiento.jsx';
/* Álgebra pura de anti-colisión de etiquetas 3D→pantalla (proyección + cajas
   AABB), la MISMA que ya generaliza `RotulosLugares` (Valle3D.jsx) para el kit
   `EtiquetasMundo` — se reusa aquí en vez de duplicarla una tercera vez; solo
   la POLÍTICA de foco (abajo) es propia de los hotspots. */
import { proyectarAPantalla, rectanguloDe, seSolapan } from '../kit/etiquetasAntiColision.js';

/* El bloom sutil de la hora dorada: chunk LAZY con gate ESTRICTO
   `tier === 'alto' && !reducedMotion` — medio y bajo NI LO DESCARGAN
   (el import dinámico solo dispara cuando el elemento llega a renderizarse). */
const BloomSutil = lazy(() => import('./BloomSutil.jsx'));

/* ── ANTI-COLISIÓN de hotspots en pantalla (ARREGLO ETIQUETAS ENCIMADAS,
 * SPEC-UX-01): el MISMO criterio ya aprobado de `RotulosLugares` (Valle3D.jsx)
 * y su port `CartelesNombres` (CorralVivo.jsx) — portado a la base compartida
 * por los 9 arquetipos que la componen (los otros 2 de la familia de 11 — el
 * valle y su calma — no la usan: el valle ya trae su propio RotulosLugares,
 * la calma no tiene hotspots).
 *
 * Sin esto, `EscenaBase3D` pintaba la etiqueta COMPLETA de cada hotspot sin
 * saber de las demás: dos puntos de interés cercanos EN PANTALLA (cámara
 * alejada, auto-rotate) quedaban con sus rótulos encimados e ilegibles.
 *
 * NOTA de política (por qué NO se llama `resolverModos` del kit tal cual):
 * `resolverModos` deja que CUALQUIER punto intente 'pleno' (útil para chips
 * didácticos sueltos). Los hotspots son botones de NAVEGACIÓN, no chips, y el
 * criterio YA aprobado para ellos (RotulosLugares banda 'media' / CorralVivo
 * `CartelesNombres`) es más calmo: SOLO el activo/enfocado intenta 'pleno' —
 * los demás van derecho a 'punto'. Se reusa la geometría pura del kit
 * (`proyectarAPantalla`/`rectanguloDe`/`seSolapan`) pero se mantiene ESA
 * política aquí, para no romper la lectura ya validada del valle/corral.
 *
 * Reusado el scratch (cero basura de GC en el hilo caliente del useFrame).
 */
const _projHotspot = new THREE.Vector3();

function Contenido({
  params, hotspots, entrada, tinte, reducedMotion, onHotspot, cielo, animo, energia, piso = 0,
  frugal = false, tier = 'alto', hablando = false, focoId = null, focoToken = 0,
  estadoFinca = ESTADO_FINCA_MUESTRA, hayAlerta = false, camaraInicial,
  tierInicial = 'medio',
  presupuestoInicial,
  children,
}) {
  const controls = useRef(null);
  const [activo, setActivo] = useState(null);
  // El PARTE DE VIAJE de la abeja (auditoría #50): useEntradaAbeja lo escribe
  // cada frame (fase del cruce + posición viva) y CamaraDirector lo lee para
  // ESCOLTARLA en la picada de entrada. Un ref compartido, cero re-renders.
  const viajeAbeja = useRef({ fase: 'oculta', pos: new THREE.Vector3() });
  // `rebote`: cada toque de hotspot lo incrementa → Angelita da un microrrebote
  // (carácter de compañera, ref. el zorro de Ori / el ganso de Untitled Goose).
  const [rebote, setRebote] = useState(0);
  // Háptica del tap (DR-3D-HAPTICA): un tick seco al tocar un hotspot —
  // "toqué algo vivo, respondió". Gate triple interno; no-op en iOS.
  const haptics = useHaptics({ reducedMotion });
  // Anti-colisión de hotspots (ver bloque de arriba): refs de los botones +
  // memoria del último "candidato" (histéresis anti-parpadeo, mismo criterio
  // de RotulosLugares/CartelesNombres).
  const botonesHotspot = useRef({});
  const plenaHotspot = useRef(null);
  const tickHotspot = useRef(0);
  const zoom = entrada?.zoom ?? 6.5;
  const acento = (tinte && tinte[0]) || '#3f8f4e';
  const centro = entrada?.centro || /** @type {[number, number, number]} */ ([0, (params?.alto ?? 1.1) * 0.5, 0]);

  // La atmósfera del mundo: su `cielo` propio MEZCLADO 60% hacia la MADRE de
  // la franja REAL del día (ciclo diurno vivo — antes la madre era la hora
  // dorada clavada y entrar a un mundo a medianoche se sentía de otra app).
  // La receta vive en atmosferaMadre (mezclarCielo): ley exportada, mismo
  // resultado aquí y en cualquier consumidor. Memoizado por cielo + franja
  // (la franja cambia unas pocas veces al día; en demo, cada tantos segundos).
  const { franja } = useCicloDia({ reducedMotion });
  const madre = useMemo(() => presetDeHora(franja), [franja]);
  const c = useMemo(() => mezclarCielo(cielo, madre), [cielo, madre]);

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

  // Anti-colisión de hotspots en pantalla (ver `rectoDeHotspot`/`seSolapanHotspot`
  // arriba): ~12 pasadas/s (corre en el PRIMER frame — importa con
  // frameloop='demand' de reduced-motion, que renderiza pocos frames), imperativo
  // sobre `dataset` (cero re-render de React por cuadro). El hotspot `activo`
  // (tocado, o el que acaba de enfocar un comando de voz — ambos setean `activo`
  // arriba) manda su espacio primero; si no hay ninguno activo, el más cercano
  // al centro del encuadre, con histéresis (solo cambia si otro queda 20% más
  // centrado — anti-parpadeo). Los demás ceden a un punto-chip con solo el
  // emoji; quien ni así cabe cede del todo (el CSS lo trae de vuelta si el
  // teclado lo enfoca — mismo contrato que `.v3d-poi` del valle).
  useFrame(({ camera, size }) => {
    if (!hotspots || !hotspots.length) return;
    if (tickHotspot.current++ % 5 !== 0) return;

    const pts = hotspots.map((h) => {
      _projHotspot.set(h.pos[0], h.pos[1], h.pos[2]);
      const p = proyectarAPantalla(_projHotspot, _projHotspot, camera, size);
      return {
        id: h.id,
        label: h.label || '',
        ...p,
        dc: Math.hypot(p.x - size.width / 2, p.y - size.height / 2),
      };
    });

    let candidata = null;
    if (activo && pts.some((p) => p.id === activo && !p.detras)) {
      candidata = activo;
    } else {
      const previa = pts.find((p) => p.id === plenaHotspot.current && !p.detras);
      const cercana = pts.filter((p) => !p.detras).sort((a, b) => a.dc - b.dc)[0];
      candidata = previa && cercana && cercana.dc > previa.dc * 0.8 ? previa.id : (cercana?.id ?? null);
    }
    plenaHotspot.current = candidata;

    const tomados = [];
    const pisa = (r) => tomados.some((o) => seSolapan(r, o));
    const orden = [...pts].sort((a, b) =>
      a.id === candidata ? -1 : b.id === candidata ? 1 : a.dc - b.dc,
    );
    for (const p of orden) {
      let modo = 'oculto';
      if (!p.detras) {
        const esPlena = p.id === candidata;
        const r = esPlena
          ? rectanguloDe(p.x, p.y, 76 + p.label.length * 9, 48)
          : rectanguloDe(p.x, p.y, 44, 44);
        if (!pisa(r)) {
          tomados.push(r);
          modo = esPlena ? 'plena' : 'punto';
        }
      }
      const btn = botonesHotspot.current[p.id];
      if (btn && btn.dataset.modo !== modo) btn.dataset.modo = modo;
    }
  });

  return (
    <>
      {!reducedMotion && <MonitorRendimiento key={tierInicial} tier={tierInicial} />}
      <color attach="background" args={[c.fondo]} />
      {/* Niebla sutil: profundidad atmosférica sin lavar el diorama (arranca
          detrás de él y se funde con la niebla dorada del valle). Se paga por
          fragmento → en el perfil mínimo (tier bajo forzado a 3D) se apaga. */}
      {!frugal && <fog attach="fog" args={[c.niebla, zoom * 1.4, zoom * 4.6]} />}
      <hemisphereLight intensity={0.55 * c.intensidad} color={c.cielo} groundColor={c.suelo} />
      <ambientLight intensity={0.28 * c.intensidad} color={madre.luz} />
      {/* El sol de la franja — MISMO arco que el valle (solPos del preset:
          rasante al amanecer, cenital al mediodía, luna de noche) para que el
          lenguaje de sombreado no cambie al entrar. Sin castShadow: Lambert +
          sombras de contacto falsas dan la forma, gratis. */}
      <directionalLight position={madre.solPos} intensity={0.9 * c.intensidad} color={madre.luz} />
      {/* Relleno frío tenue desde el lado opuesto: despega los volúmenes del
          fondo cálido sin matar el contraste (clave del look claymation). */}
      <directionalLight position={[-5, 4, -6]} intensity={0.22} color={madre.relleno} />
      {/* De noche (o en el filo del atardecer/amanecer), las estrellas del
          presupuesto del tier asoman también DENTRO del mundo: el diorama no
          se queda con cielo de día mientras el valle duerme. */}
      {madre.estrellas > 0 && !frugal && (
        <Stars
          radius={zoom * 8}
          depth={30}
          count={Math.round(perfilDeTier(tier).estrellas * madre.estrellas)}
          factor={3}
          saturation={0}
          fade
          speed={reducedMotion ? 0 : 0.5}
        />
      )}

      {/* La alfombra de suelo + el anillo de contacto: posan el diorama en un
          piso en vez de dejarlo a la deriva sobre el color de fondo. Son dos
          planos transparentes grandes (overdraw) → fuera en el perfil mínimo. */}
      {!frugal && (
        <>
          <SombraContacto
            refExt={undefined}
            pos={[0, piso + 0.008, 0]}
            radio={zoom * 0.68}
            color={c.alfombra}
            opacidad={0.5}
            orden={1}
          />
          <SombraContacto
            refExt={undefined}
            pos={[0, piso + 0.02, 0]}
            radio={zoom * 0.4}
            color={madre.sombra}
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
            tier={/** @type {'alto'|'medio'|'bajo'} */ (tier)}
            reducedMotion={reducedMotion}
      />

      {(hotspots || []).map((h) => {
        const esComando = resaltado.id === h.id;
        return (
          <group key={h.id} position={h.pos}>
            <Html center distanceFactor={zoom + 2} zIndexRange={[30, 0]}>
              <button
                ref={(el) => {
                  botonesHotspot.current[h.id] = el;
                }}
                type="button"
                data-modo={h.id === activo ? 'plena' : 'punto'}
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

      {/* EL COMPAÑERO del mundo: según el avatar elegido (CompaiEscena resuelve
          angelita/maíz/zarigüeya). Una sola por mundo (la del footer se oculta
          dentro). `entrando` vive AHORA en si hay hotspot activo — con foco se
          posa junto a la puerta, sin foco RONDA (idle propio, ya no un fotograma
          clavado). `hablando` la hace pulsar cuando el agente narra; `rebote` es
          el microrrebote del toque. Hoy maíz/zarigüeya caen a Angelita (fallback,
          sin regresión) hasta que el Fable de compai (#5) les dé arte 3D. */}
      <CompaiEscena
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
        mundoId={params?.id || params?.tipo || null}
        viajeRef={viajeAbeja}
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
        siga={viajeAbeja}
      />
      {/* Bloom SUTIL solo donde sobra GPU: tier alto sin reduced-motion. El
          gate es estricto a propósito (contrato de costo del DR de gama baja):
          medio/bajo no montan el pase NI descargan su chunk, y reduced-motion
          tampoco (su frameloop 'demand' no le debe un composer a nadie). */}
      {presupuestoInicial.bloom && !reducedMotion && (
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
  const tierInicial = useMemo(() => detectarTierInicial({ tier, reducedMotion }), [tier, reducedMotion]);
  const presupuestoInicial = useMemo(() => presupuestoDeTier(tierInicial), [tierInicial]);
  /* Device-tiering (DR-3D-PERF-GAMABAJA §2): el andamiaje ya es frugal por
     contrato (sin sombras, Lambert); lo que gradúa el tier son los píxeles
     (DPR/antialias) y, en el perfil mínimo, la niebla y las alfombras. */
  const frugal = tierInicial === 'bajo';
  const dpr = presupuestoInicial.dpr;
  return (
    <>
    <Canvas
      className={`mundo-canvas${listo ? ' mundo-canvas--listo' : ''}`}
      dpr={dpr}
      gl={{ antialias: tierInicial === 'alto', powerPreference: 'high-performance' }}
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
          tierInicial={tierInicial}
          presupuestoInicial={presupuestoInicial}
        >
          {children}
        </Contenido>
      </Suspense>
    </Canvas>
    <HudRendimiento />
    </>
  );
}
