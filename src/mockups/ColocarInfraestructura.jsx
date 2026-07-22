/*
 * ColocarInfraestructura — modo COLOCAR de la librería de infraestructura 3D
 * (ruta #/mockups/colocar-infraestructura).
 *
 * El paso que le sigue a la vitrina (#/mockups/infraestructura-3d): allá el
 * campesino MIRA el catálogo; aquí lo USA — elige una construcción (galería),
 * toca el terreno donde va, la gira en pasos de 45° y la confirma. La pieza se
 * POSA sobre la ladera (snapping a la altura del terreno, la misma fórmula de
 * ladera andina del valle) y queda guardada en el equipo:
 *
 *   localStorage['chagra.infraColocada'] = [{ tipo, pos: [x,y,z], rot }]
 *
 * — el mismo shape que consume `<Infraestructura tipo pos rot/>`, así que un
 * mundo real puede leer esta lista tal cual el día que se cablee a la finca.
 *
 * LIGERO a propósito: NO importa Valle3D (ese módulo arrastra criaturas,
 * animales y toda la data del valle); replica su `alturaTerreno(x, z)` en Math
 * puro y dibuja una ladera propia y sencilla. Tampoco toca EscenaRecinto ni
 * EscenaBase3D: es una escena autocontenida.
 *
 * PERF (device-tiering real): en equipo humilde / ahorro de datos cae al PLANO
 * 2D cenital (sin WebGL) con el mismo flujo completo — tocar, girar, confirmar,
 * guardar — y hay botón para forzarlo. Táctil: todos los controles ≥ 44px.
 * Autocontenida, móvil-first (320px), español de Colombia en "usted".
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  INFRAESTRUCTURA,
  INFRAESTRUCTURA_IDS,
} from '../visual/mundo3d/infraestructura/infraestructuraData.js';
import Infraestructura from '../visual/mundo3d/infraestructura/Infraestructura.jsx';
import { decidirTier, permite3D } from '../visual/mundo3d/index.js';
import { ATMOSFERA } from '../visual/mundo3d/atmosferaMadre.js';
import { MSG } from '../config/messages.js';
import './colocar-infraestructura.css';

/* ── El terreno ──────────────────────────────────────────────────────────────
 * La misma ladera andina de Valle3D (mockups/valle/Valle3D.jsx): al fondo
 * (z negativo) trepa al páramo, al frente (z positivo) baja a tierra caliente.
 * Copiada en Math puro (sin THREE.MathUtils) para que el snapping funcione
 * igual en el plano 2D sin tocar three. Determinista: la pieza se posa encima.
 */
const TAM = 30; // lado del terreno en metros (mundo de juguete)
const BORDE = TAM / 2 - 1.5; // margen: que nada quede colgando del filo

function alturaTerreno(x, z) {
  const t = Math.min(1, Math.max(0, (-z + 8) / 19)); // smoothstep(-z, -8, 11)
  const subida = t * t * (3 - 2 * t) * 5.4;
  const ondul = Math.sin(x * 0.42) * 0.14 + Math.cos(z * 0.36 + x * 0.2) * 0.12;
  const cauce = -0.32 * Math.exp(-((x - 1.2) ** 2) / 6) * Math.exp(-((z + 1) ** 2) / 55);
  return subida + ondul + cauce;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* Snap de un punto (x, z) tocado: se acota al terreno y se posa a su altura. */
function puntoAterrizado(x, z) {
  const px = clamp(x, -BORDE, BORDE);
  const pz = clamp(z, -BORDE, BORDE);
  return [px, alturaTerreno(px, pz), pz];
}

/* ── Persistencia (estado local del equipo) ────────────────────────────────── */
const CLAVE_GUARDADO = 'chagra.infraColocada';
const MAX_COLOCADAS = 40; // techo de cordura: perf y sentido común

function cargarColocadas() {
  try {
    const arr = JSON.parse(localStorage.getItem(CLAVE_GUARDADO) || '[]');
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (c) =>
          c &&
          INFRAESTRUCTURA[c.tipo] &&
          Array.isArray(c.pos) &&
          c.pos.length === 3 &&
          c.pos.every(Number.isFinite) &&
          Number.isFinite(c.rot),
      )
      .slice(0, MAX_COLOCADAS);
  } catch {
    return []; // guardado corrupto o storage bloqueado: finca vacía, sin drama
  }
}

