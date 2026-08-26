/*
 * Mundo3DClima — vitrina pública del MUNDO DEL CLIMA (ruta #/mockups/mundo3d-clima).
 *
 * El cielo bajo el que vive la finca: la hora del día (el sol que arquea), la
 * temporada bimodal andina (dos lluvias / dos secas, no cuatro estaciones
 * europeas), la niebla del páramo que el frailejón vuelve agua, y la montaña de
 * pisos térmicos con su casquete de hielo. Del hielo hablamos con conciencia,
 * no con miedo: Colombia perdió casi todo su glaciar y los nevados se apagan —
 * pero el páramo sigue siendo la fábrica de agua, y cuidarlo es la esperanza.
 * Menos colapso, finca viva.
 *
 * NO reimplementa nada: monta `<Mundo mundoId="clima">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`). En equipo
 * humilde (o con "menos movimiento") se ve el gemelo 2D digno del cielo; en gama
 * media/alta, la bóveda 3D low-poly (chunk perezoso `vendor-three`) con la abeja
 * Angelita entrando. Los puntos del cielo son las mismas puertas del registro:
 * aquí (vitrina sin sesión) cuentan a qué pantalla real de la app llevan.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en
 * español de Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { decidirTier, permite3D } from '../visual/mundo3d/index.js';
import AcompananteMundo, { useAcompanante } from './valle/AcompananteMundo.jsx';
import useClima3DVivo from '../hooks/useClima3DVivo.js';
import './Mundo3DClima.css';

const TINTE = ['#4c7fa0', '#dce9f2'];

/* El cielo, punto por punto — la misma verdad andina del registro, contada en
   una leyenda didáctica y esperanzadora. */
const LEYENDA = [
  { emoji: '⛅', titulo: 'La hora del día', texto: 'El sol arquea de la mañana a la tarde: por dónde sale y dónde se pone le dice cuándo regar, cuándo cosechar y cuándo guardar.' },
  { emoji: '🌧️', titulo: 'Dos lluvias, dos secas', texto: 'En los Andes no hay cuatro estaciones: el año va en dos temporadas de lluvia y dos de seca. Sembrar con ese compás es media cosecha ganada.' },
  { emoji: '🌫️', titulo: 'La niebla que da agua', texto: 'En el páramo el frailejón le peina el agua a la nube y la entrega despacio al suelo. Esa niebla es la que llena su quebrada en el verano.' },
  { emoji: '🏔️', titulo: 'El hielo que se va', texto: 'La línea ámbar marca hasta dónde llegaba el hielo. Colombia ya perdió casi todo su glaciar; por eso el páramo, la fábrica de agua, se cuida hoy.' },
  { emoji: '🌡️', titulo: 'Cada piso, su clima', texto: 'La montaña sube del cálido al páramo y en cada piso el clima manda qué crece. La altura es el primer dato del tiempo de su finca.' },
  { emoji: '❄️', titulo: 'La helada avisa', texto: 'En los pisos fríos la helada llega de madrugada con cielo despejado. Leerla a tiempo salva la papa y la mora de una mala noche.' },
];

const CONDICIONES = {
  despejado: 'Cielo despejado',
  nublado: 'Cielo cubierto',
  lluvia: 'Lluvia sobre la finca',
  niebla: 'Niebla de ladera',
};

function ValorHud({ label, value, unit, tone = 'cyan' }) {
  return (
    <div className={`m3dc__metric m3dc__metric--${tone}`}>
      <span>{label}</span>
      <strong>{value == null ? '•••' : value}<small>{value == null ? '' : unit}</small></strong>
    </div>
  );
}

function ClimaHud({ climaLive }) {
  const estado = climaLive.senal
    ? (CONDICIONES[climaLive.condicion] || (climaLive.lluvia ? 'Lluvia sobre la finca' : 'Lectura atmosférica'))
    : 'Esperando señal del cielo';
  const enso = climaLive.tieneEnso
    ? (climaLive.ensoLabel || `Fase ${climaLive.ensoFamily}`)
    : 'ENSO sin lectura';
  const fuente = climaLive.tieneOpenMeteo && climaLive.tieneEnso
    ? 'Open-Meteo + NOAA / IDEAM'
    : climaLive.tieneOpenMeteo
      ? 'Open-Meteo'
      : climaLive.tieneEnso ? 'NOAA / IDEAM' : 'Sin señal cacheada';

  return (
    <div className="m3dc__hud" aria-label="Lectura climática en vivo">
      <div className="m3dc__hudline">
        <span className={`m3dc__signal${climaLive.senal ? ' is-live' : ''}`} aria-hidden="true" />
        <span>{climaLive.senal ? 'SEÑAL CLIMÁTICA' : 'MODO CONTEMPLATIVO'}</span>
        <span className="m3dc__hudsource">{fuente}</span>
      </div>
      <div className="m3dc__hudmain">
        <div>
          <p className="m3dc__hudlabel">ESTADO DEL VALLE</p>
          <h2>{estado}</h2>
          <p className="m3dc__hudsub">
            {climaLive.ubicacion ? `${climaLive.ubicacion}${climaLive.precision === 'centroid' ? ' · centroide' : ''}` : 'Ubicación de la finca'}
            {climaLive.pisoTermico && ` · piso ${climaLive.pisoTermico.nombre.toLowerCase()}`}
          </p>
        </div>
        <div className="m3dc__enso-readout">
          <span>ENSO</span>
          <strong>{enso}</strong>
          <small>{climaLive.oni == null ? 'ONI: sin dato' : `ONI ${climaLive.oni.toFixed(1)} °C`}</small>
        </div>
      </div>
      <div className="m3dc__metrics">
        <ValorHud label="AHORA" value={climaLive.temp == null ? null : Math.round(climaLive.temp)} unit="°C" />
        <ValorHud label="MÍNIMA" value={climaLive.tempMin == null ? null : Math.round(climaLive.tempMin)} unit="°C" tone="blue" />
        <ValorHud label="LLUVIA" value={climaLive.lluviaMm == null ? null : climaLive.lluviaMm.toFixed(1)} unit=" mm" tone="amber" />
        <ValorHud label="HUMEDAD" value={climaLive.humedad == null ? null : Math.round(climaLive.humedad)} unit="%" tone="green" />
      </div>
      <div className="m3dc__phenomena" aria-label="Fenómenos visibles">
        <span className={climaLive.lluvia ? 'is-on' : ''}>Lluvia</span>
        <span className={climaLive.niebla ? 'is-on' : ''}>Niebla</span>
        <span className={climaLive.helada ? 'is-on' : ''}>Helada</span>
        <span className={climaLive.helada ? 'is-on' : ''}>Cielo frío</span>
      </div>
    </div>
  );
}

