/*
 * i18n (ADR-050): copy del selector del guardián en español Colombia (tú/usted),
 * pendiente de migrar a src/config/messages.js — mismo criterio que
 * DashboardLive.jsx / MundosDeMiFinca.jsx.
 */
import { useCallback, useEffect, useState } from 'react';
import { getGuardianEspecie, setGuardianEspecie } from '../../services/userProfileService';
import './guardian-espiritu.css';

/**
 * GuardianEspiritu — el SELECTOR DEL GUARDIÁN (espíritu de la finca) en el home
 * vivo (menú vivo). Portado del mockup aprobado #/mockups/avatar-biopunk
 * (AvatarGameBiopunk / módulo Pro avatar-espiritu): "SU GUARDIÁN — ESCOJA UNA
 * ESPECIE NATIVA", tarjetas seleccionables de fauna nativa emblemática, la
 * elegida resaltada con glow neón y nombre científico. El guardián elegido se
 * vuelve el espíritu de la finca y PERSISTE en el perfil del usuario
 * (userProfileService: `guardian_especie`).
 *
 * GROUNDING (clave): las especies ofrecidas son REALES y del catálogo/grafo de
 * Chagra (fauna nativa colombiana verificable), con nombre científico correcto
 * — NUNCA fauna inventada. Cada una lleva su fuente de grounding en el repo.
 *
 * @param {Object} props
 * @param {(id: string, especie: Object) => void} [props.onChange]  callback
 *   opcional al elegir/cambiar el guardián (además de la persistencia).
 */

// ─── ROSTER GROUNDED — fauna nativa colombiana REAL con nombre científico ────
// Cada acento (acc/accRgb) re-tiñe el HUD, igual que en el mockup. `fuente` es la
// evidencia de grounding en el repo (catálogo/cycle-content/datos).
const ESPECIES = [
  {
    id: 'abeja',
    nombre: 'Abeja angelita',
    cientifico: 'Tetragonisca angustula',
    eje: 'Floración y polinizadores',
    frase: 'Soy la angelita: cuido su floración y le multiplico la cosecha.',
    fuente: 'Meliponino nativo sin aguijón · catálogo de fauna de Chagra',
    acc: '#ffb54f', accRgb: '255, 181, 79',
  },
  {
    id: 'oso',
    nombre: 'Oso de anteojos',
    cientifico: 'Tremarctos ornatus',
    eje: 'Bosque y agroforestería',
    frase: 'Soy el oso andino: guardo su bosque y la conexión de la montaña.',
    fuente: 'Único oso de Suramérica (VU) · catálogo de bosque andino de Chagra',
    acc: '#b28dff', accRgb: '178, 141, 255',
  },
  {
    id: 'chivito',
    nombre: 'Chivito de páramo',
    cientifico: 'Oxypogon guerinii',
    eje: 'Páramo y flores nativas',
    frase: 'Soy el chivito del páramo: velo por el agua que nace arriba.',
    fuente: 'Colibrí endémico de Colombia · catálogo de páramo de Chagra',
    acc: '#2dffc4', accRgb: '45, 255, 196',
  },
  {
    id: 'danta',
    nombre: 'Danta de montaña',
    cientifico: 'Tapirus pinchaque',
    eje: 'Suelo y semillas del bosque',
    frase: 'Soy la danta de montaña: siembro el bosque con cada semilla que dejo.',
    fuente: 'Tapir andino endémico (EN) · fauna paramuna del catálogo de Chagra',
    acc: '#7fd0ff', accRgb: '127, 208, 255',
  },
  {
    id: 'rana',
    nombre: 'Rana dorada',
    cientifico: 'Phyllobates terribilis',
    eje: 'Agua limpia',
    frase: 'Soy la rana dorada: mi presencia dice que su agua está sana.',
    fuente: 'Anfibio endémico del Chocó · bioindicadora de agua limpia',
    acc: '#ffd76a', accRgb: '255, 215, 106',
  },
];

const byId = (id) => ESPECIES.find((e) => e.id === id) || ESPECIES[0];

/* ------------------------------------------------------------------------- */
/* filtros SVG compartidos (glow + blur), portados del mockup                  */
/* ------------------------------------------------------------------------- */
function GuardianDefs() {
  return (
    <defs>
      <filter id="ge-glow1" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.2" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="ge-blur3"><feGaussianBlur stdDeviation="3" /></filter>
    </defs>
  );
}

/* --------- los avatares (SVG portados 1:1 del mockup biopunk) ------------- */