function guardarColocadas(lista) {
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(lista));
  } catch {
    /* storage lleno/bloqueado: la sesión sigue viva en memoria */
  }
}

/* ── La ladera 3D ────────────────────────────────────────────────────────────
 * Plano desplazado por alturaTerreno + color por altura (cálido abajo, páramo
 * arriba). Distingue TOQUE de ARRASTRE (OrbitControls): solo coloca si el dedo
 * no se movió más de unos px entre down y up.
 */
function Terreno({ segmentos, onTocar }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(TAM, TAM, segmentos, segmentos);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colores = new Float32Array(pos.count * 3);
    const cBajo = new THREE.Color('#9db35f'); // pasto de tierra templada
    const cAlto = new THREE.Color('#6d8a68'); // frailejonal apagado
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = alturaTerreno(x, z);
      pos.setY(i, y);
      c.copy(cBajo).lerp(cAlto, clamp(y / 5.4, 0, 1));
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

/* El anillo que marca el BORRADOR (la pieza aún sin confirmar) en el piso. */
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

/* Retrato (teléfono en vertical), decidido UNA vez al cargar el módulo: la
   toma de escritorio dejaba el terreno en una franja arriba y media pantalla
   de vacío. El sujeto es EL TERRENO donde se coloca: en retrato la cámara
   pica más y el lote llena el cuadro. */
const RETRATO = typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(max-aspect-ratio: 19/20)').matches;

/* La escena completa de colocación: ladera + lo ya colocado + el borrador. */
function EscenaColocar({ tier, reducedMotion, colocadas, borrador, onTocar }) {
  const segmentos = tier === 'alto' ? 48 : 28;
  return (
    <Canvas
      className="cinf__canvas"
      dpr={[1, tier === 'alto' ? 1.5 : 1.15]}
      gl={{ antialias: tier === 'alto', powerPreference: 'high-performance' }}
      camera={RETRATO ? { position: [0, 16, 11.5], fov: 48 } : { position: [0, 13, 19], fov: 46 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
    >
      <color attach="background" args={[ATMOSFERA.fondo]} />
      <hemisphereLight intensity={0.62} color={ATMOSFERA.cielo} groundColor={ATMOSFERA.suelo} />
      <ambientLight intensity={0.28} color={ATMOSFERA.luz} />
      <directionalLight position={[8, 12, 6]} intensity={0.95} color={ATMOSFERA.luz} />
      <directionalLight position={[-6, 5, -8]} intensity={0.2} color={ATMOSFERA.relleno} />
      <Terreno segmentos={segmentos} onTocar={onTocar} />
      <Suspense fallback={null}>
        {colocadas.map((c, i) => (
            <Infraestructura
                    key={`${c.tipo}-${i}`}
              tipo={c.tipo}
              pos={c.pos}
              rot={c.rot}
              dims={c.dims}
              params={c.params || {}}
              tier={tier}
              reducedMotion={reducedMotion}
            />
        ))}
        {borrador && (
          <>
            <Infraestructura
              tipo={borrador.tipo}
              pos={borrador.pos}
              rot={borrador.rot}
              dims={borrador.dims}
              params={borrador.params || {}}
              tier={tier}
              reducedMotion={reducedMotion}
            />
            <AnilloBorrador borrador={borrador} />
          </>
        )}
      </Suspense>
      <OrbitControls
        target={RETRATO ? [0, 0.6, 0] : [0, 2.2, 0]}
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={9}
        maxDistance={38}
        minPolarAngle={0.25}
        maxPolarAngle={1.32}
        enableDamping
        dampingFactor={0.1}
      />
    </Canvas>
  );
}

/* ── El plano 2D cenital (gama baja / a elección) ───────────────────────────
 * Visto desde arriba: páramo al fondo (arriba), tierra caliente al frente
 * (abajo) — el mismo terreno, sin WebGL. Tocar el plano ubica; los marcadores
 * son el emoji de cada pieza, girado con el mismo `rot` que guarda el 3D.
 */
function pctDesdeMetros(v) {
  return ((v / (TAM / 2)) + 1) * 50; // [-15, 15] m → [0, 100] %
}

function Marcador2D({ item, borrador }) {
  const e = INFRAESTRUCTURA[item.tipo];
  return (
    <span
      className={`cinf__marca${borrador ? ' cinf__marca--borrador' : ''}`}
      style={{ left: `${pctDesdeMetros(item.pos[0])}%`, top: `${pctDesdeMetros(item.pos[2])}%` }}
      title={e.nombre}
    >
      <span
        className="cinf__marca-emoji"
        style={{ transform: `rotate(${Math.round((-item.rot * 180) / Math.PI)}deg)` }}
        aria-hidden="true"
      >
        {e.emoji}
      </span>
    </span>
  );
}

function Plano2D({ colocadas, borrador, onTocar }) {
  const ref = useRef(null);
  return (
    <div
      ref={ref}
      className="cinf__plano"
      role="application"
      aria-label="Plano de la finca visto desde arriba. Toque donde va la construcción."
      onClick={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return;
        const relX = (e.clientX - rect.left) / rect.width;
        const relZ = (e.clientY - rect.top) / rect.height;
        onTocar((relX * 2 - 1) * (TAM / 2), (relZ * 2 - 1) * (TAM / 2));
      }}
    >
      <span className="cinf__plano-rotulo cinf__plano-rotulo--alto">Páramo (arriba)</span>
      <span className="cinf__plano-rotulo cinf__plano-rotulo--bajo">Tierra caliente (abajo)</span>
      {colocadas.map((c, i) => (
        <Marcador2D key={`${c.tipo}-${i}`} item={c} borrador={false} />
      ))}
      {borrador && <Marcador2D item={borrador} borrador />}
    </div>
  );
}

/* ── El mockup ────────────────────────────────────────────────────────────── */
const PASO_GIRO = Math.PI / 4; // 45° por toque: preciso sin ser quisquilloso

export default function ColocarInfraestructura() {
  // Device-tiering REAL (una vez): gama baja / ahorro / menos-movimiento → 2D.
  const decision = useMemo(() => decidirTier(), []);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const capaz3D = permite3D(decision.tier);
  const [ver2d, setVer2d] = useState(false);
  const en3D = capaz3D && !ver2d;
  const tier = decision.tier === 'alto' ? 'alto' : 'medio';

  const [colocadas, setColocadas] = useState(cargarColocadas);
  const [seleccion, setSeleccion] = useState(null); // id elegido en la galería
  const [borrador, setBorrador] = useState(null); // { tipo, pos, rot } sin confirmar
  const [aviso, setAviso] = useState(null); // toast corto (aria-live)
  const timerAviso = useRef(null);

  useEffect(() => () => clearTimeout(timerAviso.current), []);
  const avisar = (txt) => {
    setAviso(txt);
    clearTimeout(timerAviso.current);
    timerAviso.current = setTimeout(() => setAviso(null), 2600);
  };

  const elegir = (id) => {
    setSeleccion(id);
    setBorrador(null);
    avisar(`Toque el terreno donde va su ${INFRAESTRUCTURA[id].nombre.toLowerCase()}.`);
  };

  const tocarTerreno = (x, z) => {
    const tipo = borrador?.tipo || seleccion;
    if (!tipo) {
      avisar('Primero elija una construcción de la lista de abajo.');
      return;
    }
    setBorrador((b) => ({ tipo, pos: puntoAterrizado(x, z), rot: b?.rot || 0 }));
  };

  const girar = (dir) =>
    setBorrador((b) => (b ? { ...b, rot: b.rot + dir * PASO_GIRO } : b));

  const confirmar = () => {
    if (!borrador) return;
    if (colocadas.length >= MAX_COLOCADAS) {
      avisar('Ya no cabe más: quite alguna construcción primero.');
      return;
    }
    const lista = [...colocadas, borrador];
    setColocadas(lista);
    guardarColocadas(lista);
    avisar(`Listo: su ${INFRAESTRUCTURA[borrador.tipo].nombre.toLowerCase()} quedó en la finca. ✓`);
    setBorrador(null);
    setSeleccion(null);
  };

  const cancelar = () => {
    setBorrador(null);
    setSeleccion(null);
    setAviso(null);
  };

  const quitarUltima = () => {
    if (!colocadas.length) return;
    const lista = colocadas.slice(0, -1);
    setColocadas(lista);
    guardarColocadas(lista);
    avisar('Se quitó la última construcción.');
  };

  const entradaBorrador = borrador ? INFRAESTRUCTURA[borrador.tipo] : null;
  const entradaSeleccion = seleccion ? INFRAESTRUCTURA[seleccion] : null;

  return (
    <main className="cinf">
      <header className="cinf__head">
        <p className="cinf__kicker">Los mundos de su finca · colocar</p>
        <h1>Ponga su infraestructura en la finca</h1>
        <p className="cinf__lema">
          Elija una construcción, toque el terreno donde va, gírela y confírmela.
          Queda guardada en su equipo.
        </p>
        {capaz3D && (
          <button type="button" className="cinf__toggle" onClick={() => setVer2d((v) => !v)}>
            {ver2d ? 'Ver en 3D' : 'Ver como plano (2D)'}
          </button>
        )}
        {!capaz3D && (
          <p className="cinf__aviso-tier">
            Su equipo va mejor con el plano: aquí ubica sus construcciones vistas
            desde arriba (va parejo en cualquier teléfono).
          </p>
        )}
      </header>

      <div className="cinf__escena">
        {en3D ? (
          <EscenaColocar
            tier={tier}
            reducedMotion={reducedMotion}
            colocadas={colocadas}
            borrador={borrador}
            onTocar={tocarTerreno}
          />
        ) : (
          <Plano2D colocadas={colocadas} borrador={borrador} onTocar={tocarTerreno} />
        )}
        <p className="cinf__toast" role="status" aria-live="polite">
          {aviso || ''}
        </p>
      </div>

      <section className="cinf__panel" aria-label="Controles de colocación">
        {borrador && entradaBorrador ? (
          <div className="cinf__acciones">
            <p className="cinf__estado">
              <span aria-hidden="true">{entradaBorrador.emoji}</span> {entradaBorrador.nombre} — toque
              el terreno para moverla, o gírela y confírmela.
            </p>
            <div className="cinf__botonera">
              <button type="button" className="cinf__btn" onClick={() => girar(-1)}>
                ⟲ Girar
              </button>
              <button type="button" className="cinf__btn" onClick={() => girar(1)}>
                ⟳ Girar
              </button>
              <button type="button" className="cinf__btn cinf__btn--ok" onClick={confirmar}>
                ✓ Ponerla aquí
              </button>
              <button type="button" className="cinf__btn cinf__btn--no" onClick={cancelar}>
                ✕ {MSG.action.cancelar}
              </button>
            </div>
          </div>
        ) : entradaSeleccion ? (
          <div className="cinf__acciones">
            <p className="cinf__estado">
              <span aria-hidden="true">{entradaSeleccion.emoji}</span> {entradaSeleccion.nombre} —
              toque el terreno donde va.
            </p>
            <div className="cinf__botonera">
              <button type="button" className="cinf__btn cinf__btn--no" onClick={cancelar}>
                ✕ {MSG.action.cancelar}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="cinf__titulo-galeria">Elija una construcción</h2>
            <ul className="cinf__galeria">
              {INFRAESTRUCTURA_IDS.map((id) => {
                const e = INFRAESTRUCTURA[id];
                return (
                  <li key={id}>
                    <button type="button" className="cinf__ficha" onClick={() => elegir(id)}>
                      <span className="cinf__ficha-emoji" aria-hidden="true">
                        {e.emoji}
                      </span>
                      <span className="cinf__ficha-nombre">{e.nombre}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <footer className="cinf__pie">
          <p className="cinf__cuenta">
            {colocadas.length === 0
              ? 'Todavía no ha puesto construcciones.'
              : `${colocadas.length} ${colocadas.length === 1 ? 'construcción puesta' : 'construcciones puestas'} en su finca.`}
          </p>
          {colocadas.length > 0 && !borrador && (
            <button type="button" className="cinf__btn cinf__btn--suave" onClick={quitarUltima}>
              Quitar la última
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}
