/* eslint-disable react-refresh/only-export-components -- entry de página
   (createRoot al final): no es un módulo de componentes hot-reloadeable. */
/*
 * comparador-vivo — la página de integración compai-antes-despues que se
 * despliega en 3d.guatoc.co/compai-antes-despues.html.
 *
 * Reconstruida del deploy vivo del 2026-08-19 (el entry original se construyó
 * fuera del repo y se perdió; este queda COMMITEADO para que el deploy sea
 * reproducible) y extendida con la orden del operador del mismo día:
 *
 *   «HOY solo el jaguar CAMINA en el estado caminando; los demás rubber-hose
 *    NO. Hacer que TODOS caminen igual que el jaguar.»
 *
 * — TODA Vieja (rubber-hose) recibe su pose/estado de marcha en «caminando»:
 *   ciclo de patas real por hueso (CSS por cadera) + bob del cuerpo. Nada de
 *   translateX ni scaleX(-1) ni deslizar la imagen.
 * — Se suman las tarjetas de ANGELITA y GUACAMAYA (aprobadas tal cual, sin
 *   par «lámina viva»): también caminan — el elenco completo o no era elenco.
 */
import { Component, StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import JaguarLaminaViva from './src/visual/creatures/JaguarLaminaViva.jsx';
import ZariguyaLaminaViva from './src/visual/creatures/ZariguyaLaminaViva.jsx';
import LuciernagaLaminaViva from './src/visual/creatures/LuciernagaLaminaViva.jsx';
import OsoBastonLaminaViva from './src/visual/creatures/OsoBastonLaminaViva.jsx';
import ChivitoPunkLaminaViva from './src/visual/creatures/ChivitoPunkLaminaViva.jsx';

import { Jaguar } from './src/visual/creatures/Jaguar.jsx';
import { Zariguya } from './src/visual/creatures/Zariguya.jsx';
import { Luciernaga } from './src/visual/creatures/Luciernaga.jsx';
import { OsoBaston } from './src/visual/creatures/OsoBaston.jsx';
import { ChivitoPunk } from './src/visual/creatures/ChivitoPunk.jsx';
import { AbejaAngelita } from './src/visual/creatures/AbejaAngelita.jsx';
import { GuacamayaCompai } from './src/visual/creatures/GuacamayaCompai.jsx';

import './comparador-vivo.css';

const ESTADOS = ['idle', 'thinking', 'speaking', 'listening', 'caminando'];

/* Una entrada por personaje. `Vieja` es el rubber-hose que corre hoy en la
   PWA; `Nueva` la lámina viva aprobada (si existe). `viejaProps(estado)`
   traduce el estado conversacional al contrato de cada rig viejo — y en
   «caminando» TODOS marchan: esa es la orden. */
const ELENCO = [
  {
    slug: 'jaguar', nombre: 'Jaguar', emoji: '🐆',
    Nueva: JaguarLaminaViva, Vieja: Jaguar,
    viejaProps: (e) => ({ size: 300, animated: true, pose: e === 'caminando' ? 'camina' : 'anda' }),
    momentos: ['acecha', 'ruge', 'reposo'],
    nota: 'Marcha cuadrúpeda REAL por hueso (jaguarLamina/marcha.js) en «caminando»; el viejo marcha de perfil (rig .jaguar-lado). Idle-cerebro: acecha · ruge · reposo.',
  },
  {
    slug: 'zariguya', nombre: 'Zarigüeya', emoji: '🐀',
    Nueva: ZariguyaLaminaViva, Vieja: Zariguya,
    viejaProps: (e) => ({ size: 300, animated: true, pose: e === 'caminando' ? 'camina' : 'anda' }),
    momentos: ['husmea', 'tanatosis', 'reposo'],
    nota: 'En «caminando» marcha bípeda menuda: patas traseras en ciclo por cadera, cola de contrapeso, crías mecidas. Idle: husmea · tanatosis · reposo.',
  },
  {
    slug: 'luciernaga', nombre: 'Luciérnaga', emoji: '✨',
    Nueva: LuciernagaLaminaViva, Vieja: Luciernaga,
    viejaProps: (e) => ({ size: 300, animated: true, pose: e === 'caminando' ? 'camina' : 'vuela' }),
    momentos: ['destella', 'lee', 'reposo'],
    nota: 'En «caminando» ATERRIZA y anda: seis patas en trípode alternado de insecto, alas a medio gas. Idle: destella · lee · reposo.',
  },
  {
    slug: 'oso', nombre: 'Oso del bastón', emoji: '🐻',
    Nueva: OsoBastonLaminaViva, Vieja: OsoBaston,
    viejaProps: (e) => ({ size: 300, animated: true, pose: e === 'caminando' ? 'camina' : 'anda' }),
    momentos: ['florece', 'resopla', 'reposo'],
    nota: 'Paso pesado de plantígrado con bastón que planta a contratiempo — zancada ampliada para que la marcha se LEA. Idle: florece · resopla · reposo.',
  },
  {
    slug: 'chivito', nombre: 'Chivito punk', emoji: '🐐',
    Nueva: ChivitoPunkLaminaViva, Vieja: ChivitoPunk,
    viejaProps: (e) => ({ size: 300, state: e }),
    momentos: ['apunta', 'rockea', 'reposo'],
    nota: 'En «caminando» saca sus patitas manguera (el rig del valle vive flotando) y marcha zumbando. Idle: apunta · rockea · reposo.',
  },
  {
    slug: 'angelita', nombre: 'Abeja angelita', emoji: '🐝',
    Nueva: null, Vieja: AbejaAngelita,
    viejaProps: (e) => ({ size: 300, animated: true, pose: e === 'caminando' ? 'camina' : 'vuela' }),
    momentos: [],
    nota: 'Aprobada tal cual (sin par de lámina) — y también camina: patitas en ciclo por cadera, bracitos en contratiempo, alitas zumbando.',
  },
  {
    slug: 'guacamaya', nombre: 'Guacamaya', emoji: '🦜',
    Nueva: null, Vieja: GuacamayaCompai,
    viejaProps: (e) => ({ size: 300, state: e }),
    momentos: [],
    nota: 'Aprobada tal cual (sin par de lámina) — y también camina: bamboleo de loro con patas manguera en ciclo, cola larga de contrapeso.',
  },
];

class Muro extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) {
      return <div className="err">✗ {this.props.slug}: {String(this.state.err.message || this.state.err)}</div>;
    }
    return this.props.children;
  }
}

