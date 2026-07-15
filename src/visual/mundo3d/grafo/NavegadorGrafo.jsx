/**
 * NavegadorGrafo.jsx — el saber de la chagra, navegable.
 *
 * Chagra tiene un grafo de conocimiento de verdad: 134 matas, 122 plagas, sus
 * remedios, sus aliados y ~900 relaciones entre todo eso. Hasta hoy ese saber
 * vivía en un JSON y salía en párrafos de texto. Aquí se puede VER y RECORRER.
 *
 * LA APUESTA: NO ES UNA CONSTELACIÓN, ES UNA CORDILLERA
 * ────────────────────────────────────────────────────
 * El camino fácil era la nube de puntos flotando en negro con líneas de neón —
 * el dashboard de tecnología que se ve en cualquier conferencia. Se ve
 * impresionante en una foto y no le sirve absolutamente de nada a nadie: la
 * posición no significa NADA, así que no hay nada que leer.
 *
 * Aquí la altura en la pantalla ES la altura sobre el mar (piso térmico,
 * Caldas 1808). El mapa se para en el suelo de un hecho que el campesino de
 * Choachí ya conoce con el cuerpo: abajo hace calor y se da el plátano, arriba
 * hace frío y se da la papa, más arriba ya no se da nada. Nadie tiene que leer
 * una leyenda para orientarse — se orienta como se orienta en su vereda.
 *
 * De ahí sale todo lo demás:
 *   · el aire es la hora dorada de `atmosferaMadre` bajada de luz, no el vacío;
 *   · la niebla se come la distancia, y ESO es lo que desenreda el espagueti —
 *     mucho más que cualquier algoritmo de layout;
 *   · enfocar apaga el resto hacia la niebla en vez de esconderlo, para que
 *     usted nunca pierda el norte;
 *   · lo que no sabemos (55 matas sin piso declarado) se dibuja en la niebla del
 *     pie, con su rótulo. El mapa muestra sus huecos; no se los inventa.
 *
 * TIER-SAFE POR CONSTRUCCIÓN, NO POR PARCHE
 * ─────────────────────────────────────────
 * Todo lo caro —construir el grafo, acomodarlo, tejer las curvas, recolorear al
 * enfocar— pasa en eventos, nunca en el bucle de render. En gama baja: menos
 * nodos (los que enseñan, ver `grafoModelo`), cero física (espiral pura), línea
 * de 1 px, sin bloom, sin estratos y sin respiración. Sigue siendo el mismo mapa
 * y sigue diciendo la verdad — solo que quieto. Nunca pantalla negra, nunca el
 * teléfono ahogado.
 */

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { decidirTier, perfilDeTier } from '../deviceTier.js';
import { cargarGrafoCrudo, construirGrafo, relacionesDe } from './grafoModelo.js';
import { calcularLayout } from './grafoLayout.js';
import { AIRE, TIPOS_NODO, TIPOS_ARISTA, TIPOS_ORDEN, TINTE_PISO, colorDeNodo } from './grafoPaleta.js';
import BandasPiso from './BandasPiso.jsx';
import NodosGrafo from './NodosGrafo.jsx';
import AristasGrafo from './AristasGrafo.jsx';
import './navegadorGrafo.css';

/* El bloom de la hora dorada, el MISMO de todo el mundo 3D (un solo bloom en
   todo el juego = la luz se siente del mismo atardecer). Lazy: en gama media y
   baja el chunk ni se descarga. */
const BloomSutil = lazy(() => import('../escenas/BloomSutil.jsx'));

/** Cómo se nombra cada piso en la carta. */
const NOMBRE_PISO = {
  calido: 'piso cálido', templado: 'piso templado', frio: 'piso frío',
  paramo: 'páramo', superparamo: 'superpáramo', nival: 'nival',
  sin_piso: 'sin altura declarada',
};

// ── La cámara que acompaña ─────────────────────────────────────────────────
/**
 * Al tocar un nodo la cámara se ACERCA a él; al soltar, vuelve a ver el cerro
 * completo. Sin saltos: se desliza. Un salto de cámara desorienta y obliga a
 * reconstruir mentalmente dónde quedó uno — el deslizamiento mantiene el hilo.
 * Con `prefers-reduced-motion` no se desliza: se planta de una (que es lo que
 * pidió quien activó esa preferencia).
 */
