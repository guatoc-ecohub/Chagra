/*
 * VitrinaInfraestructura — vitrina JUGABLE de la librería de infraestructura 3D
 * (ruta pública #/mockups/vitrina-infra, sin auth).
 *
 * La hermana de la vitrina de criaturas (#/mockups/vitrina-3d), pero para las
 * piezas de CONSTRUCCIÓN (src/visual/mundo3d/infraestructura): invernaderos,
 * gallinero, galpón, establo, bodega, compostera, tanque y secadero. Las monta
 * SIN editarlas, agrupadas por familia en pestañas:
 *
 *   · Una pestaña por categoría del catálogo (cultivo protegido, animales,
 *     almacenamiento, agua, poscosecha): cada pieza vive en su tarjeta con un
 *     diorama 3D girable + nombre, rol, medidas típicas y control de tamaño.
 *   · Una pestaña "Colocar en el terreno": el mini demo del modo colocar —
 *     elija una pieza, toque la ladera y la pieza SE POSA a la altura del
 *     terreno (snapping); se gira en pasos de 45° y se deja fijada.
 *
 * PERF: solo la pestaña activa se monta, y dentro de ella cada tarjeta monta su
 * Canvas SOLO mientras está en pantalla (IntersectionObserver) — nunca hay diez
 * contextos WebGL vivos a la vez. Con `reducedMotion`, frameloop='demand' y sin
 * autorrotación. En equipo humilde (o a voluntad) cae a FICHAS 2D sin WebGL.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Español de
 * Colombia en "usted". El 3D (three/R3F) viaja en el chunk perezoso de la ruta.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  INFRAESTRUCTURA,
  INFRAESTRUCTURA_IDS,
  INFRAESTRUCTURA_CATEGORIAS,
} from '../../visual/mundo3d/infraestructura/infraestructuraData.js';
import Infraestructura from '../../visual/mundo3d/infraestructura/Infraestructura.jsx';
import { decidirTier, permite3D } from '../../visual/mundo3d/deviceTier.js';
import { ATMOSFERA } from '../../visual/mundo3d/atmosferaMadre.js';
import './VitrinaInfraestructura.css';

/* ── Config de la vitrina ──────────────────────────────────────────────────── */

/* Rótulo legible de cada categoría del catálogo (pestañas y chips). */
const ROTULO_CAT = {
  'cultivo protegido': { emoji: '🌱', txt: 'Cultivo protegido' },
  pecuaria: { emoji: '🐄', txt: 'Animales' },
  almacenamiento: { emoji: '📦', txt: 'Bodega y reciclaje' },
  agua: { emoji: '💧', txt: 'Agua' },
  poscosecha: { emoji: '☕', txt: 'Poscosecha' },
};

const TIERS = [
  { v: 'alto', label: 'Alto' },
  { v: 'medio', label: 'Medio' },
  { v: 'bajo', label: 'Bajo' },
];

/* Tamaños discretos por tarjeta: escalan las medidas típicas del catálogo.
   Discretos a propósito: cada cambio re-encuadra la cámara (remonta el lienzo),
   y eso solo debe pasar por toque deliberado, no arrastrando un slider. */
const ESCALAS = [
  { v: 0.75, label: 'Chica' },
  { v: 1, label: 'Típica' },
  { v: 1.4, label: 'Grande' },
];

const ID_COLOCAR = 'colocar';

/* Las pestañas: una por categoría (en orden de catálogo) + el demo de colocar. */
const PESTANAS = [
  ...INFRAESTRUCTURA_CATEGORIAS.map((c) => ({
    id: c,
    emoji: ROTULO_CAT[c]?.emoji || '🏗️',
    label: ROTULO_CAT[c]?.txt || c,
  })),
  { id: ID_COLOCAR, emoji: '📍', label: 'Colocar en el terreno' },
];

/* ── Helpers puros ─────────────────────────────────────────────────────────── */

/* Medidas en texto campesino: "15 × 6 × 3 m" (coma decimal, como se dice acá). */
const num = (v) => `${Math.round(v * 10) / 10}`.replace('.', ',');
const medidasTexto = (d) => `${num(d.largo)} × ${num(d.ancho)} × ${num(d.alto)} m`;