function Tarjeta({ c }) {
  const [estado, setEstado] = useState('idle');
  const [vida, setVida] = useState(null);
  const Nueva = c.Nueva;
  const Vieja = c.Vieja;
  const ponerEstado = (e) => { setVida(null); setEstado(e); };
  const ponerVida = (m) => {
    setEstado('idle');
    setVida(null);
    requestAnimationFrame(() => setVida(m));
  };
  const extra = vida ? { 'data-vida': vida } : {};
  return (
    <section className="par">
      <h3>{c.emoji} {c.nombre} <code>{c.slug}</code></h3>
      <div className="dos">
        <div className="panel">
          <span className="etq">{Nueva ? 'ANTES · rubber-hose' : 'RUBBER-HOSE · aprobada tal cual'}</span>
          <div className="lienzo">
            <Muro slug={`${c.slug}-viejo`}>
              <Vieja {...c.viejaProps(estado)} />
            </Muro>
          </div>
        </div>
        {Nueva && (
          <div className="panel">
            <span className="etq v">DESPUÉS · lámina viva</span>
            <div className="lienzo">
              <Muro slug={`${c.slug}-nuevo`}>
                <Nueva estado={estado} animated size={320} title={c.nombre} {...extra} />
              </Muro>
            </div>
          </div>
        )}
      </div>
      <div className="ctrl">
        <div className="grupo">
          <b>estado</b>
          {ESTADOS.map((e) => (
            <button key={e} className={estado === e && !vida ? 'on' : ''} onClick={() => ponerEstado(e)}>{e}</button>
          ))}
        </div>
        {c.momentos.length > 0 && (
          <div className="grupo mom">
            <b>momentos idle</b>
            {c.momentos.map((m) => (
              <button key={m} className={vida === m ? 'on' : ''} onClick={() => ponerVida(m)}>{m}</button>
            ))}
          </div>
        )}
      </div>
      <p className="linea">
        data-agt-estado=<em>{estado}</em>
        {vida ? <> · data-vida=<em>{vida}</em></> : null}
        {' · '}<span>{c.nota}</span>
      </p>
    </section>
  );
}

