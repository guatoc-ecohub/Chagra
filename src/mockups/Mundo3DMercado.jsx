/*
 * Mundo3DMercado — vitrina pública del MUNDO DEL MERCADO (ruta
 * #/mockups/mundo3d-mercado).
 *
 * El mercado campesino de la finca andina: la comercialización justa hecha
 * lugar. El diorama enseña la CADENA CORTA del campo a la mesa — la ruta que
 * baja de la parcela a la plaza (del productor al comprador, directo), los
 * puestos con su toldo, los canastos con la cosecha propia (tomate, papa, maíz,
 * café), el sello de PROCEDENCIA (el terroir andino: de qué vereda y qué piso
 * viene) y la balanza del PRECIO JUSTO. Nada de intermediación que se come el
 * trabajo: trato directo, cuentas claras, finca que vende parejo.
 *
 * NO reimplementa nada: monta `<Mundo mundoId="mercado">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`). En equipo
 * humilde (o con "menos movimiento") se ve la ficha 2D digna; en gama media/
 * alta, el diorama 3D low-poly (chunk perezoso `vendor-three`) con la abeja
 * Angelita entrando al mundo. Los puntos de la plaza son las mismas puertas del
 * registro: aquí (vitrina sin sesión) muestran a qué pantalla real de la app
 * llevan, en vez de navegar.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en
 * español de Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { decidirTier, permite3D } from '../visual/mundo3d/index.js';
import AcompananteMundo, { useAcompanante } from './valle/AcompananteMundo.jsx';
import './Mundo3DMercado.css';

const TINTE = ['#b98a2f', '#f7ecd2'];

/* Lo que se ve en la plaza, contado en una leyenda didáctica y verificada:
   comercialización justa de verdad (cadena corta + procedencia + precio justo),
   sin promesas de plata ni instituciones inventadas. */
const LEYENDA = [
  {
    emoji: '🥕',
    titulo: 'La cadena corta del campo a la mesa',
    texto: 'La cosecha baja de la parcela a la plaza sin dar la vuelta por diez manos. Entre menos intermediarios, más se queda en la finca y más fresco llega el producto al que se lo come.',
  },
  {
    emoji: '🧺',
    titulo: 'Los puestos y los canastos',
    texto: 'El puesto de mercado campesino, con su toldo y su mesa, y los canastos con lo de la finca: tomate, papa, maíz, café. Vender directo es poner la cara y la cosecha propia a la vista.',
  },
  {
    emoji: '🏔️',
    titulo: 'La procedencia: el terroir andino',
    texto: 'El sello de origen dice de qué vereda y de qué piso térmico viene. Una papa de páramo o un café de ladera no son cualquier cosa: la procedencia cuenta la historia y le da valor a lo suyo.',
  },
  {
    emoji: '⚖️',
    titulo: 'El precio justo',
    texto: 'La balanza que reparte parejo: un precio que le paga el trabajo al que siembra y le sale razonable al que compra. Saber el precio de referencia le da con qué negociar y a quién no dejarse.',
  },
  {
    emoji: '📦',
    titulo: 'La despensa y la poscosecha',
    texto: 'Cosechar en punto, guardar sin que se dañe y transformar lo que sobra. Una buena despensa (troja, silo, secado) es vender cuando el precio sube, no rematar cuando todos cosechan.',
  },
];

export default function Mundo3DMercado() {
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
  const acompanante = useAcompanante('mercado');

  return (
    <main
      className="m3dmer"
      style={{ '--m3dmer-a': TINTE[0], '--m3dmer-b': TINTE[1] }}
    >
      <header className="m3dmer__head">
        <p className="m3dmer__kicker">Los mundos de su finca · vitrina</p>
        <h1>El mundo del mercado</h1>
        <p className="m3dmer__lema">
          Asómese a la plaza campesina: la cosecha que baja de la parcela a la
          mesa sin dar la vuelta por diez manos. Puestos, canastos, el sello de
          dónde viene y una balanza que reparte parejo. Venta directa, precio
          justo, finca que no se deja.
        </p>
      </header>

      <section className="m3dmer__escena" aria-label="El mercado campesino de la finca">
        <AcompananteMundo mundoId="mercado" acompanante={acompanante}>
          <Mundo
            mundoId="mercado"
            tier={tier}
            reducedMotion={reducedMotion}
            onHotspot={acompanante.decirPuerta}
            onSalir={null}
            animo="alegre"
            energia={0.95}
            hablando={acompanante.hablando}
          />
        </AcompananteMundo>
        <div className="m3dmer__barra">
          <p className="m3dmer__tier">
            {tier === 'bajo'
              ? 'Está viendo la ficha del mercado (va parejo en cualquier equipo).'
              : 'Está viendo el diorama 3D. Puede girarlo con el dedo.'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="m3dmer__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver en 3D' : 'Ver la ficha 2D'}
            </button>
          )}
        </div>
        <p className="m3dmer__nota">Toque un punto de la plaza para ver a dónde lo lleva.</p>
      </section>

      <section className="m3dmer__leyenda" aria-label="El mercado, pieza por pieza">
        <h2>El mercado campesino, pieza por pieza</h2>
        <ol>
          {LEYENDA.map((p) => (
            <li key={p.titulo}>
              <span className="m3dmer__emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="m3dmer__cierre">
          Vender bien no es rematar: es poner la cara, contar de dónde viene lo
          suyo y cobrar lo que vale el trabajo. La cadena corta deja la plata en
          el campo y la comida fresca en la mesa. Sepa su precio, cuide su
          despensa y negocie de frente. Menos intermediario, más finca viva.
        </p>
      </section>
    </main>
  );
}