function CamaraEnfoque({ enfocado, posiciones, centro, radioMax, reducedMotion }) {
  const controles = useThree((s) => s.controls);
  const invalidar = useThree((s) => s.invalidate);
  const destino = useRef(new THREE.Vector3());
  const distDestino = useRef(1);

  useEffect(() => {
    const p = enfocado ? posiciones.get(enfocado) : null;
    if (p) {
      destino.current.set(p[0], p[1], p[2]);
      distDestino.current = 5.2;
    } else {
      destino.current.copy(centro);
      distDestino.current = radioMax * 2.5 + 6;
    }
    invalidar();
  }, [enfocado, posiciones, centro, radioMax, invalidar]);

  useFrame((state, dt) => {
    if (!controles) return;
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2); // suavizado estable
    controles.target.lerp(destino.current, k);

    // Acercar/alejar respetando el ángulo que el usuario haya escogido.
    const cam = state.camera;
    const haciaCam = cam.position.clone().sub(controles.target);
    const dist = haciaCam.length() || 0.001;
    const nueva = THREE.MathUtils.lerp(dist, distDestino.current, k * 0.7);
    cam.position.copy(controles.target).add(haciaCam.multiplyScalar(nueva / dist));
    controles.update();
  });

  return null;
}

// ── La carta del nodo enfocado ─────────────────────────────────────────────
/**
 * Lo que sabe el grafo de lo que usted tocó, en voz de usted. DOM real, no
 * textura: se lee nítido, respeta el tamaño de letra del sistema y el lector de
 * pantalla lo anuncia.
 */
