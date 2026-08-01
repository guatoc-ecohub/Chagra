/*
 * AguacatalVivo3D — vitrina pública del MUNDO DEL AGUACATE: la finca del árbol
 * grande del piso templado alto (1.800–2.200 m, la franja andina del Hass).
 * Ruta #/mockups/aguacatal-vivo-3d, sin auth.
 *
 * El aguacate se muestra como lo que es: un ÁRBOL que le pasa por encima a la
 * casa — no un arbustico más. La finca campesina navegable: los Hass adultos
 * en sus camellones (matorros irregulares, nunca cuadrícula), el criollo viejo
 * del patio con la escalera de cosecha recostada, la floración en panícula con
 * sus abejas, el fruto rugoso pintando de verde a morado-negro, los jóvenes
 * con tutor junto a la zanjilla, y bajo cada copa el microclima de hojarasca.
 * Cuatro pasos cortos recorren la lección.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el mundo 3D (chunk
 * perezoso `vendor-three`); en equipo humilde, ahorro de datos o sin-WebGL se
 * ve la ficha del aguacatal, digna y sin sudar la GPU. Copy en español de
 * Colombia, en "usted". Autocontenida: cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './AguacatalVivo3D.css';

const MundoAguacatal = lazy(() => import('../visual/mundo3d/aguacatal/MundoAguacatal.jsx'));

/* Lo que enseña el aguacatal (verificado, en "usted"). */
const SABERES = [
  {
    emoji: '🌳',
    titulo: 'Es un árbol, no una mata',
    texto:
      'Un Hass adulto injertado pasa de los 8 metros — más alto que la casa — y el criollo de semilla crece más todavía. Quien siembra aguacate siembra sombra para años: hay que darle campo, luz y escalera.',
  },
  {
    emoji: '🐝',
    titulo: 'Miles de flores, poquitos frutos',
    texto:
      'La floración sale en panículas de miles de flores pequeñas, amarillo-verdosas. De todas esas, cuajan poquitas — y las que cuajan se las deben a las abejas y demás polinizadores. Cuidar el enjambre es cuidar la cosecha.',
  },
  {
    emoji: '🥑',
    titulo: 'Hass rugoso, criollo liso',
    texto:
      'El Hass se conoce por su cáscara rugosa, que pinta de verde a morado-negro al madurar. El criollo es más grande, de cáscara lisa y verde aunque esté maduro. Distinguirlos importa: se cosechan, se venden y se pagan distinto.',
  },
  {
    emoji: '⛏️',
    titulo: 'La raíz manda: camellón y drenaje',
    texto:
      'La raíz del aguacate es superficial: el viento lo voltea y el encharcamiento lo ahoga. Por eso se siembra en camellón, el joven lleva tutor y la zanjilla saca el agua sobrada. Y su sombra densa deja hojarasca gruesa: suelo fresco que se abona solo.',
  },
];

export default function AguacatalVivo3D() {
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
    <main className="aviva">
      <header className="aviva__head">
        <p className="aviva__kicker">El mundo del aguacate · vitrina</p>
        <h1>El árbol que le pasa por encima a la casa</h1>
        <p className="aviva__lema">
          La finca aguacatera como es de verdad: el Hass adulto en su camellón,
          el criollo viejo del patio con la escalera recostada, la floración
          zumbando de abejas y el fruto pintando de verde a morado-negro.
          Recórrala con el dedo y siga los cuatro pasos de la lección.
        </p>
      </header>

      <section className="aviva__escena" aria-label="La finca del aguacate en 3D">
        <div className="aviva__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="aviva__cargando" role="status">
                  Entrando a la finca…
                </div>
              }
            >
              <MundoAguacatal tier={tier} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <FichaAguacatal />
          )}
        </div>

        <div className="aviva__barra">
          <p className="aviva__tier">
            {mostrar3D
              ? 'Está viendo la finca en 3D. Gírela con el dedo o el mouse y siga los pasos.'
              : puede3D
                ? 'Está viendo la ficha del aguacatal.'
                : 'Su equipo ve la ficha del aguacatal (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button type="button" className="aviva__toggle" onClick={() => setVer2d((v) => !v)}>
              {ver2d ? 'Ver la finca en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="aviva__saberes" aria-label="Lo que enseña el aguacatal">
        <h2>Lo que le enseña este aguacatal</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="aviva__emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="aviva__cierre">
          El aguacate no es plantación en cuadrícula: es árbol de finca, sembrado
          con casa cerca, maíz al lado y abejas encima. Donde el camellón drena y
          la sombra deja su hojarasca, el árbol grande produce por décadas — y
          eso no lo da ningún afán.
        </p>
      </section>
    </main>
  );
}

/* La ficha del aguacatal: el fallback digno para equipo humilde / sin-WebGL.
   La ESCALA también aquí: el árbol CSS enorme y la casita al pie — cero GPU. */
function FichaAguacatal() {
  return (
    <div
      className="aviva__ficha"
      role="img"
      aria-label="El aguacatal: un árbol de aguacate enorme con sus frutos, y la casa campesina pequeña a su pie"
    >
      <div className="aviva__estampa" aria-hidden="true">
        <span className="aviva__copa" />
        <span className="aviva__copa-baja" />
        <span className="aviva__tronco" />
        <span className="aviva__fruto aviva__fruto--verde" />
        <span className="aviva__fruto aviva__fruto--pinton" />
        <span className="aviva__fruto aviva__fruto--negro" />
        <span className="aviva__casita">
          <span className="aviva__techo" />
        </span>
      </div>
      <p className="aviva__ficha-nombre">El árbol del aguacate</p>
      <p className="aviva__ficha-sub">Piso templado alto · más alto que la casa</p>
    </div>
  );
}
