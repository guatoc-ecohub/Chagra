/*
 * CanaTrapiche3D — vitrina pública del MUNDO DE LA CAÑA Y EL TRAPICHE: el
 * cañaveral de tierra caliente y la enramada donde se hace la panela.
 * Ruta #/mockups/cana-trapiche-3d, sin auth.
 *
 * Dos mitades que se necesitan: un lote de caña que le pasa por encima a
 * cualquiera, y al lado la enramada con su molienda, su hornilla prendida y sus
 * gaveras. Cinco pasos cortos recorren la transformación completa — la caña en
 * pie, el corte y la molienda, el bagazo que vuelve como leña, la hornilla con
 * su fila de pailas, y las gaveras donde la miel se vuelve bloque.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el mundo 3D (chunk
 * perezoso `vendor-three`); en equipo humilde, ahorro de datos o sin-WebGL se ve
 * la ficha del trapiche, digna y sin sudar la GPU. Copy en español de Colombia,
 * en "usted". Autocontenida: cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './CanaTrapiche3D.css';

const MundoCana = lazy(() => import('../visual/mundo3d/cana/MundoCana.jsx'));

/* Lo que enseña el trapiche (en "usted"). */
const SABERES = [
  {
    emoji: '🌾',
    titulo: 'La caña le pasa por encima',
    texto:
      'Una caña de trapiche madura pasa de los cuatro metros: más de dos veces una persona. El tallo viene por segmentos, con un nudo entre uno y otro, y en cada nudo hay una yema. De un pedazo de tallo con yemas sale la mata siguiente: la caña se siembra de caña, no de semilla.',
  },
  {
    emoji: '⚙️',
    titulo: 'Del corte al molino, sin demora',
    texto:
      'Caña cortada que se queda esperando empieza a fermentar y la panela sale mala. Por eso el trapiche se para al lado del cañaveral: se corta, se despunta, se arruma y se muele. Entre las tres masas del molino sale el guarapo, que es el jugo, y queda el bagazo.',
  },
  {
    emoji: '🔥',
    titulo: 'La caña calienta su propia miel',
    texto:
      'El bagazo sale mojado del molino, se apila unas semanas a secar y seco vuelve a la hornilla como combustible. El trapiche se alimenta solo: ni compra leña ni le baja un palo al monte. Es de los pocos oficios del campo donde el desecho de un paso es la energía del siguiente.',
  },
  {
    emoji: '🥄',
    titulo: 'Una candela para toda la fila',
    texto:
      'El fuego va en un extremo de la hornilla y la chimenea en el otro, así que cada paila recibe distinto calor. El guarapo entra por la más templada — ahí se le retira la cachaza, la espuma que se lleva la suciedad y que después sirve de abono o de comida para los animales — y va caminando hacia el fuego mientras se vuelve miel.',
  },
  {
    emoji: '🟫',
    titulo: 'La panela es jugo de caña y nada más',
    texto:
      'La miel en su punto se bate para que entre aire y granule, y se vacía en las gaveras, los moldes de madera, donde cuaja. No se le quita nada ni se le agrega nada: la panela es el jugo de la caña concentrado. Por eso conserva el color y el sabor que el azúcar blanco pierde en el camino.',
  },
];

export default function CanaTrapiche3D() {
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
    <main className="ctrap">
      <header className="ctrap__head">
        <p className="ctrap__kicker">El mundo de la caña · vitrina</p>
        <h1>El cañaveral y el trapiche</h1>
        <p className="ctrap__lema">
          Un lote de caña que le pasa por encima, y al lado la enramada donde esa
          caña se vuelve panela. Recorra la escena con el dedo y siga los cinco
          pasos: del surco al bloque que cabe en la mano.
        </p>
      </header>

      <section className="ctrap__escena" aria-label="El cañaveral y el trapiche panelero en 3D">
        <div className="ctrap__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="ctrap__cargando" role="status">
                  Prendiendo la hornilla…
                </div>
              }
            >
              <MundoCana tier={tier} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <FichaTrapiche />
          )}
        </div>

        <div className="ctrap__barra">
          <p className="ctrap__tier">
            {mostrar3D
              ? 'Está viendo el trapiche en 3D. Gírelo con el dedo o el mouse y siga los pasos.'
              : puede3D
                ? 'Está viendo la ficha del trapiche.'
                : 'Su equipo ve la ficha del trapiche (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button type="button" className="ctrap__toggle" onClick={() => setVer2d((v) => !v)}>
              {ver2d ? 'Ver el trapiche en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="ctrap__saberes" aria-label="Lo que enseña el trapiche">
        <h2>Lo que le enseña este trapiche</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="ctrap__emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="ctrap__cierre">
          Un trapiche de finca no es una fábrica: es un cobertizo abierto, una
          molienda, una candela y unas manos que saben cuándo la miel llegó al
          punto. Ese punto no lo mide un aparato — lo conoce el hornillero a ojo,
          y ese saber no está escrito en ninguna parte sino en quien lo hace.
        </p>
      </section>
    </main>
  );
}

/* La ficha del trapiche: el fallback digno para equipo humilde / sin-WebGL.
   Una caña con sus nudos y la enramada humeando detrás — cero GPU, puro CSS. */
function FichaTrapiche() {
  return (
    <div
      className="ctrap__ficha"
      role="img"
      aria-label="El cañaveral y el trapiche: una caña con sus nudos y la enramada con su chimenea humeando"
    >
      <div className="ctrap__estampa" aria-hidden="true">
        <span className="ctrap__enramada" />
        <span className="ctrap__chimenea" />
        <span className="ctrap__humo" />
        <span className="ctrap__cana">
          <i /><i /><i /><i /><i />
        </span>
        <span className="ctrap__hoja ctrap__hoja--a" />
        <span className="ctrap__hoja ctrap__hoja--b" />
        <span className="ctrap__penacho" />
      </div>
      <p className="ctrap__ficha-nombre">El cañaveral y el trapiche</p>
      <p className="ctrap__ficha-sub">Tierra caliente · de la caña a la panela</p>
    </div>
  );
}
