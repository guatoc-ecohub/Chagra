import React, { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { getProfile } from '../../services/userProfileService';
import { getPisoTermicoInfo } from '../../services/locationService';
import { MSG } from '../../config/messages.js';
import './camino-primer-cultivo.css';

/**
 * CaminoPrimerCultivo — onboarding ilustrado "el camino del primer cultivo".
 *
 * Es la BIENVENIDA del productor nuevo (0 siembras) en el home F2 "Finca
 * Viva": qué es Chagra en dos líneas y un sendero de TRES pasos ilustrados
 * que conecta con los flujos que YA existen (no crea lógica nueva):
 *
 *   1. Ubicar su finca      → ruta 'ubicacion-detectada' (piso térmico,
 *                             el filtro maestro de todos los módulos).
 *   2. Primera siembra      → ruta 'sembrar' (o 'registro_unificado' con la
 *                             flag #23) — el mismo flujo del EmptyState de
 *                             "Mis Plantas" ("Registrar mi primera siembra").
 *   3. Conocer al asistente → ruta 'agente'.
 *
 * Señales de avance (solo LECTURA de estado existente):
 *   - Paso 1: perfil con altitud finita + piso_confirmado === '1'
 *             (mismo criterio que OnboardingHero).
 *   - Paso 2: plantsCount > 0 (lo pasa el caller desde useAssetStore).
 *   - Paso 3: marca local al tocar el paso (localStorage, offline-first).
 *
 * El SENDERO es el progreso: cada tramo de camino de tierra (punteado) se
 * pinta de verde sólido al completar el paso anterior. Nada es un muro:
 * los 3 pasos son tocables siempre, y "Omitir por ahora" lo oculta
 * (persistido en el dispositivo, sin red).
 *
 * Visual: piel clara "finca viva" (crema/tinta verde, Baloo 2/Nunito) y
 * viñetas vectoriales dibujadas a mano en el lenguaje de los place-svg de
 * los 4 portales (FincaVivaHero). Sin <text> con emoji dentro del SVG
 * (Android/iOS viejos los renderizan monocromos o vacíos).
 *
 * Accesibilidad: <section> etiquetada, pasos en <ol>, estado "listo" en el
 * aria-label de cada botón, decoración aria-hidden, animaciones bajo
 * prefers-reduced-motion. Tono usted colombiano, sin voseo, sin jerga.
 */

const STORAGE_KEY = 'chagra:camino-primer-cultivo:v1';

/** Lee las marcas locales del camino (omitido / asistente conocido). */
function readCaminoPrefs() {
  const base = { omitido: false, agenteVisto: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    return { ...base, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch (_) {
    return base;
  }
}

/** Persiste las marcas locales (sincrónico, offline-first, fail-silent). */
function writeCaminoPrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (_) { /* sin storage no persistimos, pero la sesión sigue */ }
}

/* ── Viñetas vectoriales (lenguaje place-svg de FincaVivaHero) ─────────── */

/** Loma con sol y el pin de ubicación clavado en la tierra. */
function VinetaUbicar() {
  return (
    <svg className="cpc-svg" viewBox="0 0 80 64" aria-hidden="true">
      <circle cx="62" cy="14" r="9" fill="#ffe08a" opacity=".6" />
      <circle cx="62" cy="14" r="5" fill="#ffedb3" opacity=".9" />
      <path d="M-2 46 Q22 26 44 40 T82 38 V66 H-2 Z" fill="#356b42" opacity=".5" />
      <path d="M-2 52 Q28 38 54 48 T82 46 V66 H-2 Z" fill="#3f8f4e" />
      {/* pin de ubicación clavado en la loma */}
      <g className="cpc-anim-pin">
        <path d="M36 18 q-9 0 -9 9 q0 7 9 15 q9 -8 9 -15 q0 -9 -9 -9 Z" fill="#c2562f" />
        <circle cx="36" cy="27" r="3.6" fill="#fdf8ea" />
      </g>
      <ellipse cx="36" cy="45" rx="7" ry="2" fill="#26331f" opacity=".18" />
    </svg>
  );
}

/** Parcela isométrica con surcos y una mata recién brotada. */
function VinetaSiembra() {
  return (
    <svg className="cpc-svg" viewBox="0 0 80 64" aria-hidden="true">
      <circle cx="16" cy="12" r="7" fill="#ffe08a" opacity=".55" />
      <polygon points="40,18 72,36 40,54 8,36" fill="#3f7a4e" />
      <polygon points="40,18 72,36 40,37 8,36" fill="#4f9460" opacity=".7" />
      <g stroke="#2f6b3a" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".7">
        <path d="M22 38 L40 48" /><path d="M30 32 L50 43" /><path d="M38 26 L58 37" />
      </g>
      {/* brote: tallo + dos hojas tiernas + semilla asomada */}
      <g className="cpc-anim-brote">
        <path d="M40 40 v-11" stroke="#2f6b3a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M40 32 q-7 -2 -8 -8 q7 0 8 8 Z" fill="#7fc06f" />
        <path d="M40 30 q7 -3 9 -9 q-8 0 -9 9 Z" fill="#a7e17a" />
      </g>
      <ellipse cx="40" cy="41" rx="5.5" ry="1.8" fill="#26331f" opacity=".18" />
    </svg>
  );
}

/** El claro del asistente: pajarito de páramo con bocadillo de conversa. */
function VinetaAgente() {
  return (
    <svg className="cpc-svg" viewBox="0 0 80 64" aria-hidden="true">
      <path d="M-2 50 Q30 38 56 46 T82 44 V66 H-2 Z" fill="#356b42" opacity=".45" />
      {/* bocadillo de conversación */}
      <g>
        <rect x="38" y="8" width="34" height="20" rx="9" fill="#fdf8ea" stroke="#caa066" strokeWidth="1.4" />
        <path d="M46 27 l-4 7 l10 -6 Z" fill="#fdf8ea" />
        <circle cx="49" cy="18" r="2.2" fill="#3f8f4e" />
        <circle cx="56" cy="18" r="2.2" fill="#3f8f4e" opacity=".7" />
        <circle cx="63" cy="18" r="2.2" fill="#3f8f4e" opacity=".45" />
      </g>
      {/* pajarito (cuerpo, ala, cabeza, pico hacia el bocadillo) */}
      <g className="cpc-anim-ave">
        <ellipse cx="24" cy="38" rx="11" ry="8" fill="#4f9460" />
        <path d="M20 36 q-9 -1 -12 -8 q10 -2 14 5 Z" fill="#7fc06f" />
        <circle cx="33" cy="32" r="5.5" fill="#4f9460" />
        <circle cx="35" cy="31" r="1.3" fill="#26331f" />
        <path d="M38 32 l7 -2" stroke="#c2562f" strokeWidth="2" strokeLinecap="round" />
        <path d="M15 44 q-4 3 -8 3 q2 -5 8 -6 Z" fill="#356b42" />
      </g>
      <ellipse cx="25" cy="49" rx="9" ry="2" fill="#26331f" opacity=".18" />
    </svg>
  );
}

/**
 * @param {object}   props
 * @param {Function} props.onNavigate  - router del shell (misma firma que el resto del home).
 * @param {number}  [props.plantsCount] - siembras registradas (paso 2 listo si > 0).
 * @param {string}  [props.rutaSiembra] - destino del paso 2 ('sembrar' o
 *   'registro_unificado' cuando la flag #23 está activa — lo decide el caller).
 */
export default function CaminoPrimerCultivo({
  onNavigate,
  plantsCount = 0,
  rutaSiembra = 'sembrar',
}) {
  const [prefs, setPrefs] = useState(readCaminoPrefs);

  // Piso térmico: mismo criterio de "listo" que OnboardingHero (lectura pura).
  const [piso] = useState(() => {
    try {
      const p = getProfile();
      const alt = Number(p.finca_altitud);
      const tieneAltitud = p.finca_altitud !== '' && p.finca_altitud != null && Number.isFinite(alt);
      const info = tieneAltitud ? getPisoTermicoInfo(alt) : null;
      return { done: !!info && p.piso_confirmado === '1', info, altitud: alt };
    } catch (_) {
      return { done: false, info: null, altitud: NaN };
    }
  });

  const marcarAgente = () => {
    const next = { ...prefs, agenteVisto: true };
    setPrefs(next);
    writeCaminoPrefs(next);
    onNavigate?.('agente');
  };

  const omitir = () => {
    const next = { ...prefs, omitido: true };
    setPrefs(next);
    writeCaminoPrefs(next);
  };

  const pasos = [
    {
      id: 'ubicar',
      done: piso.done,
      titulo: 'Ubique su finca',
      desc: 'Con la altura de su tierra, los consejos le salen acertados para su clima.',
      hecho: piso.info
        ? `Clima ${piso.info.label.toLowerCase()}, a unos ${Math.round(piso.altitud)} m de altura.`
        : 'Su finca ya está ubicada.',
      Vineta: VinetaUbicar,
      accion: () => onNavigate?.('ubicacion-detectada'),
    },
    {
      id: 'sembrar',
      done: plantsCount > 0,
      titulo: 'Registre su primera siembra',
      desc: 'Una sola mata basta para estrenar su cuaderno: por foto, por voz o escribiendo.',
      hecho: 'Su cuaderno ya tiene su primera mata.',
      Vineta: VinetaSiembra,
      accion: () => onNavigate?.(rutaSiembra),
    },
    {
      id: 'agente',
      done: prefs.agenteVisto,
      titulo: 'Conozca a su asistente',
      desc: 'Pregúntele lo que sea de su finca: le responde con voz y le muestra sus fuentes.',
      hecho: 'Ya se conocieron. Pregúntele cuando quiera.',
      Vineta: VinetaAgente,
      accion: marcarAgente,
    },
  ];

  const hechos = pasos.filter((p) => p.done).length;

  // Omitido o camino completo: no ocupar el home (el productor ya arrancó).
  if (prefs.omitido || hechos === pasos.length) return null;

  const actualIdx = pasos.findIndex((p) => !p.done);

  return (
    <section
      className="cpc px-4 pt-3 fvh-resto-block"
      aria-label="El camino de su primer cultivo"
      data-testid="camino-primer-cultivo"
    >
      <div className="cpc-card">
        <header className="cpc-head">
          <div className="cpc-head-txt">
            <p className="cpc-eyebrow">El camino de su primer cultivo</p>
            <h2 className="cpc-tit">{MSG.onboarding.bienvenido}</h2>
            <p className="cpc-sub">
              Este es el cuaderno de campo vivo de su finca: usted registra lo
              que siembra y Chagra le acompaña con el calendario, los consejos
              y la historia de cada mata.
            </p>
          </div>
          {/* Letrero de madera con el paso en curso (como el de la parcela). */}
          <span className="cpc-letrero" data-testid="cpc-paso-actual">
            Paso {actualIdx + 1} de {pasos.length}
          </span>
        </header>

        <ol className="cpc-sendero">
          {pasos.map((paso, i) => {
            const actual = i === actualIdx;
            return (
              <li
                key={paso.id}
                className={`cpc-paso${paso.done ? ' cpc-paso-hecho' : ''}${actual ? ' cpc-paso-actual' : ''}`}
              >
                <button
                  type="button"
                  onClick={paso.accion}
                  className="cpc-paso-btn"
                  aria-label={`Paso ${i + 1}: ${paso.titulo}${paso.done ? ' (listo)' : ''}`}
                  data-testid={`cpc-paso-${paso.id}`}
                >
                  <span className="cpc-vineta" aria-hidden="true">
                    <paso.Vineta />
                    {paso.done && (
                      <span className="cpc-vineta-check">
                        <Check size={13} strokeWidth={3.2} />
                      </span>
                    )}
                  </span>
                  <span className="cpc-paso-txt">
                    <span className="cpc-paso-tit">{paso.titulo}</span>
                    <span className="cpc-paso-desc">
                      {paso.done ? paso.hecho : paso.desc}
                    </span>
                  </span>
                  <ChevronRight size={18} className="cpc-paso-flecha" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>

        <footer className="cpc-pie">
          <p className="cpc-pie-nota">
            Vaya a su ritmo: su avance queda guardado en este dispositivo, con
            o sin señal.
          </p>
          <button
            type="button"
            onClick={omitir}
            className="cpc-omitir"
            data-testid="cpc-omitir"
          >
            Omitir por ahora
          </button>
        </footer>
      </div>
    </section>
  );
}
