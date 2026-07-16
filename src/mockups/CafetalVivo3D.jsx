/*
 * CafetalVivo3D — vitrina pública del MUNDO DEL CAFÉ: el cafetal bajo sombra
 * del piso templado (1.000–2.000 m). Ruta #/mockups/cafetal-vivo-3d, sin auth.
 *
 * El café es EL cultivo del campesino colombiano, y aquí se muestra como es de
 * verdad en la montaña: una ladera navegable sembrada en surcos a curva de
 * nivel, los cafetos con su cereza madurando del verde al rojo, y ARRIBA el
 * SOMBRÍO — guamos y nogales cafeteros que le hacen techo al cultivo — con el
 * plátano intercalado y la casa-beneficiadero asomando en la bruma del fondo.
 * Cuatro pasos cortos recorren la lección: qué es el sombrío, por qué el café
 * va bajo sombra, cómo madura la cereza y a dónde va el grano.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el mundo 3D (chunk
 * perezoso `vendor-three`); en equipo humilde, ahorro de datos o sin-WebGL se
 * ve la ficha del cafetal, digna y sin sudar la GPU. Copy en español de
 * Colombia, en "usted". Autocontenida: cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './CafetalVivo3D.css';

const MundoCafetal = lazy(() => import('../visual/mundo3d/cafetal/MundoCafetal.jsx'));

/* Lo que enseña el cafetal (verificado, en "usted"). */
const SABERES = [
  {
    emoji: '🌳',
    titulo: 'El sombrío no estorba: trabaja',
    texto:
      'Guamos y nogales cafeteros se siembran a propósito entre el café. Su techo de hojas baja el sol quemante, guarda la humedad y la hoja que cae abona el suelo sin costar un peso.',
  },
  {
    emoji: '🐦',
    titulo: 'Café con sombra es café con vida',
    texto:
      'Bajo el sombrío vuelven las aves, las mariposas y los polinizadores que el café a pleno sol espanta. Un cafetal con sombra es medio bosque: produce café y cuida el monte a la vez.',
  },
  {
    emoji: '🍒',
    titulo: 'La cereza se coge roja, a mano',
    texto:
      'El fruto nace verde, pinta amarillo y madura rojo cereza. A la sombra madura despacio, y grano que madura despacio da taza más dulce. Por eso se cosecha grano a grano, solo el maduro.',
  },
  {
    emoji: '🏡',
    titulo: 'Del cerezo al pergamino',
    texto:
      'La cereza cogida se despulpa, se lava y se seca en la marquesina de la casa hasta volverse café pergamino: el grano que la familia vende. El tueste ya es del otro lado, no del campo.',
  },
];

export default function CafetalVivo3D() {
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
    <main className="cviva">
      <header className="cviva__head">
        <p className="cviva__kicker">El mundo del café · vitrina</p>
        <h1>El cafetal bajo sombra</h1>
        <p className="cviva__lema">
          La ladera cafetera como es de verdad: los surcos a curva de nivel, la
          cereza pintando del verde al rojo y el sombrío tendiéndole techo al
          cultivo. Recórrala con el dedo y siga los cuatro pasos de la lección.
        </p>
      </header>

      <section className="cviva__escena" aria-label="El cafetal bajo sombra en 3D">
        <div className="cviva__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="cviva__cargando" role="status">
                  Subiendo a la ladera…
                </div>
              }
            >
              <MundoCafetal tier={tier} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <FichaCafetal />
          )}
        </div>

        <div className="cviva__barra">
          <p className="cviva__tier">
            {mostrar3D
              ? 'Está viendo el cafetal en 3D. Gírelo con el dedo o el mouse y siga los pasos.'
              : puede3D
                ? 'Está viendo la ficha del cafetal.'
                : 'Su equipo ve la ficha del cafetal (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button type="button" className="cviva__toggle" onClick={() => setVer2d((v) => !v)}>
              {ver2d ? 'Ver el cafetal en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="cviva__saberes" aria-label="Lo que enseña el cafetal">
        <h2>Lo que le enseña este cafetal</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="cviva__emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="cviva__cierre">
          El café no es una plantación a pleno sol: es un cultivo de montaña que
          vive mejor acompañado. Donde hay sombrío hay suelo vivo, hay pájaros y
          hay taza dulce — y eso no cuesta cemento.
        </p>
      </section>
    </main>
  );
}

/* La ficha del cafetal: el fallback digno para equipo humilde / sin-WebGL.
   Un cafeto CSS con sus cerezas y el guamo detrás — cero GPU. */
function FichaCafetal() {
  return (
    <div className="cviva__ficha" role="img" aria-label="El cafetal bajo sombra: cafeto con cerezas y su árbol de sombrío">
      <div className="cviva__estampa" aria-hidden="true">
        <span className="cviva__guamo" />
        <span className="cviva__guamo-tronco" />
        <span className="cviva__cafeto">
          <span className="cviva__cereza cviva__cereza--verde" />
          <span className="cviva__cereza cviva__cereza--pinton" />
          <span className="cviva__cereza cviva__cereza--roja" />
          <span className="cviva__cereza cviva__cereza--roja2" />
        </span>
      </div>
      <p className="cviva__ficha-nombre">El cafetal bajo sombra</p>
      <p className="cviva__ficha-sub">Piso templado · el cultivo bandera del campesino</p>
    </div>
  );
}