function CartaNodo({ grafo, nodo, onIr, onCerrar }) {
  const rels = useMemo(() => (nodo ? relacionesDe(grafo, nodo.id) : []), [grafo, nodo]);
  if (!nodo) return null;

  const tipo = TIPOS_NODO[nodo.tipo];
  const color = colorDeNodo(nodo);

  return (
    <aside className="grafo-carta" role="status" aria-live="polite" style={{ '--carta-tinte': color }}>
      <button type="button" className="grafo-carta__cerrar" onClick={onCerrar} aria-label="Cerrar y ver todo el mapa">
        ×
      </button>

      <p className="grafo-carta__tipo">{tipo.etiqueta}</p>
      <h3 className="grafo-carta__nombre">{nodo.etiqueta}</h3>
      {nodo.sub && <p className="grafo-carta__sub">{nodo.sub}</p>}

      {nodo.tipo === 'especie' && (
        <p className="grafo-carta__piso">
          <span className="grafo-carta__punto" style={{ background: TINTE_PISO[nodo.piso] }} aria-hidden="true" />
          {NOMBRE_PISO[nodo.piso] || nodo.piso}
        </p>
      )}

      {!!nodo.nombresComunes?.length && (
        <p className="grafo-carta__alias">También le dicen: {nodo.nombresComunes.join(', ')}.</p>
      )}

      {rels.length === 0 && (
        <p className="grafo-carta__vacio">El grafo todavía no le conoce relaciones a esta ficha.</p>
      )}

      {rels.map((r) => (
        <div key={r.tipo} className="grafo-carta__grupo">
          <p className="grafo-carta__rel" style={{ '--rel-tinte': TIPOS_ARISTA[r.tipo].color }}>
            {TIPOS_ARISTA[r.tipo].etiqueta}
            <span className="grafo-carta__cuenta">{r.otros.length}</span>
          </p>
          <ul className="grafo-carta__lista">
            {r.otros.map((o) => (
              <li key={o.id}>
                <button type="button" className="grafo-carta__salto" onClick={() => onIr(o.id)}>
                  {o.etiqueta}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}

// ── La escena ──────────────────────────────────────────────────────────────
function Escena({ grafo, layout, tier, reducedMotion, enfocado, relacionados, onTocar, onSobre, onFondo }) {
  const centro = useMemo(
    () => new THREE.Vector3(0, ((layout.yMin ?? 0) + (layout.yMax ?? 0)) / 2, 0),
    [layout],
  );

  return (
    <>
      <color attach="background" args={[AIRE.fondo]} />
      {/* LA NIEBLA NO ES DECORACIÓN: ES LO QUE DESENREDA EL MAPA.
          Entierra lo lejano y deja nítido lo que usted está mirando — hace por
          la legibilidad más que cualquier algoritmo de acomodado. Y al enfocar
          una mata, la cámara se le acerca: el resto del grafo se hunde en la
          niebla SOLO, sin que haya que esconder nada a mano.

          Cerca/lejos salen del tamaño real del cerro, no de constantes: en gama
          baja el grafo viene recortado y es más chiquito, y con números fijos se
          ahogaría entero en niebla. En gama baja no hay niebla (ley de
          `deviceTier`) y por eso justamente allá el grafo se recorta. */}
      {tier !== 'bajo' && (
        <fog attach="fog" args={[AIRE.niebla, layout.radioMax * 1.6, layout.radioMax * 5.5]} />
      )}

      {/* El sol bajo de la hora dorada + un relleno frío de cielo. Dos luces:
          es lo que pide Lambert y es todo lo que un teléfono debería pagar. */}
      <hemisphereLight args={[AIRE.luz, AIRE.niebla, 0.85]} />
      <directionalLight position={[6, 12, 8]} intensity={1.15} color={AIRE.luz} />
      <directionalLight position={[-8, 2, -6]} intensity={0.35} color={AIRE.relleno} />

      <BandasPiso bandas={layout.bandas} tier={tier} enfocado={enfocado} onTocarBanda={() => onFondo()} />

      <AristasGrafo
        grafo={grafo}
        posiciones={layout.posiciones}
        tier={tier}
        enfocado={enfocado}
        relacionados={relacionados}
      />

      <NodosGrafo
        grafo={grafo}
        posiciones={layout.posiciones}
        tier={tier}
        enfocado={enfocado}
        relacionados={relacionados}
        reducedMotion={reducedMotion}
        onTocar={onTocar}
        onSobre={onSobre}
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={2.5}
        maxDistance={radioTope(layout)}
        /* Nunca por debajo del horizonte ni sobre el polo: desde abajo el mapa
           se vuelve ilegible y uno se pierde. Se mira el cerro como se mira un
           cerro — de frente y desde arriba. */
        minPolarAngle={0.22}
        maxPolarAngle={1.52}
      />
      <CamaraEnfoque
        enfocado={enfocado}
        posiciones={layout.posiciones}
        centro={centro}
        radioMax={layout.radioMax}
        reducedMotion={reducedMotion}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

const radioTope = (layout) => layout.radioMax * 3.6 + 10;

// ── El navegador ───────────────────────────────────────────────────────────
export default function NavegadorGrafo() {
  /* OJO: `decidirTier()` devuelve un OBJETO `{ tier, motivo, reducedMotion }`.
     Hay demos en el repo que lo tratan como string y por eso caen siempre al
     perfil `medio` sin enterarse. Aquí se desestructura. */
  const { tier, reducedMotion } = useMemo(() => decidirTier(), []);
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);

  const [estado, setEstado] = useState('cargando'); // cargando | listo | vacio
  const [datos, setDatos] = useState(null);
  const [enfocado, setEnfocado] = useState(null);
  const [sobre, setSobre] = useState(null);
  const [listoCanvas, setListoCanvas] = useState(false);

  useEffect(() => {
    let vivo = true;
    cargarGrafoCrudo().then((raw) => {
      if (!vivo) return;
      if (!raw) { setEstado('vacio'); return; }
      /* Construir + acomodar cuesta ~250 ms la primera vez en gama alta. Se paga
         aquí, DESPUÉS de que el aviso de carga ya se pintó, y una sola vez. */
      const grafo = construirGrafo(raw, { tier });
      if (!grafo.nodos.length) { setEstado('vacio'); return; }
      const layout = calcularLayout(grafo, { tier });
      setDatos({ grafo, layout });
      setEstado('listo');
    });
    return () => { vivo = false; };
  }, [tier]);

  /* El vecindario del enfocado (él incluido). Es lo único que se queda
     encendido cuando usted toca algo. */
  const relacionados = useMemo(() => {
    if (!enfocado || !datos) return new Set();
    const s = new Set(datos.grafo.vecinos.get(enfocado) || []);
    s.add(enfocado);
    return s;
  }, [enfocado, datos]);

  const nodoEnfocado = enfocado && datos ? datos.grafo.porId.get(enfocado) : null;
  const nodoSobre = sobre && !enfocado ? sobre : null;

  const alTocar = useCallback((nodo) => setEnfocado((prev) => (prev === nodo.id ? null : nodo.id)), []);
  const alFondo = useCallback(() => setEnfocado(null), []);

  if (estado !== 'listo') {
    return (
      <section className="grafo-nav grafo-nav--aviso">
        <p className="grafo-aviso">
          {estado === 'cargando'
            ? 'Abriendo el saber de la chagra…'
            : 'No se pudo leer el grafo. Conéctese una vez y vuelva: queda guardado en el teléfono.'}
        </p>
      </section>
    );
  }

  const { grafo, layout } = datos;

  return (
    <section className="grafo-nav" data-tier={tier}>
      <Canvas
        className={`grafo-canvas${listoCanvas ? ' grafo-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [0, layout.yMax * 0.6 + 3, layout.radioMax * 2.6 + 6], fov: 45 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        /* Tocar el aire = soltar el enfoque y volver a ver el cerro entero.
           `onPointerMissed` es justamente "el toque no le pegó a nada": no hay
           que poner una malla invisible atrás a recoger toques. */
        onPointerMissed={alFondo}
        onCreated={() => setListoCanvas(true)}
      >
        <Escena
          grafo={grafo}
          layout={layout}
          tier={tier}
          reducedMotion={reducedMotion}
          enfocado={enfocado}
          relacionados={relacionados}
          onTocar={alTocar}
          onSobre={setSobre}
          onFondo={alFondo}
        />
        <Suspense fallback={null}>
          {tier === 'alto' && !reducedMotion && <BloomSutil />}
        </Suspense>
      </Canvas>

      <div className="grafo-chrome">
        <header className="grafo-titulo">
          <h2>El saber de la chagra</h2>
          <p>
            {grafo.conteo.especie} matas ordenadas por la altura donde viven.
            Toque una para ver de qué se acompaña.
          </p>
        </header>

        {/* LA LEYENDA. El mapa se explica solo, pero la leyenda confirma. Va
            abajo y chiquita: es una nota al pie, no el protagonista. */}
        <ul className="grafo-leyenda" aria-label="Qué es cada figura">
          {TIPOS_ORDEN.map((t) => {
            if (!grafo.conteo[t]) return null;
            const info = TIPOS_NODO[t];
            return (
              <li key={t}>
                <span
                  className={`grafo-leyenda__figura grafo-leyenda__figura--${info.geo}`}
                  style={{ '--fig-tinte': info.color || TINTE_PISO.frio }}
                  aria-hidden="true"
                />
                <span className="grafo-leyenda__txt">
                  {grafo.conteo[t]} {grafo.conteo[t] === 1 ? info.etiqueta : info.plural}
                </span>
              </li>
            );
          })}
        </ul>

        {/* El nombre de lo que está debajo del dedo, antes de tocarlo. */}
        {nodoSobre && (
          <p className="grafo-sobre" aria-hidden="true">{nodoSobre.etiqueta}</p>
        )}

        {enfocado && (
          <button type="button" className="grafo-volver" onClick={alFondo}>
            Ver todo el mapa
          </button>
        )}

        {grafo.recortado && (
          <p className="grafo-recorte">
            Equipo sencillo: se muestran las relaciones principales.
          </p>
        )}

        <CartaNodo grafo={grafo} nodo={nodoEnfocado} onIr={setEnfocado} onCerrar={alFondo} />
      </div>
    </section>
  );
}
