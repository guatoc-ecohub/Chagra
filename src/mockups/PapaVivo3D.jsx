/*
 * PapaVivo3D — vitrina pública del MUNDO DE LA PAPA: el papal en surcos de la
 * tierra fría (piso frío, 2.000–3.200 m). Ruta #/mockups/papa-viva-3d, sin auth.
 *
 * La papa criolla es el cultivo de la montaña alta, y aquí se muestra como es
 * de verdad: una ladera navegable con los SURCOS horneados en el relieve —
 * caballones de tierra negra a curva de nivel con la mata aporcada encima —,
 * la flor lila y blanca avisando que abajo hay tubérculo, el pajonal del frío
 * rodeando el lote, los frailejones en silueta al fondo y el rincón de cosecha
 * con la diversidad andina destapada: criolla amarilla, roja y morada. Cuatro
 * pasos cortos recorren la lección: el surco y por qué, la mata y su flor, la
 * papa criolla y la cosecha.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el mundo 3D (chunk
 * perezoso `vendor-three`); en equipo humilde, ahorro de datos o sin-WebGL se
 * ve la ficha del papal — con su corte de tierra y las papas abajo — digna y
 * sin sudar la GPU. Copy en español de Colombia, en "usted". Autocontenida:
 * cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './PapaVivo3D.css';

const MundoPapa = lazy(() => import('../visual/mundo3d/papa/MundoPapa.jsx'));

/* Lo que enseña el papal (verificado, en "usted"). */
const SABERES = [
  {
    emoji: '⛰️',
    titulo: 'El surco abriga y escurre',
    texto:
      'La papa se siembra en caballones: tierra amontonada a curva de nivel. Ese lomo abriga la semilla del frío de la madrugada, escurre el agua lluvia para que el tubérculo no se pudra y le da campo para engordar.',
  },
  {
    emoji: '🌼',
    titulo: 'La flor avisa lo de abajo',
    texto:
      'Cuando el papal florece — lila o blanco, según la variedad — la mata está avisando que abajo ya se forma la papa. Al aporcar se le arrima más tierra al tallo, y la mata responde echando más tubérculo.',
  },
  {
    emoji: '🥔',
    titulo: 'La criolla no está sola',
    texto:
      'La criolla amarilla es la reina de la tierra fría colombiana, pero los Andes guardan cientos de variedades: rojas, moradas, pintadas. Esa diversidad es semilla campesina de generaciones y un seguro contra plagas y heladas.',
  },
  {
    emoji: '🧺',
    titulo: 'Se cosecha con cuidado',
    texto:
      'A los cinco o seis meses la mata amarillea: es la seña. El caballón se abre con azadón sin lastimar la papa, se aparta la saca por tamaños, se cose el costal de fique y la cosecha arranca pal mercado.',
  },
];

export default function PapaVivo3D() {
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
    <main className="pviva">
      <header className="pviva__head">
        <p className="pviva__kicker">El mundo de la papa · vitrina</p>
        <h1>El papal en surcos de la tierra fría</h1>
        <p className="pviva__lema">
          La ladera papera como es de verdad: los caballones de tierra negra a
          curva de nivel, la mata aporcada con su flor lila y blanca, y en el
          claro la cosecha destapada — criolla amarilla, roja y morada. Recórrala
          con el dedo y siga los cuatro pasos de la lección.
        </p>
      </header>

      <section className="pviva__escena" aria-label="El papal en surcos en 3D">
        <div className="pviva__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="pviva__cargando" role="status">
                  Subiendo a la tierra fría…
                </div>
              }
            >
              <MundoPapa tier={tier} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <FichaPapal />
          )}
        </div>

        <div className="pviva__barra">
          <p className="pviva__tier">
            {mostrar3D
              ? 'Está viendo el papal en 3D. Gírelo con el dedo o el mouse y siga los pasos.'
              : puede3D
                ? 'Está viendo la ficha del papal.'
                : 'Su equipo ve la ficha del papal (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button type="button" className="pviva__toggle" onClick={() => setVer2d((v) => !v)}>
              {ver2d ? 'Ver el papal en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="pviva__saberes" aria-label="Lo que enseña el papal">
        <h2>Lo que le enseña este papal</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="pviva__emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="pviva__cierre">
          La papa no es solo un bulto en la plaza: es el cultivo que domesticaron
          los Andes y el que sostiene la mesa de la tierra fría. Donde hay surco
          bien hecho y semilla propia hay comida segura — y eso se cuida
          sembrando de todas, no de una sola.
        </p>
      </section>
    </main>
  );
}

/* La ficha del papal: el fallback digno para equipo humilde / sin-WebGL.
   El corte del caballón en CSS: la mata con sus flores arriba y, bajo la
   línea de tierra, las papas criollas engordando — cero GPU. */
function FichaPapal() {
  return (
    <div
      className="pviva__ficha"
      role="img"
      aria-label="El surco de papa en corte: la mata con su flor arriba y las papas criollas bajo la tierra"
    >
      <div className="pviva__estampa" aria-hidden="true">
        <span className="pviva__mata">
          <span className="pviva__flor pviva__flor--lila" />
          <span className="pviva__flor pviva__flor--blanca" />
          <span className="pviva__flor pviva__flor--lila2" />
        </span>
        <span className="pviva__caballon" />
        <span className="pviva__tierra">
          <span className="pviva__papa pviva__papa--criolla" />
          <span className="pviva__papa pviva__papa--criolla2" />
          <span className="pviva__papa pviva__papa--roja" />
          <span className="pviva__papa pviva__papa--morada" />
          <span className="pviva__papa pviva__papa--criolla3" />
        </span>
      </div>
      <p className="pviva__ficha-nombre">El surco de papa, en corte</p>
      <p className="pviva__ficha-sub">Piso frío · el cultivo que domesticaron los Andes</p>
    </div>
  );
}
