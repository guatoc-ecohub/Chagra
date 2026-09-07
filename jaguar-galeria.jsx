/*
  jaguar-galeria.jsx — Galería comparativa de las variantes del jaguar.
  DECISIÓN DEL OPERADOR (2026-08-24): JaguarTrazado es la DEFINITIVA — se
  integra y Angelita se aproxima a este estilo. Las demás quedan marcadas
  para ARCHIVAR/BORRAR (tras rewiring; ver plan). Comportamiento místico:
  el jaguar NO da la vuelta; aparece y desaparece en otro lugar.
  Entry aislado (vite.galeria.config.js) para jaguar.guatoc.co.
*/
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Jaguar } from './src/visual/creatures/Jaguar.jsx';
import JaguarTrazado from './src/visual/creatures/JaguarTrazado.jsx';
import JaguarHuesos from './src/visual/creatures/JaguarHuesos.jsx';
import JaguarLaminaViva from './src/visual/creatures/JaguarLaminaViva.jsx';

function Badge({ tone, children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Controls({ opciones, valor, onChange }) {
  return (
    <div className="controls">
      {opciones.map((o) => (
        <button key={o} type="button" className={o === valor ? 'on' : ''} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Card({ id, titulo, sub, badge, badgeTone, featured, archivar, nota, children, controls }) {
  return (
    <article className={`card${featured ? ' featured' : ''}${archivar ? ' archivar' : ''}`} id={id}>
      <div className="card-head">
        <div>
          <h2>{titulo}</h2>
          <p className="sub">{sub}</p>
        </div>
        <Badge tone={badgeTone}>{badge}</Badge>
      </div>
      <div className="stage">{children}</div>
      {nota ? <p className="nota">{nota}</p> : null}
      {controls}
    </article>
  );
}

function CardTrazado() {
  const estados = ['idle', 'ruge'];
  const [estado, setEstado] = useState('idle');
  return (
    <Card
      id="v-trazado"
      titulo="Jaguar trazado (tinta)"
      sub="JaguarTrazado.jsx · estilo tinta / calco vectorial"
      badge="DEFINITIVA · INTEGRAR"
      badgeTone="ok"
      featured
      nota="ELEGIDA por el operador. Angelita se aproxima a este estilo. Místico: aparece y desaparece en otro lugar — NO da la vuelta."
      controls={<Controls opciones={estados} valor={estado} onChange={setEstado} />}
    >
      <JaguarTrazado estado={estado} size={320} animated title="Jaguar trazado" />
    </Card>
  );
}

function CardEstado({ id, titulo, sub, badge, badgeTone, Comp, size = 240 }) {
  const estados = ['idle', 'ruge'];
  const [estado, setEstado] = useState('idle');
  return (
    <Card
      id={id}
      titulo={titulo}
      sub={sub}
      badge={badge}
      badgeTone={badgeTone}
      archivar
      controls={<Controls opciones={estados} valor={estado} onChange={setEstado} />}
    >
      <Comp estado={estado} size={size} animated title={titulo} />
    </Card>
  );
}

function CardNatural() {
  const poses = ['anda', 'camina', 'reposo', 'celebra', 'señala'];
  const [pose, setPose] = useState('camina');
  return (
    <Card
      id="v-natural"
      titulo="Jaguar natural (rubber-hose)"
      sub="Jaguar.jsx · rig rubber-hose frontal/lateral"
      badge="ARCHIVAR / BORRAR"
      badgeTone="bad"
      archivar
      controls={<Controls opciones={poses} valor={pose} onChange={setPose} />}
    >
      <Jaguar size={260} pose={pose} animated title="Jaguar natural" />
    </Card>
  );
}

function Galeria() {
  return (
    <>
      <header className="top">
        <p className="eyebrow">Chagra · compAI</p>
        <h1>Galería del Jaguar — decisión: TRAZADO es la definitiva</h1>
        <p className="lead">
          Decisión del operador (2026-08-24): <strong>JaguarTrazado (tinta)</strong> es la
          variante DEFINITIVA — se integra y <strong>Angelita se aproxima a este estilo</strong>.
          Comportamiento místico: <strong>aparece y desaparece</strong> en otro lugar, NO da la
          vuelta. Las demás quedan marcadas para ARCHIVAR/BORRAR (requiere rewiring previo).
        </p>
      </header>

      <section className="grid">
        <CardTrazado />

        <CardNatural />

        <CardEstado
          id="v-huesos"
          titulo="Jaguar huesos"
          sub="JaguarHuesos.jsx · rig visible (dependencia interna de Trazado)"
          badge="ARCHIVAR / BORRAR"
          badgeTone="bad"
          Comp={JaguarHuesos}
        />

        <Card
          id="v-humboldt"
          titulo="Jaguar humboldt (vector)"
          sub="jaguar-humboldt-gate · lámina vectorial estilo Humboldt"
          badge="ARCHIVAR / BORRAR"
          badgeTone="bad"
          archivar
          controls={<p className="hint">Gate independiente embebido.</p>}
        >
          <iframe className="frame" src="./humboldt/index.html" title="Jaguar humboldt vector" loading="lazy" />
        </Card>

        <CardEstado
          id="v-lamina"
          titulo="Jaguar lámina viva (PNG)"
          sub="JaguarLaminaViva.jsx · PNG en 5 capas (avatar compai actual en la app)"
          badge="ARCHIVAR / BORRAR"
          badgeTone="bad"
          Comp={JaguarLaminaViva}
        />
      </section>

      <footer className="foot">
        <p>jaguar.guatoc.co · galería comparativa · componentes vivos desde <code>src/visual/creatures/</code></p>
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(<Galeria />);
