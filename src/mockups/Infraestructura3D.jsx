/*
 * Infraestructura3D — VITRINA pública de la LIBRERÍA DE INFRAESTRUCTURA 3D
 * (ruta #/mockups/infraestructura-3d).
 *
 * Muestra TODAS las piezas del catálogo (src/visual/mundo3d/infraestructura) en
 * una grilla, agrupadas por categoría, para revisarlas de un vistazo: cómo se ve
 * cada invernadero, galpón, tanque o secadero antes de agregarlo a un mundo. Cada
 * tarjeta trae su diorama 3D low-poly girable + nombre, medidas típicas (metros)
 * y para qué sirve.
 *
 * PERF (device-tiering real del framework): en equipo humilde / ahorro de datos /
 * menos-movimiento cae a la vista de FICHAS 2D (sin WebGL), y hay un botón para
 * forzarla. En 3D, cada tarjeta monta su Canvas SOLO cuando entra en pantalla
 * (IntersectionObserver) y lo suelta al salir — así nunca hay diez contextos
 * WebGL vivos a la vez. `frameloop='demand'` bajo reduced-motion (diorama quieto).
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en español
 * de Colombia, en "usted". El 3D (three/R3F) va en el chunk perezoso de esta ruta.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  INFRAESTRUCTURA,
  INFRAESTRUCTURA_CATEGORIAS,
} from '../visual/mundo3d/infraestructura/infraestructuraData.js';
import Infraestructura from '../visual/mundo3d/infraestructura/Infraestructura.jsx';
import { decidirTier, permite3D } from '../visual/mundo3d/index.js';
import { ATMOSFERA } from '../visual/mundo3d/atmosferaMadre.js';
import './Infraestructura3D.css';

/* Etiqueta legible de cada categoría del catálogo (con su emoji de familia). */
const ROTULO_CAT = {
  'cultivo protegido': { emoji: '🌱', txt: 'Cultivo protegido' },
  pecuaria: { emoji: '🐄', txt: 'Animales' },
  almacenamiento: { emoji: '📦', txt: 'Almacenamiento y reciclaje' },
  agua: { emoji: '💧', txt: 'Agua' },
  poscosecha: { emoji: '☕', txt: 'Poscosecha' },
};

/* Formatea las medidas típicas en un texto campesino (largo × ancho × alto). */
function medidasTexto(dims) {
  const n = (v) => `${v}`.replace('.', ',');
  return `${n(dims.largo)} × ${n(dims.ancho)} × ${n(dims.alto)} m`;
}

/* IntersectionObserver: ¿la tarjeta está (cerca de) en pantalla? Monta/suelta el
   Canvas para acotar los contextos WebGL vivos. Margen generoso: aparece un poco
   antes de entrar y se va un poco después de salir (sin parpadeo). */
function useEnVista() {
  const ref = useRef(null);
  const [enVista, setEnVista] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setEnVista(true); // sin observer (SSR/viejo): mostrar y ya
      return undefined;
    }
    const obs = new IntersectionObserver(
      ([e]) => setEnVista(e.isIntersecting),
      { rootMargin: '300px 0px', threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, enVista };
}

/* El lienzo 3D de UNA pieza: fondo dorado del valle, luz de hora dorada, un piso
   redondo y la infraestructura centrada. Cámara encuadrada a sus medidas; se gira
   con el dedo (autorotación suave, apagada bajo reduced-motion). */
