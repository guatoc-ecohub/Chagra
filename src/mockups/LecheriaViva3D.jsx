/*
 * LecheriaViva3D — vitrina pública del MUNDO DE LA CADENA LÁCTEA campesina: el
 * potrero silvopastoril, la quesera de la finca y el ciclo del estiércol al
 * abono. Ruta #/mockups/lecheria-viva-3d, sin auth.
 *
 * La lechería agroecológica como es de verdad: un potrero navegable con el hato
 * (Holstein, Normando, criolla, cruce con cebú) pastando bajo el banco forrajero
 * de nacedero, matarratón, leucaena y botón de oro; la quesera donde la leche se
 * hace queso, cuajada, kumis, yogur y arequipe; y el biodigestor que vuelve el
 * estiércol en biogás y abono. Cuatro pasos cortos recorren la lección.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el mundo 3D (chunk
 * perezoso `vendor-three`); en equipo humilde, ahorro de datos o sin-WebGL se ve
 * la ficha, digna y sin sudar la GPU. Copy en español de Colombia, en "usted".
 * Autocontenida: cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './LecheriaViva3D.css';

const MundoLecheria = lazy(() => import('../visual/mundo3d/lecheria/MundoLecheria.jsx'));

/* Lo que enseña la lechería (verificado en el DR de la cadena láctea, en "usted"). */
const SABERES = [
  {
    emoji: '🌳',
    titulo: 'El potrero se siembra con árboles',
    texto:
      'Nacedero, matarratón, leucaena y el arbusto botón de oro se siembran entre el pasto. Dan sombra a la vaca, forraje con proteína y fijan nitrógeno que abona el suelo. Con sombra la vaca sufre menos calor y da más leche.',
  },
  {
    emoji: '🐄',
    titulo: 'Cada vaca según su clima',
    texto:
      'En tierra fría van la Holstein y la Normando, de buena leche; en tierra caliente, la criolla y el cruce con cebú (el de la giba), que aguantan el calor y las garrapatas. Y se rota el potrero para que el pasto descanse y se recupere.',
  },
  {
    emoji: '🧀',
    titulo: 'La leche se transforma en la finca',
    texto:
      'Vender la leche cruda deja poco. En la quesera salen la cuajada y el queso campesino, el doble crema, el kumis, el yogur y el arequipe en la olla de cobre. Transformar en finca es donde el campesino de verdad gana.',
  },
  {
    emoji: '♻️',
    titulo: 'El estiércol no se bota',
    texto:
      'La boñiga entra al biodigestor y da biogás para cocinar y biol para abonar; lo demás va al montón de abono. Del potrero a la leche y de vuelta al potrero: el ciclo se cierra sin comprar químicos ni quemar leña.',
  },
];

export default function LecheriaViva3D() {
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
    <main className="lviva">
      <header className="lviva__head">
        <p className="lviva__kicker">La cadena láctea · vitrina</p>
        <h1>El potrero, la quesera y el ciclo</h1>
        <p className="lviva__lema">
          La lechería campesina como es de verdad: el hato pastando bajo los
          árboles forrajeros, la quesera donde la leche se hace queso y el
          biodigestor que vuelve el estiércol en abono. Recórrala con el dedo y
          siga los cuatro pasos de la lección.
        </p>
      </header>

      <section className="lviva__escena" aria-label="La cadena láctea campesina en 3D">
        <div className="lviva__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="lviva__cargando" role="status">
                  Saliendo al potrero…
                </div>
              }
            >
              <MundoLecheria tier={tier} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <FichaLecheria />
          )}
        </div>

        <div className="lviva__barra">
          <p className="lviva__tier">
            {mostrar3D
              ? 'Está viendo el potrero en 3D. Gírelo con el dedo o el mouse y siga los pasos.'
              : puede3D
                ? 'Está viendo la ficha de la lechería.'
                : 'Su equipo ve la ficha de la lechería (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button type="button" className="lviva__toggle" onClick={() => setVer2d((v) => !v)}>
              {ver2d ? 'Ver el potrero en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="lviva__saberes" aria-label="Lo que enseña la lechería">
        <h2>Lo que le enseña esta lechería</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="lviva__emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="lviva__cierre">
          La leche buena no sale de potrero pelado ni de vender crudo y barato:
          sale de un potrero con árboles, de una vaca con sombra y de una finca
          que transforma lo suyo y no bota nada. Eso no cuesta cemento.
        </p>
      </section>
    </main>
  );
}

/* La ficha de la lechería: el fallback digno para equipo humilde / sin-WebGL.
   Una vaca CSS bajo su árbol forrajero, con la rueda de queso al pie — cero GPU. */
function FichaLecheria() {
  return (
    <div
      className="lviva__ficha"
      role="img"
      aria-label="La lechería campesina: una vaca bajo el árbol forrajero, con la rueda de queso"
    >
      <div className="lviva__estampa" aria-hidden="true">
        <span className="lviva__arbol" />
        <span className="lviva__arbol-tronco" />
        <span className="lviva__vaca">
          <span className="lviva__vaca-mancha lviva__vaca-mancha--a" />
          <span className="lviva__vaca-mancha lviva__vaca-mancha--b" />
          <span className="lviva__vaca-cabeza" />
        </span>
        <span className="lviva__queso" />
      </div>
      <p className="lviva__ficha-nombre">El potrero, la quesera y el ciclo</p>
      <p className="lviva__ficha-sub">La cadena láctea campesina · silvopastoril</p>
    </div>
  );
}
