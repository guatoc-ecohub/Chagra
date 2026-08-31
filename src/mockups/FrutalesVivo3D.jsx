/*
 * FrutalesVivo3D — vitrina pública del MUNDO DE LOS FRUTALES: mango y cítricos
 * en una misma finca. Ruta #/mockups/frutales-vivo-3d, sin auth.
 *
 * Van juntos a propósito: comparten el arquetipo del árbol frutal de copa
 * redondeada, y juntos enseñan lo que por separado no — EL PISO TÉRMICO. En la
 * vega caliente del frente están los palos de mango (0 a 1.000 metros); loma
 * arriba, ya en clima medio, el huerto de cítricos (la naranja y la mandarina
 * suben hasta unos 1.600). Entre los dos, el camino. Cuatro pasos cortos
 * recorren la lección: quién es el mango, hasta dónde suben los cítricos, cómo
 * se reconoce cada uno y por qué la altura manda.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el mundo 3D (chunk
 * perezoso `vendor-three`); en equipo humilde, ahorro de datos o sin-WebGL se ve
 * la ficha — que aquí no es adorno: dibuja al mango y al cítrico A ESCALA, uno
 * al lado del otro, que es justo lo que hay que entender. Copy en español de
 * Colombia, en "usted". Autocontenida: cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './FrutalesVivo3D.css';

const MundoFrutales = lazy(() => import('../visual/mundo3d/frutales/MundoFrutales.jsx'));

/* Lo que enseñan los frutales (verificado, en "usted"). */
const SABERES = [
  {
    emoji: '🥭',
    titulo: 'El mango es de tierra caliente',
    texto:
      'Del nivel del mar hasta unos 1.000 metros. Es árbol grande y longevo, de copa más ancha que alta: bajo un solo palo cabe la familia entera. El común en Colombia es el de azúcar e hilacha, pequeño y amarillo, no el gigante de exportación.',
  },
  {
    emoji: '🍊',
    titulo: 'Los cítricos suben más',
    texto:
      'La naranja y la mandarina se dan hasta unos 1.600 metros, y el limón aguanta todavía un poco más arriba. Por eso en la misma finca el mango se queda abajo y los cítricos lo acompañan en la parte alta.',
  },
  {
    emoji: '🍷',
    titulo: 'El brote vino delata al mango',
    texto:
      'La hoja nueva del mango no nace verde: brota color vino, pasa a cobrizo y solo después se pone verde oscuro. Si ve una copa grande con las puntas tirando a rojo, es mango. Su flor es una panícula: un ramillete grande y ramificado sobre la copa.',
  },
  {
    emoji: '🌿',
    titulo: 'El pecíolo alado delata al cítrico',
    texto:
      'Mire la base de la hoja: los cítricos llevan ahí una hojita pequeña pegada — el pecíolo alado, la seña del género. Súmele las espinas de la rama y la flor blanca de azahar, de olor fuerte, y ya no se equivoca.',
  },
];

export default function FrutalesVivo3D() {
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
    <main className="fviva">
      <header className="fviva__head">
        <p className="fviva__kicker">El mundo de los frutales · vitrina</p>
        <h1>El mango abajo, los cítricos arriba</h1>
        <p className="fviva__lema">
          Una finca que sube: en la vega caliente los palos de mango, loma arriba
          el huerto de naranjos, mandarinos y limoneros. Recórrala con el dedo y
          siga los cuatro pasos: la altura es la que decide qué se da.
        </p>
      </header>

      <section className="fviva__escena" aria-label="El mundo de los frutales en 3D">
        <div className="fviva__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="fviva__cargando" role="status">
                  Llegando a la finca…
                </div>
              }
            >
              <MundoFrutales tier={tier} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <FichaFrutales />
          )}
        </div>

        <div className="fviva__barra">
          <p className="fviva__tier">
            {mostrar3D
              ? 'Está viendo la finca en 3D. Gírela con el dedo o el mouse y siga los pasos.'
              : puede3D
                ? 'Está viendo la ficha de los frutales.'
                : 'Su equipo ve la ficha de los frutales (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button type="button" className="fviva__toggle" onClick={() => setVer2d((v) => !v)}>
              {ver2d ? 'Ver la finca en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="fviva__saberes" aria-label="Lo que enseñan los frutales">
        <h2>Lo que le enseñan estos frutales</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="fviva__emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="fviva__cierre">
          Sembrar frutal no es escoger el que más le guste: es mirar primero a qué
          altura está su tierra. El mismo palo que carga sabroso en la vega se
          queda mustio mil metros más arriba — y esa cuenta se hace antes de
          abrir el hueco, no después.
        </p>
      </section>
    </main>
  );
}

/* La ficha de los frutales: el fallback digno para equipo humilde / sin-WebGL.
   No es adorno — dibuja el mango y el cítrico A ESCALA, uno al lado del otro,
   con su franja de altura. La lección entera, sin gastar un solo polígono. */
function FichaFrutales() {
  return (
    <div
      className="fviva__ficha"
      role="img"
      aria-label="Un palo de mango grande junto a un cítrico pequeño, a escala: el mango de tierra caliente y el cítrico que sube al clima medio"
    >
      <div className="fviva__estampa" aria-hidden="true">
        {/* EL MANGO: copa ancha y baja, con su brote vino en las puntas */}
        <span className="fviva__mango-tronco" />
        <span className="fviva__mango-copa">
          <span className="fviva__brote fviva__brote--a" />
          <span className="fviva__brote fviva__brote--b" />
          <span className="fviva__mango-fruto fviva__mango-fruto--a" />
          <span className="fviva__mango-fruto fviva__mango-fruto--b" />
        </span>
        {/* EL CÍTRICO: chiquito, redondo, cargado */}
        <span className="fviva__citrico-tronco" />
        <span className="fviva__citrico-copa">
          <span className="fviva__naranja fviva__naranja--a" />
          <span className="fviva__naranja fviva__naranja--b" />
          <span className="fviva__naranja fviva__naranja--c" />
        </span>
        <span className="fviva__suelo" />
      </div>
      <p className="fviva__ficha-nombre">El mango y el cítrico, a escala</p>
      <p className="fviva__ficha-sub">
        Mango: 0 a 1.000 m · Naranja y mandarina: hasta unos 1.600 m
      </p>
    </div>
  );
}
