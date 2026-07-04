import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Search, X, Camera, MessageCircle } from 'lucide-react';
import { CAPABILITY_MANIFEST } from '../../services/agentCapabilities.js';
import ManoChagraGlyph from '../dashboard/ManoChagraGlyph.jsx';
import { CosturaDivider } from './HelpIllustrations.jsx';

/**
 * HelpFuncionesScreen — "¿Qué puede hacer Chagra?" (sub-vista del Manual).
 *
 * LA respuesta del botón "?" a la pregunta más básica del campesino nuevo:
 * qué hace esta app y cómo llego a cada cosa. Cada tarjeta ABRE la función
 * (deep-link real, mismas vistas de App.jsx) — no la describe y ya.
 *
 * GROUNDED por construcción: se DERIVA de CAPABILITY_MANIFEST
 * (agentCapabilities.js — la fuente única de "la mano de Chagra"). Si una
 * función no está en el manifiesto, NO aparece aquí: esta pantalla no puede
 * prometer nada que la app no tenga. Cero re-declaración de capacidades
 * (mismo criterio que ayudaFunciones.js de «Chagra enseña a usar Chagra»).
 *
 * Cómo se llega a cada función (derivado de heroRoute):
 *   - kind 'nav'   → botón "Abrir" que navega a esa pantalla.
 *   - kind 'ask'   → "Pregúntale" (abre el chat del agente; la función es
 *                    una consulta con fuente).
 *   - kind 'photo' → "Con foto" (abre el chat; ahí está el botón cámara).
 *   - otro/chip    → "Pregúntale" (vive como chip dentro del chat).
 *   - status 'soon' → lista honesta "En camino", sin botón (anti-promesa).
 */

/** Etiquetas campesinas + orden de los grupos del manifiesto. */
const GRUPOS = [
  { id: 'registrar', label: 'Guardar lo que hago' },
  { id: 'cultivo', label: 'Cultivar' },
  { id: 'cuidar', label: 'Cuidar' },
  { id: 'observar', label: 'Observar la finca' },
  { id: 'planear', label: 'Planear' },
  { id: 'aprender', label: 'Aprender' },
  { id: 'vender', label: 'Vender' },
  { id: 'restaurar', label: 'Restaurar el monte' },
];

/** Deriva la acción de apertura de una capacidad (sin re-declarar nada). */
function accionDe(cap) {
  const hr = cap.heroRoute || {};
  if (hr.kind === 'nav' && hr.view) return { tipo: 'abrir', view: hr.view, label: 'Abrir' };
  if (hr.kind === 'photo') return { tipo: 'foto', view: 'agente', label: 'Con foto' };
  return { tipo: 'preguntar', view: 'agente', label: 'Pregúntale' };
}

