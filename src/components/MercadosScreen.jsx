/**
 * MercadosScreen — superficie HONESTA de la rama "Vender" de la mano de Chagra.
 *
 * Contexto (auditoría UX §7.4 P3): la rama "Vender" de la mano radial no iba a
 * ningún lado (su único nodo, 'precio', está en estado 'soon'/no clickeable).
 * Esta pantalla la hace ALCANZABLE sin mentir: explica qué hay hoy (la consulta
 * de precios mayoristas todavía no está conectada en Chagra) y orienta a las
 * fuentes públicas reales (DANE/SIPSA, centrales de abasto). No promete precios
 * en vivo ni un mercado dentro de la app — es una pantalla "en preparación"
 * real, no un dead-end ni un placeholder vacío.
 *
 * Identidad visual: reusa los primitivos de marca (mano de Chagra + paleta del
 * tema vía --t-accent-rgb), nada de estética genérica de IA. Sin enlaces a
 * homepages genéricas (trazabilidad teatral): solo cita las fuentes por nombre.
 */
import React from 'react';
import { Handshake, Info } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import ManoChagraGlyph from './dashboard/ManoChagraGlyph.jsx';

const FUENTES_PRECIO = [
  {
    nombre: 'DANE — SIPSA',
    detalle:
      'El Sistema de Información de Precios del Sector Agropecuario publica los precios mayoristas diarios de las principales centrales de abasto del país.',
  },
  {
    nombre: 'Centrales de abasto regionales',
    detalle:
      'Corabastos (Bogotá), Cavasa (Cali), la Central Mayorista de Antioquia y otras plazas publican boletines de precios de referencia.',
  },
];

export default function MercadosScreen({ onBack, onAskAgent }) {
  return (
    <ScreenShell
      title="Vender mejor"
      icon={Handshake}
      onBack={onBack}
    >
      <div className="max-w-md mx-auto p-4 space-y-4" data-testid="mercados-screen">
        {/* Encabezado con identidad de Chagra (mano + acento del tema) */}
        <div
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            border: '1px solid rgba(var(--t-accent-rgb), 0.45)',
            background:
              'linear-gradient(135deg, rgba(var(--t-accent-rgb),0.16), rgba(15,23,20,0.55) 60%)',
          }}
        >
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 140 90"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M4 86 C 34 78, 40 42, 70 40 S 110 30, 138 8"
              fill="none"
              stroke="rgb(var(--t-accent-rgb))"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity="0.45"
            />
            <circle cx="70" cy="40" r="2.6" fill="rgb(var(--t-accent-rgb))" opacity="0.65" />
          </svg>
          <div className="relative z-10">
            <span
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
              style={{
                color: 'rgb(var(--t-accent-rgb))',
                background: 'rgba(var(--t-accent-rgb),0.12)',
              }}
              aria-hidden="true"
            >
              <ManoChagraGlyph size={28} />
            </span>
            <h2 className="text-lg font-black text-slate-100 leading-tight">
              Vender mejor tu cosecha
            </h2>
            <p className="text-sm text-slate-300/85 leading-relaxed mt-1.5">
              Esta parte de Chagra está en preparación. Todavía no consultamos
              precios mayoristas en vivo dentro de la app, y preferimos decírtelo
              claro antes que mostrarte un dato que no podemos respaldar.
            </p>
          </div>
        </div>

        {/* Estado honesto */}
        <div
          className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 flex items-start gap-3"
          data-testid="mercados-estado"
        >
          <Info size={18} className="text-sky-300 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-sm text-slate-200 leading-relaxed">
            Mientras conectamos la consulta de precios, puedes orientarte con las
            fuentes públicas oficiales. No te damos un precio inventado: te decimos
            dónde está el dato real.
          </p>
        </div>

        {/* Fuentes de precio reales (citadas por nombre, sin enlaces teatrales) */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Dónde consultar precios mayoristas
          </p>
          {FUENTES_PRECIO.map((f) => (
            <div
              key={f.nombre}
              className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-3.5"
            >
              <p className="text-sm font-bold text-slate-100 leading-tight">{f.nombre}</p>
              <p className="text-xs text-slate-300/80 leading-relaxed mt-1">{f.detalle}</p>
            </div>
          ))}
        </div>

        {/* Puente al agente: el agente puede orientar sobre dónde vender / a
            quién, aunque la consulta de precios en vivo no esté lista. */}
        {typeof onAskAgent === 'function' && (
          <button
            type="button"
            data-testid="mercados-preguntar-agente"
            onClick={() =>
              onAskAgent('¿Dónde y a quién puedo vender mejor mi cosecha?')
            }
            className="w-full inline-flex items-center gap-3 px-4 py-3 rounded-2xl text-left active:scale-[0.99] transition-transform min-h-[52px]"
            style={{
              border: '1px solid rgba(var(--t-accent-rgb), 0.5)',
              background:
                'linear-gradient(135deg, rgba(var(--t-accent-rgb),0.16), rgba(15,23,20,0.5) 60%)',
            }}
          >
            <span
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl"
              style={{
                color: 'rgb(var(--t-accent-rgb))',
                background: 'rgba(var(--t-accent-rgb),0.12)',
              }}
              aria-hidden="true"
            >
              <ManoChagraGlyph size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-100 leading-tight">
                Pregúntale al agente
              </span>
              <span className="block text-xs text-slate-300/80 leading-snug mt-0.5">
                “¿Dónde y a quién puedo vender mejor mi cosecha?”
              </span>
            </span>
          </button>
        )}

        <p className="text-[11px] text-slate-600 text-center leading-relaxed pt-1">
          En preparación: cuando la consulta de precios esté conectada, la verás
          aquí con su fuente.
        </p>
      </div>
    </ScreenShell>
  );
}
