import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Zariguya } from '../src/visual/creatures/Zariguya.jsx';
import ZariguyaTrazado from '../src/visual/creatures/ZariguyaTrazado.jsx';
import ZariguyaHuesos from '../src/visual/creatures/ZariguyaHuesos.jsx';
import ZariguyaGeminiLaminaViva from '../src/visual/creatures/ZariguyaGeminiLaminaViva.jsx';
import './styles.css';

/* Galería de DECISIÓN de la zarigüeya — ESPEJO de jaguar.guatoc.co (misma
   estructura: article.card / .card-head / .badge / .stage / .controls,
   la MISMA hoja de estilos). No es la vitrina comparativa de estados: es la
   página que el operador usa para aprobar UNA variante e ignorar el resto. */

function Badge({ tone, children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Controls({ opciones, valor, onChange }) {
  return (
    <div className="controls">
      {opciones.map((op) => (
        <button
          key={op}
          type="button"
          className={op === valor ? 'on' : ''}
          onClick={() => onChange(op)}
        >
          {op}
        </button>
      ))}
    </div>
  );
}

function Card({ id, titulo, sub, badge, badgeTone, featured, archivar, nota, controls, children }) {
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

/* ── Featured: la DEFINITIVA ────────────────────────────────────────────── */
function CardTrazado() {
  const opciones = ['idle', 'caminando'];
  const [estado, setEstado] = useState('idle');
  return (
    <Card
      id="v-trazado"
      titulo="Zarigüeya trazado (tinta)"
      sub="ZariguyaTrazado.jsx · estilo tinta / calco vectorial (vtracer)"
      badge="DEFINITIVA · INTEGRAR"
      badgeTone="ok"
      featured
      nota="ELEGIDA por el operador. Piel calcada automáticamente (vtracer) sobre el mismo esqueleto de huesos — drop-in de ZariguyaHuesos, mismas props. Místico: aparece y desaparece en otro lugar — NO da la vuelta."
      controls={<Controls opciones={opciones} valor={estado} onChange={setEstado} />}
    >
      {/* modo="normal" (fija, no cicla a "actuando"): PROBADO 2026-08-25 —
          el spin `zhAnticVuelta` (rotate -338deg de TODO el cuerpo, ciclo
          9.7s) revela huecos reales de fondo (background asomando) en las
          junturas cuello/cabeza/manoLapiz al congelar el frame; el sistema
          anti-costura (casqueteCalco) cubre el balanceo NORMAL de cada
          hueso, no una rotación del cuerpo ENTERO de 90-338°. Confirmado con
          el MISMO forzado de transform en JaguarTrazado.jsx (jaguar-galeria,
          rama chagra-merge-dev): mismo rig, mismo hueco — no es un bug del
          calco nuevo de esta tarea. Se apaga SOLO en esta galería de
          decisión para que el operador juzgue encuadre/calco sin el glitch;
          NO se toca la CSS canónica de producción (zariguyaHuesos.css). */}
      <ZariguyaTrazado estado={estado} modo="normal" size={320} animated title="Zarigüeya trazado" />
    </Card>
  );
}

/* ── Rubber-hose: ARCHIVAR (poses reales del componente) ──────────────── */
function CardNatural() {
  const opciones = ['anda', 'celebra', 'reposo', 'señala'];
  const [pose, setPose] = useState('anda');
  return (
    <Card
      id="v-natural"
      titulo="Zarigüeya natural (rubber-hose)"
      sub="Zariguya.jsx · rig rubber-hose, crías al lomo"
      badge="ARCHIVAR / BORRAR"
      badgeTone="bad"
      archivar
      controls={<Controls opciones={opciones} valor={pose} onChange={setPose} />}
    >
      <Zariguya size={260} pose={pose} animated title="Zarigüeya natural" />
    </Card>
  );
}

/* ── Genérica ARCHIVAR (mismo patrón que la featured: idle/caminando) ──── */
function CardArchivar({ id, titulo, sub, Comp, size = 240, modo }) {
  const opciones = ['idle', 'caminando'];
  const [estado, setEstado] = useState('idle');
  const extra = modo ? { modo } : null;
  return (
    <Card
      id={id}
      titulo={titulo}
      sub={sub}
      badge="ARCHIVAR / BORRAR"
      badgeTone="bad"
      archivar
      controls={<Controls opciones={opciones} valor={estado} onChange={setEstado} />}
    >
      <Comp estado={estado} size={size} animated title={titulo} {...extra} />
    </Card>
  );
}

function App() {
  return (
    <>
      <header className="top">
        <p className="eyebrow">Chagra · compAI</p>
        <h1>Galería de la Zarigüeya — decisión: TRAZADO es la definitiva</h1>
        <p className="lead">
          Decisión del operador (2026-08-25): <strong>ZariguyaTrazado (tinta)</strong> es la
          variante DEFINITIVA — se integra al roster compAI, mismo patrón que JaguarTrazado.
          Místico: <strong>aparece y desaparece</strong> en otro lugar, NO da la vuelta. Las demás
          quedan marcadas para ARCHIVAR/BORRAR (requiere rewiring previo).
        </p>
      </header>

      <section className="grid">
        <CardTrazado />
        <CardNatural />
        <CardArchivar
          id="v-huesos"
          titulo="Zarigüeya huesos"
          sub="ZariguyaHuesos.jsx · rig visible (dependencia interna de Trazado)"
          Comp={ZariguyaHuesos}
          modo="normal"
        />
        <CardArchivar
          id="v-lamina"
          titulo="Zarigüeya lámina viva (PNG Gemini)"
          sub="ZariguyaGeminiLaminaViva.jsx · set Gemini aprobado (2026-08-23), PNG en capas"
          Comp={ZariguyaGeminiLaminaViva}
        />
      </section>

      <footer className="foot">
        <p>
          zarigueya.guatoc.co · galería comparativa · componentes vivos desde{' '}
          <code>src/visual/creatures/</code>
        </p>
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