const normalize = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function HelpFuncionesScreen({ onBackToHome, onNavigate }) {
  const [query, setQuery] = useState('');

  const go = (view) => {
    if (typeof onNavigate === 'function') onNavigate(view);
  };

  // Capacidades visibles = live Y alcanzables: las que brotan de la mano Ⓐ
  // (hero !== false) MÁS los chips de consulta del chat (tienen `intent`:
  // toxicidad, saberes, variedades, polinización, fenología, alerta páramo,
  // precio — viven bajo "Más" en la barra de chips). Quedan fuera solo las
  // entradas retiradas por dedup (hero:false SIN intent: puertas duplicadas
  // a la misma vista) y las 'soon' (van a "En camino", sin promesa).
  const { vivas, enCamino } = useMemo(() => {
    const vivas = CAPABILITY_MANIFEST.filter(
      (c) => c.status === 'live' && (c.hero !== false || c.intent)
    );
    const enCamino = CAPABILITY_MANIFEST.filter((c) => c.status !== 'live');
    return { vivas, enCamino };
  }, []);

  const visibles = useMemo(() => {
    const q = normalize(query).trim();
    if (!q) return vivas;
    const terms = q.split(/\s+/);
    return vivas.filter((c) => {
      const hay = normalize(`${c.label} ${c.desc || ''}`);
      return terms.every((t) => hay.includes(t));
    });
  }, [vivas, query]);

  const porGrupo = useMemo(() => {
    const map = new Map();
    for (const c of visibles) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group).push(c);
    }
    return map;
  }, [visibles]);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Sub-header con back to home del Manual */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 shrink-0 border-b border-slate-800/60 bg-slate-950/60">
        <button
          type="button"
          onClick={onBackToHome}
          aria-label="Volver al Manual"
          className="p-2 -ml-2 rounded-lg active:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          <ArrowLeft size={20} className="text-emerald-400" />
        </button>
        <p className="text-xs uppercase tracking-wider text-emerald-400/80 font-bold">Manual</p>
        <ChevronRight size={14} className="text-slate-600" />
        <p className="text-xs font-bold text-emerald-200">¿Qué puede hacer Chagra?</p>
      </div>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-12 flex flex-col gap-4">
        {/* Hero: la mano de Chagra presenta sus capacidades */}
        <div className="flex items-start gap-3">
          <span className="shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-[16px_16px_16px_6px] bg-emerald-700/30 border border-emerald-500/50 text-emerald-300">
            <ManoChagraGlyph size={32} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black text-emerald-100 leading-tight">
              Todo esto puede hacer Chagra
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mt-1">
              Toca una tarjeta y te lleva directo. Estas mismas funciones brotan
              de <strong className="text-emerald-200">la mano de Chagra</strong>{' '}
              (el botón Ⓐ) en cualquier pantalla.
            </p>
          </div>
        </div>

        <CosturaDivider />

        {/* Buscador simple (mismo filtro plano del Manual, sin IA) */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar una función (ej. plaga, foto, vender)"
            aria-label="Buscar una función"
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900/70 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-600/60 min-h-[48px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Borrar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-200 active:bg-slate-800 min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Grupos (mismo orden de ramas de la mano) */}
        {GRUPOS.map((g) => {
          const caps = porGrupo.get(g.id);
          if (!caps || caps.length === 0) return null;
          return (
            <section key={g.id} aria-label={g.label}>
              <p className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold mb-2">
                {g.label}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {caps.map((cap) => {
                  const accion = accionDe(cap);
                  return (
                    <button
                      key={cap.id}
                      type="button"
                      onClick={() => go(accion.view)}
                      data-testid={`funcion-${cap.id}`}
                      className="rounded-[16px_16px_16px_6px] bg-slate-900/60 border border-slate-800 hover:border-emerald-600/50 active:scale-[0.99] transition-all p-3 text-left flex items-center gap-3 min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                    >
                      <span
                        aria-hidden="true"
                        className="shrink-0 inline-flex items-center justify-center w-11 h-11 text-[22px] leading-none bg-slate-950/60 border border-slate-700/60 rounded-[12px_12px_12px_5px]"
                      >
                        {cap.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-slate-100 leading-tight">
                          {cap.label}
                        </span>
                        {cap.desc && (
                          <span className="block text-[11px] text-slate-400 leading-snug mt-0.5">
                            {cap.desc}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                        {accion.tipo === 'foto' && <Camera size={12} aria-hidden="true" />}
                        {accion.tipo === 'preguntar' && <MessageCircle size={12} aria-hidden="true" />}
                        {accion.label}
                        <ChevronRight size={13} aria-hidden="true" className="text-slate-500" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {query && visibles.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-center">
            <p className="text-sm text-slate-300 leading-relaxed">
              Ninguna función se llama así.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
              Prueba con otra palabra (ej.{' '}
              <strong className="text-slate-300">plaga</strong>,{' '}
              <strong className="text-slate-300">foto</strong>,{' '}
              <strong className="text-slate-300">vender</strong>) o pregúntale
              al agente con tus palabras.
            </p>
          </div>
        )}

        {/* En camino — honesto, sin botón (anti-promesa) */}
        {!query && enCamino.length > 0 && (
          <section aria-label="Funciones en camino" className="mt-1">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-2">
              En camino (todavía no)
            </p>
            <ul className="flex flex-col gap-1.5">
              {enCamino.map((cap) => (
                <li
                  key={cap.id}
                  className="rounded-xl border border-dashed border-slate-700/70 bg-slate-900/30 px-3 py-2.5 flex items-center gap-2.5 text-sm text-slate-400"
                >
                  <span aria-hidden="true" className="text-base opacity-70">{cap.icon}</span>
                  <span className="font-bold text-slate-300">{cap.label}</span>
                  <span className="text-[11px] text-slate-500 min-w-0 truncate">{cap.desc}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-[11px] text-slate-600 text-center mt-2 italic leading-relaxed">
          Esta lista sale del mismo manifiesto que usa la app: si una función no
          está aquí, Chagra todavía no la tiene. Sin promesas.
        </p>
      </main>
    </div>
  );
}
