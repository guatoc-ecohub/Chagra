/*
 * InvernaderoVivo3D — vitrina pública del MICRO-MUNDO DEL INVERNADERO: el
 * túnel de guadua y plástico donde la finca cría su propia mata y fabrica su
 * propio clima. Ruta #/mockups/invernadero-vivo-3d, sin auth.
 *
 * Un lugar donde SE ENTRA: la cámara llega por el caminito, cruza la puerta y
 * el usuario recorre el pasillo entre las camas — la mesa de almácigo con sus
 * bandejas germinando por etapas, las bolsas del repique, el tomate tutorado
 * madurando del verde al rojo y las líneas de goteo saliendo de la caneca.
 * Adentro el aire se siente: vaho bajo, condensación que gotea del techo y
 * brotes que respiran. Cinco pasos cortos recorren la lección.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el mundo 3D (chunk
 * perezoso `vendor-three`); en equipo humilde, ahorro de datos o sin-WebGL se
 * ve la ficha del invernadero, digna y sin sudar la GPU. Copy en español de
 * Colombia, en "usted". Autocontenida: cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './InvernaderoVivo3D.css';

const MundoInvernadero = lazy(() => import('../visual/mundo3d/invernadero/MundoInvernadero.jsx'));

const OPCIONES_CANTIDAD = [1500, 3000, 5000, 10000];
const OPCIONES_ESPECIE = [
  { id: 'tomate', nombre: 'Tomate' },
  { id: 'pimenton', nombre: 'Pimentón' },
  { id: 'lechuga', nombre: 'Lechuga' },
];

function cultivoInicial() {
  if (typeof window === 'undefined') return { especie: 'tomate', cantidad: 1500, layout: 'surcos' };
  const params = new URLSearchParams(window.location.search);
  const cantidad = Number(params.get('cantidad'));
  return {
    especie: params.get('especie') || 'tomate',
    cantidad: OPCIONES_CANTIDAD.includes(cantidad) ? cantidad : 1500,
    layout: ['surcos', 'franjas', 'compacto'].includes(params.get('layout')) ? params.get('layout') : 'surcos',
  };
}

/* Lo que enseña el invernadero (verificado, en "usted"). */
const SABERES = [
  {
    emoji: '🌡️',
    titulo: 'El clima se puede fabricar',
    texto:
      'Un techo de plástico sobre arcos de guadua hace un microclima: adentro no golpea el aguacero, la helada de madrugada no quema y el calor se queda. Es la obra más barata que multiplica la finca.',
  },
  {
    emoji: '🌱',
    titulo: 'El almácigo es la primera cosecha',
    texto:
      'La semilla no se riega al voleo: se siembra una por celda, en bandejas con sustrato suelto. Germinar parejo y con raíz sana define todo lo que viene. La mata fuerte se hace desde la bandeja.',
  },
  {
    emoji: '🍅',
    titulo: 'Hoja seca, tomate sano',
    texto:
      'El tomate se enferma con la hoja mojada. Bajo cubierta la lluvia no lo toca, y amarrado a su tutor el racimo madura de abajo hacia arriba: verde, pintón, rojo. Menos hongos sin un solo remedio de más.',
  },
  {
    emoji: '💧',
    titulo: 'El agua se cuenta por gotas',
    texto:
      'Bajo techo no llueve: el agua la pone usted. Las líneas de goteo tendidas sobre las camas entregan el agua al pie de cada mata, sin mojar la hoja y gastando una fracción de lo que gasta el balde.',
  },
];