/* ¿La tarjeta está (cerca de) en pantalla? Monta/suelta su Canvas para acotar
   los contextos WebGL vivos. Margen generoso para que no parpadee al borde. */
function useEnVista() {
  const ref = useRef(null);
  const [enVista, setEnVista] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setEnVista(true); // sin observer (entorno viejo): mostrar y ya
      return undefined;
    }
    const obs = new IntersectionObserver(
      ([e]) => setEnVista(e.isIntersecting),
      { rootMargin: '280px 0px', threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, enVista };
}

/* ── El diorama de UNA pieza ───────────────────────────────────────────────── */

/* Lienzo 3D de una pieza suelta: hora dorada del valle, un disco de tierra y la
   construcción centrada. La cámara se encuadra a las medidas; gira con el dedo. */
function LienzoPieza({ tipo, dims, tier, reducedMotion }) {
  const span = Math.max(dims.largo, dims.ancho, dims.alto);
  const d = span * 1.35 + 2.4;
  return (
    <Canvas
      className="vitin__canvas"
      dpr={[1, tier === 'alto' ? 1.6 : 1.2]}
      gl={{ antialias: tier === 'alto', powerPreference: 'high-performance' }}
      camera={{ position: [d * 0.72, d * 0.62, d], fov: 42 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
    >
      <color attach="background" args={[ATMOSFERA.fondo]} />
      <hemisphereLight intensity={0.6} color={ATMOSFERA.cielo} groundColor={ATMOSFERA.suelo} />
      <ambientLight intensity={0.3} color={ATMOSFERA.luz} />
      <directionalLight position={[6, 9, 4]} intensity={0.95} color={ATMOSFERA.luz} />
      <directionalLight position={[-5, 4, -6]} intensity={0.22} color={ATMOSFERA.relleno} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[span * 1.05, 40]} />
        <meshLambertMaterial color="#b49873" />
      </mesh>
      <Suspense fallback={null}>
        <Infraestructura tipo={tipo} dims={dims} params={{}} tier={tier} reducedMotion={reducedMotion} />
      </Suspense>
      <OrbitControls
        target={[0, dims.alto * 0.42, 0]}
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={d * 0.5}
        maxDistance={d * 2.1}
        minPolarAngle={0.22}
        maxPolarAngle={1.45}
        enableDamping
        dampingFactor={0.1}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.55}
      />
    </Canvas>
  );
}

/* Ficha 2D (sin WebGL): el fallback amable del equipo humilde. */
function FichaPieza({ entry }) {
  return (
    <div className="vitin__ficha" aria-hidden="true">
      <span className="vitin__fichaEmoji">{entry.emoji}</span>
      <span className="vitin__fichaDims">{medidasTexto(entry.dims)}</span>
    </div>
  );
}

/* Una tarjeta del catálogo: diorama (o ficha 2D) + nombre, rol, medidas y el
   control de tamaño. El Canvas solo vive mientras la tarjeta está en pantalla. */
