/*
 * CacaoVivo3D — vitrina pública del MUNDO DEL CACAO: el cacaotal bajo sombra
 * del piso cálido (0–1.200 m). Ruta #/mockups/cacao-vivo-3d, sin auth.
 *
 * El cacao es el cultivo de paz de la tierra caliente, y aquí se muestra como
 * es de verdad en la vega: una siembra navegable a distancia pareja, las matas
 * de cacao con sus MAZORCAS pegadas del tronco (caulifloria) pintando del
 * verde al rojo cobrizo, y ARRIBA el SOMBRÍO — guamos que le hacen techo al
 * cultivo — con el plátano intercalado y la casa con su cajón de fermentar y
 * su pasera asomando en la calina del fondo. Cuatro pasos cortos recorren la
 * lección: qué es la mazorca, por qué el cacao va bajo sombra, el grano con su
 * baba (la fermentación) y el rumbo al secado.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el mundo 3D (chunk
 * perezoso `vendor-three`); en equipo humilde, ahorro de datos o sin-WebGL se
 * ve la ficha del cacaotal, digna y sin sudar la GPU. Copy en español de
 * Colombia, en "usted". Autocontenida: cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './CacaoVivo3D.css';

const MundoCacao = lazy(() => import('../visual/mundo3d/cacao/MundoCacao.jsx'));

/* Lo que enseña el cacaotal (verificado, en "usted"). */
const SABERES = [
  {
    emoji: '🌳',
    titulo: 'La mazorca nace del tronco',
    texto:
      'El cacao da su fruto donde nadie lo espera: pegado del tronco y de las ramas gruesas. A eso se le dice caulifloria, y es la firma del árbol. La mazorca pinta del verde al amarillo y al rojo cobrizo cuando está de coger.',
  },
  {
    emoji: '🌴',
    titulo: 'Mata de monte: quiere sombra',
    texto:
      'El cacao nació bajo los árboles grandes de la selva y así quiere vivir. El guamo y el plátano le bajan el sol quemante, le guardan la humedad, y su hoja caída se vuelve el abono que lo alimenta sin costar un peso.',
  },
  {
    emoji: '🍯',
    titulo: 'La baba no se bota: fermenta',
    texto:
      'Dentro de la mazorca vienen los granos envueltos en una baba blanca y dulce. En el cajón de madera, tapada con hoja de plátano, esa baba fermenta los granos unos días — ahí, y no en la fábrica, nace el sabor a chocolate.',
  },
  {
    emoji: '☀️',
    titulo: 'Del cajón a la pasera',
    texto:
      'Fermentado el grano, se extiende en la pasera y se voltea a mano hasta quedar seco y sonando a cascajo. Ese grano seco es el que la familia vende. El cacao bien fermentado y bien secado se paga mejor: la paciencia es plata.',
  },
];

export default function CacaoVivo3D() {
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
    <main className="kviva">
      <header className="kviva__head">
        <p className="kviva__kicker">El mundo del cacao · vitrina</p>
        <h1>El cacaotal bajo sombra</h1>
        <p className="kviva__lema">
          La vega de tierra caliente como es de verdad: las matas de cacao con
          la mazorca pegada del tronco, el sombrío tendiéndoles techo y la casa
          con su cajón y su pasera al fondo. Recórrala con el dedo y siga los
          cuatro pasos de la lección.
        </p>
      </header>

      <section className="kviva__escena" aria-label="El cacaotal bajo sombra en 3D">
        <div className="kviva__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="kviva__cargando" role="status">
                  Bajando a la vega…
                </div>
              }
            >
              <MundoCacao tier={tier} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <FichaCacaotal />
          )}
        </div>

        <div className="kviva__barra">
          <p className="kviva__tier">
            {mostrar3D
              ? 'Está viendo el cacaotal en 3D. Gírelo con el dedo o el mouse y siga los pasos.'
              : puede3D
                ? 'Está viendo la ficha del cacaotal.'
                : 'Su equipo ve la ficha del cacaotal (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button type="button" className="kviva__toggle" onClick={() => setVer2d((v) => !v)}>
              {ver2d ? 'Ver el cacaotal en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="kviva__saberes" aria-label="Lo que enseña el cacaotal">
        <h2>Lo que le enseña este cacaotal</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="kviva__emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="kviva__cierre">
          El cacao es cultivo de paz: donde se siembra cacao con sombrío vuelve
          el monte, vuelve el agua y vuelve la familia a la tierra. Un cacaotal
          bien llevado es medio bosque que da chocolate — y eso no cuesta
          cemento.
        </p>
      </section>
    </main>
  );
}

/* La ficha del cacaotal: el fallback digno para equipo humilde / sin-WebGL.
   Una mata de cacao CSS con sus mazorcas PEGADAS del tronco y el guamo del
   sombrío detrás — cero GPU. */
function FichaCacaotal() {
  return (
    <div
      className="kviva__ficha"
      role="img"
      aria-label="El cacaotal bajo sombra: mata de cacao con mazorcas pegadas del tronco y su árbol de sombrío"
    >
      <div className="kviva__estampa" aria-hidden="true">
        <span className="kviva__guamo" />
        <span className="kviva__guamo-tronco" />
        <span className="kviva__copa" />
        <span className="kviva__tronco">
          <span className="kviva__mazorca kviva__mazorca--verde" />
          <span className="kviva__mazorca kviva__mazorca--amarilla" />
          <span className="kviva__mazorca kviva__mazorca--roja" />
        </span>
      </div>
      <p className="kviva__ficha-nombre">El cacaotal bajo sombra</p>
      <p className="kviva__ficha-sub">Piso cálido · el cultivo de paz de la tierra caliente</p>
    </div>
  );
}