/** @param {{ onBack?: () => void }} [props] */
export default function Mundo3DClima({ onBack = undefined } = {}) {
  // Device-tiering REAL (una vez): gama baja / ahorro / menos-movimiento → 2D.
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
  const tier = ver2d ? 'bajo' : decision.tier;
  const climaLive = useClima3DVivo();

  // La capa acompañante (BUG P1 "vitrinas mudas"): Angelita narra el mundo al
  // entrar y acusa las puertas tocadas — voz + burbuja de texto; si el equipo
  // no trae voz o está apagada, la burbuja ES la voz. Nunca mudo.
  const acompanante = useAcompanante('clima');

  return (
    <main className="m3dc" style={{ '--m3dc-a': TINTE[0], '--m3dc-b': TINTE[1] }}>
      <header className="m3dc__head">
        {onBack && (
          <button type="button" className="m3dc__volver" onClick={onBack}>
            ← Volver
          </button>
        )}
        <div className="m3dc__eyebrow"><span className="m3dc__eyebrow-dot" /> OBSERVATORIO AGROCLIMA <span>/</span> MUNDO 03D</div>
        <p className="m3dc__kicker">El cielo bajo el que trabaja su finca</p>
        <h1 aria-label="El mundo del clima">Cielo <em>vivo</em></h1>
        <p className="m3dc__lema">
          Una bóveda inmersiva que convierte el dato de su finca en atmósfera:
          lluvia, niebla, helada y el pulso lento de ENSO.
        </p>
      </header>

      <section className="m3dc__escena" aria-label="El cielo de la finca">
        <div className="m3dc__scene-topline">
          <span>ATMOSPHERE / LIVE RENDER</span>
          <span>{tier === 'bajo' ? 'TIER LIGERO' : `TIER ${tier.toUpperCase()}`}</span>
        </div>
        <div className="m3dc__scene-frame">
          <AcompananteMundo mundoId="clima" acompanante={acompanante}>
            <Mundo
              mundoId="clima"
              tier={tier}
              climaLive={climaLive}
              reducedMotion={reducedMotion}
              onHotspot={acompanante.decirPuerta}
              onSalir={null}
              animo="sereno"
              energia={0.85}
              hablando={acompanante.hablando}
            />
          </AcompananteMundo>
          <ClimaHud climaLive={climaLive} />
          <div className="m3dc__crosshair" aria-hidden="true"><i /><i /></div>
        </div>
        <div className="m3dc__barra">
          <p className="m3dc__tier">
            {tier === 'bajo'
              ? 'Está viendo el dibujo del cielo (va parejo en cualquier equipo).'
              : 'Está viendo la bóveda 3D. Puede girarla con el dedo.'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="m3dc__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver en 3D' : 'Ver el dibujo 2D'}
            </button>
          )}
        </div>
        <p className="m3dc__nota">Toque un punto del cielo para abrir una lectura real de la finca.</p>
      </section>

      <aside className="m3dc__readout" aria-label="Resumen de la señal climática">
        <div className="m3dc__readout-head">
          <span>LECTURA DE CAMPO</span>
          <b>{climaLive.senal ? 'ACTIVA' : 'EN ESPERA'}</b>
        </div>
        <p>
          {climaLive.senal
            ? 'La escena está sincronizada con la última lectura disponible del servicio climático.'
            : 'La escena no tiene un snapshot cacheado. Mostramos el relieve sin inventar cifras ni alertas.'}
        </p>
        {climaLive.alertas.length > 0 && (
          <div className="m3dc__alerts">
            {climaLive.alertas.slice(0, 2).map((alerta, index) => (
              <div key={`${alerta?.tipo || 'alerta'}-${index}`}>
                <span aria-hidden="true">!</span>
                <p>{alerta?.mensaje || alerta?.tipo || 'Alerta climática disponible'}</p>
              </div>
            ))}
          </div>
        )}
      </aside>

      <section className="m3dc__leyenda" aria-label="El cielo, punto por punto">
        <h2>El cielo, punto por punto</h2>
        <ol>
          {LEYENDA.map((p) => (
            <li key={p.titulo}>
              <span className="m3dc__emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="m3dc__cierre">
          El clima no es un enemigo: es el compás de su finca. Aprenda a leerlo y
          cuide el páramo que le da el agua — ahí está la esperanza, no el miedo.
        </p>
      </section>
    </main>
  );
}
