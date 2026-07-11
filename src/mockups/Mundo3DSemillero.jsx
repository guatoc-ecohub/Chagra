/*
 * Mundo3DSemillero — vitrina pública del MUNDO DEL SEMILLERO / VIVERO (ruta
 * #/mockups/mundo3d-semillero).
 *
 * El semillero de la finca andina: cómo se cría la matica desde el grano hasta
 * que aguanta el campo. El diorama enseña la propagación con lo que de verdad se
 * hace en finca — las bandejas germinadoras con su sustrato y su humedad (la
 * semilla que despierta), el repique de la bandeja a la bolsa cuando la plántula
 * tiene fuerza, el endurecimiento al borde soleado para aclimatarla antes de
 * llevarla al lote, la semilla propia (criolla, guardada) al lado de la comprada,
 * y el túnel de media-sombra que la resguarda del frío de la madrugada y del
 * golpe de la lluvia. Nada de atajos: crianza paciente, esperanzadora.
 *
 * NO reimplementa nada: monta `<Mundo mundoId="semillero">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`). En equipo
 * humilde (o con "menos movimiento") se ve la ficha 2D digna; en gama media/alta,
 * el diorama 3D low-poly (chunk perezoso `vendor-three`) con la abeja Angelita
 * entrando al mundo. Los puntos del recinto son las mismas puertas del registro:
 * aquí (vitrina sin sesión) muestran a qué pantalla real de la app llevan, en vez
 * de navegar.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en
 * español de Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { decidirTier, permite3D } from '../visual/mundo3d/index.js';
import AcompananteMundo, { useAcompanante } from './valle/AcompananteMundo.jsx';
import './Mundo3DSemillero.css';

const TINTE = ['#4f9d5b', '#e6f0cf'];

/* Lo que se ve en el semillero, contado en una leyenda didáctica y verificada:
   propagación real (germinación, repique, endurecimiento y semilla), bajo el
   túnel que la protege. */
const LEYENDA = [
  {
    emoji: '🫘',
    titulo: 'La germinación en bandeja',
    texto: 'La semilla despierta en las celdas de la bandeja, con su sustrato suelto y húmedo. Riegue fino y seguido, sin encharcar: la semilla se ahoga si la deja en agua. Ahí ve cuáles prenden y cuáles no — y no gasta el lote en semilla que no iba a nacer.',
  },
  {
    emoji: '🌱',
    titulo: 'El repique o trasplante',
    texto: 'Cuando la plántula ya tiene sus primeras hojas verdaderas y raíz firme, se pasa de la bandeja a la bolsa o a la era. Tómela por la hoja, nunca por el tallo, y siémbrela a la misma hondura. Ese cambio le da espacio para que engorde antes de ir al campo.',
  },
  {
    emoji: '☀️',
    titulo: 'El endurecimiento',
    texto: 'Antes de llevarla al lote, sáquela unos días al borde soleado, al sol y al viento, y aflójele el riego. Así se aclimata: una matica criada consentida bajo techo, plantada de una en pleno campo, se quema o se marchita. Endurecerla es que aguante afuera.',
  },
  {
    emoji: '🌾',
    titulo: 'Semilla propia o comprada',
    texto: 'La semilla criolla, seleccionada de sus mejores matas y bien guardada, sale gratis y ya está hecha a su clima. La comprada sirve para variedades nuevas o híbridos, pero de esos no guarde semilla (los hijos salen disparejos). Sepa qué tiene en la mano antes de sembrar.',
  },
  {
    emoji: '⛺',
    titulo: 'El semillero protegido',
    texto: 'El túnel de media-sombra le hace techo a lo tierno: corta el golpe de la lluvia y guarda el calor de la helada de madrugada. La plántula recién nacida no aguanta el frío ni el aguacero de frente — por eso el semillero va tapado hasta que la mata tenga con qué defenderse.',
  },
];

export default function Mundo3DSemillero() {
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

  // La capa acompañante (BUG P1 "vitrinas mudas"): Angelita narra el mundo al
  // entrar y acusa las puertas tocadas — voz + burbuja de texto; si el equipo
  // no trae voz o está apagada, la burbuja ES la voz. Nunca mudo.
  const acompanante = useAcompanante('semillero');

  return (
    <main
      className="m3dsem"
      style={{ '--m3dsem-a': TINTE[0], '--m3dsem-b': TINTE[1] }}
    >
      <header className="m3dsem__head">
        <p className="m3dsem__kicker">Los mundos de su finca · vitrina</p>
        <h1>El mundo del semillero</h1>
        <p className="m3dsem__lema">
          Asómese al vivero: cómo se cría la matica desde el grano. Germínela en
          bandeja, repíquela a la bolsa, endurézcala al sol y guárdese su semilla —
          todo bajo el túnel que la protege del frío y la lluvia. Del grano a la
          mata lista para el campo.
        </p>
      </header>

      <section className="m3dsem__escena" aria-label="El semillero de la finca">
        <AcompananteMundo mundoId="semillero" acompanante={acompanante}>
          <Mundo
            mundoId="semillero"
            tier={tier}
            reducedMotion={reducedMotion}
            onHotspot={acompanante.decirPuerta}
            onSalir={null}
            animo="atento"
            energia={0.9}
            hablando={acompanante.hablando}
          />
        </AcompananteMundo>
        <div className="m3dsem__barra">
          <p className="m3dsem__tier">
            {tier === 'bajo'
              ? 'Está viendo la ficha del semillero (va parejo en cualquier equipo).'
              : 'Está viendo el diorama 3D. Puede girarlo con el dedo.'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="m3dsem__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver en 3D' : 'Ver la ficha 2D'}
            </button>
          )}
        </div>
        <p className="m3dsem__nota">Toque un punto del semillero para ver a dónde lo lleva.</p>
      </section>

      <section className="m3dsem__leyenda" aria-label="El semillero, pieza por pieza">
        <h2>El semillero, pieza por pieza</h2>
        <ol>
          {LEYENDA.map((p) => (
            <li key={p.titulo}>
              <span className="m3dsem__emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="m3dsem__cierre">
          El semillero es donde empieza toda cosecha, y donde se gana o se pierde
          barato: aquí una matica mala no cuesta un lote, cuesta una celda. Semilla
          buena, sustrato suelto, humedad medida y paciencia — y al campo se van
          matas que ya saben pararse solas. Del grano fuerte sale la finca fuerte.
        </p>
      </section>
    </main>
  );
}
