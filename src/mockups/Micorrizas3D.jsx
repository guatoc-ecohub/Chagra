/*
 * Micorrizas3D — el MUNDO "Suelo Vivo": la RED MICORRÍZICA bajo la tierra (el
 * wood-wide web) en 3D REAL. Ruta #/mockups/micorrizas-3d (y entrada del home),
 * sin auth.
 *
 * Bajo cada mata hay una red viva de hongos (micorrizas) enredada en las raíces:
 * la planta les da azúcar y ellos le devuelven fósforo y agua que buscan lejos.
 * El micelio conecta plantas distintas y REPARTE nutrientes entre ellas — por eso
 * maíz+fríjol+ahuyama se ayudan bajo tierra, y un árbol madre alimenta a las
 * maticas a su sombra. Aquí se ve esa red brillando y los pulsos de nutrientes
 * corriendo por los hilos. Se cuida con coberturas, compost y no quemar ni arar
 * de más; se daña con fungicidas y exceso de fósforo.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el diorama 3D (chunk
 * perezoso `vendor-three`); en equipo humilde, ahorro de datos o sin-WebGL ve la
 * ficha del suelo vivo, digna y sin sudar la GPU. Copy en español de Colombia,
 * en "usted". Autocontenida: cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './Micorrizas3D.css';

const EscenaMicorrizas = lazy(() => import('../visual/mundo3d/micorrizas/EscenaMicorrizas.jsx'));

/* Lo que enseña la red bajo tierra (verificado, DR-micorrizas, en "usted"). */
const SABERES = [
  {
    emoji: '🤝',
    titulo: 'Se ayudan bajo tierra',
    texto: 'El hilo de hongo (micelio) enlaza las raíces del maíz, el fríjol y la ahuyama, y reparte comida y agua entre ellas. Por eso sembradas juntas rinden más: se apoyan por debajo, donde no se ve.',
  },
  {
    emoji: '💛',
    titulo: 'Fósforo por azúcar',
    texto: 'La mata le regala al hongo el azúcar que hace con el sol; el hongo le devuelve fósforo y agua que su red busca lejos, donde la raíz sola no llega. Un trato justo, sin plata de por medio.',
  },
  {
    emoji: '🌳',
    titulo: 'El árbol madre alimenta',
    texto: 'Un árbol grande —una queñua, un aliso— conecta su red con las maticas nuevas a su sombra y les pasa comida hasta que se valen solas. El bosque conversa bajo la tierra.',
  },
  {
    emoji: '🛡️',
    titulo: 'Cuídela: no queme, no are de más',
    texto: 'La red se rompe con la quema, con arar de más, con fungicidas y con exceso de fósforo. Se cuida con coberturas vivas, compost y dejando raíces viejas en la tierra. Suelo tapado y con vida = red fuerte.',
  },
];

export default function Micorrizas3D() {
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
    <main className="micss">
      <header className="micss__head">
        <p className="micss__kicker">El suelo vivo · la red bajo tierra</p>
        <h1>Las micorrizas, el internet del bosque</h1>
        <p className="micss__lema">
          Bajo cada mata brilla una red de hongos que enlaza las raíces y les
          reparte fósforo, agua y azúcar. Véala de verdad, en 3D: gire con el dedo
          y mire correr los nutrientes por los hilos.
        </p>
      </header>

      <section className="micss__escena" aria-label="La red micorrízica del suelo en 3D">
        <div className="micss__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="micss__cargando" role="status">
                  Encendiendo la red del suelo…
                </div>
              }
            >
              <EscenaMicorrizas tier={tier} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <FichaSuelo />
          )}
        </div>

        <div className="micss__barra">
          <p className="micss__tier">
            {mostrar3D
              ? 'Está viendo la red del suelo en 3D. Gírela con el dedo o el mouse.'
              : puede3D
                ? 'Está viendo la ficha del suelo vivo.'
                : 'Su equipo ve la ficha del suelo vivo (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="micss__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver la red en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
        <p className="micss__leyenda-color" aria-hidden="true">
          <span className="micss__chip micss__chip--fos">Fósforo</span>
          <span className="micss__chip micss__chip--agua">Agua</span>
          <span className="micss__chip micss__chip--carb">Azúcar (a la mata)</span>
          <span className="micss__chip micss__chip--puente">Puente entre plantas</span>
        </p>
      </section>

      <section className="micss__saberes" aria-label="Lo que enseña la red del suelo">
        <h2>Lo que le enseña el suelo vivo</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="micss__emoji" aria-hidden="true">{s.emoji}</span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="micss__cierre">
          Un suelo tapado, con compost y sin quemar, guarda esta red viva año tras
          año. Es el mejor abono que tiene su finca y no se compra: se cuida.
        </p>
      </section>
    </main>
  );
}

/* La ficha del suelo vivo: fallback digno para equipo humilde / sin-WebGL. No es
   un 3D degradado feo: es una tarjeta ilustrada con CSS, sin GPU. */
function FichaSuelo() {
  return (
    <div className="micss__ficha" role="img" aria-label="La red micorrízica del suelo vivo">
      <div className="micss__ficha-red" aria-hidden="true">
        <span className="micss__ficha-mata micss__ficha-mata--a" />
        <span className="micss__ficha-mata micss__ficha-mata--b" />
        <span className="micss__ficha-hilo" />
        <span className="micss__ficha-pulso" />
      </div>
      <p className="micss__ficha-nombre">Micorrizas · red del suelo</p>
      <p className="micss__ficha-sub">El internet de hongos que conecta sus matas</p>
    </div>
  );
}