function AvatarChivito() {
  return (
    <g className="ge-av-vuela">
      <circle className="ge-estela" r="6" fill="#2dffc4" opacity="0.5" filter="url(#ge-blur3)" />
      <circle r="5" fill="#4fd8ff" opacity="0.4" filter="url(#ge-blur3)" />
      <g filter="url(#ge-glow1)">
        <path d="M-6,-0.5 L-17,-4.5 L-12,0 L-17,4.2 Z" fill="#1f9f86" />
        <path d="M-6.5,0 C0,-6.5 10,-6 14,-1.4 C17,1 17,3 14,4.6 C8.5,8 0,7.6 -6.5,1.4 Z" fill="#2dffc4" />
        <path d="M-3.5,3 C3,5.3 10,5 14,2.5 C10,6.8 1.5,7.1 -4.8,2.2 Z" fill="#bfffe9" opacity="0.7" />
        <circle cx="12.6" cy="-2.2" r="4" fill="#9dff3f" />
        <path d="M11,-5.4 L12.6,-9 L14.4,-5 Z" fill="#4fd8ff" />
        <path d="M12,1.2 C11.4,5.4 12.2,9 13.6,12 C14.8,8.8 15.6,5 14.8,1 Z" fill="#eafff6" style={{ filter: 'drop-shadow(0 0 4px #eafff6)' }} />
        <circle cx="13.6" cy="-2.8" r="1.15" fill="#04160f" />
        <circle cx="14" cy="-3.2" r="0.4" fill="#eafff6" />
        <path d="M16.2,-1.6 C21,-2.1 25,-2.8 28.6,-4.2" stroke="#eafff6" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path className="ge-ala" d="M4,-1.4 C-4,-16 10,-23 17,-14 C14.4,-5.6 8,-1.4 4,-1.4 Z" fill="#ff4fd8" opacity="0.85" />
        <path className="ge-ala" style={{ animationDelay: '-0.06s' }} d="M5.5,1.7 C0,13 13,17.5 17,10 C14,4.2 9.5,1.7 5.5,1.7 Z" fill="#b28dff" opacity="0.5" />
      </g>
    </g>
  );
}

