/*
 * i18n (ADR-050): copy de campo en español Colombia (usted). Es un MOCKUP de
 * galería con datos de muestra, sin gate ni auth; el copy final migraría a
 * src/config/messages.js — mismo criterio que los otros mockups de la galería.
 */
import { useState } from 'react';
import { ArrowLeft, RotateCcw, Sprout } from 'lucide-react';
import AgentLamina from '../visual/laminas/AgentLamina.jsx';
import '../visual/effects/effects.css';
import './agente-dibuja.css';

/**
 * AgenteDibuja — vitrina de "el agente DIBUJA en sus respuestas de forma
 * FIABLE" (DR 2026-07-11). Muestra respuestas reales del agente donde, además
 * del texto, viaja un adjunto de lámina que SE DIBUJA SOLA.
 *
 * La pieza clave: cada turno del agente trae un `metadata.lamina = { slug,
 * props }` — EXACTAMENTE el contrato que el backend inyectará. El frontend
 * (AgentLamina) solo lee ese metadata y monta la lámina del conjunto CERRADO
 * `LAMINAS_FIABLES`. El modelo NUNCA emite SVG: elige un slug + una prop de
 * enum. Si el slug no es fiable o la prop no calza, AgentLamina degrada a
 * NADA → la respuesta queda como solo texto (último turno de la demo).
 *
 * Reusa la librería de EFECTOS (auto-dibujado) y la casa de láminas de
 * cuaderno de campo, con la estética del mockup ensena-dibujando.
 *
 * Dirección educativa de Chagra: se enseña a OBSERVAR, no a ganar puntos.
 * Sin gamificación. Tono usted colombiano.
 *
 * Ruta pública `#/mockups/agente-dibuja` (sin auth, datos de muestra).
 *
 * @param {Object} props
 * @param {Function} [props.onBack] volver al dashboard.
 */

// Turnos de muestra. Cada uno imita un mensaje `assistant` REAL: `pregunta`
// (lo que dijo el campesino) + `frases`/`observa` (el texto) + `metadata`
// (donde el backend inyecta `lamina`). El adjunto se dibuja leyendo
// `metadata.lamina` — el mismo camino que tomará ChatBubble en producción.
const TURNOS = [
  {
    id: 'milpa',
    chip: 'Asociación',
    pregunta: '¿Por qué me dicen que siembre el maíz junto con el frijol?',
    frases: [
      'El maíz crece derecho y alto: le sirve de tutor al frijol para que trepe sin necesidad de vara.',
      'El frijol, en sus raíces, agarra el nitrógeno del aire y se lo devuelve a la tierra que el maíz gasta.',
      'La calabaza, con sus hojas anchas, tapa el suelo: guarda la humedad y no deja crecer la maleza.',
    ],
    observa: 'Fíjese cómo el frijol busca el tallo del maíz para subir. Esa sociedad la lleva haciendo la milpa desde hace siglos.',
    metadata: { lamina: { slug: 'milpa', props: {} } },
  },
  {
    id: 'rotacion',
    chip: 'Rotación',
    pregunta: 'Ya coseché el tomate en esta era, ¿qué siembro ahora ahí?',
    frases: [
      'No repita la misma familia en la era: cada cultivo le pide y le devuelve algo distinto al suelo.',
      'Detrás de una de hoja o de fruto, que gastan mucho, siembre una leguminosa (fríjol, haba): esa repone el nitrógeno.',
      'La de raíz, como la zanahoria, afloja la tierra en lo hondo y deja la era lista para la siguiente.',
    ],
    observa: 'Lleve el orden en la bitácora: mirando qué sembró antes en cada era, va aprendiendo cómo descansa su tierra.',
    metadata: { lamina: { slug: 'rotacion', props: {} } },
  },
  {
    id: 'piso',
    chip: 'Piso térmico',
    pregunta: 'Mi finca está a 1.800 metros, ¿qué se da bien por aquí?',
    frases: [
      'A esa altura usted está en piso templado: aquí se dan bien el café, los cítricos y el maíz.',
      'Más abajo, en lo cálido, es tierra de plátano, yuca y cacao; más arriba, en lo frío, la papa, la cebolla y la arveja.',
      'Pasando el páramo ya no se siembra: eso se cuida, porque es la fábrica de agua de todos.',
    ],
    observa: 'Camine su ladera: donde cambia el frío y la neblina, cambia lo que le va a prender. La altura se lo enseña.',
    metadata: { lamina: { slug: 'piso-termico', props: {} } },
  },
  {
    id: 'maiz',
    chip: 'Morfología',
    pregunta: '¿Cuáles son las partes de la mata de maíz?',
    frases: [
      'Arriba de todo va el penacho o espiga: es la flor macho, la que suelta el polen.',
      'La mazorca es la flor hembra; sus barbas (el cabello) atrapan ese polen para que cada grano cuaje.',
      'La caña sube por nudos y las hojas la abrazan con su vaina; abajo, dos clases de raíz la sostienen.',
    ],
    observa: 'Salga a mirar una mata al sol: cuente los nudos y siga una barba hasta su grano. Ahí entiende cómo se hace la mazorca.',
    metadata: { lamina: { slug: 'maiz', props: {} } },
  },
  {
    id: 'mata-etapa',
    chip: 'Ciclo de vida',
    pregunta: 'Mi mata de tomate ya está cargada de fruto, ¿en qué etapa va?',
    frases: [
      'Su mata está en cosecha: la etapa en que los racimos ya cuelgan con el tomate maduro.',
      'Mírela completa: la raíz está honda, el tallo alto y la copa ancha para sostener el peso del fruto.',
      'Coseche parejo y siga observando: cuando afloje la carga, la mata empieza a cerrar su ciclo.',
    ],
    observa: 'Compare esta mata con una juvenil de su misma era: la diferencia entre las dos etapas se la enseña la planta, no el calendario.',
    metadata: { lamina: { slug: 'mata-etapa', props: { etapa: 'cosecha' } } },
  },
  {
    id: 'siembra',
    chip: 'Propagación',
    pregunta: 'Voy a sembrar papa, ¿cómo se pone en la tierra?',
    frases: [
      'La papa se siembra por tubérculo-semilla: entierra la papa entera (o un trozo con sus yemas) y de ahí brota la mata nueva.',
      'No es como la yuca (que va por esqueje) ni como el plátano (que va por colino): cada cultivo tiene su forma.',
      'Deje que el tubérculo verdee unos días antes: con las yemas despiertas, prende más parejo.',
    ],
    observa: 'Marque en la bitácora la fecha de siembra y desentierre una en tres semanas: verá las raíces y los primeros tubérculos formándose.',
    metadata: { lamina: { slug: 'siembra', props: { activo: 'tuberculo' } } },
  },
  {
    id: 'degrada',
    chip: 'Sin lámina',
    pregunta: '¿Cómo se injerta un aguacate?',
    frases: [
      'El injerto de aguacate se hace uniendo una púa de la variedad que usted quiere sobre un patrón resistente.',
      'De esto todavía no tengo una lámina verificada, así que se lo cuento con palabras y le queda mejor verlo con su técnico.',
    ],
    observa: 'Cuando tengamos la lámina del injerto dibujada y revisada, se la mostraré. Por ahora, mejor que un dibujo dudoso es un buen consejo hablado.',
    // El backend pediría 'injerto-aguacate', que NO está en LAMINAS_FIABLES:
    // AgentLamina devuelve null y la respuesta queda como SOLO TEXTO. Es la
    // degradación segura — el agente no inventa un dibujo que no tiene.
    metadata: { lamina: { slug: 'injerto-aguacate', props: {} } },
  },
];

