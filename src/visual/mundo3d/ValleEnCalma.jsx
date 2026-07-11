/*
 * ValleEnCalma — el ESTADO VACÍO de CALMA del valle.
 *
 * Cuando el motor de alertas no tiene nada urgente, el valle no muestra una
 * pantalla vacía triste: muestra PAZ ACTIVA. Un amanecer suave que respira
 * lento, Angelita descansando en una flor con las alas quietas, y una carta
 * serena: "Hoy su finca está en calma". Refuerza la dirección educativa de
 * Chagra (anti-ansiedad, anti-gamificación): a veces la mejor acción es
 * observar y descansar. Cero botones de urgencia, cero badges, cero streaks.
 *
 * Autocontenido: este host NO importa three (el diorama `EscenaCalma3D` se
 * carga perezoso al chunk `vendor-three`); el espejo 2D es SVG puro y sirve de
 * fallback de Suspense Y de piso digno para tier bajo — nunca hay pantalla en
 * blanco. reduced-motion → estático sereno (CSS y frameloop a demanda).
 *
 * ── CABLEO (lo hace el host; este archivo no toca App.jsx/Mundo.jsx) ──────
 *
 *   import ValleEnCalma from './visual/mundo3d/ValleEnCalma.jsx';
 *   // donde el motor de alertas resuelve "no hay nada urgente":
 *   {alertasUrgentes.length === 0 && (
 *     <ValleEnCalma
 *       tier={tier}                    // de decidirTier() (deviceTier.js)
 *       reducedMotion={reducedMotion}
 *       // opcionales:
 *       mensaje="Hoy su finca está en calma"
 *       detalle="Nada urgente que atender. Observar también es cuidar."
 *     />
 *   )}
 *
 * El contenedor padre define el alto (como `.mundo-root`, min 320px propio).
 */
import { lazy, Suspense } from 'react';
import { permite3D } from './deviceTier.js';
import { AbejaAngelita } from '../creatures/AbejaAngelita.jsx';
import './ValleEnCalma.css';

const EscenaCalma3D = lazy(() => import('./escenas/EscenaCalma3D.jsx'));

/*
 * El espejo 2D digno: el mismo amanecer calmo en SVG puro (cero three, cero
 * assets remotos). Es el piso para tier bajo Y el fallback mientras carga el
 * chunk 3D — la calma nunca parpadea en blanco.
 */
function Calma2D({ reducedMotion }) {
  return (
    <div className="vcalma-2d" aria-hidden="true">
      <svg className="vcalma-2d__cielo" viewBox="0 0 320 200" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="vcalma-alba" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f8ecd6" />
            <stop offset="1" stopColor="#f0dfc2" />
          </linearGradient>
        </defs>
        <rect width="320" height="200" fill="url(#vcalma-alba)" />

        {/* el sol bajo, con su halo que respira (CSS) */}
        <g className={reducedMotion ? '' : 'vcalma-respira'} style={{ transformOrigin: '84px 66px' }}>
          <circle cx="84" cy="66" r="34" fill="#f6d78a" opacity="0.35" />
          <circle cx="84" cy="66" r="20" fill="#f2c766" />
        </g>

        {/* nubes sin apuro */}
        <g fill="#fbf6ea" opacity="0.9">
          <ellipse className={reducedMotion ? '' : 'vcalma-deriva'} cx="210" cy="48" rx="34" ry="10" />
          <ellipse className={reducedMotion ? '' : 'vcalma-deriva vcalma-deriva--lenta'} cx="140" cy="86" rx="26" ry="8" />
        </g>

        {/* las lomas del valle, tonos que se alejan */}
        <ellipse cx="40" cy="205" rx="150" ry="62" fill="#4c7147" />
        <ellipse cx="290" cy="212" rx="170" ry="70" fill="#557e4c" />
        <ellipse cx="160" cy="238" rx="230" ry="86" fill="#6c9a5b" />

        {/* un árbol quieto */}
        <g>
          <rect x="246" y="150" width="5" height="18" rx="2" fill="#7a5a38" />
          <path d="M248.5 118 L266 154 L231 154 Z" fill="#4d7a4a" />
        </g>

        {/* flores dispersas; la dorada es la cama de Angelita */}
        <g>
          <line x1="96" y1="186" x2="96" y2="172" stroke="#5f8a4e" strokeWidth="2.4" />
          <circle cx="96" cy="169" r="6" fill="#d98da3" />
          <line x1="152" y1="192" x2="152" y2="180" stroke="#5f8a4e" strokeWidth="2" />
          <circle cx="152" cy="177" r="5" fill="#c9d9ec" />
          <line x1="206" y1="188" x2="206" y2="170" stroke="#5f8a4e" strokeWidth="2.8" />
          <circle cx="206" cy="166" r="8" fill="#e7b04c" />
        </g>
      </svg>

      {/* Angelita posada en la flor dorada, alas quietas, respirando lento */}
      <div className={`vcalma-abeja vcalma-abeja--2d${reducedMotion ? ' vcalma-abeja--quieta' : ''}`}>
        <AbejaAngelita size={46} animo="descansa" energia={0.4} animated={false} />
      </div>
    </div>
  );
}

/**
 * El estado vacío de calma del valle. Montable por props, sin lógica de negocio:
 * el HOST decide cuándo hay calma (motor de alertas) y este componente solo la
 * muestra.
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'|'2d'} [props.tier='alto']  de `decidirTier()`; bajo/2d → espejo SVG.
 * @param {boolean} [props.reducedMotion=false]  estático sereno (cero vaivén, un fotograma).
 * @param {string}  [props.mensaje]  titular opcional (default: "Hoy su finca está en calma").
 * @param {string}  [props.detalle]  segunda línea opcional.
 * @param {string}  [props.className]  clases extra del contenedor.
 */
export default function ValleEnCalma({
  tier = 'alto',
  reducedMotion = false,
  mensaje = 'Hoy su finca está en calma',
  detalle = 'Nada urgente que atender. Observar y descansar también es cuidar.',
  className = '',
}) {
  const con3D = permite3D(tier);
  return (
    <section
      className={`vcalma${className ? ` ${className}` : ''}`}
      data-tier={tier}
      aria-label={mensaje}
    >
      <div className="vcalma__escena">
        {con3D ? (
          <Suspense fallback={<Calma2D reducedMotion={reducedMotion} />}>
            <EscenaCalma3D tier={tier === 'alto' ? 'alto' : 'medio'} reducedMotion={reducedMotion} />
          </Suspense>
        ) : (
          <Calma2D reducedMotion={reducedMotion} />
        )}
      </div>

      <div className="vcalma__carta" role="status">
        <span className="vcalma__sol" aria-hidden="true" />
        <div className="vcalma__texto">
          <h2 className="vcalma__titulo">{mensaje}</h2>
          <p className="vcalma__detalle">{detalle}</p>
        </div>
      </div>
    </section>
  );
}
