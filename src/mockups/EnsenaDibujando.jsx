/*
 * i18n (ADR-050): copy de campo en español Colombia (usted). Es un MOCKUP de
 * galería con datos de muestra, sin gate ni auth; el copy final migraría a
 * src/config/messages.js — mismo criterio que los otros mockups de la galería.
 */
import { useState } from 'react';
import { ArrowLeft, RotateCcw, Sprout } from 'lucide-react';
import LaminaMilpa from './laminas/LaminaMilpa.jsx';
import LaminaRotacion from './laminas/LaminaRotacion.jsx';
import LaminaPisoTermico from './laminas/LaminaPisoTermico.jsx';
import '../visual/effects/effects.css';
import './ensena-dibujando.css';

/**
 * EnsenaDibujando — MOONSHOT "el agente enseña dibujando".
 *
 * En vez de responder con un párrafo, el agente RESPONDE CON UNA LÁMINA que se
 * dibuja sola frente al campesino, más dos o tres frases en habla de campo. El
 * campesino pregunta ("¿por qué siembro el maíz con el frijol?") y ve nacer el
 * dibujo: la milpa, la rotación de la era, o el piso térmico de su montaña.
 *
 * Reusa la librería de EFECTOS (`src/visual/effects`, auto-dibujado AutoDibujo +
 * effects.css) y la casa de láminas de cuaderno de campo. El auto-dibujado se
 * re-dispara al re-montar la lámina (cambiar de concepto o "dibujar otra vez").
 *
 * Dirección educativa de Chagra: se enseña a OBSERVAR, no a ganar puntos. Cada
 * respuesta cierra invitando a mirar la mata, no a subir de nivel. Sin
 * gamificación, sin medallas. Tono usted colombiano.
 *
 * Ruta pública `#/mockups/ensena-dibujando` (sin auth, datos de muestra).
 *
 * @param {Object} props
 * @param {Function} [props.onBack] volver al dashboard.
 */

// Los tres conceptos de muestra. `pregunta` es lo que teclea/dice el campesino;
// el agente responde con la `Lamina` (se dibuja sola) + `frases` + `observa`.
const CONCEPTOS = [
  {
    id: 'asociacion',
    chip: 'Asociación',
    pregunta: '¿Por qué me dicen que siembre el maíz junto con el frijol?',
    titulo: 'La milpa: tres que se ayudan',
    Lamina: LaminaMilpa,
    frases: [
      'El maíz crece derecho y alto: le sirve de tutor al frijol para que trepe sin necesidad de vara.',
      'El frijol, en sus raíces, agarra el nitrógeno del aire y se lo devuelve a la tierra que el maíz gasta.',
      'La calabaza, con sus hojas anchas, tapa el suelo: guarda la humedad y no deja crecer la maleza.',
    ],
    observa: 'Fíjese cómo el frijol busca el tallo del maíz para subir. Esa sociedad la lleva haciendo la milpa desde hace siglos.',
  },
  {
    id: 'rotacion',
    chip: 'Rotación',
    pregunta: 'Ya coseché el tomate en esta era, ¿qué siembro ahora ahí?',
    titulo: 'La rotación: cambie de familia',
    Lamina: LaminaRotacion,
    frases: [
      'No repita la misma familia en la era: cada cultivo le pide y le devuelve algo distinto al suelo.',
      'Detrás de una de hoja o de fruto, que gastan mucho, siembre una leguminosa (fríjol, haba): esa repone el nitrógeno.',
      'La de raíz, como la zanahoria, afloja la tierra en lo hondo y deja la era lista para la siguiente.',
    ],
    observa: 'Lleve el orden en la bitácora: mirando qué sembró antes en cada era, va aprendiendo cómo descansa su tierra.',
  },
  {
    id: 'piso',
    chip: 'Piso térmico',
    pregunta: 'Mi finca está a 1.800 metros, ¿qué se da bien por aquí?',
    titulo: 'El piso térmico: la altura manda',
    Lamina: LaminaPisoTermico,
    frases: [
      'A esa altura usted está en piso templado: aquí se dan bien el café, los cítricos y el maíz.',
      'Más abajo, en lo cálido, es tierra de plátano, yuca y cacao; más arriba, en lo frío, la papa, la cebolla y la arveja.',
      'Pasando el páramo ya no se siembra: eso se cuida, porque es la fábrica de agua de todos.',
    ],
    observa: 'Camine su ladera: donde cambia el frío y la neblina, cambia lo que le va a prender. La altura se lo enseña.',
  },
];

export default function EnsenaDibujando({ onBack = () => {} } = {}) {
  const [conceptoId, setConceptoId] = useState('asociacion');
  // `nonce` re-monta la lámina para volver a dispararle el auto-dibujado sin
  // cambiar de concepto ("dibujar otra vez").
  const [nonce, setNonce] = useState(0);
  const concepto = CONCEPTOS.find((c) => c.id === conceptoId) ?? CONCEPTOS[0];
  const { Lamina } = concepto;

  const elegir = (id) => {
    setConceptoId(id);
    setNonce((n) => n + 1);
  };

  return (
    <div className="ed-root">
      <header className="ed-top">
        <button type="button" className="ed-back" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Volver</span>
        </button>
        <div className="ed-title-wrap">
          <h1 className="ed-title">El agente enseña dibujando</h1>
          <p className="ed-sub">Usted pregunta; en vez de un párrafo, el agente le hace la lámina y se la va dibujando.</p>
        </div>
      </header>

      {/* selector de concepto */}
      <nav className="ed-chips" aria-label="Escoja qué le explican">
        {CONCEPTOS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`ed-chip${c.id === conceptoId ? ' ed-chip--on' : ''}`}
            aria-pressed={c.id === conceptoId}
            onClick={() => elegir(c.id)}
          >
            {c.chip}
          </button>
        ))}
      </nav>

      {/* conversación */}
      <div className="ed-chat">
        {/* la pregunta del campesino */}
        <div className="ed-msg ed-msg--user">
          <div className="ed-bubble ed-bubble--user">{concepto.pregunta}</div>
        </div>

        {/* la respuesta del agente: la lámina que se dibuja sola + las frases */}
        <div className="ed-msg ed-msg--agent">
          <div className="ed-avatar" aria-hidden="true"><Sprout size={18} /></div>
          <div className="ed-bubble ed-bubble--agent">
            <p className="ed-lamina-tit">{concepto.titulo}</p>
            <figure className="ed-lamina" key={`${concepto.id}-${nonce}`}>
              <Lamina className="ed-lamina-svg" />
            </figure>
            <ul className="ed-frases">
              {concepto.frases.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
            <p className="ed-observa">
              <span className="ed-observa-tag">Para observar</span>
              {concepto.observa}
            </p>
            <button type="button" className="ed-redraw" onClick={() => setNonce((n) => n + 1)}>
              <RotateCcw size={14} aria-hidden="true" />
              Dibujar otra vez
            </button>
          </div>
        </div>
      </div>

      <footer className="ed-foot">
        Chagra no le da puntos ni medallas por preguntar: le dibuja para que
        <strong> aprenda mirando</strong>. La lámina es la excusa para ir al surco y observar.
      </footer>
    </div>
  );
}