export default function InvernaderoVivo3D() {
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
  const [cultivo, setCultivo] = useState(cultivoInicial);
  const tier = ver2d || !puede3D ? 'bajo' : decision.tier;
  const mostrar3D = puede3D && !ver2d;
  const especieNombre = OPCIONES_ESPECIE.find((o) => o.id === cultivo.especie)?.nombre || 'Tomate';
  const cantidadTexto = new Intl.NumberFormat('es-CO').format(cultivo.cantidad);

  return (
    <main className="invivo">
      <header className="invivo__head">
        <p className="invivo__kicker">El micro-mundo del invernadero · vitrina</p>
        <h1>El invernadero campesino</h1>
        <p className="invivo__lema">
          Un túnel de guadua y plástico donde la finca cría su propia mata:
          entre por la puerta, recorra el pasillo entre las camas y mire el
          almácigo germinando, el tomate tutorado y el agua contada por gotas.
        </p>
      </header>

      <section className="invivo__escena" aria-label="El invernadero campesino en 3D">
        <form className="invivo__config" aria-label="Configurar cultivo">
          <div className="invivo__config-head">
            <div>
              <p className="invivo__config-kicker">Escala del cultivo</p>
              <p className="invivo__config-title">{especieNombre}, {cantidadTexto} plantas</p>
            </div>
            <span className="invivo__config-badge">Instancing GPU</span>
          </div>
          <div className="invivo__config-grid">
            <label>
              Especie
              <select
                value={cultivo.especie}
                onChange={(event) => setCultivo((actual) => ({ ...actual, especie: event.target.value }))}
              >
                {OPCIONES_ESPECIE.map((opcion) => (
                  <option key={opcion.id} value={opcion.id}>
                    {opcion.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cantidad
              <select
                value={cultivo.cantidad}
                onChange={(event) => setCultivo((actual) => ({ ...actual, cantidad: Number(event.target.value) }))}
              >
                {OPCIONES_CANTIDAD.map((cantidad) => (
                  <option key={cantidad} value={cantidad}>
                    {new Intl.NumberFormat('es-CO').format(cantidad)} plantas
                  </option>
                ))}
              </select>
            </label>
            <label>
              Distribución
              <select
                value={cultivo.layout}
                onChange={(event) => setCultivo((actual) => ({ ...actual, layout: event.target.value }))}
              >
                <option value="surcos">Surcos de trabajo</option>
                <option value="franjas">Franjas largas</option>
                <option value="compacto">Masa compacta</option>
              </select>
            </label>
          </div>
          <p className="invivo__config-note">
            Una geometría compartida por familia, miles de transformaciones instanciadas. El tomate es la configuración prioritaria.
          </p>
        </form>
        <div className="invivo__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="invivo__cargando" role="status">
                  Abriendo la puerta del túnel…
                </div>
              }
            >
              <MundoInvernadero
                tier={tier}
                reducedMotion={reducedMotion}
                especie={cultivo.especie}
                cantidad={cultivo.cantidad}
                layout={cultivo.layout}
              />
            </Suspense>
          ) : (
            <FichaInvernadero />
          )}
        </div>

        <div className="invivo__barra">
          <p className="invivo__tier">
            {mostrar3D
              ? 'Está adentro del invernadero en 3D. Acérquese por la puerta con el dedo o la rueda y siga los pasos.'
              : puede3D
                ? 'Está viendo la ficha del invernadero.'
                : 'Su equipo ve la ficha del invernadero (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button type="button" className="invivo__toggle" onClick={() => setVer2d((v) => !v)}>
              {ver2d ? 'Entrar al invernadero en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="invivo__saberes" aria-label="Lo que enseña el invernadero">
        <h2>Lo que le enseña este invernadero</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="invivo__emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="invivo__cierre">
          El invernadero no es tecnología de rico: es guadua, plástico y maña.
          Con él la finca deja de rogarle al clima. Cría su plántula pareja,
          cosecha tomate sano y gasta el agua gota a gota, todo el año.
        </p>
      </section>
    </main>
  );
}

/* La ficha del invernadero: el fallback digno para equipo humilde / sin-WebGL.
   El túnel CSS con su plástico, la puerta y las maticas — cero GPU. */
function FichaInvernadero() {
  return (
    <div
      className="invivo__ficha"
      role="img"
      aria-label="El invernadero campesino: túnel de plástico con su puerta y las plántulas adentro"
    >
      <div className="invivo__estampa" aria-hidden="true">
        <span className="invivo__tunel" />
        <span className="invivo__puerta" />
        <span className="invivo__mata invivo__mata--a" />
        <span className="invivo__mata invivo__mata--b" />
        <span className="invivo__mata invivo__mata--c" />
      </div>
      <p className="invivo__ficha-nombre">El invernadero campesino</p>
      <p className="invivo__ficha-sub">Guadua, plástico y maña · aquí se cría la mata</p>
    </div>
  );
}
