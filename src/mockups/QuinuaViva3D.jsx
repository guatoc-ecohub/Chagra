/*
 * QuinuaViva3D — vitrina pública del MUNDO DE LA QUINUA: el quinual maduro de
 * tierra fría (2.500–3.200 m). Ruta #/mockups/quinua-viva-3d, sin auth.
 *
 * OJO, no confundir con `components/quinua/QuinuaScreen` (ruta #quinua): esa es
 * la pantalla 2D de granos andinos —quinua, amaranto, chía, cañihua, tarwi—,
 * photo-forward y con otro propósito. Esta es el MUNDO 3D del cultivo, y no la
 * reemplaza ni la duplica.
 *
 * Lo que este mundo entrega es el color. Un quinual maduro es de las cosas más
 * bonitas del campo andino: cada mata remata en una panoja que al madurar se
 * enciende, y como el campesino siembra una variedad por tabla, el lote se ve a
 * manchas —morado, rojizo, blanco rosado, verde— hasta el fondo de la ladera.
 * Alrededor, la era de la trilla con la hoz, el garrote, la zaranda y la batea
 * del lavado. Cuatro pasos cortos van de mirar el cultivo a poder comerlo.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el mundo 3D (chunk
 * perezoso `vendor-three`); en equipo humilde, ahorro de datos o sin-WebGL se ve
 * la ficha con las DOS panojas lado a lado —la compacta y la suelta—, que es la
 * misma lección sin sudar la GPU. Copy en español de Colombia, en "usted".
 * Autocontenida: cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './QuinuaViva3D.css';

const MundoQuinua = lazy(() => import('../visual/mundo3d/quinua/MundoQuinua.jsx'));

/* Lo que enseña el quinual (verificado, en "usted"). */
const SABERES = [
  {
    emoji: '🌾',
    titulo: 'Hay dos formas de panoja',
    texto:
      'La glomerulada lleva los granitos apretados contra el eje y se ve maciza. La amarantiforme abre sus ramitas y cuelga suelta, como una escoba. No es un detalle de botánico: por ahí se reconoce la variedad, y con la variedad se sabe cómo se cosecha y si toca lavarla mucho o poco.',
  },
  {
    emoji: '🎨',
    titulo: 'El color dice la variedad',
    texto:
      'Al madurar la panoja se enciende, y cada variedad tiene su tono: Tunkahuán vira a morado y pasa de los dos metros; Punto Rojo se pone rojizo; Aurora queda blanca rosada y bajita; Blanca de Jericó se queda verde. Un lote de una sola variedad es un lote de un solo riesgo.',
  },
  {
    emoji: '💨',
    titulo: 'Se trilla y se avienta',
    texto:
      'Cuando el grano ya no se raja con la uña, se corta con hoz y se hace gavilla. En la era se le da garrote sobre la manta para que suelte el grano, y luego se avienta: se deja caer al viento, que se lleva la paja y deja la semilla limpia. Después la zaranda termina de emparejar.',
  },
  {
    emoji: '🫧',
    titulo: 'Y se le lava lo amargo',
    texto:
      'El grano viene forrado en saponina, que es amarga, y así no se come. Se lava y se frota con agua hasta que deje de hacer espuma — esa espuma es la saponina saliendo. La Blanca de Jericó nace dulce y casi no lo necesita: por eso saber cuál sembró le ahorra media jornada de trabajo.',
  },
];

export default function QuinuaViva3D() {
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
    <main className="qviva">
      <header className="qviva__head">
        <p className="qviva__kicker">El mundo de la quinua · vitrina</p>
        <h1>El quinual maduro de la tierra fría</h1>
        <p className="qviva__lema">
          Un quinual en su punto es de las cosas más bonitas del campo andino: la
          ladera baja sembrada a manchas de color, cada tabla con su variedad —
          morada, rojiza, blanca rosada, verde — y arriba, en el filo, la era
          donde se trilla, se avienta y se le lava lo amargo. Recórralo con el
          dedo y siga los cuatro pasos de la lección.
        </p>
      </header>

      <section className="qviva__escena" aria-label="El quinual maduro en 3D">
        <div className="qviva__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="qviva__cargando" role="status">
                  Subiendo al filo del quinual…
                </div>
              }
            >
              <MundoQuinua tier={tier} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <FichaQuinual />
          )}
        </div>

        <div className="qviva__barra">
          <p className="qviva__tier">
            {mostrar3D
              ? 'Está viendo el quinual en 3D. Gírelo con el dedo o el mouse y siga los pasos.'
              : puede3D
                ? 'Está viendo la ficha de la panoja.'
                : 'Su equipo ve la ficha de la panoja (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button type="button" className="qviva__toggle" onClick={() => setVer2d((v) => !v)}>
              {ver2d ? 'Ver el quinual en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="qviva__saberes" aria-label="Lo que enseña el quinual">
        <h2>Lo que le enseña este quinual</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="qviva__emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="qviva__cierre">
          La quinua aguanta lo que pocos cultivos aguantan en la altura: la
          helada, el suelo salino, la sequía. Por eso los Andes llevan miles de
          años sembrándola, y por eso vale la pena que no se pierda ninguna de
          sus variedades — cada una guarda una respuesta distinta para un año
          distinto. En Colombia se da bien en Nariño, Boyacá y Cundinamarca.
        </p>
      </section>
    </main>
  );
}

/* La ficha del quinual: el fallback digno para equipo humilde / sin-WebGL.
   Las DOS panojas lado a lado en CSS — la compacta y la suelta — que es la
   lección que más rinde de este mundo. Cero GPU. */
function FichaQuinual() {
  return (
    <div
      className="qviva__ficha"
      role="img"
      aria-label="Las dos formas de panoja de la quinua: la glomerulada compacta y la amarantiforme suelta"
    >
      <div className="qviva__estampa" aria-hidden="true">
        {/* GLOMERULADA: los glomérulos apretados contra el eje */}
        <span className="qviva__panoja qviva__panoja--glom">
          <span className="qviva__eje" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span key={`g${i}`} className={`qviva__glom qviva__glom--${i}`} />
          ))}
        </span>
        {/* AMARANTIFORME: las ramitas largas, abiertas y vencidas */}
        <span className="qviva__panoja qviva__panoja--amar">
          <span className="qviva__eje" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={`a${i}`} className={`qviva__ramita qviva__ramita--${i}`} />
          ))}
        </span>
      </div>
      <p className="qviva__ficha-nombre">Las dos panojas de la quinua</p>
      <p className="qviva__ficha-sub">
        Izquierda glomerulada (compacta) · derecha amarantiforme (suelta)
      </p>
    </div>
  );
}
