import React from 'react';
import { Lightbulb } from 'lucide-react';

/**
 * PedagogicalBlock — bloque de texto DIDÁCTICO para explicar temas densos sin
 * volverlos un muro.
 *
 * Patrón campesino "lee al sol": una frase-guía en grande (lo que hay que
 * llevarse), el desarrollo en cuerpo legible, y opcionalmente una "clave"
 * resaltada al pie. Jerarquía tipográfica clara, líneas cortas.
 *
 * Es puramente presentacional (sin estado ni datos de módulo): copiar-listo y
 * reutilizable por cualquier pantalla que necesite explicar un concepto
 * (aquí: los riesgos de contaminación del agua y la salud).
 *
 * NOTA: no confundir con `PedagogicalText` (mismo directorio) — ese otro
 * componente parsea prosa cruda del catálogo (`parsePedagogicalText`) para la
 * ficha de especie y el biopreparado; este es un bloque de layout genérico
 * (lead/children/clave/icon) para cualquier pantalla. Nombres distintos a
 * propósito para no pisar el componente compartido existente.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.lead]     frase-guía destacada (opcional).
 * @param {React.ReactNode} [props.children] cuerpo del texto.
 * @param {React.ReactNode} [props.clave]    cierre resaltado "lo clave" (opcional).
 * @param {import('lucide-react').LucideIcon} [props.icon] ícono del bloque.
 * @param {'neutral'|'alerta'} [props.tone]  acento de color.
 * @param {string} [props.className]
 */
export default function PedagogicalBlock({
  lead = null,
  children = null,
  clave = null,
  icon: Icon = null,
  tone = 'neutral',
  className = '',
  ...rest
}) {
  const accent = tone === 'alerta'
    ? {
      border: 'border-rose-700/40',
      bar: 'bg-rose-500/70',
      lead: 'text-rose-200',
      chip: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
    }
    : {
      border: 'border-slate-700/60',
      bar: 'bg-cyan-500/60',
      lead: 'text-slate-100',
      chip: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100',
    };

  return (
    <div
      className={`relative rounded-2xl border ${accent.border} bg-slate-900/50 p-4 pl-5 ${className}`}
      {...rest}
    >
      {/* barra de acento a la izquierda: ancla la vista, estilo cuaderno */}
      <span aria-hidden="true" className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${accent.bar}`} />

      {(lead || Icon) && (
        <p className={`flex items-start gap-2 text-sm font-black leading-snug ${accent.lead}`}>
          {Icon && <Icon size={18} aria-hidden="true" className="shrink-0 mt-0.5" />}
          {lead && <span>{lead}</span>}
        </p>
      )}

      {children && (
        <div className={`text-sm leading-relaxed text-slate-300 space-y-2 ${lead || Icon ? 'mt-2' : ''}`}>
          {children}
        </div>
      )}

      {clave && (
        <p className={`mt-3 inline-flex items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold leading-snug ${accent.chip}`}>
          <Lightbulb size={13} aria-hidden="true" className="shrink-0 mt-0.5" />
          <span>{clave}</span>
        </p>
      )}
    </div>
  );
}