// Un turno del agente: la pregunta del campesino + la respuesta con su lámina.
// `nonce` re-monta la lámina para re-disparar el auto-dibujado ("dibujar otra
// vez") sin tocar el resto del turno.
function Turno({ turno }) {
  const [nonce, setNonce] = useState(0);
  const lamina = turno.metadata?.lamina;

  return (
    <section className="ad-turno" aria-label={`Respuesta: ${turno.chip}`}>
      <div className="ad-msg ad-msg--user">
        <div className="ad-bubble ad-bubble--user">{turno.pregunta}</div>
      </div>

      <div className="ad-msg ad-msg--agent">
        <div className="ad-avatar" aria-hidden="true"><Sprout size={18} /></div>
        <div className="ad-bubble ad-bubble--agent" data-chat-dark="true">
          {/* El adjunto de lámina: se monta SOLO desde metadata.lamina, igual
              que lo hará ChatBubble en producción. Si el slug no es fiable
              (último turno), AgentLamina renderiza null → solo texto. */}
          {lamina && (
            <AgentLamina
              slug={lamina.slug}
              props={lamina.props}
              drawKey={`${turno.id}-${nonce}`}
              className="ad-lamina"
            />
          )}

          <ul className="ad-frases">
            {turno.frases.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>

          <p className="ad-observa">
            <span className="ad-observa-tag">Para observar</span>
            {turno.observa}
          </p>

          {/* El contrato que consume el frontend, a la vista del operador. */}
          <p className="ad-meta">
            <span className="ad-meta-tag">metadata.lamina</span>
            <code>{JSON.stringify(lamina)}</code>
          </p>

          {lamina && (
            <button type="button" className="ad-redraw" onClick={() => setNonce((n) => n + 1)}>
              <RotateCcw size={14} aria-hidden="true" />
              Dibujar otra vez
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default function AgenteDibuja({ onBack } = {}) {
  return (
    <div className="ad-root">
      <header className="ad-top">
        <button type="button" className="ad-back" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Volver</span>
        </button>
        <div className="ad-title-wrap">
          <h1 className="ad-title">El agente dibuja en sus respuestas</h1>
          <p className="ad-sub">
            Cuando lo que usted pregunta tiene una lámina verificada, el agente
            se la adjunta y se la va dibujando. Nunca inventa el dibujo: elige de
            un conjunto cerrado o no dibuja nada.
          </p>
        </div>
      </header>

      <div className="ad-chat">
        {TURNOS.map((t) => (
          <Turno key={t.id} turno={t} />
        ))}
      </div>

      <footer className="ad-foot">
        Chagra no le da puntos ni medallas por preguntar: le dibuja para que
        <strong> aprenda mirando</strong>. Y si no tiene la lámina verificada,
        se lo dice con palabras — <strong>antes que dibujarle algo dudoso</strong>.
      </footer>
    </div>
  );
}
