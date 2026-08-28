import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ZariguyaTrazado from '../../src/visual/creatures/ZariguyaTrazado.jsx';
import JaguarTrazado from '../../src/visual/creatures/JaguarTrazado.jsx';
import './styles.css';

const ESTADOS = [
  { id: 'idle', etiqueta: 'Idle', nota: 'Respira y husmea' },
  { id: 'caminando', etiqueta: 'Caminando', nota: 'Patas en contrafase' },
  { id: 'speaking', etiqueta: 'Hablando', nota: 'Mandíbula con visema' },
  { id: 'listening', etiqueta: 'Escuchando', nota: 'Orejas atentas' },
];

function EstadoCard({ estado, animado }) {
  return (
    <article className={`rig-card rig-card-${estado.id}`}>
      <div className="rig-card-head">
        <div>
          <p className="eyebrow">Estado</p>
          <h2>{estado.etiqueta}</h2>
        </div>
        <span className="state-dot" aria-hidden="true" />
      </div>
      <div className="rig-stage">
        <ZariguyaTrazado
          estado={estado.id}
          size={250}
          animated={animado}
          modo="normal"
          visema={estado.id === 'speaking' ? 'V3' : null}
          title={`Zarigüeya ${estado.etiqueta}`}
        />
      </div>
      <p className="rig-note">{estado.nota}</p>
      <code>data-agt-estado="{estado.id}"</code>
    </article>
  );
}

function App() {
  const [animado, setAnimado] = useState(true);

  return (
    <main className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Guatoc / laboratorio de presencia</p>
          <h1>Zarigüeya<br /><em>en los huesos.</em></h1>
          <p className="hero-lede">
            Una sola piel, cuatro estados y una marcha que se puede inspeccionar
            sin perder de vista las articulaciones.
          </p>
        </div>
        <div className="hero-mark" aria-hidden="true">
          <span>ZT</span>
          <i />
        </div>
      </header>

      <section className="control-bar" aria-label="Controles del rig">
        <div>
          <p className="eyebrow">Prueba de movimiento</p>
          <p className="control-caption">La tarjeta caminando revela el ciclo completo.</p>
        </div>
        <button
          type="button"
          className={`toggle ${animado ? 'is-on' : ''}`}
          aria-pressed={animado}
          onClick={() => setAnimado((value) => !value)}
        >
          <span className="toggle-track"><span /></span>
          {animado ? 'Animación activa' : 'Fotograma congelado'}
        </button>
      </section>

      <section className="rig-grid" aria-label="Estados de ZariguyaTrazado">
        {ESTADOS.map((estado) => (
          <EstadoCard key={estado.id} estado={estado} animado={animado} />
        ))}
      </section>

      <section className="walk-check" aria-label="Comparativa de patas">
        <div>
          <p className="eyebrow">Frame check</p>
          <h2>La marcha comparte lenguaje.</h2>
          <p>Jaguar y zarigüeya articulan regiones independientes. El raster queda como referencia de look, no como fotograma.</p>
        </div>
        <div className="walk-pair">
          <div className="walk-animal">
            <JaguarTrazado estado="caminando" size={260} animated={animado} modo="normal" title="Jaguar caminando" />
            <span>Jaguar / patas en secuencia</span>
          </div>
          <div className="walk-animal">
            <ZariguyaTrazado estado="caminando" size={260} animated={animado} modo="normal" title="Zarigüeya caminando" />
            <span>Zarigüeya / patas en contrafase</span>
          </div>
        </div>
      </section>

      <footer>
        <span>zarigueya.guatoc.co</span>
        <span>Rig de huesos · prueba local</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>,
);

export { App, EstadoCard };
