/*
 * BosqueVivo3D — vitrina pública del MUNDO BOSQUE VIVO y su guardián: el Ent de
 * la queñua (colorado, *Polylepis*), el árbol más alto del páramo andino.
 * Ruta #/mockups/bosque-vivo-3d, sin auth.
 *
 * La queñua es, ella misma, un Bárbol: tronco grueso retorcido, corteza rojiza
 * que se pela en papel, copa de hojitas plateadas. Aquí la mostramos en 3D REAL
 * (mallas three, no un dibujo plano) con un rostro sabio tallado en la madera,
 * viva y meciéndose en la niebla del páramo. Es la guardiana del agua: donde
 * hay queñuales, hay agua para la finca de abajo.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el diorama 3D (chunk
 * perezoso `vendor-three`); en equipo humilde, ahorro de datos o sin-WebGL se ve
 * la ficha del guardián, digna y sin sudar la GPU. Copy en español de Colombia,
 * en "usted". Autocontenida: cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './BosqueVivo3D.css';

const EscenaBosqueVivo = lazy(() => import('../visual/mundo3d/bosque/EscenaBosqueVivo.jsx'));

/* Lo que enseña el guardián (verificado, en "usted"). */
const SABERES = [
  {
    emoji: '💧',
    titulo: 'Guardiana del agua',
    texto: 'Donde crece el queñual, el suelo retiene el agua de la niebla y la suelta despacio. Cuidar la queñua de arriba es cuidar el nacimiento de agua de su finca de abajo.',
  },
  {
    emoji: '🌫️',
    titulo: 'El árbol más alto del páramo',
    texto: 'La queñua vive donde ya casi ningún árbol resiste, arriba de los 3.000 metros. Crece despacio y torcido: cada nudo es un año peleándole al frío y al viento.',
  },
  {
    emoji: '📜',
    titulo: 'Corteza de papel',
    texto: 'Su corteza rojiza se despega en láminas finas como papel. No es que esté enferma: así se protege del frío de la noche del páramo, como muchas cobijas delgadas.',
  },
  {
    emoji: '🪶',
    titulo: 'Siémbrela, no la tumbe',
    texto: 'Un queñual viejo tarda cien años en volver. Si tiene páramo, deje la queñua en pie y ayude a que rebrote: es la mejor obra de agua que puede hacer, y no cuesta cemento.',
  },
];

export default function BosqueVivo3D() {
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
    <main className="bviva">
      <header className="bviva__head">
        <p className="bviva__kicker">El bosque vivo · vitrina</p>
        <h1>La queñua, guardiana del páramo</h1>
        <p className="bviva__lema">
          El árbol más alto de la montaña, retorcido y sabio. En 3D de verdad,
          con su rostro tallado en la madera. Mírela de cerca: gírela con el dedo.
        </p>
      </header>

      <section className="bviva__escena" aria-label="El Ent de la queñua en 3D">
        <div className="bviva__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="bviva__cargando" role="status">
                  Levantando el queñual…
                </div>
              }
            >
              <EscenaBosqueVivo tier={tier} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <FichaGuardian />
          )}
        </div>

        <div className="bviva__barra">
          <p className="bviva__tier">
            {mostrar3D
              ? 'Está viendo el árbol en 3D. Gírelo con el dedo o el mouse.'
              : puede3D
                ? 'Está viendo la ficha del guardián.'
                : 'Su equipo ve la ficha del guardián (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="bviva__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver el árbol en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="bviva__saberes" aria-label="Lo que enseña la queñua">
        <h2>Lo que le enseña este árbol</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="bviva__emoji" aria-hidden="true">{s.emoji}</span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="bviva__cierre">
          El páramo no se ara: se cuida. La queñua lleva ahí más años que
          cualquiera de nosotros, y de ella baja el agua. Déjela crecer.
        </p>
      </section>
    </main>
  );
}

/* La ficha del guardián: el fallback digno para equipo humilde / sin-WebGL.
   No es un 3D degradado feo: es una tarjeta ilustrada con CSS, sin GPU. */
function FichaGuardian() {
  return (
    <div className="bviva__ficha" role="img" aria-label="La queñua, guardiana del páramo">
      <div className="bviva__arbol2d" aria-hidden="true">
        <span className="bviva__copa" />
        <span className="bviva__tronco" />
        <span className="bviva__cara">
          <span className="bviva__ojo" />
          <span className="bviva__ojo" />
        </span>
      </div>
      <p className="bviva__ficha-nombre">Queñua · colorado</p>
      <p className="bviva__ficha-sub">Guardiana del agua del páramo</p>
    </div>
  );
}
