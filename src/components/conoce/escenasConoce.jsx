/* eslint-disable react-refresh/only-export-components -- ESCENAS es el guion
 * (data) del tour y exporta junto a los visuales que referencia; el tour en
 * sí (ConoceChagra.jsx) queda limpio para fast-refresh. */
/**
 * escenasConoce — las 7 ESCENAS del recorrido "Conoce Chagra" + sus visuales.
 *
 * Separado de ConoceChagra.jsx para que el componente-pantalla exporte SOLO
 * componentes (react-refresh/only-export-components) y para que el copy y los
 * visuales se lean como lo que son: el guion del tour.
 *
 * Cada visual es JSX/SVG propio, theme-aware vía tokens (--t-accent-rgb /
 * --c-* — ver conoce-chagra.css). Sin assets externos: el tour pesa lo que
 * pesa su código. La escena de mundos importa los MUNDOS REALES
 * (mundosFinca.js): si un mundo se renombra o se va, el tour lo refleja solo.
 */
import React from 'react';
import {
  Mic, Check, WifiOff, Sun, Smartphone, BookOpenCheck,
} from 'lucide-react';
import ManoChagraGlyph from '../dashboard/ManoChagraGlyph.jsx';
import { MUNDOS_FINCA } from '../dashboard/mundosFinca.js';
/** 1 · La mano de Chagra en su anillo-semilla, con los nodos de la red. */
function VisualMano() {
  // 6 nodos que brotan sobre el borde del anillo (la red de capacidades):
  // posicionados por trigonometría sobre el radio del círculo (50% del lado).
  const nodos = [15, 75, 140, 200, 262, 322];
  return (
    <div className="cnc-mano" aria-hidden="true">
      <ManoChagraGlyph size={92} />
      {nodos.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const s = Math.sin(rad).toFixed(4);
        const c = Math.cos(rad).toFixed(4);
        return (
          <i
            key={deg}
            className="cnc-nodo"
            style={{
              left: `calc(50% + 50% * ${s})`,
              top: `calc(50% - 50% * ${c})`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}
    </div>
  );
}

/** 2 · El agente: mini-conversación con cita de fuente. */
function VisualAgente() {
  return (
    <div className="cnc-chat" aria-hidden="true">
      <div className="cnc-burbuja cnc-burbuja--yo">
        ¿Qué le echo al frijol pa&apos; la mosca blanca?
      </div>
      <div className="cnc-burbuja cnc-burbuja--chagra">
        Revise el envés de las hojas. Para mosca blanca sirve el jabón
        potásico y sembrar barreras que atraigan a sus enemigos naturales.
        <span className="cnc-fuente">
          <BookOpenCheck size={13} aria-hidden="true" /> Fuente verificada · catálogo Chagra
        </span>
      </div>
    </div>
  );
}

/** 3 · El semáforo de confianza científica (texto en cada fila: no color-only). */
function VisualSemaforo() {
  const filas = [
    ['cnc-luz--verde', 'Validado', 'Con estudios o probado en campo.'],
    ['cnc-luz--ambar', 'Documentado', 'Hay fuente; úselo con criterio.'],
    ['cnc-luz--rojo', 'Sin respaldo', 'Chagra prefiere decir «no sé» antes que inventar.'],
  ];
  return (
    <div className="cnc-semaforo">
      {filas.map(([luz, titulo, desc]) => (
        <div key={titulo} className="cnc-semaforo-fila">
          <i className={`cnc-luz ${luz}`} aria-hidden="true" />
          <div>
            <b>{titulo}</b>
            <small>{desc}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 4 · Los mundos REALES de la finca (fuente única: mundosFinca.js). */
function VisualMundos() {
  return (
    <div className="cnc-mundos">
      {MUNDOS_FINCA.map((m, i) => (
        <div
          key={m.id}
          className="cnc-mundo"
          data-testid={`cnc-mundo-${m.id}`}
          style={{ '--cnc-mundo-a': m.tinte?.[0], '--cnc-mundo-b': m.tinte?.[1], '--cnc-i': i }}
        >
          <span aria-hidden="true">{m.emoji}</span>
          <small>{m.titulo}</small>
        </div>
      ))}
    </div>
  );
}

/** 5 · La voz: micrófono, ondas y un registro que queda anotado. */
function VisualVoz() {
  const ondas = [10, 18, 12, 22, 14, 20, 9];
  return (
    <div className="cnc-voz" aria-hidden="true">
      <div className="cnc-mic"><Mic size={36} /></div>
      <div className="cnc-ondas">
        {ondas.map((h, i) => (
          <i key={i} className="cnc-onda" style={{ '--cnc-h': h, '--cnc-i': i }} />
        ))}
      </div>
      <div className="cnc-registro">
        <Check size={20} className="cnc-check" />
        <span>&laquo;Sembré 20 matas de frijol en la era 3&raquo; — anotado en su cuaderno.</span>
      </div>
    </div>
  );
}

/** 6 · Off-grid: el monte, el sol y el panel solar — SVG propio (rsvg-safe). */
function VisualOffgrid() {
  return (
    <div className="cnc-voz" aria-hidden="true">
      <svg className="cnc-monte" viewBox="0 0 320 150" role="img">
        <rect width="320" height="150" fill="#0d1f1a" />
        {/* cielo estrellado sutil */}
        <g fill="#9fd9c3" opacity="0.6">
          <circle cx="36" cy="22" r="1.4" /><circle cx="92" cy="14" r="1.1" />
          <circle cx="150" cy="26" r="1.3" /><circle cx="212" cy="12" r="1.1" />
        </g>
        {/* sol/luna de la madrugada campesina */}
        <circle cx="262" cy="34" r="17" fill="#f2b441" />
        <circle cx="262" cy="34" r="10.5" fill="#ffd98a" />
        {/* cordillera */}
        <path d="M-4 108 L58 56 L108 96 L168 44 L226 98 L288 62 L324 96 V150 H-4 Z" fill="#1d4636" />
        <path d="M-4 122 L44 92 L116 122 L190 86 L258 120 L324 100 V150 H-4 Z" fill="#2e6b4f" />
        {/* la casita de la finca con su panel solar */}
        <g>
          <rect x="128" y="102" width="42" height="26" rx="2" fill="#3b2b1d" />
          <path d="M122 104 L149 86 L176 104 Z" fill="#5a422c" />
          {/* panel solar sobre el techo */}
          <rect x="138" y="88" width="22" height="10" rx="1.5" fill="#1e3a5f" stroke="#9fd9c3" strokeWidth="1" transform="rotate(-18 149 93)" />
          <rect x="141" y="112" width="9" height="16" fill="#20140b" />
          {/* ventana con luz prendida (energía propia) */}
          <rect x="156" y="110" width="8" height="8" fill="#ffd98a" />
        </g>
        {/* señal tachada, honesta */}
        <g transform="translate(38 96)">
          <circle r="14" fill="#0d1f1a" stroke="#9fd9c3" strokeWidth="1.4" />
          <path d="M-6 2 a8.5 8.5 0 0 1 12 0 M-3 5 a4.5 4.5 0 0 1 6 0" stroke="#9fd9c3" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <circle cy="8" r="1.4" fill="#9fd9c3" />
          <line x1="-9" y1="-9" x2="9" y2="9" stroke="#e07a5f" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </svg>
      <div className="cnc-sellos">
        <span className="cnc-sello"><Smartphone size={13} /> Sus datos, primero en su teléfono</span>
        <span className="cnc-sello"><Sun size={13} /> Servidor con energía solar</span>
        <span className="cnc-sello"><WifiOff size={13} /> Registre sin señal</span>
      </div>
    </div>
  );
}

/* ── Las 7 escenas: el guion del recorrido ─────────────────────────────── */
export const ESCENAS = [
  {
    id: 'mano',
    kicker: 'Esto es Chagra',
    titulo: 'Su mano en el campo.',
    sub: 'Una app para andar su finca viva: el saber campesino y la ciencia abierta, juntos en su bolsillo.',
    Visual: VisualMano,
  },
  {
    id: 'agente',
    kicker: 'El agente',
    titulo: 'Pregunte como le pregunta a una vecina.',
    sub: 'Chagra responde con datos verificados de más de 700 especies, plagas y remedios — y le dice de dónde salió cada cosa. La inteligencia corre en infraestructura propia, no en la nube de las grandes.',
    Visual: VisualAgente,
  },
  {
    id: 'confianza',
    kicker: 'Confianza científica',
    titulo: 'Chagra no inventa.',
    sub: 'Cada respuesta trae su semáforo: qué está validado, qué está documentado y qué es mejor no afirmar. Si no hay respaldo, se lo dice de frente.',
    Visual: VisualSemaforo,
  },
  {
    id: 'mundos',
    kicker: 'Los mundos de mi finca',
    titulo: 'Su finca, en mundos.',
    sub: 'El suelo vivo, el agua, los cultivos, los animales, la cosecha y el mercado: cada mundo agrupa lo suyo, como los rincones de la finca.',
    Visual: VisualMundos,
  },
  {
    id: 'voz',
    kicker: 'La voz',
    titulo: 'Dígalo, y queda anotado.',
    sub: 'Registre siembras, cosechas y lo que vea en el campo hablando con Chagra — con las botas puestas y las manos en la tierra.',
    Visual: VisualVoz,
  },
  {
    id: 'offgrid',
    kicker: 'Sin señal, sin susto',
    titulo: 'Funciona en el monte.',
    sub: 'Sus registros viven primero en su teléfono y se sincronizan cuando vuelve la señal. El agente sí necesita señal para responder — sus datos no. Y el servidor de Chagra trabaja con energía solar.',
    Visual: VisualOffgrid,
  },
  {
    id: 'cierre',
    kicker: 'La chagra',
    titulo: 'Saber campesino + ciencia. Eso es Chagra.',
    sub: 'Hecha con campesinas y campesinos de Colombia, con código abierto y energía del sol. Bienvenida a su finca viva.',
    Visual: VisualMano,
  },
];
