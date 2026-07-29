/*
 * CasaAdentro3D — vitrina pública de LA CASA POR DENTRO: el interior de la
 * casa-ancla del valle. Ruta sugerida #/casa_adentro, sin auth.
 *
 * Un lugar donde SE ESTÁ: la cámara cruza el umbral y el usuario queda adentro
 * de la casa campesina — el fogón de leña con su candela y su humo, la mesa
 * con los taburetes, la luz del día entrando por la ventana, el estante de los
 * fermentos y, al fondo, la ventana de los mundos. Es el punto de silencio del
 * valle: la casa no pide nada, abriga. Cuatro pasos cortos leen el cuarto, y
 * dos accesos salen de él: los portales (vitrina maestra) y los fermentos.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el interior 3D
 * (chunk perezoso `vendor-three`); en equipo humilde, ahorro de datos o
 * sin-WebGL se ve la ficha de la casa, digna y sin sudar la GPU. Copy en
 * español de Colombia, en "usted". Autocontenida: cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './CasaAdentro3D.css';

const MundoCasaAdentro = lazy(() => import('../visual/mundo3d/casa/MundoCasaAdentro.jsx'));

/* Lo que cuenta la casa (en "usted"). */
const SABERES = [
  {
    emoji: '🔥',
    titulo: 'El fogón es el corazón',
    texto:
      'La cocina de leña se prende antes del amanecer y no se apaga hasta la noche. Alrededor del fogón se hace el café, se cuenta el día y se decide la siembra: la casa que cocina es casa viva.',
  },
  {
    emoji: '🍽️',
    titulo: 'La mesa junta',
    texto:
      'En la mesa de madera se come lo que la finca dio. Lo que de verdad se sirve es la palabra: la mesa campesina es la primera escuela y la primera asamblea.',
  },
  {
    emoji: '⚱️',
    titulo: 'Los fermentos trabajan callados',
    texto:
      'En el estante, la chicha, el vinagre y el guarapo maduran solos: microbios buenos transformando la cosecha sin afán y sin remedio comprado. Saber viejo, ciencia viva.',
  },
  {
    emoji: '🪟',
    titulo: 'Desde la casa se ve la finca',
    texto:
      'La ventana del fondo mira a los mundos: el agua, el suelo, el café, el páramo. Se sale a recorrerlos y se vuelve — la casa siempre espera con la candela prendida.',
  },
];

export default function CasaAdentro3D() {
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
    <main className="casadentro">
      <header className="casadentro__head">
        <p className="casadentro__kicker">La casa por dentro · vitrina</p>
        <h1>La casa campesina, por dentro</h1>
        <p className="casadentro__lema">
          Cruce el umbral y quédese un momento: el fogón prendido, la mesa
          servida de palabra, los fermentos trabajando callados y, al fondo,
          la ventana que mira a todos los mundos de la finca.
        </p>
      </header>

      <section className="casadentro__escena" aria-label="El interior de la casa campesina en 3D">
        <div className="casadentro__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="casadentro__cargando" role="status">
                  Empujando la puerta de la casa…
                </div>
              }
            >
              <MundoCasaAdentro tier={tier} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <FichaCasa />
          )}
        </div>

        <div className="casadentro__barra">
          <p className="casadentro__tier">
            {mostrar3D
              ? 'Está adentro de la casa en 3D. Mire alrededor con el dedo, acérquese con la rueda y siga los pasos.'
              : puede3D
                ? 'Está viendo la ficha de la casa.'
                : 'Su equipo ve la ficha de la casa (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button type="button" className="casadentro__toggle" onClick={() => setVer2d((v) => !v)}>
              {ver2d ? 'Entrar a la casa en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="casadentro__saberes" aria-label="Lo que cuenta la casa">
        <h2>Lo que cuenta esta casa</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="casadentro__emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="casadentro__cierre">
          La casa es el punto de silencio del valle: no gamifica, no apura, no
          pide. Tapia encalada, teja, madera y candela — el lugar al que todo
          lo demás vuelve.
        </p>
      </section>
    </main>
  );
}

/* La ficha de la casa: el fallback digno para equipo humilde / sin-WebGL.
   La estampa CSS del cuarto — muro, zócalo, fogón y ventana — cero GPU. */
function FichaCasa() {
  return (
    <div
      className="casadentro__ficha"
      role="img"
      aria-label="El interior de la casa campesina: muro encalado con zócalo, el fogón con su candela y la ventana con luz"
    >
      <div className="casadentro__estampa" aria-hidden="true">
        <span className="casadentro__muro" />
        <span className="casadentro__zocalo" />
        <span className="casadentro__ventanita" />
        <span className="casadentro__fogonsito" />
        <span className="casadentro__candela" />
      </div>
      <p className="casadentro__ficha-nombre">La casa por dentro</p>
      <p className="casadentro__ficha-sub">Tapia, teja, candela · el punto de silencio del valle</p>
    </div>
  );
}
