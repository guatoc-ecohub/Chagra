/*
 * Mundo3DBosque — vitrina pública de la LADERA ANDINA / PISOS TÉRMICOS
 * (ruta #/mockups/mundo3d-bosque).
 *
 * La montaña en corte vertical: se sube del cálido al páramo y en cada piso
 * crece lo suyo — la altura manda. Cálido (plátano y frutales) → templado (café
 * y maíz) → frío (papa) → páramo (frailejón y la niebla que capta agua, zona que
 * se cuida, no se ara). Trae una señal SUTIL de cambio climático: los pisos
 * suben de a poco (termofilización), sin catástrofe. Didáctico y esperanzador —
 * menos colapso, finca viva.
 *
 * NO reimplementa nada: monta `<Mundo mundoId="pisos">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`) sobre el
 * arquetipo `estratos` reparametrizado a 4 pisos. En equipo humilde (o con
 * "menos movimiento") se ve el gemelo 2D digno con las mismas bandas térmicas;
 * en gama media/alta, el diorama 3D low-poly (chunk perezoso `vendor-three`) con
 * la abeja Angelita entrando al mundo. Los puntos de la ladera son las mismas
 * puertas del registro: aquí (vitrina sin sesión) muestran a qué pantalla real
 * de la app llevan, en vez de navegar.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en
 * español de Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { MUNDO, decidirTier, permite3D } from '../visual/mundo3d/index.js';
import './Mundo3DBosque.css';

const TINTE = ['#4f8f7d', '#e6efe9'];

/* La ladera, piso por piso — la misma data del registro (mundoData.js), contada
   en una leyenda didáctica y verificada. */
const LEYENDA = [
  { emoji: '🌴', titulo: 'Cálido · 0–1.000 m', texto: 'Lo bajo y caliente: plátano, cacao, cítricos y ahuyama. El calor abundante manda; se cosecha casi todo el año.' },
  { emoji: '☕', titulo: 'Templado · 1.000–2.000 m', texto: 'El piso del café de sombra, el aguacate y la caña. Ni mucho calor ni mucho frío: aquí la finca da lo más conocido.' },
  { emoji: '🥔', titulo: 'Frío · 2.000–3.000 m', texto: 'La papa, el maíz criollo, el fríjol, la uchuva y la mora. Fresco y de noches largas: sabores que sólo dan en la altura.' },
  { emoji: '🏔️', titulo: 'Páramo · 3.000–4.200 m', texto: 'El frailejón y la niebla que capta el agua para toda la finca de abajo. No se ara: se cuida. Es la fábrica de agua de la montaña.' },
  { emoji: '🌡️', titulo: 'Los pisos suben', texto: 'Con el calentamiento, cada piso trepa de a poco: lo que hoy da en su altura, mañana da un poco más arriba. No es catástrofe — es una señal para observar y acompañar el páramo.' },
];

export default function Mundo3DBosque() {
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

  // En la vitrina (sin sesión) un punto de la ladera no navega: cuenta a qué
  // pantalla real de la app lleva esa puerta.
  const [puerta, setPuerta] = useState(null);
  const onHotspot = (view, data) => {
    const hs = (MUNDO.pisos.hotspots || []).find(
      (h) => h.view === view && (h.data === data || (!h.data && !data)),
    ) || (MUNDO.pisos.hotspots || []).find((h) => h.view === view);
    setPuerta({ label: hs?.label || view, view });
  };

  return (
    <main
      className="m3db"
      style={{ '--m3db-a': TINTE[0], '--m3db-b': TINTE[1] }}
    >
      <header className="m3db__head">
        <p className="m3db__kicker">Los mundos de su finca · vitrina</p>
        <h1>La ladera y sus pisos</h1>
        <p className="m3db__lema">
          Suba por la montaña: del cálido al páramo, cada piso con lo suyo. La
          altura manda qué se siembra. Menos colapso, finca viva.
        </p>
      </header>

      <section className="m3db__escena" aria-label="La ladera andina y sus pisos térmicos">
        <Mundo
          mundoId="pisos"
          tier={tier}
          reducedMotion={reducedMotion}
          onHotspot={onHotspot}
          onSalir={null}
          animo="sereno"
          energia={0.85}
        />
        <div className="m3db__barra">
          <p className="m3db__tier">
            {tier === 'bajo'
              ? 'Está viendo el dibujo de la ladera (va parejo en cualquier equipo).'
              : 'Está viendo el diorama 3D. Puede girarlo con el dedo.'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="m3db__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver en 3D' : 'Ver el dibujo 2D'}
            </button>
          )}
        </div>
        <p className="m3db__nota" role="status" aria-live="polite">
          {puerta
            ? `«${puerta.label}» es una puerta real: dentro de la app abre la pantalla «${puerta.view}».`
            : 'Toque un piso de la ladera para ver a dónde lo lleva.'}
        </p>
      </section>

      <section className="m3db__leyenda" aria-label="La ladera, piso por piso">
        <h2>La ladera, piso por piso</h2>
        <ol>
          {LEYENDA.map((p) => (
            <li key={p.titulo}>
              <span className="m3db__emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="m3db__cierre">
          No pelee con la altura: acompáñela. Mire a qué piso pertenece su finca y
          siembre lo que ese piso pide — y cuide el páramo de arriba, que es el que
          le manda el agua. Empiece por saber su altura.
        </p>
      </section>
    </main>
  );
}
