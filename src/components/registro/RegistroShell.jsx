import React from 'react';
import { ArrowLeft } from 'lucide-react';
import './registro-shell.css';

/**
 * RegistroShell — caparazón VISUAL común de las 4 ventanas de registro de
 * Chagra (Cosechar, Insumos, Labores, Bitácora). Le da a las cuatro la MISMA
 * familia visual: identidad Chagra, theme-aware (toma la piel del tema activo
 * vía las CSS vars `--c-*` / `--t-*`), mobile-first, jerarquía clara.
 *
 * El acento de cada pantalla es el del TEMA activo (`--t-accent-rgb`), no un
 * color fijo: en biopunk vira teal, en nature ocre, en minimalista/verde-vivo
 * verde. Eso hace que las cuatro pantallas se vean coherentes con el resto de
 * la app en los cuatro temas.
 *
 * Va GATED tras `fincaVivaHomePerfilActivo()` en cada call-site: con la flag
 * apagada (default/prod) cada pantalla conserva su markup legacy; con la flag
 * encendida (dev) se renderiza este caparazón rediseñado.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 *
 * @param {Object} props
 * @param {string} props.title - Título de la pantalla (ej. "Cosechar").
 * @param {string} [props.subtitle] - Microcopy campesino bajo el título.
 * @param {React.ComponentType} props.Icon - Icono lucide de la pantalla.
 * @param {Function} props.onBack - Callback del botón Volver.
 * @param {React.ReactNode} props.children - Cuerpo del formulario / contenido.
 * @param {React.ReactNode} [props.footer] - Barra de acción fija inferior (CTA).
 * @param {React.ReactNode} [props.headerExtra] - Slot a la derecha del header.
 * @returns {React.ReactNode}
 */
export default function RegistroShell({
  title,
  subtitle,
  Icon,
  onBack,
  children,
  footer,
  headerExtra,
}) {
  return (
    <div className="registro-shell h-[100dvh] w-full flex flex-col bg-slate-950 text-slate-100">
      {/* Header con sello Chagra: icono en un disco con el acento del tema. */}
      <header className="registro-shell__header shrink-0 px-4 pt-4 pb-4 flex items-center gap-3">
        <button
          onClick={/** @type {React.MouseEventHandler<HTMLButtonElement>} */ (onBack)}
          aria-label="Volver"
          className="registro-shell__back shrink-0 min-h-[52px] min-w-[52px] rounded-2xl flex items-center justify-center"
        >
          <ArrowLeft size={26} aria-hidden="true" />
        </button>
        <div className="registro-shell__badge shrink-0 min-h-[52px] min-w-[52px] rounded-2xl flex items-center justify-center" aria-hidden="true">
          {Icon ? React.createElement(/** @type {any} */ (Icon), { size: 28 }) : null}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="registro-shell__title text-2xl font-black leading-tight truncate">{title}</h2>
          {subtitle && (
            <p className="registro-shell__subtitle text-sm leading-snug mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {headerExtra && <div className="shrink-0">{headerExtra}</div>}
      </header>

      {/* Hairline con el acento del tema, marca de identidad. */}
      <div className="registro-shell__rule shrink-0" aria-hidden="true" />

      {/* Cuerpo scrolleable. El padding inferior deja aire para el footer fijo. */}
      <div className={`flex-1 overflow-y-auto px-4 pt-5 ${footer ? 'pb-32' : 'pb-10'}`}>
        <div className="max-w-xl mx-auto flex flex-col gap-5">{children}</div>
      </div>

      {/* Barra de acción fija (CTA principal). */}
      {footer && (
        <div className="registro-shell__footer shrink-0 px-4 pt-3 pb-5">
          <div className="max-w-xl mx-auto">{footer}</div>
        </div>
      )}
    </div>
  );
}
