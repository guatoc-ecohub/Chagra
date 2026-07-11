/*
 * Mundo3DSuelo — vitrina pública del MUNDO DEL SUELO (ruta #/mockups/mundo3d-suelo).
 *
 * El corte de tierra donde la vida invisible del subsuelo se hace visible: las
 * tres capas reales (hojarasca → suelo negro → subsuelo) y, entre ellas, las
 * raíces que bajan, el "internet de hongos" (micorrizas) y las criaturas que
 * cuentan que la tierra está viva — la lombriz que asoma, el escarabajo que
 * trabaja la hojarasca. Entre más vivo el suelo, más vida se ve. Didáctico y
 * esperanzador — menos colapso, finca viva.
 *
 * NO reimplementa nada: monta `<Mundo mundoId="suelo">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`). En equipo
 * humilde (o con "menos movimiento" activado) se ve el gemelo 2D digno; en
 * gama media/alta, el diorama 3D low-poly (chunk perezoso `vendor-three`) con
 * la abeja Angelita entrando al mundo. Los puntos del corte son las mismas
 * puertas del registro: aquí (vitrina sin sesión) muestran a qué pantalla real
 * de la app llevan, en vez de navegar.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en
 * español de Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { MUNDO, decidirTier, permite3D } from '../visual/mundo3d/index.js';
import './Mundo3DSuelo.css';

const TINTE = ['#8a5a38', '#f0e2c8'];

/* El corte, capa por capa y vida por vida — la misma verdad del registro
   (mundoData.js), contada en una leyenda didáctica y verificada. */
const LEYENDA = [
  { emoji: '🍂', titulo: 'La hojarasca', texto: 'Las hojas y el rastrojo que caen y se pudren arriba: la cobija que abriga la tierra y le devuelve el alimento.' },
  { emoji: '🌑', titulo: 'El suelo negro', texto: 'La capa de materia orgánica, oscura y esponjosa: ahí vive casi toda la vida y ahí guarda la tierra su fuerza.' },
  { emoji: '⛰️', titulo: 'El subsuelo', texto: 'La reserva de abajo, más clara y firme: hasta allá bajan las raíces profundas a buscar agua y minerales.' },
  { emoji: '🪱', titulo: 'Las lombrices', texto: 'Cuando hay lombrices, la tierra está viva: airean, mezclan y dejan un abono fino. Son el mejor termómetro de un suelo sano.' },
  { emoji: '🕸️', titulo: 'El internet de hongos', texto: 'Las micorrizas son hilos de hongo que se enlazan con las raíces y les llevan agua y minerales de lejos. Una red que no se ve, pero sostiene.' },
];

export default function Mundo3DSuelo() {
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

  // En la vitrina (sin sesión) un punto del corte no navega: cuenta a qué
  // pantalla real de la app lleva esa puerta.
  const [puerta, setPuerta] = useState(null);
  const onHotspot = (view, data) => {
    const hs = (MUNDO.suelo.hotspots || []).find(
      (h) => h.view === view && (h.data === data || (!h.data && !data)),
    ) || (MUNDO.suelo.hotspots || []).find((h) => h.view === view);
    setPuerta({ label: hs?.label || view, view });
  };

  return (
    <main
      className="m3ds"
      style={{ '--m3ds-a': TINTE[0], '--m3ds-b': TINTE[1] }}
    >
      <header className="m3ds__head">
        <p className="m3ds__kicker">Los mundos de su finca · vitrina</p>
        <h1>El mundo del suelo</h1>
        <p className="m3ds__lema">
          Asómese al corte de la tierra: las capas, las raíces y la vida que no
          se ve. Entre más vivo el suelo, más lombrices, más raíces, más hongos.
          Menos colapso, finca viva.
        </p>
      </header>

      <section className="m3ds__escena" aria-label="El corte del suelo vivo de la finca">
        <Mundo
          mundoId="suelo"
          tier={tier}
          reducedMotion={reducedMotion}
          onHotspot={onHotspot}
          onSalir={null}
          animo="sereno"
          energia={0.85}
        />
        <div className="m3ds__barra">
          <p className="m3ds__tier">
            {tier === 'bajo'
              ? 'Está viendo el dibujo del corte (va parejo en cualquier equipo).'
              : 'Está viendo el diorama 3D. Puede girarlo con el dedo.'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="m3ds__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver en 3D' : 'Ver el dibujo 2D'}
            </button>
          )}
        </div>
        <p className="m3ds__nota" role="status" aria-live="polite">
          {puerta
            ? `«${puerta.label}» es una puerta real: dentro de la app abre la pantalla «${puerta.view}».`
            : 'Toque un punto del corte para ver a dónde lo lleva.'}
        </p>
      </section>

      <section className="m3ds__leyenda" aria-label="El suelo, capa por capa">
        <h2>El suelo, capa por capa</h2>
        <ol>
          {LEYENDA.map((p) => (
            <li key={p.titulo}>
              <span className="m3ds__emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="m3ds__cierre">
          Un suelo vivo no se compra: se cría. Devuélvale la hojarasca, no lo
          deje desnudo y déjelo descansar — la vida vuelve sola. Empiece por
          mirar su tierra: color, olor y tacto ya le cuentan cómo está.
        </p>
      </section>
    </main>
  );
}
