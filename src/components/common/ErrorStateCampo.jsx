import React from 'react';
import { RotateCcw } from 'lucide-react';
import './campo-states.css';

/**
 * ErrorStateCampo — estado de ERROR con identidad de cuaderno de campo.
 *
 * Completa la familia campo (EmptyStateCampo = vacío, SkeletonCampo = carga)
 * para secciones INLINE de una pantalla: lista del mercado, panel de una guía,
 * resultados del directorio. No reemplaza a ScreenLoadingStatus (que es
 * full-screen, h-[100dvh]) ni a los ErrorBoundary (que capturan errores de
 * render); este componente es para fallos de datos/red manejados en el flujo.
 *
 * La escena: una nube pasajera tapó el sol, pero el brote sigue vivo y la
 * chagra intacta. Un fallo aquí es un aguacero que pasa, no una tragedia:
 * nada se perdió y casi siempre basta con volver a intentar.
 *
 * Componente PURAMENTE presentacional: sin estado, sin efectos, sin fetch.
 * NUNCA le pase un `error.message` crudo como title/hint — use frases curadas
 * (o `mensajeErrorCampesino` de utils para traducir excepciones).
 *
 * @param {object} props
 * @param {React.ReactNode} [props.title]  - frase principal, en lenguaje campesino.
 * @param {React.ReactNode} [props.hint]   - qué puede hacer el usuario ahora.
 * @param {() => void} [props.onRetry]     - si viene, muestra el botón de reintento.
 * @param {React.ReactNode} [props.retryLabel]
 * @param {string} [props.className]
 * @param {React.ReactNode} [props.children] - contenido extra (ej. link "Volver") debajo.
 */

// Paleta compartida con EmptyStateCampo (sobre slate-900/950):
const INK = '#94a3b8'; // trazo principal (slate-400)
const INK_SOFT = '#64748b'; // trazo secundario (slate-500)
const TIERRA = '#8b7d6b'; // suelo, gris cálido
const BROTE = '#34d399'; // el elemento vivo (emerald-400)
const BROTE_CLARO = '#6ee7b7';
const SOL = '#fbbf24'; // amber-400

/** Nube pasajera que tapa el sol: el problema es de paso, no de fondo. */
const VignetteNube = () => (
  <>
    {/* Cerro andino al fondo */}
    <path
      d="M18,60 Q46,32 70,54 Q88,68 108,56 Q126,46 142,58"
      fill="none"
      stroke={INK_SOFT}
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.4"
    />
    {/* Sol asomándose detrás de la nube: sigue ahí */}
    <g stroke={SOL} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.85">
      <path d="M104,26 A8,8 0 0 1 118,29" />
      <line x1="100" y1="18" x2="102" y2="20" />
      <line x1="112" y1="14" x2="112" y2="17" />
      <line x1="123" y1="19" x2="121" y2="21" />
    </g>
    {/* La nube, trazo de tinta */}
    <path
      d="M88,38 Q90,28 100,29 Q104,22 113,25 Q122,22 126,30 Q135,31 133,39 Q130,45 121,44 L96,44 Q88,45 88,38 Z"
      fill="rgba(148,163,184,0.10)"
      stroke={INK}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Gotas cortas: aguacero suave que ya casi escampa */}
    <g stroke={INK_SOFT} strokeWidth="1.3" strokeLinecap="round" opacity="0.55">
      <line x1="99" y1="51" x2="97" y2="56" />
      <line x1="110" y1="49" x2="108" y2="54" />
      <line x1="121" y1="51" x2="119" y2="56" />
    </g>
    {/* Suelo */}
    <line x1="18" y1="88" x2="142" y2="88" stroke={TIERRA} strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
    {/* El brote sigue vivo: nada se perdió */}
    <g className="esc-vivo">
      <line x1="52" y1="88" x2="52" y2="70" stroke={BROTE} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M52,76 Q44,70 38,72 Q45,79 52,80 Z" fill={BROTE} />
      <path d="M52,72 Q60,66 66,68 Q59,75 52,76 Z" fill={BROTE_CLARO} />
    </g>
  </>
);

/**
 * @param {{
 *   title?: React.ReactNode,
 *   hint?: React.ReactNode,
 *   onRetry?: (() => void) | null,
 *   retryLabel?: React.ReactNode,
 *   className?: string,
 *   children?: React.ReactNode,
 * }} props
 */
export default function ErrorStateCampo({
  title = 'Esto no cargó.',
  hint = 'Puede ser la señal. Espere un momento y vuelva a intentar.',
  onRetry = null,
  retryLabel = 'Intentar de nuevo',
  className = '',
  children = null,
}) {
  return (
    <div className={`flex flex-col items-center text-center px-6 ${className}`} role="status">
      <svg
        className="esc-scene mb-3"
        viewBox="0 0 160 100"
        width="176"
        height="110"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <VignetteNube />
      </svg>
      {title && <p className="text-sm font-bold text-slate-200 leading-snug max-w-xs mx-auto">{title}</p>}
      {hint && <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">{hint}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
        >
          <RotateCcw size={16} aria-hidden="true" /> {retryLabel}
        </button>
      )}
      {children}
    </div>
  );
}
