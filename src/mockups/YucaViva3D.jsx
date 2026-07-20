/*
 * YucaViva3D — vitrina pública del MUNDO DE LA YUCA: el yucal de clima medio
 * (0–2.000 m) en el momento del arranque. Ruta #/mockups/yuca-viva-3d, sin auth.
 *
 * La yuca es el pan del piso cálido y templado, y aquí se muestra por lo que de
 * verdad la distingue: el tallo leñoso PELADO Y ANILLADO de cicatrices —cada
 * anillo es una hoja que se cayó— con el follaje arriba no más, y el momento en
 * que la tierra suelta el racimo de raíces. Al lado, el semillero de estacas
 * inclinadas, porque la yuca se siembra de tallo y no de semilla. Cuatro pasos
 * cortos recorren la vuelta entera: reconocerla, sembrarla, cosecharla y
 * comerla sin riesgo.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el mundo 3D (chunk
 * perezoso `vendor-three`); en equipo humilde, ahorro de datos o sin-WebGL se ve
 * la ficha de la yuca en corte —el tallo anillado arriba y el racimo de raíces
 * bajo la línea de tierra— digna y sin sudar la GPU. Copy en español de
 * Colombia, en "usted". Autocontenida: cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './YucaViva3D.css';

const MundoYuca = lazy(() => import('../visual/mundo3d/yuca/MundoYuca.jsx'));

/* Lo que enseña el yucal (verificado, en "usted"). */
const SABERES = [
  {
    emoji: '🪵',
    titulo: 'El tallo lleva la cuenta',
    texto:
      'La yuca suelta las hojas de abajo mientras crece y en cada nudo le queda la cicatriz. Por eso el tallo va pelado y anillado, con el follaje arriba no más. Esa seña la delata de lejos: ningún otro cultivo de la finca tiene ese palo marcado.',
  },
  {
    emoji: '🌱',
    titulo: 'Se siembra de tallo',
    texto:
      'No va de semilla: va de ESTACA. Un pedazo de tallo maduro de 20 a 25 centímetros, con cinco a siete yemas, enterrado inclinado. De ahí rebrota la mata. Por eso al cosechar lo primero que se hace es cortar y guardar los tallos: esa es la siembra de la vuelta que viene.',
  },
  {
    emoji: '🍠',
    titulo: 'La raíz sale en racimo',
    texto:
      'No sale una: salen cuatro, cinco o seis, colgadas del mismo cuello, de 30 a 50 centímetros. Se corta el tallo, se palanquea la mata con el gancho y la tierra entrega el racimo entero. Por fuera parda o rojiza; por dentro, blanca.',
  },
  {
    emoji: '🔥',
    titulo: 'Dulce o amarga, cocida siempre',
    texto:
      'La yuca amarga carga mucho más compuesto cianogénico que la dulce, y por eso jamás se come cruda. Cocinarla, remojarla o rallarla y exprimirla es lo que la vuelve segura. La dulce pide menos trabajo, pero también va cocida. Esta regla no se salta.',
  },
];

export default function YucaViva3D() {
  const decision = useMemo(() => decidirTier(), []);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const puede3D = permite3D(decision.tier);
  const [ver2d, setVer2d] = useState(false);
  const tier = ver2d || !puede3D ? 'bajo' : decision.tier;
  const mostrar3D = puede3D && !ver2d;

  return (
    <main className="yviva">
      <header className="yviva__head">
        <p className="yviva__kicker">El mundo de la yuca · vitrina</p>
        <h1>El yucal de clima medio, en el arranque</h1>
        <p className="yviva__lema">
          La parcela de yuca como es de verdad: los tallos pelados y anillados de
          cicatrices con el follaje arriba, el plátano y el maíz asociados, el
          semillero de estacas inclinadas — y adelante, la tierra abierta con el
          racimo de raíces ya destapado. Recórrala con el dedo y siga los cuatro
          pasos de la lección.
        </p>
      </header>

      <section className="yviva__escena" aria-label="El yucal de clima medio en 3D">
        <div className="yviva__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="yviva__cargando" role="status">
                  Bajando al yucal…
                </div>
              }
            >
              <MundoYuca tier={tier} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <FichaYucal />
          )}
        </div>

        <div className="yviva__barra">
          <p className="yviva__tier">
            {mostrar3D
              ? 'Está viendo el yucal en 3D. Gírelo con el dedo o el mouse y siga los pasos.'
              : puede3D
                ? 'Está viendo la ficha de la yuca.'
                : 'Su equipo ve la ficha de la yuca (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button type="button" className="yviva__toggle" onClick={() => setVer2d((v) => !v)}>
              {ver2d ? 'Ver el yucal en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="yviva__saberes" aria-label="Lo que enseña el yucal">
        <h2>Lo que le enseña este yucal</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="yviva__emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="yviva__cierre">
          La yuca aguanta donde otros cultivos no: suelo pobre, sequía larga, y
          se queda en la tierra esperando hasta que la casa la necesite — no hay
          bodega mejor que el mismo suelo. Por eso en la parcela campesina nunca
          va sola: va con el plátano, con el maíz, con el fríjol. Esa mezcla es
          la que sostiene la mesa cuando un cultivo falla.
        </p>
      </section>
    </main>
  );
}

/* La ficha de la yuca: el fallback digno para equipo humilde / sin-WebGL.
   El corte en CSS — el tallo anillado de cicatrices arriba, y bajo la línea de
   tierra el racimo de raíces colgando del cuello. Cero GPU. */
function FichaYucal() {
  return (
    <div
      className="yviva__ficha"
      role="img"
      aria-label="La mata de yuca en corte: el tallo anillado de cicatrices arriba y el racimo de raíces bajo la tierra"
    >
      <div className="yviva__estampa" aria-hidden="true">
        {/* el follaje, arriba no más */}
        <span className="yviva__copa">
          <span className="yviva__hoja yviva__hoja--a" />
          <span className="yviva__hoja yviva__hoja--b" />
          <span className="yviva__hoja yviva__hoja--c" />
        </span>
        {/* el tallo con sus cicatrices en espiral */}
        <span className="yviva__tallo">
          <span className="yviva__cicatriz" style={{ top: '12%' }} />
          <span className="yviva__cicatriz" style={{ top: '32%' }} />
          <span className="yviva__cicatriz" style={{ top: '52%' }} />
          <span className="yviva__cicatriz" style={{ top: '72%' }} />
        </span>
        {/* bajo la línea de tierra: el racimo */}
        <span className="yviva__tierra">
          <span className="yviva__raiz yviva__raiz--a" />
          <span className="yviva__raiz yviva__raiz--b" />
          <span className="yviva__raiz yviva__raiz--c" />
          <span className="yviva__raiz yviva__raiz--d" />
        </span>
      </div>
      <p className="yviva__ficha-nombre">La mata de yuca, en corte</p>
      <p className="yviva__ficha-sub">Clima medio · el tallo anillado y el racimo de raíces</p>
    </div>
  );
}