/* ?solo=slug — un solo personaje a pantalla llena (para gates y capturas).
   Usa la lámina viva si existe; si el personaje no tiene par (angelita,
   guacamaya), monta su rubber-hose con el mismo estado. */
function Solo({ slug }) {
  const c = ELENCO.find((x) => x.slug === slug) || ELENCO[0];
  const q = new URLSearchParams(location.search);
  const animated = q.get('anim') !== '0';
  const estado = q.get('estado') || 'idle';
  const vida = q.get('vida') || null;
  const extra = vida ? { 'data-vida': vida } : {};
  const Nueva = c.Nueva;
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#12262e' }}>
      <Muro slug={`${c.slug}-solo`}>
        {Nueva
          ? <Nueva estado={estado} animated={animated} size={440} title={c.nombre} {...extra} />
          : <c.Vieja {...c.viejaProps(estado)} size={440} />}
      </Muro>
    </div>
  );
}

function Pagina() {
  const solo = new URLSearchParams(location.search).get('solo');
  if (solo) return <Solo slug={solo} />;
  return (
    <div className="env">
      <header className="top">
        <h1>compAI — antes / después, con su comportamiento completo</h1>
        <p className="lema">La lámina dejó de ser un cuadro: ahora respira, parpadea, cambia el peso de pata y camina — y en «caminando» camina TODO el elenco.</p>
        <p>
          A la izquierda, el compai <b>rubber-hose</b> anterior. A la derecha, la <b>lámina viva</b> aprobada:
          el mismo componente React que corre en el valle, vivo, con su vida 30/70 y —en el jaguar— la marcha
          cuadrúpeda real por hueso. Los botones cambian el <code>estado</code> conversacional; los «momentos
          idle» fuerzan, uno a uno, los micro-gestos que el propio CSS del rig declara. En <code>caminando</code> cada
          rubber-hose mueve las patas en ciclo de marcha real (rotación por cadera + bob del cuerpo, CSS puro) —
          nunca un <code>translateX</code> falso ni un espejo.
        </p>
        <div className="migas">
          <code>src/visual/creatures/*LaminaViva.jsx</code>
          <code>marcha rubber-hose: rama fable/marcha-rubberhose-todos</code>
          <code>jaguar @ 835c30cbb</code>
          <code>oso @ b4de816f1</code>
          <code>chivito @ 6915647b5</code>
        </div>
        <div className="dial">
          <b>El 30/70:</b> <span className="b30">30 %</span> ACTUANDO (expresión rubber-hose cuando escucha,
          piensa o habla) · <span className="b70">70 %</span> QUIETO pero VIVO — respira, parpadea a su aire,
          el idle-cerebro dispara sus micro-gestos solo. Déjalo en <code>idle</code> y verás correr el 70 %.
        </div>
      </header>
      {ELENCO.map((c) => <Tarjeta c={c} key={c.slug} />)}
      <footer>
        Página de integración — se despliega como <code>~/demos/3d/compai-antes-despues.html</code>.
        Cada lámina viva se monta como el componente React aprobado, sin recorte ni fake; el caminar del
        jaguar es el gait por hueso de <code>jaguarLamina/marcha.js</code> y el de los rubber-hose es ciclo
        CSS por cadera (<code>creatures.css</code>). Assets base en <code>/compai/laminas/</code>.
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode><Pagina /></StrictMode>,
);
