import React from 'react';
import { Sprout, WifiOff, AlertTriangle, RotateCcw, Plus } from 'lucide-react';

/**
 * EmptyState — estado vacío / error / sin-conexión reutilizable.
 *
 * La primera impresión de un productor nuevo (0 plantas, 0 registros) no
 * puede ser una pantalla fría. Este componente convierte el vacío en una
 * invitación: qué es este espacio, por qué está vacío y cuál es el primer
 * paso (CTA conectado al flujo de alta existente — NO crea lógica nueva).
 *
 * Variantes:
 *   - "empty"   → acento esmeralda, invita a la primera acción (default)
 *   - "error"   → acento ámbar + botón de reintento (tono tranquilo, no rojo pánico)
 *   - "offline" → acento cielo, tono calmado offline-first
 *                 ("Trabajando sin conexión, sus datos están a salvo")
 *
 * Tamaños:
 *   - "full"    → pantalla/panel completo (py-12)
 *   - "compact" → dentro de listas/cards (py-6, icono menor)
 *
 * Accesibilidad: role="status" para que lectores anuncien el estado;
 * el anillo punteado y la ilustración son decorativos (aria-hidden).
 * Tono: usted colombiano. Sin dependencias nuevas: lucide + tailwind.
 */

const VARIANT_STYLES = {
  empty: {
    ring: 'border-emerald-700/50',
    iconBg: 'bg-emerald-900/30',
    iconColor: 'text-emerald-400',
    title: 'text-slate-100',
    action: 'bg-emerald-600 hover:bg-emerald-500 active:brightness-90 text-white',
    DefaultIcon: Sprout,
  },
  error: {
    ring: 'border-amber-700/50',
    iconBg: 'bg-amber-900/30',
    iconColor: 'text-amber-400',
    title: 'text-amber-100',
    action: 'bg-slate-800 hover:bg-slate-700 active:brightness-90 text-slate-100 border border-slate-700',
    DefaultIcon: AlertTriangle,
  },
  offline: {
    ring: 'border-sky-700/50',
    iconBg: 'bg-sky-900/30',
    iconColor: 'text-sky-400',
    title: 'text-sky-100',
    action: 'bg-slate-800 hover:bg-slate-700 active:brightness-90 text-slate-100 border border-slate-700',
    DefaultIcon: WifiOff,
  },
};

export default function EmptyState({
  variant = 'empty',
  size = 'full',
  icon,
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  secondaryHint,
  className = '',
  'data-testid': testId = 'empty-state',
}) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.empty;
  const Icon = icon || styles.DefaultIcon;
  const ActionIcon = actionIcon || (variant === 'empty' ? Plus : RotateCcw);
  const compact = size === 'compact';

  return (
    <div
      role="status"
      data-testid={testId}
      className={`flex flex-col items-center justify-center text-center px-6 ${
        compact ? 'py-6 gap-2' : 'py-12 gap-3'
      } ${className}`}
    >
      {/* Ilustración custom (ej. ChagraGrowLoader por piso térmico) o icono
          en badge circular con anillo punteado — "espacio por sembrar". */}
      {illustration ? (
        <div aria-hidden="true" className="mb-1">{illustration}</div>
      ) : (
        <div
          aria-hidden="true"
          className={`rounded-full border-2 border-dashed ${styles.ring} p-1.5 mb-1`}
        >
          <div
            className={`rounded-full ${styles.iconBg} flex items-center justify-center ${
              compact ? 'w-12 h-12' : 'w-16 h-16'
            }`}
          >
            <Icon size={compact ? 22 : 30} className={styles.iconColor} />
          </div>
        </div>
      )}

      {title && (
        <p className={`font-bold leading-snug ${styles.title} ${compact ? 'text-sm' : 'text-base'}`}>
          {title}
        </p>
      )}

      {description && (
        <p className={`text-slate-400 leading-relaxed max-w-xs ${compact ? 'text-xs' : 'text-sm'}`}>
          {description}
        </p>
      )}

      {actionLabel && typeof onAction === 'function' && (
        <button
          type="button"
          onClick={onAction}
          className={`mt-2 px-5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all min-h-[48px] ${
            compact ? 'py-2.5 text-sm' : 'py-3'
          } ${styles.action}`}
        >
          <ActionIcon size={18} aria-hidden="true" />
          <span>{actionLabel}</span>
        </button>
      )}

      {secondaryHint && (
        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mt-1">
          {secondaryHint}
        </p>
      )}
    </div>
  );
}

/**
 * OfflineNotice — franja calmada para trabajo sin conexión (offline-first).
 * No es un error: es el modo normal de la app en el campo. Tono tranquilo.
 */
export function OfflineNotice({ className = '', message, 'data-testid': testId = 'offline-notice' }) {
  return (
    <div
      role="status"
      data-testid={testId}
      className={`flex items-start gap-2.5 p-3 rounded-xl bg-sky-950/40 border border-sky-800/40 text-sky-200 text-sm ${className}`}
    >
      <WifiOff size={16} className="shrink-0 mt-0.5 text-sky-400" aria-hidden="true" />
      <span className="leading-snug">
        {message || 'Trabajando sin conexión — sus datos están a salvo en este dispositivo y se sincronizarán cuando vuelva la señal.'}
      </span>
    </div>
  );
}
