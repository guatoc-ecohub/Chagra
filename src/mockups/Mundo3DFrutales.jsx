/*
 * Mundo3DFrutales — vitrina pública del MUNDO DE FRUTALES
 * (ruta #/mockups/mundo3d-frutales).
 *
 * El huerto de frutales de clima cálido/templado del solar campesino: el
 * AGUACATE mayor con su fruto verde-oscuro colgando, el MANGO de copa ancha con
 * el fruto dorado en su pedúnculo largo, y los CÍTRICOS (naranjo, limonero,
 * mandarino) cargados de color. El diorama enseña lo que de verdad es el huerto:
 * árboles de distinta EDAD y ALTURA conviviendo (nunca la fila monótona), el
 * PLATEO al pie de cada árbol, la PODA con su corte limpio, el INJERTO joven
 * con tutor (el huerto se renueva) y la COSECHA a mano con escalera y canasto
 * (la fruta golpeada se pierde).
 *
 * NO reimplementa nada: monta `<Mundo mundoId="frutales">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`). En equipo
 * humilde (o con "menos movimiento") se ve la tarjeta 2D digna; en gama media/
 * alta, el diorama 3D low-poly (chunk perezoso `vendor-three`) con la abeja
 * Angelita entrando al mundo. Los puntos del huerto son las mismas puertas del
 * registro: aquí (vitrina sin sesión) muestran a qué pantalla real de la app
 * llevan, en vez de navegar.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en
 * español de Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { decidirTier, permite3D } from '../visual/mundo3d/index.js';
import AcompananteMundo, { useAcompanante } from './valle/AcompananteMundo.jsx';
import './Mundo3DFrutales.css';

const TINTE = ['#c96a1f', '#f4e6cc'];

/* Lo que se ve en el huerto, contado en una leyenda didáctica y verificada:
   frutales reales del solar (aguacate, mango, cítricos), con la lección de la
   poda, la sombra propia, el injerto y la cosecha — sin recetas de veneno. */
const LEYENDA = [
  {
    emoji: '🥑',
    titulo: 'El aguacate, el mayor del solar',
    texto: 'Árbol grande de raíz delicada: pide suelo suelto que no se encharque (el encharque le pudre la raíz). El fruto se cosecha "hecho" pero verde, y madura bajado, en la casa. Verde oscuro colgando de su pedúnculo: esa es su seña.',
  },
  {
    emoji: '🥭',
    titulo: 'El mango, copa ancha de tierra caliente',
    texto: 'Copa densa que da sombra propia. El fruto cuelga de un pedúnculo largo — por eso se cosecha con vara de bolsa o con escalera, nunca a palo. Es de clima cálido: abajo de los mil metros es donde carga con ganas.',
  },
  {
    emoji: '🍊',
    titulo: 'Los cítricos: naranja, limón y mandarina',
    texto: 'Árboles medianos y redondos, cargados de fruto de color que se ve de lejos. Casi todos van INJERTADOS sobre un patrón resistente: la copa da la fruta buena y el patrón aguanta el suelo. Del cálido al templado, cada uno con su piso.',
  },
  {
    emoji: '✂️',
    titulo: 'La poda: abrirle luz y aire a la copa',
    texto: 'La copa cerrada cría hongos y esconde la fruta. La poda quita lo enfermo, lo cruzado y los chupones, con corte limpio y herramienta desinfectada. Copa abierta = menos enfermedad y fruta que se alcanza.',
  },
  {
    emoji: '🌱',
    titulo: 'Las edades: el huerto se renueva',
    texto: 'En el huerto conviven el árbol mayor y el injerto recién sembrado con su tutor. Sembrar un frutal nuevo cada tanto es la pensión del solar: cuando el viejo afloje, el joven ya está cargando. Y el plateo — el anillo de hojarasca al pie — le guarda la humedad y le quita el pasto de encima.',
  },
  {
    emoji: '🧺',
    titulo: 'La cosecha: a mano, no a palo',
    texto: 'La fruta se baja con la mano, con escalera o con vara de bolsa, y se acomoda en canasto sin llenarlo hasta reventar. Fruta golpeada es fruta que se pudre antes de llegar a la plaza: el cuidado de un minuto vale el precio del bulto.',
  },
];

export default function Mundo3DFrutales() {
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
  const acompanante = useAcompanante('frutales');

  return (
    <main
      className="m3dfru"
      style={{ '--m3dfru-a': TINTE[0], '--m3dfru-b': TINTE[1] }}
    >
      <header className="m3dfru__head">
        <p className="m3dfru__kicker">Los mundos de su finca · vitrina</p>
        <h1>El mundo de los frutales</h1>
        <p className="m3dfru__lema">
          Métase al huerto del solar: el aguacate mayor con su fruto verde
          colgando, el mango de copa ancha con el pedúnculo largo, y los
          cítricos cargados de naranja, limón y mandarina. Árboles de distinta
          edad conviviendo, el plateo que guarda la humedad, la poda que abre
          luz y aire, y la cosecha a mano — porque la fruta golpeada se pierde.
        </p>
      </header>

      <section className="m3dfru__escena" aria-label="El huerto de frutales de la finca">
        <AcompananteMundo mundoId="frutales" acompanante={acompanante}>
          <Mundo
            mundoId="frutales"
            tier={tier}
            reducedMotion={reducedMotion}
            onHotspot={acompanante.decirPuerta}
            onSalir={null}
            animo="sereno"
            energia={0.9}
            hablando={acompanante.hablando}
          />
        </AcompananteMundo>
        <div className="m3dfru__barra">
          <p className="m3dfru__tier">
            {tier === 'bajo'
              ? 'Está viendo la ficha de frutales (va parejo en cualquier equipo).'
              : 'Está viendo el diorama 3D. Puede girarlo con el dedo.'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="m3dfru__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver en 3D' : 'Ver la ficha 2D'}
            </button>
          )}
        </div>
        <p className="m3dfru__nota">Toque un punto del huerto para ver a dónde lo lleva.</p>
      </section>

      <section className="m3dfru__leyenda" aria-label="El huerto de frutales, pieza por pieza">
        <h2>El huerto, pieza por pieza</h2>
        <ol>
          {LEYENDA.map((p) => (
            <li key={p.titulo}>
              <span className="m3dfru__emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="m3dfru__cierre">
          El buen huerto no es una fila de árboles iguales: es el aguacate mayor
          y el injerto nuevo, la copa podada a tiempo, el plateo que abona y la
          fruta bajada con la mano. Siembre el reemplazo antes de necesitarlo y
          cosecha no le va a faltar — al solar ni a la plaza.
        </p>
      </section>
    </main>
  );
}