function TarjetaPieza({ entry, modo3D, tier, reducedMotion }) {
  const { ref, enVista } = useEnVista();
  const [escala, setEscala] = useState(1);
  const dims = useMemo(
    () => ({
      largo: entry.dims.largo * escala,
      ancho: entry.dims.ancho * escala,
      alto: entry.dims.alto * escala,
    }),
    [entry, escala],
  );
  const rotCat = ROTULO_CAT[entry.categoria];
  return (
    <article ref={ref} className="vitin__card">
      <div className="vitin__stage">
        {modo3D && enVista ? (
          <Suspense fallback={<div className="vitin__cargando">Preparando la pieza…</div>}>
            <LienzoPieza
              key={escala}
              tipo={entry.id}
              dims={dims}
              tier={tier}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        ) : (
          <FichaPieza entry={entry} />
        )}
      </div>
      <div className="vitin__meta">
        <h3 className="vitin__cardTitle">
          <span aria-hidden="true">{entry.emoji}</span> {entry.nombre}
        </h3>
        <p className="vitin__cardDesc">{entry.descripcion}</p>
        <div className="vitin__chips">
          <span className="vitin__chip">
            {rotCat ? `${rotCat.emoji} ${rotCat.txt}` : entry.categoria}
          </span>
          <span className="vitin__chip vitin__chip--dims">📏 {medidasTexto(dims)}</span>
        </div>
        <div className="vitin__escala" role="group" aria-label={`Tamaño de ${entry.nombre}`}>
          <span className="vitin__escalaLabel">Tamaño</span>
          {ESCALAS.map((e) => (
            <button
              key={e.v}
              type="button"
              className={`vitin__seg${escala === e.v ? ' is-on' : ''}`}
              onClick={() => setEscala(e.v)}
              aria-pressed={escala === e.v}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

/* ── El mini demo de COLOCAR (snapping sobre el terreno) ───────────────────── */

/* Una ladera de juguete propia (Math puro, determinista): al fondo trepa, al
   frente baja. La MISMA función posa la pieza (snap a la altura del terreno). */
const TAM_TERRENO = 26;
const BORDE = TAM_TERRENO / 2 - 1.6;
const MAX_COLOCADAS = 12;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function alturaTerreno(x, z) {
  const t = clamp((-z + 7) / 18, 0, 1);
  const loma = t * t * (3 - 2 * t) * 4.4; // smoothstep: la subida al páramo
  const ondul = Math.sin(x * 0.5) * 0.16 + Math.cos(z * 0.4 + x * 0.23) * 0.12;
  return loma + ondul;
}

/* Snap de un toque (x, z): se acota al terreno y se posa a su altura. */
function puntoAterrizado(x, z) {
  const px = clamp(x, -BORDE, BORDE);
  const pz = clamp(z, -BORDE, BORDE);
  return [px, alturaTerreno(px, pz), pz];
}

/* La ladera 3D: plano desplazado por alturaTerreno, color por altura (cálido
   abajo, frailejonal arriba). Distingue TOQUE de arrastre de cámara: solo
   coloca si el dedo no se movió más de unos pocos px entre down y up. */
function TerrenoDemo({ segmentos, onTocar }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(TAM_TERRENO, TAM_TERRENO, segmentos, segmentos);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colores = new Float32Array(pos.count * 3);
    const cBajo = new THREE.Color('#a2b263');
    const cAlto = new THREE.Color('#6d8a68');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = alturaTerreno(x, z);
      pos.setY(i, y);
      c.copy(cBajo).lerp(cAlto, clamp(y / 4.4, 0, 1));
      colores[i * 3] = c.r;
      colores[i * 3 + 1] = c.g;
      colores[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    g.computeVertexNormals();
    return g;
  }, [segmentos]);
  useEffect(() => () => geo.dispose(), [geo]);

  const inicio = useRef(null);
  return (
    <mesh
      geometry={geo}
      onPointerDown={(e) => {
        inicio.current = [e.clientX, e.clientY];
      }}
      onPointerUp={(e) => {
        const d = inicio.current;
        inicio.current = null;
        if (!d) return;
        const dx = e.clientX - d[0];
        const dy = e.clientY - d[1];
        if (dx * dx + dy * dy > 64) return; // fue giro de cámara, no un toque
        onTocar(e.point.x, e.point.z);
      }}
    >
      <meshLambertMaterial vertexColors />
    </mesh>
  );
}

/* El anillo dorado que marca el BORRADOR (la pieza aún sin fijar) en el piso. */
function AnilloBorrador({ borrador }) {
  const e = INFRAESTRUCTURA[borrador.tipo];
  const r = Math.max(e.dims.largo, e.dims.ancho) * 0.62 + 0.4;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[borrador.pos[0], borrador.pos[1] + 0.07, borrador.pos[2]]}
    >
      <ringGeometry args={[r - 0.28, r, 40]} />
      <meshBasicMaterial color="#f2b134" transparent opacity={0.92} />
    </mesh>
  );
}

/* La sección completa del demo: selector de pieza + lienzo con la ladera +
   botonera (girar 45°, fijar, quitar). El estado vive SOLO en memoria: es una
   probadera, no la finca real (el modo completo persiste en su propio mockup). */
function DemoColocar({ modo3D, tier, reducedMotion }) {
  const [tipoSel, setTipoSel] = useState(INFRAESTRUCTURA_IDS[0]);
  const [borrador, setBorrador] = useState(null); // { tipo, pos, rot } | null
  const [colocadas, setColocadas] = useState([]);
  const llena = colocadas.length >= MAX_COLOCADAS;

  const tocarTerreno = (x, z) => {
    setBorrador((b) => ({
      tipo: tipoSel,
      pos: puntoAterrizado(x, z),
      rot: b?.rot || 0,
    }));
  };
  const girar = () => {
    setBorrador((b) => (b ? { ...b, rot: (b.rot + Math.PI / 4) % (Math.PI * 2) } : b));
  };
  const fijar = () => {
    if (!borrador || llena) return;
    setColocadas((lista) => [...lista, borrador]);
    setBorrador(null);
  };
  const quitarUltima = () => setColocadas((lista) => lista.slice(0, -1));
  const despejar = () => {
    setColocadas([]);
    setBorrador(null);
  };

  if (!modo3D) {
    return (
      <div className="vitin__aviso" role="note">
        <span aria-hidden="true">📍</span> El demo de colocar necesita el modo 3D.
        Apague «Solo fichas 2D» (o pruebe en un equipo con más aliento) para
        posar piezas sobre la ladera.
      </div>
    );
  }

  return (
    <div className="vitin__colocar">
      <p className="vitin__colocarGuia">
        Elija una pieza y <strong>toque la ladera</strong> donde va: se posa a la
        altura del terreno. Gírela de a 45° y déjela fijada. Arrastre para mover
        la cámara. (Probadera en memoria: nada se guarda.)
      </p>
      <div className="vitin__colocarCtl">
        <label className="vitin__field">
          <span>Pieza</span>
          <select value={tipoSel} onChange={(e) => setTipoSel(e.target.value)}>
            {INFRAESTRUCTURA_IDS.map((id) => (
              <option key={id} value={id}>
                {INFRAESTRUCTURA[id].emoji} {INFRAESTRUCTURA[id].nombre}
              </option>
            ))}
          </select>
        </label>
        <div className="vitin__botonera">
          <button type="button" className="vitin__accion" onClick={girar} disabled={!borrador}>
            ↻ Girar 45°
          </button>
          <button
            type="button"
            className="vitin__accion vitin__accion--fijar"
            onClick={fijar}
            disabled={!borrador || llena}
          >
            ✓ Dejarla aquí
          </button>
          <button
            type="button"
            className="vitin__accion"
            onClick={quitarUltima}
            disabled={colocadas.length === 0}
          >
            ⌫ Quitar la última
          </button>
          <button
            type="button"
            className="vitin__accion"
            onClick={despejar}
            disabled={colocadas.length === 0 && !borrador}
          >
            ✕ Despejar
          </button>
        </div>
      </div>
      <div className="vitin__lienzoColocar">
        <Suspense fallback={<div className="vitin__cargando">Preparando la ladera…</div>}>
          <Canvas
            className="vitin__canvas"
            dpr={[1, tier === 'alto' ? 1.6 : 1.2]}
            gl={{ antialias: tier === 'alto', powerPreference: 'high-performance' }}
            camera={{ position: [11, 13, 17], fov: 46 }}
            frameloop={reducedMotion ? 'demand' : 'always'}
          >
            <color attach="background" args={[ATMOSFERA.fondo]} />
            <fog attach="fog" args={[ATMOSFERA.niebla, 26, 62]} />
            <hemisphereLight intensity={0.62} color={ATMOSFERA.cielo} groundColor={ATMOSFERA.suelo} />
            <ambientLight intensity={0.3} color={ATMOSFERA.luz} />
            <directionalLight position={[8, 12, 6]} intensity={0.95} color={ATMOSFERA.luz} />
            <directionalLight position={[-6, 5, -8]} intensity={0.22} color={ATMOSFERA.relleno} />
            <TerrenoDemo segmentos={tier === 'alto' ? 56 : 34} onTocar={tocarTerreno} />
            {colocadas.map((c, i) => (
              <Infraestructura
                key={`${c.tipo}-${i}`}
                tipo={c.tipo}
                pos={c.pos}
                rot={c.rot}
                dims={/** @type {any} */ (undefined)}
                params={/** @type {any} */ (undefined)}
                tier={tier}
                reducedMotion={reducedMotion}
              />
            ))}
            {borrador && (
              <>
                <AnilloBorrador borrador={borrador} />
                <Infraestructura
                  tipo={borrador.tipo}
                  pos={borrador.pos}
                  rot={borrador.rot}
                  dims={/** @type {any} */ (undefined)}
                  params={/** @type {any} */ (undefined)}
                  tier={tier}
                  reducedMotion={reducedMotion}
                />
              </>
            )}
            <OrbitControls
              target={[0, 1.6, 0]}
              makeDefault
              enablePan={false}
              enableZoom
              minDistance={9}
              maxDistance={38}
              minPolarAngle={0.25}
              maxPolarAngle={1.42}
              enableDamping
              dampingFactor={0.1}
            />
          </Canvas>
        </Suspense>
      </div>
      <p className="vitin__colocarEstado" aria-live="polite">
        {llena
          ? `El terreno está lleno (${MAX_COLOCADAS} piezas): quite alguna para seguir.`
          : `Piezas fijadas: ${colocadas.length} de ${MAX_COLOCADAS}.`}
        {borrador
          ? ` Hay una ${INFRAESTRUCTURA[borrador.tipo].nombre.toLowerCase()} sin fijar.`
          : ''}
      </p>
    </div>
  );
}

/* ── La vitrina ────────────────────────────────────────────────────────────── */
export default function VitrinaInfraestructura({ onBack }) {
  const tierInicial = useMemo(() => decidirTier().tier, []);
  const [pestana, setPestana] = useState(PESTANAS[0].id);
  const [tier, setTier] = useState(/** @type {any} */ (tierInicial));
  const [soloFichas, setSoloFichas] = useState(() => !permite3D(tierInicial));
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );
  const modo3D = !soloFichas;

  const piezasDePestana = useMemo(
    () => INFRAESTRUCTURA_IDS.map((id) => INFRAESTRUCTURA[id]).filter((e) => e.categoria === pestana),
    [pestana],
  );

  return (
    <div className="vitin" data-tier={tier}>
      <header className="vitin__head">
        <div className="vitin__headMain">
          <button type="button" className="vitin__back" onClick={() => onBack?.()}>
            ← Volver
          </button>
          <div>
            <h1 className="vitin__title">Vitrina de infraestructura</h1>
            <p className="vitin__sub">
              Las piezas de construcción del catálogo, vivas y girables: véalas
              por familia, cámbieles el tamaño y pruebe a posarlas en la ladera.
            </p>
          </div>
        </div>

        <div className="vitin__controls" role="group" aria-label="Controles globales">
          <div className="vitin__ctl">
            <span className="vitin__ctlLabel">Detalle</span>
            <div className="vitin__segmented">
              {TIERS.map((t) => (
                <button
                  key={t.v}
                  type="button"
                  className={`vitin__seg${tier === t.v ? ' is-on' : ''}`}
                  onClick={() => setTier(t.v)}
                  aria-pressed={tier === t.v}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <label className="vitin__toggle">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
            />
            <span>Movimiento reducido</span>
          </label>
          <label className="vitin__toggle">
            <input
              type="checkbox"
              checked={soloFichas}
              onChange={(e) => setSoloFichas(e.target.checked)}
            />
            <span>Solo fichas 2D</span>
          </label>
        </div>

        <nav className="vitin__tabs" aria-label="Familias de infraestructura">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`vitin__tab${pestana === p.id ? ' is-on' : ''}`}
              onClick={() => setPestana(p.id)}
              aria-pressed={pestana === p.id}
            >
              <span aria-hidden="true">{p.emoji}</span> {p.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="vitin__body">
        {pestana === ID_COLOCAR ? (
          <section className="vitin__section" aria-label="Colocar en el terreno">
            <DemoColocar modo3D={modo3D} tier={tier} reducedMotion={reducedMotion} />
          </section>
        ) : (
          <section
            className="vitin__section"
            aria-label={ROTULO_CAT[pestana]?.txt || pestana}
          >
            <div className="vitin__grid">
              {piezasDePestana.map((entry) => (
                <TarjetaPieza
                  key={entry.id}
                  entry={entry}
                  modo3D={modo3D}
                  tier={tier}
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