function LienzoInfra({ tipo, dims, tier, reducedMotion }) {
  const span = Math.max(dims.largo, dims.ancho, dims.alto);
  const d = span * 1.35 + 2.4;
  const target = /** @type {[number, number, number]} */ ([0, dims.alto * 0.42, 0]);
  return (
    <Canvas
      className="vinf__canvas"
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
      {/* piso: un disco de tierra tibia que posa la pieza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[span * 1.05, 40]} />
        <meshLambertMaterial color="#b49873" />
      </mesh>
      <Suspense fallback={null}>
        <Infraestructura tipo={tipo} dims={dims} params={{}} tier={tier} reducedMotion={reducedMotion} />
      </Suspense>
      <OrbitControls
        target={target}
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

/* Una tarjeta del catálogo: el diorama (o su ficha 2D) + nombre, medidas y para
   qué sirve. El Canvas solo vive mientras la tarjeta está en pantalla. */
function TarjetaInfra({ entry, puede3D, reducedMotion, tierBase }) {
  const { ref, enVista } = useEnVista();
  const mostrar3D = puede3D && enVista;
  const tier = tierBase;
  return (
    <li className="vinf__card" ref={ref}>
      <div className="vinf__lienzo" aria-label={`Diorama de ${entry.nombre}`}>
        {mostrar3D ? (
          <LienzoInfra tipo={entry.id} dims={entry.dims} tier={tier} reducedMotion={reducedMotion} />
        ) : (
          <div className="vinf__placeholder" aria-hidden={puede3D ? 'true' : undefined}>
            <span className="vinf__ph-emoji">{entry.emoji}</span>
            {!puede3D && <span className="vinf__ph-txt">Dibujo de la finca</span>}
          </div>
        )}
      </div>
      <div className="vinf__meta">
        <h3>
          <span className="vinf__emoji" aria-hidden="true">{entry.emoji}</span>
          {entry.nombre}
        </h3>
        <p className="vinf__medidas">{medidasTexto(entry.dims)}</p>
        <p className="vinf__desc">{entry.descripcion}</p>
      </div>
    </li>
  );
}

export default function Infraestructura3D() {
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
  const puede3D = capaz3D && !ver2d;
  // En la vitrina el diorama chico no necesita el detalle pleno: 'medio' ahorra.
  const tierBase = decision.tier === 'alto' ? 'alto' : 'medio';

  const total = Object.keys(INFRAESTRUCTURA).length;
  const porCategoria = useMemo(
    () =>
      INFRAESTRUCTURA_CATEGORIAS.map((cat) => ({
        cat,
        items: Object.values(INFRAESTRUCTURA).filter((e) => e.categoria === cat),
      })),
    [],
  );

  return (
    <main className="vinf">
      <header className="vinf__head">
        <p className="vinf__kicker">Los mundos de su finca · vitrina</p>
        <h1>La infraestructura de su finca</h1>
        <p className="vinf__lema">
          Estas son las construcciones que puede agregar a sus mundos para verlos
          parecidos a los de verdad: su invernadero, su galpón, su tanque, su
          secadero. Cada una con sus medidas típicas — usted las ajusta a las de su
          finca. Toque un diorama y gírelo con el dedo.
        </p>
        <div className="vinf__barra">
          <p className="vinf__cuenta">{total} construcciones en el catálogo</p>
          {capaz3D && (
            <button type="button" className="vinf__toggle" onClick={() => setVer2d((v) => !v)}>
              {ver2d ? 'Ver en 3D' : 'Ver como dibujo (2D)'}
            </button>
          )}
        </div>
        {!capaz3D && (
          <p className="vinf__aviso">
            Su equipo va mejor con el dibujo: aquí ve las fichas de cada
            construcción (van parejas en cualquier teléfono).
          </p>
        )}
      </header>

      {porCategoria.map(({ cat, items }) => {
        const rot = ROTULO_CAT[cat] || { emoji: '🏗️', txt: cat };
        return (
          <section key={cat} className="vinf__grupo" aria-label={rot.txt}>
            <h2 className="vinf__cat">
              <span aria-hidden="true">{rot.emoji}</span> {rot.txt}
            </h2>
            <ul className="vinf__grid">
              {items.map((entry) => (
                <TarjetaInfra
                  key={entry.id}
                  entry={entry}
                  puede3D={puede3D}
                  reducedMotion={reducedMotion}
                  tierBase={tierBase}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <footer className="vinf__pie">
        <p>
          ¿Le falta una construcción? La librería es de datos: se agrega una
          entrada al catálogo y aparece aquí y en los mundos. Empiece por medir la
          suya con la cinta.
        </p>
      </footer>
    </main>
  );
}