function AvatarRana() {
  return (
    <g className="ge-av-flota" filter="url(#ge-glow1)">
      <ellipse cx="0" cy="8" rx="15" ry="3" fill="#000" opacity="0.35" />
      <path d="M-13,7 C-16,2 -13,-4 -7,-7 C-1,-10 8,-9 12,-4 C15,-1 15,4 12,7 Z" fill="#ffd76a" style={{ filter: 'drop-shadow(0 0 8px rgba(255,181,79,0.8))' }} />
      <path d="M-11,6 C-13,2 -10,-3 -5,-5 C1,-8 8,-7 11,-3" fill="none" stroke="#fff3c9" strokeWidth="1" opacity="0.7" />
      <circle cx="-4" cy="1" r="1.2" fill="#7a4a10" opacity="0.65" />
      <circle cx="2" cy="-3" r="1" fill="#7a4a10" opacity="0.6" />
      <circle cx="5" cy="2" r="1.1" fill="#7a4a10" opacity="0.6" />
      <path d="M-13,7 C-17,6 -19,3 -18,-1" fill="none" stroke="#ff9d3f" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M8,7 C12,8 16,7 18,4" fill="none" stroke="#ff9d3f" strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="9" cy="3.4" rx="3.4" ry="2.6" fill="#fff3c9" opacity="0.85" />
      <circle cx="8.6" cy="-5.4" r="3.4" fill="#04160f" />
      <circle cx="8.6" cy="-5.4" r="3.4" fill="none" stroke="#ffd76a" strokeWidth="1" />
      <circle cx="9.6" cy="-6.4" r="1.1" fill="#eafff6" />
      <path d="M10.8,-1.4 Q13,-0.6 14.6,-1.8" stroke="#7a4a10" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

function AvatarAbeja() {
  return (
    <g className="ge-av-flota">
      <g filter="url(#ge-glow1)">
        <circle r="5" fill="#ffb54f" opacity="0.4" filter="url(#ge-blur3)" />
        <ellipse cx="0" cy="0" rx="7.5" ry="4.8" fill="#ffb54f" style={{ filter: 'drop-shadow(0 0 6px rgba(255,181,79,0.9))' }} />
        <path d="M-2.8,-4.3 L-2.8,4.3 M0.7,-4.6 L0.7,4.6 M3.9,-3.7 L3.9,3.7" stroke="#3a2410" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="7.3" cy="-0.7" r="3" fill="#ffd76a" />
        <circle cx="8.3" cy="-1.4" r="0.8" fill="#04160f" />
        <path d="M10,-2 C11.2,-2.9 12.3,-2.9 13.2,-2.2" stroke="#3a2410" strokeWidth="0.6" fill="none" />
        <ellipse className="ge-aleteo" cx="-1.6" cy="-6.2" rx="5.3" ry="3.2" fill="#4fd8ff" opacity="0.65" />
        <ellipse className="ge-aleteo" style={{ animationDelay: '-0.06s' }} cx="2" cy="-5.7" rx="4.1" ry="2.5" fill="#bfeaff" opacity="0.5" />
        <circle cx="-8.4" cy="1.2" r="1.2" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 3px #d8ff6a)' }} />
      </g>
    </g>
  );
}

function AvatarOso() {
  return (
    <g className="ge-av-flota" filter="url(#ge-glow1)">
      <ellipse cx="0" cy="21" rx="15" ry="3" fill="#000" opacity="0.4" />
      <path d="M-11,20 C-14,8 -10,-4 0,-6 C10,-4 14,8 11,20 Z" fill="#171030" stroke="#2dffc4" strokeWidth="0.8" strokeOpacity="0.5" />
      <path d="M-3,6 C-1,10 1,10 3,6 C2,12 -2,12 -3,6 Z" fill="#eafff6" opacity="0.85" />
      <path d="M-8,20 L-8,14 M8,20 L8,14" stroke="#0f0a20" strokeWidth="4.4" strokeLinecap="round" />
      <circle cx="0" cy="-9" r="8" fill="#1c1338" stroke="#2dffc4" strokeWidth="0.8" strokeOpacity="0.5" />
      <path d="M-7,-15 A2.8,2.8 0 1 1 -3,-17.5 M7,-15 A2.8,2.8 0 1 0 3,-17.5" fill="#1c1338" stroke="#2dffc4" strokeWidth="0.7" strokeOpacity="0.5" />
      <circle cx="-3.2" cy="-10" r="3" fill="none" stroke="#eafff6" strokeWidth="1.3" style={{ filter: 'drop-shadow(0 0 4px #eafff6)' }} />
      <circle cx="3.2" cy="-10" r="3" fill="none" stroke="#eafff6" strokeWidth="1.3" style={{ filter: 'drop-shadow(0 0 4px #eafff6)' }} />
      <path d="M-0.4,-10 L0.4,-10" stroke="#eafff6" strokeWidth="1" />
      <circle cx="-3.2" cy="-10" r="1" fill="#2dffc4" />
      <circle cx="3.2" cy="-10" r="1" fill="#2dffc4" />
      <ellipse cx="0" cy="-5.4" rx="2.6" ry="1.9" fill="#d8b48a" />
      <circle cx="0" cy="-6" r="0.9" fill="#04160f" />
    </g>
  );
}

/* Danta de montaña (Tapirus pinchaque) — avatar NUEVO en la línea biopunk:
   silueta de tapir con la trompa prensil, borde neón y el labio blanco
   característico del tapir andino. */
function AvatarDanta() {
  return (
    <g className="ge-av-flota" filter="url(#ge-glow1)">
      <ellipse cx="0" cy="14" rx="16" ry="3" fill="#000" opacity="0.4" />
      {/* cuerpo robusto */}
      <path d="M-14,8 C-16,-2 -8,-9 3,-8 C12,-7 17,-2 16,6 C15,11 8,13 -2,13 C-9,13 -13,12 -14,8 Z"
        fill="#141a3a" stroke="#7fd0ff" strokeWidth="0.9" strokeOpacity="0.6" />
      {/* lomo iluminado */}
      <path d="M-11,-2 C-4,-8 8,-8 14,-1" fill="none" stroke="#bfeaff" strokeWidth="1" opacity="0.55" />
      {/* patas */}
      <path d="M-9,12 L-9,7 M-2,13 L-2,7.5 M9,11 L9,6" stroke="#0f0a24" strokeWidth="3.6" strokeLinecap="round" />
      {/* cabeza + trompa prensil */}
      <path d="M12,-3 C18,-4 22,-1 23,3 C23.6,5.4 22,7 20,6.6 C21,4 19.4,1.4 16,1 C14,0.8 12.6,-1 12,-3 Z"
        fill="#1c2350" stroke="#7fd0ff" strokeWidth="0.8" strokeOpacity="0.6" />
      {/* labio blanco del tapir andino (rasgo diagnóstico) */}
      <path d="M20.4,5.4 C22,5.2 23,5.8 23.2,6.8 C22,7.2 20.6,7 19.8,6.2 Z" fill="#eafff6" opacity="0.9" />
      {/* ojo */}
      <circle cx="14.4" cy="-1.2" r="1.15" fill="#04160f" />
      <circle cx="14.7" cy="-1.6" r="0.4" fill="#eafff6" />
      {/* oreja con borde vivo */}
      <path d="M8,-6 C7,-11 12,-12 13,-8 C12,-6.5 10,-6 8,-6 Z" fill="#1c2350" stroke="#9dff3f" strokeWidth="0.7" strokeOpacity="0.6" />
    </g>
  );
}

const AVATAR = {
  abeja: AvatarAbeja,
  rana: AvatarRana,
  oso: AvatarOso,
  chivito: AvatarChivito,
  danta: AvatarDanta,
};

/** Un avatar aislado dibujado en su propio SVG (para chips y héroe).
    Exportado: el valle 3D monta el oso negro biopunk como vecino del monte
    (decisión del operador — este es EL oso, no el rubber-hose café). */
export function GuardianAvatar({ id, size = 46 }) {
  const Cuerpo = AVATAR[id] || AvatarAbeja;
  return (
    <svg viewBox="-26 -24 52 46" width={size} height={size} aria-hidden="true" focusable="false">
      <GuardianDefs />
      <Cuerpo />
    </svg>
  );
}

export default function GuardianEspiritu({ onChange = null }) {
  // Guardián persistido (o el default si aún no ha elegido). El home distingue
  // "sin elegir" para el copy, pero siempre mostramos un espíritu por defecto.
  const [elegido, setElegido] = useState(() => getGuardianEspecie());
  const activoId = elegido || ESPECIES[0].id;
  const activo = byId(activoId);

  // Re-leer si otra superficie (perfil, otra pestaña) cambia el guardián.
  useEffect(() => {
    const handler = () => setElegido(getGuardianEspecie());
    try {
      window.addEventListener('chagra:guardian-changed', handler);
      return () => {
        try { window.removeEventListener('chagra:guardian-changed', handler); } catch (_) { /* noop */ }
      };
    } catch (_) {
      return () => {};
    }
  }, []);

  const escoger = useCallback((especie) => {
    setElegido(especie.id);
    setGuardianEspecie(especie.id);
    if (typeof onChange === 'function') onChange(especie.id, especie);
  }, [onChange]);

  const accVars = {
    '--ge-acc': activo.acc,
    '--ge-acc-rgb': activo.accRgb,
  };

  return (
    <section
      className={`ge ${elegido ? 'on-glow' : ''}`}
      style={accVars}
      aria-label="Su guardián: el espíritu de su finca"
      data-testid="guardian-selector"
      data-guardian={activoId}
    >
      <header className="ge-head">
        <span className="ge-kicker">SU GUARDIÁN</span>
        <h2 className="ge-title">Escoja una especie nativa</h2>
        <p className="ge-sub">
          El guardián que elija se vuelve el espíritu de su finca. Fauna nativa colombiana, real y verificable.
        </p>
      </header>

      {/* héroe: el guardián elegido, en grande, con su nombre científico */}
      <div className="ge-hero" data-testid="guardian-hero">
        <span className="ge-hero-avatar">
          <GuardianAvatar id={activoId} size={78} />
        </span>
        <div className="ge-hero-txt">
          <p className="ge-hero-rol">EL ESPÍRITU DE SU FINCA</p>
          <h3 className="ge-hero-nombre" data-testid="guardian-nombre">{activo.nombre}</h3>
          <p className="ge-hero-cientifico" data-testid="guardian-cientifico">{activo.cientifico}</p>
          <p className="ge-hero-frase">{activo.frase}</p>
          <span className="ge-hero-fuente">{activo.fuente}</span>
        </div>
      </div>

      {/* selector: tarjetas seleccionables con glow neón por acento */}
      <div className="ge-chips" role="radiogroup" aria-label="Especie del guardián">
        {ESPECIES.map((e) => {
          const on = e.id === activoId;
          return (
            <button
              key={e.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${e.nombre} (${e.cientifico}) — ${e.eje}`}
              className={`ge-chip ${on ? 'on' : ''}`}
              style={{ '--ge-chip-acc': e.acc, '--ge-chip-acc-rgb': e.accRgb }}
              data-testid={`guardian-chip-${e.id}`}
              onClick={() => escoger(e)}
            >
              {on && <span className="ge-chip-check" aria-hidden="true">✓</span>}
              <span className="ge-chip-avatar">
                <GuardianAvatar id={e.id} size={46} />
              </span>
              <span className="ge-chip-nombre">{e.nombre}</span>
              <span className="ge-chip-eje">{e.eje}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
